import * as SQLite from 'expo-sqlite';
import { startOfDay, endOfDay } from 'date-fns';
import { Habit, HabitLog, Todo } from '../types';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Ensure DB is initialized and return the instance
const ensureDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Use local variable for initialization
      const _db = await SQLite.openDatabaseAsync('myplan.db');
      
      // Setup tables
      await _db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        goal TEXT,
        frequency TEXT NOT NULL,
        reminderTime TEXT,
        createdAt TEXT NOT NULL,
        archived INTEGER DEFAULT 0,
        targetValue REAL DEFAULT 1,
        unit TEXT,
        category TEXT,
        color TEXT,
        frequencyDays TEXT,
        notificationIds TEXT
        );
        CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY NOT NULL,
        habitId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        value REAL,
        note TEXT,
        imageUri TEXT,
        FOREIGN KEY (habitId) REFERENCES habits (id)
        );
        CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY NOT NULL,
        content TEXT NOT NULL,
        isCompleted INTEGER DEFAULT 0,
        dueDate TEXT,
        createdAt TEXT NOT NULL,
        reminderTime TEXT,
        note TEXT,
        relatedHabitId TEXT,
        category TEXT,
        notificationId TEXT,
        completedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS categories (
        name TEXT PRIMARY KEY NOT NULL
        );
      `);

      // Migration: Try to add columns if they don't exist
      const columnsToAdd = [
        'ALTER TABLE habits ADD COLUMN targetValue REAL DEFAULT 1',
        'ALTER TABLE habits ADD COLUMN unit TEXT',
        'ALTER TABLE habits ADD COLUMN category TEXT',
        'ALTER TABLE habits ADD COLUMN color TEXT',
        'ALTER TABLE habits ADD COLUMN frequencyDays TEXT',
        'ALTER TABLE habits ADD COLUMN notificationIds TEXT',
        'ALTER TABLE todos ADD COLUMN reminderTime TEXT',
        'ALTER TABLE todos ADD COLUMN note TEXT',
        'ALTER TABLE todos ADD COLUMN relatedHabitId TEXT',
        'ALTER TABLE todos ADD COLUMN category TEXT',
        'ALTER TABLE todos ADD COLUMN categories TEXT', // JSON string for multiple categories
        'ALTER TABLE todos ADD COLUMN notificationId TEXT',
        'ALTER TABLE todos ADD COLUMN completedAt TEXT',
        'ALTER TABLE habit_logs ADD COLUMN imageUri TEXT'
      ];

      for (const sql of columnsToAdd) {
        try {
          await _db.execAsync(sql);
        } catch (e) {
          // Ignore error if column already exists
        }
      }

      // Indexes to speed up common queries
      const indexesToCreate = [
        'CREATE INDEX IF NOT EXISTS idx_habit_logs_habitId ON habit_logs (habitId)',
        'CREATE INDEX IF NOT EXISTS idx_habit_logs_timestamp ON habit_logs (timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_todos_createdAt ON todos (createdAt)',
        'CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits (archived)'
      ];
      for (const idx of indexesToCreate) {
        try {
          await _db.execAsync(idx);
        } catch (e) {
        }
      }

      db = _db; // Assign to global only after success
      return _db;
    } catch (error) {
      console.error("Failed to init DB:", error);
      db = null; // Ensure null on failure
      throw error;
    } finally {
      initPromise = null; // Clear promise to allow retry
    }
  })();

  return initPromise;
};

// Explicit init function (can be called to force re-init)
export const initDB = async () => {
  // If we are already initialized, do nothing unless we want to force re-init?
  // Current usage in stores is just to ensure it's ready.
  await ensureDB();
};

const runWithRetry = async <T>(operation: (database: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> => {
  try {
    const database = await ensureDB();
    return await operation(database);
  } catch (error: any) {
    const errorStr = error?.toString() || '';
    const errorMsg = error?.message || '';
    // Check for NullPointerException or closed database errors common in hot reload
    if (errorStr.includes('NullPointerException') || errorMsg.includes('NullPointerException') || 
        errorStr.includes('database is closed') || errorMsg.includes('database is closed')) {
        console.warn('DB Error encountered (NullPtr/Closed), resetting and retrying...', error);
        
        // Force reset DB connection
        db = null;
        initPromise = null;
        
        // Wait a bit before retry to allow native resources to clear
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Retry once
        const database = await ensureDB();
        return await operation(database);
    }
    throw error;
  }
};

export const getHabits = async (): Promise<Habit[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM habits WHERE archived = 0');
    return result.map(row => ({
        ...row,
        archived: !!row.archived,
        frequencyDays: row.frequencyDays ? JSON.parse(row.frequencyDays) : undefined,
        notificationIds: row.notificationIds ? JSON.parse(row.notificationIds) : undefined,
    }));
  });
};

export const addHabit = async (habit: Habit) => {
  await runWithRetry(async (database) => {
    const { id, name, goal, frequency, reminderTime, createdAt, archived, targetValue, unit, category, color, frequencyDays, notificationIds } = habit;
    await database.runAsync(
        'INSERT INTO habits (id, name, goal, frequency, reminderTime, createdAt, archived, targetValue, unit, category, color, frequencyDays, notificationIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, goal, frequency, reminderTime || null, createdAt, archived ? 1 : 0, targetValue || 1, unit || null, category || null, color || null, frequencyDays ? JSON.stringify(frequencyDays) : null, notificationIds ? JSON.stringify(notificationIds) : null]
    );
  });
};

export const deleteHabit = async (id: string) => {
  await runWithRetry(async (database) => {
    await database.runAsync('UPDATE habits SET archived = 1 WHERE id = ?', [id]);
  });
};

export const updateHabit = async (habit: Habit) => {
  await runWithRetry(async (database) => {
    // Prepare fields
    const {
        id, name, goal, frequency, reminderTime, archived, targetValue, unit, category, color, frequencyDays, notificationIds
    } = habit;

    await database.runAsync(
        `UPDATE habits SET 
            name = ?, 
            goal = ?, 
            frequency = ?, 
            reminderTime = ?, 
            archived = ?, 
            targetValue = ?, 
            unit = ?, 
            category = ?, 
            color = ?, 
            frequencyDays = ?, 
            notificationIds = ?
         WHERE id = ?`,
        [
            name, 
            goal || null, 
            frequency, 
            reminderTime || null, 
            archived ? 1 : 0, 
            targetValue || 1, 
            unit || null, 
            category || null, 
            color || null, 
            frequencyDays ? JSON.stringify(frequencyDays) : null, 
            notificationIds ? JSON.stringify(notificationIds) : null,
            id
        ]
    );
  });
};

export const addHabitLog = async (log: HabitLog) => {
  await runWithRetry(async (database) => {
    const { id, habitId, timestamp, value, note, imageUri } = log;
    await database.runAsync(
        'INSERT INTO habit_logs (id, habitId, timestamp, value, note, imageUri) VALUES (?, ?, ?, ?, ?, ?)',
        [id, habitId, timestamp, value || null, note || null, imageUri || null]
    );
  });
};

export const updateHabitLog = async (log: HabitLog) => {
  await runWithRetry(async (database) => {
    const { id, value, note, imageUri } = log;
    await database.runAsync(
        'UPDATE habit_logs SET value = ?, note = ?, imageUri = ? WHERE id = ?',
        [value || null, note || null, imageUri || null, id]
    );
  });
};

export const deleteHabitLog = async (id: string) => {
  await runWithRetry(async (database) => {
    await database.runAsync('DELETE FROM habit_logs WHERE id = ?', [id]);
  });
};

export const getHabitLogs = async (habitId: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM habit_logs WHERE habitId = ? ORDER BY timestamp DESC', [habitId]);
    return result;
  });
};

export const getTodayLogs = async (): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const now = new Date();
    const start = startOfDay(now).toISOString();
    const end = endOfDay(now).toISOString();
    const result = await database.getAllAsync<any>('SELECT * FROM habit_logs WHERE timestamp >= ? AND timestamp <= ?', [start, end]);
    return result;
  });
};

export const getLogsForDate = async (dateISO: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const date = new Date(dateISO);
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();
    const result = await database.getAllAsync<any>('SELECT * FROM habit_logs WHERE timestamp >= ? AND timestamp <= ?', [start, end]);
    return result;
  });
};

export const getLogsForDateRange = async (startDateISO: string, endDateISO: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM habit_logs WHERE timestamp >= ? AND timestamp <= ?', [startDateISO, endDateISO]);
    return result;
  });
};

export const getLogsSince = async (dateISO: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM habit_logs WHERE timestamp >= ?', [dateISO]);
    return result;
  });
};

// Todo Operations
export const getTodos = async (): Promise<Todo[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM todos ORDER BY createdAt DESC');
    return result.map(row => ({
        ...row,
        isCompleted: !!row.isCompleted,
        categories: row.categories ? JSON.parse(row.categories) : (row.category ? [row.category] : []), // Fallback to category for migration
    }));
  });
};

export const addTodo = async (todo: Todo) => {
  await runWithRetry(async (database) => {
    const { id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, categories, notificationId, completedAt } = todo;
    await database.runAsync(
      'INSERT INTO todos (id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, categories, notificationId, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, content, isCompleted ? 1 : 0, dueDate || null, createdAt, reminderTime || null, note || null, relatedHabitId || null, category || null, categories ? JSON.stringify(categories) : null, notificationId || null, completedAt || null]
    );
  });
};

export const toggleTodo = async (id: string, isCompleted: boolean, completedAt?: string | null) => {
  await runWithRetry(async (database) => {
    await database.runAsync('UPDATE todos SET isCompleted = ?, completedAt = ? WHERE id = ?', [isCompleted ? 1 : 0, completedAt || null, id]);
  });
};

export const updateTodo = async (todo: Todo) => {
  await runWithRetry(async (database) => {
    const { id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, categories, notificationId, completedAt } = todo;
    await database.runAsync(
        'UPDATE todos SET content = ?, isCompleted = ?, dueDate = ?, createdAt = ?, reminderTime = ?, note = ?, relatedHabitId = ?, category = ?, categories = ?, notificationId = ?, completedAt = ? WHERE id = ?',
        [content, isCompleted ? 1 : 0, dueDate || null, createdAt, reminderTime || null, note || null, relatedHabitId || null, category || null, categories ? JSON.stringify(categories) : null, notificationId || null, completedAt || null, id]
    );
  });
};

export const deleteTodo = async (id: string) => {
  await runWithRetry(async (database) => {
    await database.runAsync('DELETE FROM todos WHERE id = ?', [id]);
  });
};

// Category Operations
export const getCategories = async (): Promise<string[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<{name: string}>('SELECT name FROM categories ORDER BY name ASC');
    return result.map(r => r.name);
  });
};

export const addCategory = async (category: string) => {
  await runWithRetry(async (database) => {
    try {
      await database.runAsync('INSERT INTO categories (name) VALUES (?)', [category]);
    } catch (e) {
      // Ignore duplicate errors
    }
  });
};


// Backup & Restore
export const getAllHabitsIncludingArchived = async (): Promise<Habit[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM habits');
    return result.map(row => ({
        ...row,
        archived: !!row.archived,
        frequencyDays: row.frequencyDays ? JSON.parse(row.frequencyDays) : undefined,
        notificationIds: row.notificationIds ? JSON.parse(row.notificationIds) : undefined,
    }));
  });
};

export const getAllLogs = async (): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM habit_logs');
    return result;
  });
};

export const getAllTodos = async (): Promise<Todo[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM todos');
    return result.map(row => ({
        ...row,
        isCompleted: !!row.isCompleted,
    }));
  });
};

export const restoreData = async (habits: Habit[], logs: HabitLog[], todos: Todo[] = []) => {
  await runWithRetry(async (database) => {
    await database.execAsync('BEGIN TRANSACTION');
    try {
      await database.execAsync('DELETE FROM habit_logs');
      await database.execAsync('DELETE FROM habits');
      await database.execAsync('DELETE FROM todos');

      for (const habit of habits) {
        await database.runAsync(
          'INSERT INTO habits (id, name, goal, frequency, reminderTime, createdAt, archived, targetValue, unit, category, color, frequencyDays, notificationIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [habit.id, habit.name, habit.goal, habit.frequency, habit.reminderTime || null, habit.createdAt, habit.archived ? 1 : 0, habit.targetValue || 1, habit.unit || null, habit.category || null, habit.color || null, habit.frequencyDays ? JSON.stringify(habit.frequencyDays) : null, habit.notificationIds ? JSON.stringify(habit.notificationIds) : null]
        );
      }

      for (const log of logs) {
        await database.runAsync(
          'INSERT INTO habit_logs (id, habitId, timestamp, value, note, imageUri) VALUES (?, ?, ?, ?, ?, ?)',
          [log.id, log.habitId, log.timestamp, log.value || null, log.note || null, log.imageUri || null]
        );
      }

      for (const todo of todos) {
        await database.runAsync(
          'INSERT INTO todos (id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, categories, notificationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [todo.id, todo.content, todo.isCompleted ? 1 : 0, todo.dueDate || null, todo.createdAt, todo.reminderTime || null, todo.note || null, todo.relatedHabitId || null, todo.category || null, todo.categories ? JSON.stringify(todo.categories) : null, todo.notificationId || null]
        );
      }

      await database.execAsync('COMMIT');
    } catch (error) {
      await database.execAsync('ROLLBACK');
      throw error;
    }
  });
};
