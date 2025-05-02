import { 
  users, 
  botConfig,
  type User, 
  type InsertUser,
  type BotConfig,
  type InsertBotConfig
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bot config methods
  getBotConfig(): Promise<BotConfig | undefined>;
  saveBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private botConfigs: Map<number, BotConfig>;
  userCurrentId: number;
  configCurrentId: number;

  constructor() {
    this.users = new Map();
    this.botConfigs = new Map();
    this.userCurrentId = 1;
    this.configCurrentId = 1;
    
    // Initialize with a default bot config
    const defaultConfig: BotConfig = {
      id: this.configCurrentId,
      serverAddress: "",
      serverPort: 25565,
      username: "MineBuddy_Bot",
      version: "1.20.1",
      movementSpeed: 3,
      antiDetectionLevel: "balanced",
      afkInterval: 30,
      chatTemplate: "Hi {player}, I'm a bot!",
      antiAfkEnabled: false,
      autoRespawnEnabled: true,
      chatResponseEnabled: false
    };
    
    this.botConfigs.set(this.configCurrentId, defaultConfig);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Bot config methods
  async getBotConfig(): Promise<BotConfig | undefined> {
    return this.botConfigs.get(1);
  }
  
  async saveBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    const existingConfig = await this.getBotConfig();
    
    if (existingConfig) {
      const updatedConfig: BotConfig = {
        ...existingConfig,
        ...config
      };
      this.botConfigs.set(existingConfig.id, updatedConfig);
      return updatedConfig;
    } else {
      const id = this.configCurrentId++;
      const newConfig: BotConfig = { ...config, id };
      this.botConfigs.set(id, newConfig);
      return newConfig;
    }
  }
  
  async updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig> {
    const existingConfig = await this.getBotConfig();
    
    if (!existingConfig) {
      throw new Error("No config exists to update");
    }
    
    const updatedConfig: BotConfig = {
      ...existingConfig,
      ...config
    };
    
    this.botConfigs.set(existingConfig.id, updatedConfig);
    return updatedConfig;
  }
}

export const storage = new MemStorage();
