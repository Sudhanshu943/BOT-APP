import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const botConfig = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  serverAddress: text("server_address").notNull(),
  serverPort: integer("server_port").notNull().default(25565),
  username: text("username").notNull(),
  version: text("version").notNull(),
  movementSpeed: integer("movement_speed").notNull().default(3),
  antiDetectionLevel: text("anti_detection_level").notNull().default("balanced"),
  afkInterval: integer("afk_interval").notNull().default(30),
  chatTemplate: text("chat_template"),
  antiAfkEnabled: boolean("anti_afk_enabled").notNull().default(false),
  autoRespawnEnabled: boolean("auto_respawn_enabled").notNull().default(false),
  chatResponseEnabled: boolean("chat_response_enabled").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBotConfigSchema = createInsertSchema(botConfig).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;

// Bot status types
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
