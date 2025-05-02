import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import ConnectionPanel from './ConnectionPanel';
import ConsoleOutput from './ConsoleOutput';
import ControlsPanel from './ControlsPanel';
import BotConfigPanel from './BotConfigPanel';
import StatusPanel from './StatusPanel';
import { useMineBot } from '@/hooks/useMineBot';
import { MineBotConfig } from '@/lib/types';
import { Bot, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const MineBuddyApp: React.FC = () => {
  const {
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
    clearConsole
  } = useMineBot();
  
  const [localConfig, setLocalConfig] = useState<MineBotConfig>(config);
  const { theme, setTheme } = useTheme();
  
  const handleConfigChange = (field: keyof MineBotConfig, value: any) => {
    setLocalConfig((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveConfig = async () => {
    return await saveConfig(localConfig);
  };
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#272727] text-gray-200 font-sans">
      {/* Header Section */}
      <header className="bg-[#4A4A4A] border-b-4 border-[#828282]">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-[#5D9C42] rounded flex items-center justify-center">
              <Bot className="text-white text-xl" />
            </div>
            <h1 className="font-['VT323',_monospace] text-2xl md:text-3xl text-[#5D9C42]">MineBuddy</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center">
              <span className="px-2 py-1 rounded bg-[#5C3C24] text-sm">Status:</span>
              <span className="ml-2 flex items-center">
                <span className={`h-3 w-3 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'} inline-block mr-2`}></span>
                <span>{status.connected ? 'Connected' : 'Disconnected'}</span>
              </span>
            </div>
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="p-2 rounded hover:bg-[#5C3C24] transition"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ConnectionPanel
          config={localConfig}
          isConnected={status.connected}
          isLoading={isLoading}
          onConnect={connectBot}
          onDisconnect={disconnectBot}
          onConfigChange={handleConfigChange}
        />
        
        <ConsoleOutput
          messages={consoleMessages}
          onSendCommand={sendCommand}
          onClearConsole={clearConsole}
          disabled={!status.connected}
        />
        
        <ControlsPanel
          onMove={moveBot}
          onStop={stopBot}
          onAttack={attackAction}
          onUse={useAction}
          onJump={jumpAction}
          onSneak={sneakAction}
          disabled={!status.connected}
        />
        
        <BotConfigPanel
          config={localConfig}
          onSaveConfig={handleSaveConfig}
          onConfigChange={handleConfigChange}
          disabled={isLoading}
        />
        
        <StatusPanel status={status} />
      </main>
      
      {/* Footer */}
      <footer className="bg-[#4A4A4A] border-t-4 border-[#828282] mt-6">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400 mb-2 md:mb-0">
              <p>MineBuddy Bot Controller | Not affiliated with Mojang or Aternos</p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#5D9C42] transition">
                <span className="flex items-center">
                  <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </span>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#5D9C42] transition">
                <span className="flex items-center">
                  <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 1v18h-12v-2h10v-14h-20v14h10v2h-12v-18h24zm-10 10.8c0 1.16-.94 2.1-2.1 2.1s-2.1-.94-2.1-2.1.94-2.1 2.1-2.1 2.1.94 2.1 2.1zm-4.2 0c0 1.16-.94 2.1-2.1 2.1s-2.1-.94-2.1-2.1.94-2.1 2.1-2.1 2.1.94 2.1 2.1zm-4.2 0c0 1.16-.94 2.1-2.1 2.1s-2.1-.94-2.1-2.1.94-2.1 2.1-2.1 2.1.94 2.1 2.1z"/>
                  </svg>
                  Documentation
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MineBuddyApp;
