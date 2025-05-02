export interface MineBotConfig {
  serverAddress: string;
  serverPort: number;
  username: string;
  version: string;
  movementSpeed: number;
  antiDetectionLevel: 'minimal' | 'balanced' | 'careful' | 'paranoid';
  afkInterval: number;
  chatTemplate: string;
  antiAfkEnabled: boolean;
  autoRespawnEnabled: boolean;
  chatResponseEnabled: boolean;
}

export interface BotStatus {
  connected: boolean;
  position: { x: number; y: number; z: number };
  health: number;
  food: number;
  dimension: string;
  inventory: InventoryItem[];
  nearbyEntities: NearbyEntity[];
}

export interface InventoryItem {
  name: string;
  count: number;
  slot: number;
}

export interface NearbyEntity {
  name: string;
  distance: number;
  type: string;
}

export interface BotAction {
  type: 'move' | 'attack' | 'use' | 'jump' | 'sneak' | 'stop' | 'command';
  direction?: string;
  command?: string;
}

export interface ConsoleMessage {
  message: string;
  type: 'info' | 'error' | 'success' | 'warn' | 'system' | 'bot' | 'server';
  timestamp: Date;
}
