import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { BotStatus, MineBotConfig, BotAction, ConsoleMessage } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Helper function to avoid circular reference
const addConsoleMessage = (setMessages: React.Dispatch<React.SetStateAction<ConsoleMessage[]>>, message: string, type: ConsoleMessage['type'] = 'info') => {
  setMessages(prev => [
    ...prev,
    {
      message,
      type,
      timestamp: new Date()
    }
  ]);
};

export const useMineBot = () => {
  const [config, setConfig] = useState<MineBotConfig>({
    serverAddress: '',
    serverPort: 25565,
    username: 'MineBuddy_Bot',
    version: '1.20.1',
    movementSpeed: 3,
    antiDetectionLevel: 'balanced',
    afkInterval: 30,
    chatTemplate: 'Hi {player}, I\'m a bot!',
    antiAfkEnabled: false,
    autoRespawnEnabled: true,
    chatResponseEnabled: false
  });
  
  const [status, setStatus] = useState<BotStatus>({
    connected: false,
    position: { x: 0, y: 0, z: 0 },
    health: 0,
    food: 0,
    dimension: 'Overworld',
    inventory: [],
    nearbyEntities: []
  });
  
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([
    {
      message: 'Welcome to MineBuddy Bot Controller',
      type: 'system',
      timestamp: new Date()
    },
    {
      message: 'Ready to connect to a Minecraft server',
      type: 'system',
      timestamp: new Date()
    },
    {
      message: 'Use the connection panel to configure your bot',
      type: 'system',
      timestamp: new Date()
    }
  ]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  // Initialize by loading config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setConfig(data);
          }
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    
    fetchConfig();
    setupWebsocket();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);
  
  const setupWebsocket = () => {
    // Close existing connection if any
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Connect to our dedicated WebSocket path to avoid conflicts with Vite
    const wsUrl = `${protocol}//${host}/ws-minebuddy`;
    
    console.log(`Attempting to connect to WebSocket at ${wsUrl}`);
    
    try {
      // Using addConsoleMessage helper to avoid using logToConsole before declaration
      addConsoleMessage(setConsoleMessages, `Attempting to connect to WebSocket: ${wsUrl}`, 'system');
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConsoleMessages(prev => [
          ...prev,
          {
            message: 'WebSocket connected',
            type: 'system',
            timestamp: new Date()
          }
        ]);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'status') {
            setStatus(data.data);
          } else if (data.type === 'console') {
            setConsoleMessages(prev => [
              ...prev,
              {
                message: data.data.message,
                type: data.data.type,
                timestamp: new Date()
              }
            ]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConsoleMessages(prev => [
          ...prev,
          {
            message: 'WebSocket error occurred',
            type: 'error',
            timestamp: new Date()
          }
        ]);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setConsoleMessages(prev => [
          ...prev,
          {
            message: 'WebSocket connection closed',
            type: 'system',
            timestamp: new Date()
          }
        ]);
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            setupWebsocket();
          }
        }, 3000);
      };
      
      websocketRef.current = ws;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setConsoleMessages(prev => [
        ...prev,
        {
          message: `Error setting up WebSocket: ${(error as Error).message}`,
          type: 'error',
          timestamp: new Date()
        }
      ]);
    }
  };
  
  const sendAction = async (action: BotAction) => {
    if (!status.connected && action.type !== 'command') {
      logToConsole(`Cannot perform ${action.type} action: Bot is not connected`, 'error');
      return false;
    }
    
    try {
      const response = await apiRequest('POST', '/api/bot/action', action);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute action');
      }
      
      return true;
    } catch (error) {
      console.error('Error sending action:', error);
      logToConsole(`Action error: ${(error as Error).message}`, 'error');
      return false;
    }
  };
  
  const connectBot = async (connectionConfig?: Partial<MineBotConfig>) => {
    setIsLoading(true);
    
    try {
      // Use provided connection config or current state
      const connectConfig = connectionConfig ? { ...config, ...connectionConfig } : config;
      
      // Validate config
      if (!connectConfig.serverAddress) {
        throw new Error('Server address is required');
      }
      
      if (!connectConfig.username) {
        throw new Error('Username is required');
      }
      
      // Save the config first
      await apiRequest('POST', '/api/config', connectConfig);
      
      // Connect the bot
      const response = await apiRequest('POST', '/api/bot/connect', connectConfig);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect bot');
      }
      
      // Update local state with the new config
      setConfig(connectConfig);
      
      toast({
        title: "Connecting bot",
        description: "Bot is attempting to connect to the server...",
      });
      
      return true;
    } catch (error) {
      console.error('Error connecting bot:', error);
      logToConsole(`Connection error: ${(error as Error).message}`, 'error');
      
      toast({
        title: "Connection Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const disconnectBot = async () => {
    if (!status.connected) {
      logToConsole('Bot is already disconnected', 'warn');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/bot/disconnect');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect bot');
      }
      
      toast({
        title: "Bot Disconnected",
        description: "Bot has been disconnected from the server",
      });
      
      return true;
    } catch (error) {
      console.error('Error disconnecting bot:', error);
      logToConsole(`Disconnection error: ${(error as Error).message}`, 'error');
      
      toast({
        title: "Disconnection Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveConfig = async (newConfig: Partial<MineBotConfig>) => {
    setIsLoading(true);
    
    try {
      const updatedConfig = { ...config, ...newConfig };
      
      const response = await apiRequest('PATCH', '/api/config', newConfig);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
      
      setConfig(updatedConfig);
      
      toast({
        title: "Configuration Saved",
        description: "Bot configuration has been updated",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      logToConsole(`Config error: ${(error as Error).message}`, 'error');
      
      toast({
        title: "Configuration Error",
        description: (error as Error).message,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendCommand = async (command: string) => {
    if (!command.trim()) return false;
    
    if (!status.connected) {
      logToConsole('Cannot send command: Bot is not connected', 'error');
      return false;
    }
    
    return sendAction({
      type: 'command',
      command: command
    });
  };
  
  const moveBot = (direction: string) => {
    return sendAction({
      type: 'move',
      direction
    });
  };
  
  const stopBot = () => {
    return sendAction({
      type: 'stop'
    });
  };
  
  const attackAction = () => {
    return sendAction({
      type: 'attack'
    });
  };
  
  const useAction = () => {
    return sendAction({
      type: 'use'
    });
  };
  
  const jumpAction = () => {
    return sendAction({
      type: 'jump'
    });
  };
  
  const sneakAction = () => {
    return sendAction({
      type: 'sneak'
    });
  };
  
  const logToConsole = useCallback((message: string, type: ConsoleMessage['type'] = 'info') => {
    setConsoleMessages(prev => [
      ...prev,
      {
        message,
        type,
        timestamp: new Date()
      }
    ]);
  }, []);
  
  const clearConsole = useCallback(() => {
    setConsoleMessages([
      {
        message: 'Console cleared',
        type: 'system',
        timestamp: new Date()
      }
    ]);
  }, []);
  
  return {
    config,
    status,
    isLoading,
    consoleMessages,
    connectBot,
    disconnectBot,
    saveConfig,
    sendCommand,
    moveBot,
    stopBot,
    attackAction,
    useAction,
    jumpAction,
    sneakAction,
    logToConsole,
    clearConsole
  };
};
