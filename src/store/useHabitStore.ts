import { create } from 'zustand';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Habit, HabitLog } from '../types';
import * as DB from '../db';
import * as NotificationService from '../services/notification';

interface HabitState {
  habits: Habit[];
  todayLogs: HabitLog[];
  selectedDateLogs: HabitLog[]; // Logs for the currently selected date in Schedule view
  monthlyLogs: HabitLog[]; // Logs for the currently displayed month in Schedule view
  loadedMonth: string | null; // Track which month is loaded in monthlyLogs (ISO string)
  currentHabitLogs: HabitLog[]; // Logs for a specific habit (detail view)
  loading: boolean;
  habitsLoaded: boolean;
  fetchHabits: (force?: boolean) => Promise<void>;
  fetchLogsForDate: (dateISO: string) => Promise<void>;
  fetchLogsForMonth: (dateISO: string, force?: boolean) => Promise<void>;
  fetchHabitLogs: (habitId: string) => Promise<void>;
  createHabit: (name: string, goal?: string, targetValue?: number, category?: string, frequency?: 'daily' | 'weekly' | 'specific_days', frequencyDays?: number[], reminderTime?: string) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  logHabit: (habitId: string, value?: number, note?: string, dateISO?: string, imageUri?: string) => Promise<void>;
  updateLog: (log: HabitLog) => Promise<void>;
  deleteLog: (id: string, habitId: string) => Promise<void>;
  updateHabit: (habit: Partial<Habit> & { id: string }) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayLogs: [],
  selectedDateLogs: [],
  monthlyLogs: [],
  loadedMonth: null,
  currentHabitLogs: [],
  loading: false,
  habitsLoaded: false,

  fetchHabits: async (force = false) => {
    if (get().habitsLoaded && !force) return;
    set({ loading: true });
    try {
      await DB.initDB();
      const habits = await DB.getHabits();
      const todayLogs = await DB.getTodayLogs();
      set({ habits, todayLogs, loading: false, habitsLoaded: true });
    } catch (error) {
      console.error('Failed to fetch habits:', error);
      set({ loading: false });
    }
  },

  fetchLogsForDate: async (dateISO: string) => {
    // No loading state here to avoid flickering entire UI, or use a separate one if needed
    try {
      const logs = await DB.getLogsForDate(dateISO);
      set({ selectedDateLogs: logs });
    } catch (error) {
      console.error('Failed to fetch logs for date:', error);
    }
  },

  fetchLogsForMonth: async (dateISO: string, force = false) => {
    try {
        const date = new Date(dateISO);
        const start = startOfMonth(date).toISOString();
        // Check if we already have this month loaded
        // We only compare YYYY-MM
        const currentLoaded = get().loadedMonth;
        if (currentLoaded && !force) {
            const loadedDate = new Date(currentLoaded);
            if (loadedDate.getFullYear() === date.getFullYear() && loadedDate.getMonth() === date.getMonth()) {
                return;
            }
        }

        const end = endOfMonth(date).toISOString();
        const logs = await DB.getLogsForDateRange(start, end);
        set({ monthlyLogs: logs, loadedMonth: dateISO });
    } catch (error) {
        console.error('Failed to fetch logs for month:', error);
    }
  },

  fetchHabitLogs: async (habitId: string) => {
    try {
      const logs = await DB.getHabitLogs(habitId);
      set({ currentHabitLogs: logs });
    } catch (error) {
      console.error('Failed to fetch habit logs:', error);
    }
  },

  createHabit: async (name, goal, targetValue, category, frequency = 'daily', frequencyDays, reminderTime) => {
    const id = Date.now().toString();
    let notificationIds: string[] = [];

    if (reminderTime) {
      const date = new Date(reminderTime);
      const hour = date.getHours();
      const minute = date.getMinutes();
      
      if (frequency === 'daily') {
        const nid = await NotificationService.scheduleRepeatingNotification(
          '习惯提醒',
          `该打卡了: ${name}`,
          hour,
          minute
        );
        if (nid) notificationIds.push(nid);
      } else if (frequency === 'specific_days' && frequencyDays) {
        for (const day of frequencyDays) {
          const nid = await NotificationService.scheduleRepeatingNotification(
            '习惯提醒',
            `该打卡了: ${name}`,
            hour,
            minute,
            day
          );
          if (nid) notificationIds.push(nid);
        }
      }
    }

    const newHabit: Habit = {
      id,
      name,
      goal: goal || '',
      frequency,
      frequencyDays,
      reminderTime,
      notificationIds,
      createdAt: new Date().toISOString(),
      archived: false,
      targetValue: targetValue || 1,
      category,
    };
    await DB.addHabit(newHabit);
    await get().fetchHabits(true);
  },

  archiveHabit: async (id: string) => {
    const habit = get().habits.find(h => h.id === id);
    if (habit?.notificationIds) {
        for (const nid of habit.notificationIds) {
            await NotificationService.cancelNotification(nid);
        }
    }
    await DB.deleteHabit(id);
    await get().fetchHabits(true);
  },

  logHabit: async (habitId: string, value: number = 1, note?: string, dateISO?: string, imageUri?: string) => {
    const timestamp = dateISO || new Date().toISOString();
    const newLog: HabitLog = {
      id: Date.now().toString(),
      habitId,
      timestamp,
      value,
      note,
      imageUri,
    };
    await DB.addHabitLog(newLog);

    const monthISO = dateISO || new Date().toISOString();
    await Promise.all([
      get().fetchHabitLogs(habitId),
      get().fetchLogsForMonth(monthISO, true),
      dateISO ? get().fetchLogsForDate(dateISO) : Promise.resolve(),
      get().fetchHabits(true),
    ]);
  },

  updateLog: async (log: HabitLog) => {
    await DB.updateHabitLog(log);
    await Promise.all([
      get().fetchHabits(true),
      get().fetchHabitLogs(log.habitId),
      get().fetchLogsForMonth(log.timestamp, true),
      get().fetchLogsForDate(log.timestamp),
    ]);
  },

  deleteLog: async (id: string, habitId: string) => {
    await DB.deleteHabitLog(id);
    await Promise.all([
      get().fetchHabits(true),
      get().fetchHabitLogs(habitId),
      get().fetchLogsForMonth(new Date().toISOString(), true),
    ]);
  },

  updateHabit: async (habitChanges) => {
    const { habits } = get();
    const existingHabit = habits.find(h => h.id === habitChanges.id);
    if (!existingHabit) return;

    const updatedHabit = { ...existingHabit, ...habitChanges };
    
    // Handle Notification Logic if reminderTime changed
    if (habitChanges.reminderTime !== undefined && habitChanges.reminderTime !== existingHabit.reminderTime) {
        // Cancel old notifications
        if (existingHabit.notificationIds) {
            for (const nid of existingHabit.notificationIds) {
                await NotificationService.cancelNotification(nid);
            }
        }
        
        updatedHabit.notificationIds = [];

        // Schedule new if reminderTime is set
        if (updatedHabit.reminderTime) {
             const date = new Date(updatedHabit.reminderTime);
             const hour = date.getHours();
             const minute = date.getMinutes();
             
             if (updatedHabit.frequency === 'daily') {
                 const nid = await NotificationService.scheduleRepeatingNotification(
                     '习惯提醒',
                     `该打卡了: ${updatedHabit.name}`,
                     hour,
                     minute
                 );
                 if (nid) updatedHabit.notificationIds.push(nid);
             } else if (updatedHabit.frequency === 'specific_days' && updatedHabit.frequencyDays) {
                 for (const day of updatedHabit.frequencyDays) {
                     const nid = await NotificationService.scheduleRepeatingNotification(
                         '习惯提醒',
                         `该打卡了: ${updatedHabit.name}`,
                         hour,
                         minute,
                         day
                     );
                     if (nid) updatedHabit.notificationIds.push(nid);
                 }
             }
        }
    }

    await DB.updateHabit(updatedHabit);
    
    set({
        habits: habits.map(h => h.id === updatedHabit.id ? updatedHabit : h)
    });
  },
}));
