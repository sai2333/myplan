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
        completedAt TEXT,
        categories TEXT,
        autoPostpone INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS categories (
        name TEXT PRIMARY KEY NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
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
        'ALTER TABLE todos ADD COLUMN autoPostpone INTEGER DEFAULT 0',
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
        [name, goal, frequency, reminderTime || null, archived ? 1 : 0, targetValue || 1, unit || null, category || null, color || null, frequencyDays ? JSON.stringify(frequencyDays) : null, notificationIds ? JSON.stringify(notificationIds) : null, id]
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

export const getHabitLogs = async (habitId: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<HabitLog>('SELECT * FROM habit_logs WHERE habitId = ? ORDER BY timestamp DESC', [habitId]);
    return result;
  });
};

export const getTodayLogs = async (): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const todayStart = new Date().toISOString().split('T')[0] + '%';
    const result = await database.getAllAsync<HabitLog>('SELECT * FROM habit_logs WHERE timestamp LIKE ?', [todayStart]);
    return result;
  });
};

export const getLogsForDate = async (dateISO: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const dateStart = dateISO.split('T')[0] + '%';
    const result = await database.getAllAsync<HabitLog>('SELECT * FROM habit_logs WHERE timestamp LIKE ?', [dateStart]);
    return result;
  });
};

export const getLogsSince = async (dateISO: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<HabitLog>('SELECT * FROM habit_logs WHERE timestamp >= ?', [dateISO]);
    return result;
  });
};

export const getLogsForDateRange = async (startDateISO: string, endDateISO: string): Promise<HabitLog[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<HabitLog>(
      'SELECT * FROM habit_logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC',
      [startDateISO, endDateISO]
    );
    return result;
  });
};

export const getTodos = async (): Promise<Todo[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM todos ORDER BY createdAt DESC');
    return result.map(row => ({
      ...row,
      isCompleted: !!row.isCompleted,
      autoPostpone: !!row.autoPostpone,
      categories: row.categories ? JSON.parse(row.categories) : (row.category ? [row.category] : [])
    }));
  });
};

export const addTodo = async (todo: Todo) => {
  await runWithRetry(async (database) => {
    const { id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, notificationId, completedAt, categories, autoPostpone } = todo;
    await database.runAsync(
      'INSERT INTO todos (id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, notificationId, completedAt, categories, autoPostpone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, content, isCompleted ? 1 : 0, dueDate || null, createdAt, reminderTime || null, note || null, relatedHabitId || null, category || null, notificationId || null, completedAt || null, categories ? JSON.stringify(categories) : null, autoPostpone ? 1 : 0]
    );
  });
};

export const toggleTodo = async (id: string, isCompleted: boolean, completedAt: string | null = null) => {
  await runWithRetry(async (database) => {
    await database.runAsync('UPDATE todos SET isCompleted = ?, completedAt = ? WHERE id = ?', [isCompleted ? 1 : 0, completedAt, id]);
  });
};

export const updateTodo = async (todo: Todo) => {
  await runWithRetry(async (database) => {
    const { id, content, isCompleted, dueDate, reminderTime, note, relatedHabitId, category, notificationId, completedAt, categories, autoPostpone } = todo;
    await database.runAsync(
      `UPDATE todos SET 
        content = ?, 
        isCompleted = ?, 
        dueDate = ?, 
        reminderTime = ?, 
        note = ?, 
        relatedHabitId = ?, 
        category = ?, 
        notificationId = ?, 
        completedAt = ?, 
        categories = ?,
        autoPostpone = ?
      WHERE id = ?`,
      [content, isCompleted ? 1 : 0, dueDate || null, reminderTime || null, note || null, relatedHabitId || null, category || null, notificationId || null, completedAt || null, categories ? JSON.stringify(categories) : null, autoPostpone ? 1 : 0, id]
    );
  });
};

export const deleteTodo = async (id: string) => {
  await runWithRetry(async (database) => {
    await database.runAsync('DELETE FROM todos WHERE id = ?', [id]);
  });
};

export const getCategories = async (): Promise<string[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT name FROM categories');
    return result.map(row => row.name);
  });
};

export const addCategory = async (category: string) => {
  await runWithRetry(async (database) => {
    await database.runAsync('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
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
    return await database.getAllAsync<HabitLog>('SELECT * FROM habit_logs');
  });
};

export const getAllTodos = async (): Promise<Todo[]> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT * FROM todos');
    return result.map(row => ({
      ...row,
      isCompleted: !!row.isCompleted,
      autoPostpone: !!row.autoPostpone,
      categories: row.categories ? JSON.parse(row.categories) : (row.category ? [row.category] : [])
    }));
  });
};

export const restoreData = async (habits: Habit[], logs: HabitLog[], todos: Todo[], categories: string[] = []) => {
  await runWithRetry(async (database) => {
    await database.runAsync('DELETE FROM habits');
    await database.runAsync('DELETE FROM habit_logs');
    await database.runAsync('DELETE FROM todos');
    await database.runAsync('DELETE FROM categories');
    
    // We should ideally use transactions or batch inserts here, but simple loop is safer for now
    for (const habit of habits) {
       // reuse add logic but with raw sql to include ID
       const { id, name, goal, frequency, reminderTime, createdAt, archived, targetValue, unit, category, color, frequencyDays, notificationIds } = habit;
       await database.runAsync(
        'INSERT INTO habits (id, name, goal, frequency, reminderTime, createdAt, archived, targetValue, unit, category, color, frequencyDays, notificationIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, goal, frequency, reminderTime || null, createdAt, archived ? 1 : 0, targetValue || 1, unit || null, category || null, color || null, frequencyDays ? JSON.stringify(frequencyDays) : null, notificationIds ? JSON.stringify(notificationIds) : null]
      );
    }
    
    for (const log of logs) {
       const { id, habitId, timestamp, value, note, imageUri } = log;
       await database.runAsync(
        'INSERT INTO habit_logs (id, habitId, timestamp, value, note, imageUri) VALUES (?, ?, ?, ?, ?, ?)',
        [id, habitId, timestamp, value || null, note || null, imageUri || null]
      );
    }
    
    for (const todo of todos) {
       const { id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, notificationId, completedAt, categories, autoPostpone } = todo;
       await database.runAsync(
        'INSERT INTO todos (id, content, isCompleted, dueDate, createdAt, reminderTime, note, relatedHabitId, category, notificationId, completedAt, categories, autoPostpone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, content, isCompleted ? 1 : 0, dueDate || null, createdAt, reminderTime || null, note || null, relatedHabitId || null, category || null, notificationId || null, completedAt || null, categories ? JSON.stringify(categories) : null, autoPostpone ? 1 : 0]
      );
    }

    for (const category of categories) {
        await database.runAsync('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
    }
  });
};

export const getWidgetTheme = async (): Promise<'light' | 'dark'> => {
  return runWithRetry(async (database) => {
    const result = await database.getAllAsync<any>('SELECT value FROM settings WHERE key = ?', ['widget_theme']);
    if (result && result.length > 0) {
      return result[0].value as 'light' | 'dark';
    }
    return 'light'; // default
  });
};

export const setWidgetTheme = async (theme: 'light' | 'dark') => {
  await runWithRetry(async (database) => {
    await database.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['widget_theme', theme]
    );
  });
};
