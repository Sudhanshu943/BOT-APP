import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { insertBotConfigSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import mineflayer from "mineflayer";
import { pathfinder, Movements } from "mineflayer-pathfinder";
import minecraftData from "minecraft-data";
import { Vec3 } from "vec3";

// Bot instance and status
let bot: any = null;
let botStatus = {
  connected: false,
  position: { x: 0, y: 0, z: 0 },
  health: 0,
  food: 0,
  dimension: "Overworld",
  inventory: [],
  nearbyEntities: []
};

// WebSocket connections for real-time updates
const clients = new Set<WebSocket>();

// Anti-detection settings based on level
const antiDetectionSettings = {
  minimal: {
    moveDelay: 50,
    lookSpeed: 0.8,
    chatDelay: 300,
    randomMovementChance: 0.05
  },
  balanced: {
    moveDelay: 150,
    lookSpeed: 0.5,
    chatDelay: 1000,
    randomMovementChance: 0.1
  },
  careful: {
    moveDelay: 300,
    lookSpeed: 0.3,
    chatDelay: 2000,
    randomMovementChance: 0.15
  },
  paranoid: {
    moveDelay: 500,
    lookSpeed: 0.2, 
    chatDelay: 3000,
    randomMovementChance: 0.2
  }
};

// Timers and intervals for bot actions
let antiAfkInterval: NodeJS.Timeout | null = null;

function broadcastStatus() {
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({
        type: 'status',
        data: botStatus
      }));
    }
  });
}

function broadcastConsole(message: string, type: string) {
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({
        type: 'console',
        data: { message, type }
      }));
    }
  });
}

function updateBotStatus() {
  if (!bot) return;
  
  try {
    const position = bot.entity?.position;
    const health = bot.health;
    const food = bot.food;
    
    botStatus = {
      connected: bot !== null,
      position: position ? { x: Math.floor(position.x), y: Math.floor(position.y), z: Math.floor(position.z) } : { x: 0, y: 0, z: 0 },
      health: health || 0,
      food: food || 0,
      dimension: bot.game?.dimension || "Overworld",
      inventory: Object.values(bot.inventory.slots || {})
        .filter(item => item)
        .map((item: any) => ({
          name: item.name,
          count: item.count,
          slot: item.slot
        })),
      nearbyEntities: Object.values(bot.entities || {})
        .filter((entity: any) => entity.type === 'mob' || entity.type === 'player')
        .map((entity: any) => ({
          name: entity.username || entity.name || entity.displayName || entity.type,
          distance: Math.floor(bot.entity.position.distanceTo(entity.position)),
          type: entity.type
        }))
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 10)
    };
    
    broadcastStatus();
  } catch (err) {
    console.error('Error updating bot status:', err);
  }
}

async function connectBot(config: any) {
  if (bot) {
    disconnectBot();
  }
  
  try {
    broadcastConsole('Attempting to connect to server...', 'system');
    
    const botConfig = {
      host: config.serverAddress,
      port: config.serverPort,
      username: config.username,
      version: config.version,
      hideErrors: false,
      checkTimeoutInterval: 60000,
      // Important for Aternos: Adding slightly more human-like behavior
      viewDistance: 'normal',
      respawn: config.autoRespawnEnabled
    };
    
    bot = mineflayer.createBot(botConfig);
    
    // Add pathfinder plugin
    bot.loadPlugin(pathfinder);
    
    bot.on('spawn', () => {
      broadcastConsole('Bot spawned in the world', 'success');
      updateBotStatus();
      
      // Initialize pathfinder
      const mcData = minecraftData(bot.version);
      const movements = new Movements(bot, mcData);
      
      // Apply anti-detection settings
      const antiDetection = antiDetectionSettings[config.antiDetectionLevel as keyof typeof antiDetectionSettings] || 
                             antiDetectionSettings.balanced;
      
      movements.canDig = false; // Don't dig blocks
      movements.maxDropDown = 3; // Limit drop height to appear more human
      movements.blocksCantBreak.push(mcData.blocksByName.bedrock.id);
      
      bot.pathfinder.setMovements(movements);
      
      // Set up anti-AFK if enabled
      if (config.antiAfkEnabled) {
        setupAntiAfk(config);
      }
    });
    
    bot.on('health', () => {
      updateBotStatus();
    });
    
    bot.on('move', () => {
      updateBotStatus();
    });
    
    bot.on('message', (message) => {
      const messageStr = message.toString();
      broadcastConsole(messageStr, 'server');
      
      // Auto-response to whispers if enabled
      if (config.chatResponseEnabled && message.privateMessage) {
        const sender = message.sender || "Unknown";
        
        setTimeout(() => {
          let response = config.chatTemplate || "Hi!";
          response = response.replace('{player}', sender);
          bot.chat(response);
          broadcastConsole(`Sent response to ${sender}: ${response}`, 'bot');
        }, antiDetectionSettings[config.antiDetectionLevel as keyof typeof antiDetectionSettings].chatDelay);
      }
    });
    
    bot.on('kicked', (reason) => {
      broadcastConsole(`Bot was kicked: ${reason}`, 'error');
      bot = null;
      botStatus.connected = false;
      broadcastStatus();
    });
    
    bot.on('error', (err) => {
      broadcastConsole(`Bot error: ${err.message}`, 'error');
    });
    
    bot.on('end', () => {
      broadcastConsole('Bot disconnected from server', 'system');
      bot = null;
      botStatus.connected = false;
      broadcastStatus();
      
      if (antiAfkInterval) {
        clearInterval(antiAfkInterval);
        antiAfkInterval = null;
      }
    });
    
    return true;
  } catch (err: any) {
    broadcastConsole(`Error connecting bot: ${err.message}`, 'error');
    return false;
  }
}

function disconnectBot() {
  if (bot) {
    broadcastConsole('Disconnecting bot...', 'system');
    
    if (antiAfkInterval) {
      clearInterval(antiAfkInterval);
      antiAfkInterval = null;
    }
    
    bot.quit();
    bot = null;
    botStatus.connected = false;
    broadcastStatus();
    
    return true;
  }
  
  return false;
}

function setupAntiAfk(config: any) {
  if (antiAfkInterval) {
    clearInterval(antiAfkInterval);
  }
  
  const interval = config.afkInterval * 1000;
  const antiDetection = antiDetectionSettings[config.antiDetectionLevel as keyof typeof antiDetectionSettings];
  
  antiAfkInterval = setInterval(() => {
    if (!bot || !botStatus.connected) return;
    
    const randomAction = Math.random();
    
    if (randomAction < 0.25) {
      // Look around randomly
      const yaw = (Math.random() * Math.PI) - (Math.PI/2);
      const pitch = (Math.random() * Math.PI) - (Math.PI/2);
      bot.look(yaw, pitch, false);
      broadcastConsole('Anti-AFK: Looking around', 'bot');
    } else if (randomAction < 0.5) {
      // Jump
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.setControlState('jump', false);
      }, 500);
      broadcastConsole('Anti-AFK: Jumping', 'bot');
    } else if (randomAction < 0.75) {
      // Swing arm
      bot.swingArm();
      broadcastConsole('Anti-AFK: Swinging arm', 'bot');
    } else {
      // Turn 360 degrees slowly
      const currentYaw = bot.entity.yaw;
      let targetYaw = currentYaw;
      
      const turnInterval = setInterval(() => {
        if (!bot) {
          clearInterval(turnInterval);
          return;
        }
        
        targetYaw += 0.2;
        bot.look(targetYaw, bot.entity.pitch, false);
        
        if (targetYaw >= currentYaw + (Math.PI * 2)) {
          clearInterval(turnInterval);
        }
      }, antiDetection.moveDelay);
      
      broadcastConsole('Anti-AFK: Turning around', 'bot');
    }
  }, interval);
}

function handleBotAction(action: any) {
  if (!bot || !botStatus.connected) {
    broadcastConsole('Cannot perform action: Bot is not connected', 'error');
    return false;
  }
  
  try {
    switch (action.type) {
      case 'move':
        // Stop any current movement
        bot.clearControlStates();
        
        switch (action.direction) {
          case 'forward':
            bot.setControlState('forward', true);
            broadcastConsole('Moving forward', 'bot');
            break;
          case 'backward':
            bot.setControlState('back', true);
            broadcastConsole('Moving backward', 'bot');
            break;
          case 'left':
            bot.setControlState('left', true);
            broadcastConsole('Moving left', 'bot');
            break;
          case 'right':
            bot.setControlState('right', true);
            broadcastConsole('Moving right', 'bot');
            break;
        }
        break;
        
      case 'stop':
        bot.clearControlStates();
        broadcastConsole('Movement stopped', 'bot');
        break;
        
      case 'attack':
        const entity = bot.nearestEntity();
        if (entity) {
          bot.attack(entity);
          broadcastConsole(`Attacking ${entity.name || entity.username || 'entity'}`, 'bot');
        } else {
          bot.swingArm();
          broadcastConsole('No target found, swinging arm', 'bot');
        }
        break;
        
      case 'use':
        bot.activateItem();
        broadcastConsole('Using item in hand', 'bot');
        break;
        
      case 'jump':
        bot.setControlState('jump', true);
        setTimeout(() => {
          bot.setControlState('jump', false);
        }, 250);
        broadcastConsole('Jumping', 'bot');
        break;
        
      case 'sneak':
        const isSneaking = bot.getControlState('sneak');
        bot.setControlState('sneak', !isSneaking);
        broadcastConsole(isSneaking ? 'Stopped sneaking' : 'Started sneaking', 'bot');
        break;
        
      case 'command':
        if (!action.command) return false;
        
        if (action.command.startsWith('/')) {
          bot.chat(action.command);
        } else {
          bot.chat(action.command);
        }
        
        broadcastConsole(`Executed command: ${action.command}`, 'bot');
        break;
        
      default:
        broadcastConsole(`Unknown action type: ${action.type}`, 'error');
        return false;
    }
    
    return true;
  } catch (err: any) {
    broadcastConsole(`Error performing action: ${err.message}`, 'error');
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  const apiRouter = app.route('/api');
  
  // Get bot configuration
  app.get('/api/config', async (req: Request, res: Response) => {
    try {
      const config = await storage.getBotConfig();
      res.json(config || {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Save bot configuration
  app.post('/api/config', async (req: Request, res: Response) => {
    try {
      const config = insertBotConfigSchema.parse(req.body);
      const savedConfig = await storage.saveBotConfig(config);
      res.json(savedConfig);
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  });
  
  // Update bot configuration
  app.patch('/api/config', async (req: Request, res: Response) => {
    try {
      const partialConfig = req.body;
      const updatedConfig = await storage.updateBotConfig(partialConfig);
      res.json(updatedConfig);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });
  
  // Connect bot to server
  app.post('/api/bot/connect', async (req: Request, res: Response) => {
    try {
      const config = await storage.getBotConfig();
      
      if (!config) {
        return res.status(400).json({ error: "No bot configuration found" });
      }
      
      // Override config with request body if provided
      const connectionConfig = {
        ...config,
        ...req.body
      };
      
      // Update storage with the new config
      await storage.updateBotConfig(connectionConfig);
      
      const success = await connectBot(connectionConfig);
      
      if (success) {
        res.json({ message: "Bot connecting to server" });
      } else {
        res.status(500).json({ error: "Failed to connect bot" });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });
  
  // Disconnect bot
  app.post('/api/bot/disconnect', (req: Request, res: Response) => {
    try {
      const success = disconnectBot();
      
      if (success) {
        res.json({ message: "Bot disconnected from server" });
      } else {
        res.status(400).json({ error: "Bot was not connected" });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });
  
  // Bot status
  app.get('/api/bot/status', (req: Request, res: Response) => {
    res.json(botStatus);
  });
  
  // Bot action
  app.post('/api/bot/action', (req: Request, res: Response) => {
    try {
      const actionSchema = z.object({
        type: z.enum(['move', 'attack', 'use', 'jump', 'sneak', 'stop', 'command']),
        direction: z.string().optional(),
        command: z.string().optional()
      });
      
      const action = actionSchema.parse(req.body);
      const success = handleBotAction(action);
      
      if (success) {
        res.json({ message: `Action ${action.type} executed successfully` });
      } else {
        res.status(400).json({ error: "Failed to execute action" });
      }
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates with a dedicated path to avoid conflicts with Vite
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws-minebuddy',
    clientTracking: true
  });
  
  console.log('WebSocket server initialized at /ws-minebuddy path');
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    clients.add(ws);
    
    // Send initial status on connection
    ws.send(JSON.stringify({
      type: 'status',
      data: botStatus
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'action') {
          handleBotAction(data.data);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });
  
  // Update status periodically when bot is connected
  setInterval(() => {
    if (bot && botStatus.connected) {
      updateBotStatus();
    }
  }, 1000);

  return httpServer;
}
