import { int } from "drizzle-orm/mysql-core";
import { pgTable, timestamp, uuid, text, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: text("name").notNull().unique(),
});

export const feeds = pgTable("feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(()=> users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
})

export const feedFollows = pgTable("feed_follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),

  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  feedId: uuid("feed_id").references(() => feeds.id, { onDelete: "cascade" }).notNull()
}, (t) => ({unq: unique().on(t.userId, t.feedId)}))