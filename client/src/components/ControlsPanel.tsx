import React from 'react';
import { Button } from "@/components/ui/button";
import { PixelBorder } from './MinecraftTheme';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, StopCircle, 
  Hand, MousePointer, ArrowUpToLine, ArrowDownToLine, 
  Gamepad2
} from 'lucide-react';

interface ControlsPanelProps {
  onMove: (direction: string) => Promise<boolean>;
  onStop: () => Promise<boolean>;
  onAttack: () => Promise<boolean>;
  onUse: () => Promise<boolean>;
  onJump: () => Promise<boolean>;
  onSneak: () => Promise<boolean>;
  disabled: boolean;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  onMove,
  onStop,
  onAttack,
  onUse,
  onJump,
  onSneak,
  disabled
}) => {
  return (
    <div className="col-span-1 bg-[#4A4A4A] rounded-lg p-4">
      <PixelBorder className="rounded-lg p-4 bg-[#4A4A4A]">
        <h2 className="font-['VT323',_monospace] text-xl text-[#FCDC5F] border-b-2 border-[#5C3C24] pb-2 mb-4">
          <Gamepad2 className="inline mr-2 h-5 w-5" /> Bot Controls
        </h2>
        
        <div className="space-y-6">
          {/* Movement Controls */}
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider text-gray-400 mb-2">Movement</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div></div>
              <Button
                onClick={() => onMove('forward')}
                className="bg-[#828282] hover:bg-[#4A4A4A] p-3 rounded transition"
                disabled={disabled}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <div></div>
              
              <Button
                onClick={() => onMove('left')}
                className="bg-[#828282] hover:bg-[#4A4A4A] p-3 rounded transition"
                disabled={disabled}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={onStop}
                className="bg-[#5C3C24] p-3 rounded"
                disabled={disabled}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => onMove('right')}
                className="bg-[#828282] hover:bg-[#4A4A4A] p-3 rounded transition"
                disabled={disabled}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <div></div>
              <Button
                onClick={() => onMove('backward')}
                className="bg-[#828282] hover:bg-[#4A4A4A] p-3 rounded transition"
                disabled={disabled}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <div></div>
            </div>
          </div>
          
          {/* Action Controls */}
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider text-gray-400 mb-2">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onAttack}
                className="bg-[#ED3209] hover:bg-red-700 text-white p-2 rounded flex items-center justify-center transition"
                disabled={disabled}
              >
                <Hand className="h-4 w-4 mr-2" /> Attack
              </Button>
              <Button
                onClick={onUse}
                className="bg-[#5D9C42] hover:bg-[#3B692A] text-white p-2 rounded flex items-center justify-center transition"
                disabled={disabled}
              >
                <MousePointer className="h-4 w-4 mr-2" /> Use
              </Button>
              <Button
                onClick={onJump}
                className="bg-[#3D99F9] hover:bg-blue-700 text-white p-2 rounded flex items-center justify-center transition"
                disabled={disabled}
              >
                <ArrowUpToLine className="h-4 w-4 mr-2" /> Jump
              </Button>
              <Button
                onClick={onSneak}
                className="bg-[#825432] hover:bg-[#5C3C24] text-white p-2 rounded flex items-center justify-center transition"
                disabled={disabled}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" /> Sneak
              </Button>
            </div>
          </div>
          
          {/* Auto Actions */}
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider text-gray-400 mb-2">Automation</h3>
            <div className="space-y-3">
              <AutoToggle
                label="Anti-AFK"
                value={disabled ? false : false} // Replace with actual state
                onChange={() => {}} // Replace with actual handler
                disabled={disabled}
              />
              
              <AutoToggle
                label="Auto Respawn"
                value={disabled ? false : true} // Replace with actual state
                onChange={() => {}} // Replace with actual handler
                disabled={disabled}
              />
              
              <AutoToggle
                label="Chat Response"
                value={disabled ? false : false} // Replace with actual state
                onChange={() => {}} // Replace with actual handler
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </PixelBorder>
    </div>
  );
};

interface AutoToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const AutoToggle: React.FC<AutoToggleProps> = ({
  label,
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center justify-between bg-[#272727] rounded-lg p-3">
      <span className="font-medium">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          disabled={disabled}
        />
        <div className={`w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer ${value ? 'peer-checked:after:translate-x-full peer-checked:bg-[#5D9C42]' : ''} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
      </label>
    </div>
  );
};

export default ControlsPanel;
