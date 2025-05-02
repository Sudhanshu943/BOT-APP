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
let antiAfkInterval: NodeJS.Timeout | null = null;
// Define types for typed inventory and entities
type InventoryItem = {
  name: string;
  count: number;
  slot: number;
};

type NearbyEntity = {
  name: string;
  distance: number;
  type: string;
};

// Bot status with proper typing
let botStatus = {
  connected: false,
  position: { x: 0, y: 0, z: 0 },
  health: 0,
  food: 0,
  dimension: "Overworld",
  inventory: [] as InventoryItem[],
  nearbyEntities: [] as NearbyEntity[]
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
    
    // Create a new entities array
    const entities: NearbyEntity[] = [];
    
    // Only process entities if bot.entities exists
    if (bot.entities) {
      Object.values(bot.entities).forEach((entity: any) => {
        if (entity && (entity.type === 'mob' || entity.type === 'player')) {
          entities.push({
            name: entity.username || entity.name || entity.displayName || entity.type,
            distance: Math.floor(bot.entity.position.distanceTo(entity.position)),
            type: entity.type
          });
        }
      });
    }
    
    // Sort entities by distance
    entities.sort((a, b) => a.distance - b.distance);
    
    // Create a new inventory array
    const inventory: InventoryItem[] = [];
    
    // Only process inventory if bot.inventory exists
    if (bot.inventory && bot.inventory.slots) {
      Object.values(bot.inventory.slots).forEach((item: any) => {
        if (item) {
          inventory.push({
            name: item.name,
            count: item.count,
            slot: item.slot
          });
        }
      });
    }
    
    // Update botStatus
    botStatus = {
      connected: bot !== null,
      position: position ? { x: Math.floor(position.x), y: Math.floor(position.y), z: Math.floor(position.z) } : { x: 0, y: 0, z: 0 },
      health: health || 0,
      food: food || 0,
      dimension: bot.game?.dimension || "Overworld",
      inventory: inventory,
      nearbyEntities: entities.slice(0, 10)
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
      // Better connection handling for Aternos servers
      checkTimeoutInterval: 120000, // Longer timeout for slow Aternos servers
      noPongTimeout: 60000, // Don't disconnect if no ping response for a while
      closeTimeout: 30000, // Wait longer for server to properly close socket
      chatLengthLimit: 100, // Limit length of chat messages
      // Important for Aternos: Adding slightly more human-like behavior
      viewDistance: "far" as const, // Use 'as const' to type it properly
      // Automatically respawn if enabled
      respawn: config.autoRespawnEnabled,
      // Handle Aternos Auth plugin
      // Use more authentic client behavior
      physicsEnabled: true,
      // Don't place blocks automatically
      autoEat: false
    };
    
    bot = mineflayer.createBot(botConfig);
    
    // Add pathfinder plugin
    bot.loadPlugin(pathfinder);
    
    bot.on('spawn', () => {
      broadcastConsole('Bot spawned in the world', 'success');
      updateBotStatus();
      
      // Initialize pathfinder
      const mcData = minecraftData(bot.version);
      // Create movements with just the bot parameter
      const movements = new Movements(bot);
      
      // Apply anti-detection settings
      const antiDetection = antiDetectionSettings[config.antiDetectionLevel as keyof typeof antiDetectionSettings] || 
                             antiDetectionSettings.balanced;
      
      movements.canDig = false; // Don't dig blocks
      movements.maxDropDown = 3; // Limit drop height to appear more human
      // Set the blocks that can't be broken instead of using push
      movements.blocksCantBreak = new Set([mcData.blocksByName.bedrock.id]);
      
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
      
      // Handle common Aternos auth plugin messages
      if (messageStr.includes('/register') || messageStr.includes('/login') || 
          messageStr.includes('register') || messageStr.includes('login')) {
        broadcastConsole('Auth request detected! You may need to register or login.', 'system');
      }
      
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
      
      // Provide more specific information about common kick reasons
      const reasonStr = reason.toString().toLowerCase();
      if (reasonStr.includes('proxy') || reasonStr.includes('vpn') || reasonStr.includes('auth')) {
        broadcastConsole('Server may be blocking proxies, VPNs or requiring authentication', 'error');
      } else if (reasonStr.includes('timeout')) {
        broadcastConsole('Connection timed out - server might be overloaded or have high ping', 'error');
      } else if (reasonStr.includes('banned') || reasonStr.includes('blacklisted')) {
        broadcastConsole('The username or IP might be banned on this server', 'error');
      } else if (reasonStr.includes('whitelist')) {
        broadcastConsole('This server uses a whitelist and the bot is not on it', 'error');
      } else if (reasonStr.includes('outdated') || reasonStr.includes('version')) {
        broadcastConsole('The Minecraft version might be incorrect - try a different version', 'error');
      }
      
      bot = null;
      botStatus.connected = false;
      broadcastStatus();
    });
    
    bot.on('error', (err) => {
      const errorMessage = `Bot error: ${err.message} (Code: ${err.code || 'unknown'})`;
      console.error(errorMessage, err);
      broadcastConsole(errorMessage, 'error');
      
      // Handle specific common errors
      if (err.code === 'ECONNRESET') {
        broadcastConsole('Connection was forcibly closed by the server. This might happen due to server anti-bot measures.', 'error');
      } else if (err.code === 'ETIMEDOUT') {
        broadcastConsole('Connection timed out. Please check if the server is online and accessible.', 'error');
      }
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

// Anti-AFK task states
type AntiAfkState = 'idle' | 'exploring' | 'mining' | 'farming' | 'crafting' | 'returning';
let antiAfkState: AntiAfkState = 'idle';
let antiAfkTarget: Vec3 | null = null;
let antiAfkStartPosition: Vec3 | null = null;
let antiAfkTaskTimeout: NodeJS.Timeout | null = null;

function setupAntiAfk(config: any) {
  if (antiAfkInterval) {
    clearInterval(antiAfkInterval);
  }
  
  if (antiAfkTaskTimeout) {
    clearTimeout(antiAfkTaskTimeout);
    antiAfkTaskTimeout = null;
  }
  
  // Reset state
  antiAfkState = 'idle';
  antiAfkTarget = null;
  antiAfkStartPosition = null;
  
  const interval = config.afkInterval * 1000;
  const antiDetection = antiDetectionSettings[config.antiDetectionLevel as keyof typeof antiDetectionSettings];
  
  // Record starting position if available
  if (bot && bot.entity) {
    antiAfkStartPosition = bot.entity.position.clone();
  }
  
  antiAfkInterval = setInterval(() => {
    if (!bot || !botStatus.connected) return;
    
    // More advanced anti-AFK with state machine for different tasks
    const randomAction = Math.random();
    
    // Perform basic random actions to appear active
    if (randomAction < 0.15) {
      // Look around randomly
      const yaw = (Math.random() * Math.PI * 2);
      const pitch = (Math.random() * Math.PI) - (Math.PI/2);
      bot.look(yaw, pitch, false);
      broadcastConsole('Anti-AFK: Looking around', 'bot');
    } else if (randomAction < 0.25) {
      // Jump
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.setControlState('jump', false);
      }, 500);
      broadcastConsole('Anti-AFK: Jumping', 'bot');
    } else if (randomAction < 0.35) {
      // Swing arm
      bot.swingArm();
      broadcastConsole('Anti-AFK: Swinging arm', 'bot');
    } else if (randomAction < 0.45) {
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
    } else if (randomAction < 0.65) {
      // Walk in a random direction if not already exploring
      if (antiAfkState === 'idle') {
        const randomDirection = Math.floor(Math.random() * 4);
        antiAfkState = 'exploring';
        
        // Clear previous movement
        bot.clearControlStates();
        
        switch (randomDirection) {
          case 0:
            bot.setControlState('forward', true);
            broadcastConsole('Anti-AFK: Walking forward', 'bot');
            break;
          case 1:
            bot.setControlState('back', true);
            broadcastConsole('Anti-AFK: Walking backward', 'bot');
            break;
          case 2:
            bot.setControlState('left', true);
            broadcastConsole('Anti-AFK: Walking left', 'bot');
            break;
          case 3:
            bot.setControlState('right', true);
            broadcastConsole('Anti-AFK: Walking right', 'bot');
            break;
        }
        
        // Stop after a random time (3-8 seconds)
        const walkTime = Math.floor(Math.random() * 5000) + 3000;
        antiAfkTaskTimeout = setTimeout(() => {
          if (!bot) return;
          bot.clearControlStates();
          antiAfkState = 'idle';
          broadcastConsole('Anti-AFK: Stopped walking', 'bot');
        }, walkTime);
      }
    } else if (randomAction < 0.80) {
      // Try to mine a block if not already in a task
      if (antiAfkState === 'idle' && bot.entity) {
        antiAfkState = 'mining';
        
        // Look slightly down to find blocks
        bot.look(bot.entity.yaw, Math.PI / 4, false);
        
        // Try to find a block to mine in front of the bot
        const block = bot.blockAtCursor(5);
        
        if (block && block.name !== 'air' && block.name !== 'bedrock') {
          broadcastConsole(`Anti-AFK: Mining ${block.name}`, 'bot');
          bot.dig(block).then(() => {
            broadcastConsole(`Anti-AFK: Finished mining ${block.name}`, 'bot');
            antiAfkState = 'idle';
          }).catch(() => {
            // If mining fails, just reset state
            antiAfkState = 'idle';
          });
        } else {
          broadcastConsole('Anti-AFK: No suitable block to mine', 'bot');
          antiAfkState = 'idle';
        }
      }
    } else if (randomAction < 0.90) {
      // Random chat message with low probability to avoid spam
      if (Math.random() < 0.1) { // 10% chance of this already rare event
        const messages = [
          'Just mining some resources',
          'Anyone else online?',
          'The weather is nice today',
          'I like this server',
          'Just exploring'
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        bot.chat(randomMessage);
        broadcastConsole(`Anti-AFK: Sent chat message: ${randomMessage}`, 'bot');
      }
    } else {
      // Return to start position if we've strayed far and not in the middle of a task
      if (antiAfkState === 'idle' && antiAfkStartPosition && bot.entity) {
        const distance = bot.entity.position.distanceTo(antiAfkStartPosition);
        
        // If we're more than 20 blocks away from our start position
        if (distance > 20) {
          broadcastConsole('Anti-AFK: Returning to starting position', 'bot');
          antiAfkState = 'returning';
          
          // Try to pathfind back to start position
          if (bot.pathfinder) {
            try {
              const mcData = minecraftData(bot.version);
              const movements = new Movements(bot, mcData);
              bot.pathfinder.setMovements(movements);
              
              // Create a proper goal from the stored position
              bot.pathfinder.setGoal({ x: antiAfkStartPosition.x, y: antiAfkStartPosition.y, z: antiAfkStartPosition.z, reach: 1 });
              broadcastConsole('Anti-AFK: Returning to starting position', 'bot');
              
              // Reset state after a timeout in case pathfinding gets stuck
              setTimeout(() => {
                if (antiAfkState === 'returning') {
                  broadcastConsole('Anti-AFK: Timeout while returning, resetting state', 'bot');
                  antiAfkState = 'idle';
                }
              }, 30000); // 30 second timeout
            } catch (err) {
              broadcastConsole('Anti-AFK: Failed to start pathfinding', 'error');
              antiAfkState = 'idle';
            }
          } else {
            // If pathfinder not available, just move in the general direction
            const dx = antiAfkStartPosition.x - bot.entity.position.x;
            const dz = antiAfkStartPosition.z - bot.entity.position.z;
            
            const yaw = Math.atan2(-dx, -dz);
            bot.look(yaw, 0, true);
            bot.setControlState('forward', true);
            
            // Move for a while then stop
            antiAfkTaskTimeout = setTimeout(() => {
              bot.clearControlStates();
              antiAfkState = 'idle';
              broadcastConsole('Anti-AFK: Stopped returning', 'bot');
            }, 5000);
          }
        }
      }
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
