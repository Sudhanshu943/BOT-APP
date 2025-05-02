import React from 'react';

// Utility components for Minecraft-like styling

export const PixelBorder: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`shadow-[inset_-2px_-2px_0_0_#272727,inset_2px_2px_0_0_#828282] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const MinecraftScrollbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`scrollbar-w-3 scrollbar scrollbar-track-[#272727] scrollbar-track-rounded scrollbar-track-border-2 scrollbar-track-border-[#4A4A4A] scrollbar-thumb-[#5C3C24] scrollbar-thumb-rounded scrollbar-thumb-border-2 scrollbar-thumb-border-[#825432] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Minecraft color classes mapped to Tailwind CSS
export const minecraftColors = {
  // Background colors
  green: 'bg-[#5D9C42]',
  darkgreen: 'bg-[#3B692A]',
  brown: 'bg-[#825432]',
  darkbrown: 'bg-[#5C3C24]',
  stone: 'bg-[#828282]',
  darkstone: 'bg-[#4A4A4A]',
  bedrock: 'bg-[#272727]',
  redstone: 'bg-[#ED3209]',
  water: 'bg-[#3D99F9]',
  gold: 'bg-[#FCDC5F]',
  blue: 'bg-[#3D5AFC]',
  
  // Text colors
  textGreen: 'text-[#5D9C42]',
  textDarkgreen: 'text-[#3B692A]',
  textBrown: 'text-[#825432]',
  textDarkbrown: 'text-[#5C3C24]',
  textStone: 'text-[#828282]',
  textDarkstone: 'text-[#4A4A4A]',
  textBedrock: 'text-[#272727]',
  textRedstone: 'text-[#ED3209]',
  textWater: 'text-[#3D99F9]',
  textGold: 'text-[#FCDC5F]',
  textBlue: 'text-[#3D5AFC]',
  
  // Border colors
  borderGreen: 'border-[#5D9C42]',
  borderDarkgreen: 'border-[#3B692A]',
  borderBrown: 'border-[#825432]',
  borderDarkbrown: 'border-[#5C3C24]',
  borderStone: 'border-[#828282]',
  borderDarkstone: 'border-[#4A4A4A]',
  borderBedrock: 'border-[#272727]',
  borderRedstone: 'border-[#ED3209]',
  borderWater: 'border-[#3D99F9]',
  borderGold: 'border-[#FCDC5F]',
  borderBlue: 'border-[#3D5AFC]',
};

export const ConsoleText: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { type?: string }
> = ({ className = '', type = 'info', children, ...props }) => {
  const typeToColorClass = {
    error: 'text-red-400',
    success: 'text-green-400',
    warn: 'text-yellow-400',
    system: 'text-gray-500',
    bot: 'text-[#5D9C42]',
    server: 'text-[#3D99F9]',
    info: 'text-gray-300',
  };
  
  const colorClass = typeToColorClass[type as keyof typeof typeToColorClass] || 'text-gray-300';
  
  return (
    <div className={`font-['VT323',_monospace] leading-tight ${colorClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
