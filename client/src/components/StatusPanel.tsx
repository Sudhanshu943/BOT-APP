import React from 'react';
import { PixelBorder, MinecraftScrollbar } from './MinecraftTheme';
import { BotStatus, InventoryItem, NearbyEntity } from '@/lib/types';
import { InfoIcon } from 'lucide-react';

interface StatusPanelProps {
  status: BotStatus;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ status }) => {
  return (
    <div className="col-span-1 bg-[#4A4A4A] rounded-lg p-4">
      <PixelBorder className="rounded-lg p-4 bg-[#4A4A4A]">
        <h2 className="font-['VT323',_monospace] text-xl text-white border-b-2 border-[#5C3C24] pb-2 mb-4">
          <InfoIcon className="inline mr-2 h-5 w-5" /> Bot Status
        </h2>
        
        <div className="space-y-4">
          <div className="bg-[#272727] p-3 rounded grid grid-cols-2 gap-2">
            <div className="text-sm">
              <span className="text-gray-400">Position:</span>
              <span className="ml-1">
                X: {status.position.x}, Y: {status.position.y}, Z: {status.position.z}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Health:</span>
              <span className="ml-1">{status.health}/20</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Food:</span>
              <span className="ml-1">{status.food}/20</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Dimension:</span>
              <span className="ml-1">{status.dimension}</span>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider text-gray-400 mb-2">Bot Inventory</h3>
            <div className="grid grid-cols-9 gap-1">
              {status.inventory.length === 0 ? (
                <div className="col-span-9 text-center text-sm text-gray-500 py-2">
                  No items in inventory
                </div>
              ) : (
                status.inventory.map((item, idx) => (
                  <InventorySlot key={idx} item={item} />
                ))
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider text-gray-400 mb-2">Nearby Entities</h3>
            <MinecraftScrollbar className="bg-[#272727] rounded h-[100px] overflow-y-auto p-2 text-sm">
              {status.nearbyEntities.length === 0 ? (
                <div className="text-center text-gray-500 py-2">
                  No entities nearby
                </div>
              ) : (
                status.nearbyEntities.map((entity, idx) => (
                  <EntityItem key={idx} entity={entity} />
                ))
              )}
            </MinecraftScrollbar>
          </div>
        </div>
      </PixelBorder>
    </div>
  );
};

interface InventorySlotProps {
  item: InventoryItem;
}

const InventorySlot: React.FC<InventorySlotProps> = ({ item }) => {
  return (
    <div 
      className="w-full aspect-square bg-[#272727] border border-[#5C3C24] rounded flex items-center justify-center relative"
      title={`${item.name} (${item.count})`}
    >
      <div className="text-xs font-bold text-center">{item.name.slice(0, 1)}</div>
      {item.count > 1 && (
        <div className="absolute bottom-0 right-0 text-xs bg-[#272727]/80 px-1 rounded-tl">
          {item.count}
        </div>
      )}
    </div>
  );
};

interface EntityItemProps {
  entity: NearbyEntity;
}

const EntityItem: React.FC<EntityItemProps> = ({ entity }) => {
  return (
    <div className="flex justify-between items-center mb-1">
      <span>{entity.name}</span>
      <span className="text-xs text-gray-400">{entity.distance} blocks</span>
    </div>
  );
};

export default StatusPanel;
