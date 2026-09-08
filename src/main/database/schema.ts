import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

/**
 * Tasks table
 * Stores user defined tasks / categories (e.g. Office, Learning, Personal Project)
 */
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').notNull(), // ISO-8601 string
  updatedAt: text('updated_at').notNull(), // ISO-8601 string
});

/**
 * Time Sessions table
 * Stores each individual tracking interval for a task
 */
export const timeSessions = sqliteTable('time_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // 'YYYY-MM-DD' user's local date
  startTime: integer('start_time').notNull(), // Unix timestamp (ms)
  endTime: integer('end_time'), // Unix timestamp (ms) or null when running
  duration: integer('duration').notNull().default(0), // Duration in seconds
  status: text('status', { enum: ['running', 'completed'] }).notNull(),
});

// Define Drizzle relations for seamless querying
export const tasksRelations = relations(tasks, ({ many }) => ({
  sessions: many(timeSessions),
}));

export const timeSessionsRelations = relations(timeSessions, ({ one }) => ({
  task: one(tasks, {
    fields: [timeSessions.taskId],
    references: [tasks.id],
  }),
}));

export type TaskSelect = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type TimeSessionSelect = typeof timeSessions.$inferSelect;
export type TimeSessionInsert = typeof timeSessions.$inferInsert;
