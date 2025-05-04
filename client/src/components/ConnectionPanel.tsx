import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PixelBorder } from './MinecraftTheme';
import { MineBotConfig } from '@/lib/types';
import { Plug, PowerOff } from 'lucide-react';

interface ConnectionPanelProps {
  config: MineBotConfig;
  isConnected: boolean;
  isLoading: boolean;
  onConnect: (config: Partial<MineBotConfig>) => Promise<boolean>;
  onDisconnect: () => Promise<boolean>;
  onConfigChange: (field: keyof MineBotConfig, value: any) => void;
}

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  config,
  isConnected,
  isLoading,
  onConnect,
  onDisconnect,
  onConfigChange
}) => {
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Connecting to server with config:", config);
    // Check if server address is provided
    if (!config.serverAddress || config.serverAddress.trim() === '') {
      toast({
        title: "Missing Information", 
        description: "Please enter a server address",
        variant: "destructive"
      });
      return;
    }
    
    // Check if username is provided
    if (!config.username || config.username.trim() === '') {
      toast({
        title: "Missing Information", 
        description: "Please enter a username",
        variant: "destructive"
      });
      return;
    }
    
    // Pass the current configuration when connecting
    await onConnect(config);
  };

  return (
    <div className="col-span-1 bg-[#4A4A4A] rounded-lg p-4">
      <PixelBorder className="rounded-lg p-4 bg-[#4A4A4A]">
        <h2 className="font-['VT323',_monospace] text-xl text-[#3D99F9] border-b-2 border-[#5C3C24] pb-2 mb-4">
          <Plug className="inline mr-2 h-5 w-5" /> Connection 
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium mb-1">Server Address</Label>
              <Input
                type="text"
                value={config.serverAddress}
                onChange={(e) => onConfigChange('serverAddress', e.target.value)}
                placeholder="mc.aternos.me"
                className="w-full bg-[#272727] border-2 border-[#5C3C24] rounded px-3 py-2 focus:border-[#5D9C42] focus:outline-none"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">Port</Label>
              <Input
                type="number"
                value={config.serverPort}
                onChange={(e) => onConfigChange('serverPort', parseInt(e.target.value, 10))}
                placeholder="25565"
                className="w-full bg-[#272727] border-2 border-[#5C3C24] rounded px-3 py-2 focus:border-[#5D9C42] focus:outline-none"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">Username</Label>
              <Input
                type="text"
                value={config.username}
                onChange={(e) => onConfigChange('username', e.target.value)}
                placeholder="Bot_Player"
                className="w-full bg-[#272727] border-2 border-[#5C3C24] rounded px-3 py-2 focus:border-[#5D9C42] focus:outline-none"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">Version</Label>
              <Select 
                value={config.version} 
                onValueChange={(value) => onConfigChange('version', value)}
              >
                <SelectTrigger className="w-full bg-[#272727] border-2 border-[#5C3C24] rounded focus:border-[#5D9C42] focus:outline-none">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.20.1">1.20.1</SelectItem>
                  <SelectItem value="1.19.4">1.19.4</SelectItem>
                  <SelectItem value="1.18.2">1.18.2</SelectItem>
                  <SelectItem value="1.17.1">1.17.1</SelectItem>
                  <SelectItem value="1.16.5">1.16.5</SelectItem>
                  <SelectItem value="1.12.2">1.12.2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-2 flex flex-col space-y-3">
              <Button
                type="submit"
                className="w-full bg-[#5D9C42] hover:bg-[#3B692A] text-white font-medium py-2 px-4 rounded transition duration-200 flex items-center justify-center"
                disabled={isConnected || isLoading}
              >
                <Plug className="mr-2 h-4 w-4" /> Connect
              </Button>
              
              <Button
                type="button"
                onClick={onDisconnect}
                className="w-full bg-[#ED3209] hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition duration-200 flex items-center justify-center"
                disabled={!isConnected || isLoading}
              >
                <PowerOff className="mr-2 h-4 w-4" /> Disconnect
              </Button>
            </div>
          </div>
        </form>
      </PixelBorder>
    </div>
  );
};

export default ConnectionPanel;
