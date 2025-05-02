import React, { useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PixelBorder, MinecraftScrollbar, ConsoleText } from './MinecraftTheme';
import { ConsoleMessage } from '@/lib/types';
import { Terminal, Trash, Send } from 'lucide-react';

interface ConsoleOutputProps {
  messages: ConsoleMessage[];
  onSendCommand: (command: string) => Promise<boolean>;
  onClearConsole: () => void;
  disabled: boolean;
}

const ConsoleOutput: React.FC<ConsoleOutputProps> = ({
  messages,
  onSendCommand,
  onClearConsole,
  disabled
}) => {
  const [command, setCommand] = React.useState('');
  const consoleRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    const success = await onSendCommand(command);
    if (success) {
      setCommand('');
    }
  };

  return (
    <div className="col-span-1 lg:col-span-2 bg-[#4A4A4A] rounded-lg flex flex-col h-[500px]">
      <PixelBorder className="rounded-lg flex flex-col h-full">
        <div className="flex items-center justify-between border-b-2 border-[#5C3C24] p-3">
          <h2 className="font-['VT323',_monospace] text-xl text-[#5D9C42]">
            <Terminal className="inline mr-2 h-5 w-5" /> Console Output
          </h2>
          <div>
            <Button 
              onClick={onClearConsole}
              variant="outline" 
              className="text-sm bg-[#5C3C24] hover:bg-[#825432] text-white border-none"
            >
              <Trash className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        </div>
        
        <MinecraftScrollbar
          ref={consoleRef}
          className="flex-grow overflow-y-auto p-3 bg-black/50 font-['VT323',_monospace] text-gray-300"
        >
          {messages.map((msg, idx) => (
            <ConsoleText key={idx} type={msg.type}>
              {msg.message}
            </ConsoleText>
          ))}
        </MinecraftScrollbar>
        
        <div className="border-t-2 border-[#5C3C24] p-3">
          <form onSubmit={handleSubmit} className="flex">
            <Input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Type a command..."
              className="flex-grow bg-[#272727] border-2 border-[#5C3C24] rounded-l px-3 py-2 focus:border-[#5D9C42] focus:outline-none"
              disabled={disabled}
            />
            <Button
              type="submit"
              className="bg-[#3D5AFC] hover:bg-blue-700 text-white px-4 py-2 rounded-r"
              disabled={disabled}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </PixelBorder>
    </div>
  );
};

export default ConsoleOutput;
