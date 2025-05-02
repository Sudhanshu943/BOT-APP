import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PixelBorder } from './MinecraftTheme';
import { MineBotConfig } from '@/lib/types';
import { SlidersHorizontal, Save } from 'lucide-react';

interface BotConfigPanelProps {
  config: MineBotConfig;
  onSaveConfig: (config: Partial<MineBotConfig>) => Promise<boolean>;
  onConfigChange: (field: keyof MineBotConfig, value: any) => void;
  disabled: boolean;
}

const BotConfigPanel: React.FC<BotConfigPanelProps> = ({
  config,
  onSaveConfig,
  onConfigChange,
  disabled
}) => {
  const handleSave = async () => {
    await onSaveConfig(config);
  };
  
  const handleAfkIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 10 && value <= 300) {
      onConfigChange('afkInterval', value);
    }
  };

  return (
    <div className="col-span-1 bg-[#4A4A4A] rounded-lg p-4">
      <PixelBorder className="rounded-lg p-4 bg-[#4A4A4A]">
        <h2 className="font-['VT323',_monospace] text-xl text-[#ED3209] border-b-2 border-[#5C3C24] pb-2 mb-4">
          <SlidersHorizontal className="inline mr-2 h-5 w-5" /> Bot Configuration
        </h2>
        
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-1">Movement Speed</Label>
            <Slider
              onValueChange={(value) => onConfigChange('movementSpeed', value[0])}
              value={[config.movementSpeed]}
              min={1}
              max={5}
              step={1}
              disabled={disabled}
              className="w-full h-2 bg-[#272727] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>
          
          <div>
            <Label className="block text-sm font-medium mb-1">Anti-Detection Level</Label>
            <Select
              value={config.antiDetectionLevel}
              onValueChange={(value: any) => onConfigChange('antiDetectionLevel', value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-full bg-[#272727] border-2 border-[#5C3C24] rounded px-3 py-2 focus:border-[#5D9C42] focus:outline-none">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal (Fast Actions)</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="careful">Careful (Humanlike)</SelectItem>
                <SelectItem value="paranoid">Paranoid (Very Slow)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-sm font-medium mb-1">AFK Action Interval (seconds)</Label>
            <Input
              type="number"
              value={config.afkInterval}
              onChange={handleAfkIntervalChange}
              min={10}
              max={300}
              step={5}
              disabled={disabled}
              className="w-full bg-[#272727] border-2 border-[#5C3C24] rounded px-3 py-2 focus:border-[#5D9C42] focus:outline-none"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium mb-1">Chat Response Template</Label>
            <Textarea
              value={config.chatTemplate}
              onChange={(e) => onConfigChange('chatTemplate', e.target.value)}
              rows={3}
              placeholder="Hi {player}, I'm a bot!"
              disabled={disabled}
              className="w-full bg-[#272727] border-2 border-[#5C3C24] rounded px-3 py-2 focus:border-[#5D9C42] focus:outline-none"
            />
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="antiAfkEnabled" className="font-medium">Enable Anti-AFK Mode</Label>
              <Switch
                id="antiAfkEnabled"
                checked={config.antiAfkEnabled}
                onCheckedChange={(checked: boolean) => onConfigChange('antiAfkEnabled', checked)}
                disabled={disabled}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="autoRespawnEnabled" className="font-medium">Auto Respawn</Label>
              <Switch
                id="autoRespawnEnabled"
                checked={config.autoRespawnEnabled}
                onCheckedChange={(checked: boolean) => onConfigChange('autoRespawnEnabled', checked)}
                disabled={disabled}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="chatResponseEnabled" className="font-medium">Auto Reply to Chat</Label>
              <Switch
                id="chatResponseEnabled"
                checked={config.chatResponseEnabled}
                onCheckedChange={(checked: boolean) => onConfigChange('chatResponseEnabled', checked)}
                disabled={disabled}
              />
            </div>
            
            <div className="pt-3">
              <Button
                onClick={handleSave}
                className="w-full bg-[#FCDC5F] hover:bg-yellow-600 text-black font-medium py-2 px-4 rounded transition duration-200 flex items-center justify-center"
                disabled={disabled}
              >
                <Save className="h-4 w-4 mr-2" /> Save Configuration
              </Button>
            </div>
          </div>
        </div>
      </PixelBorder>
    </div>
  );
};

export default BotConfigPanel;
