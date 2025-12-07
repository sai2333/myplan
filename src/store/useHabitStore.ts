import { create } from 'zustand';
import { InteractionManager } from 'react-native';
import { startOfMonth, endOfMonth, format } from 'date-fns';
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
  currentHabitDailyTotals: Record<string, { totalValue: number; count: number }>;
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
  clearCurrentHabitData: () => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayLogs: [],
  selectedDateLogs: [],
  monthlyLogs: [],
  loadedMonth: null,
  currentHabitLogs: [],
  currentHabitDailyTotals: {},
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
      // If we are switching to a different habit, we should ideally clear first, but the component handles that too.
      // However, to be safe, let's make sure we fetch fresh data.
      const logs = await DB.getHabitLogs(habitId);
      const totals: Record<string, { totalValue: number; count: number }> = {};
      for (const l of logs) {
        const key = format(new Date(l.timestamp), 'yyyy-MM-dd');
        const v = l.value || 1;
        const item = totals[key] || { totalValue: 0, count: 0 };
        item.totalValue += v;
        item.count += 1;
        totals[key] = item;
      }
      set({ currentHabitLogs: logs, currentHabitDailyTotals: totals });
    } catch (error) {
      console.error('Failed to fetch habit logs:', error);
    }
  },

  clearCurrentHabitData: () => {
    set({ currentHabitLogs: [], currentHabitDailyTotals: {} });
  },

  createHabit: async (name, goal, targetValue, category, frequency = 'daily', frequencyDays, reminderTime) => {
    const id = Date.now().toString();
    let notificationIds: string[] = [];

    if (reminderTime) {
      const date = new Date(reminderTime);
      const hour = date.getHours();
      const minute = date.getMinutes();
      console.log(`Scheduling habit reminder for: ${name}, ISO=${reminderTime}, Local=${date.toString()}, Hour=${hour}, Minute=${minute}`);
      
      // Safety Net: Schedule a one-time notification for today if the time is in the future
      // This ensures that even if the repeating notification fires immediately (due to OS bugs) and gets intercepted,
      // the user still gets a notification today.
      const now = new Date();
      const todayTarget = new Date();
      todayTarget.setHours(hour, minute, 0, 0);
      
      if (todayTarget > now) {
         console.log('Scheduling one-time catch-up notification for today');
         const nid = await NotificationService.scheduleNotification(
             '习惯提醒',
             `该打卡了: ${name}`,
             todayTarget,
             { type: 'habit_onetime' }
         );
         if (nid) notificationIds.push(nid);
      }

      if (frequency === 'daily') {
        const nid = await NotificationService.scheduleRepeatingNotification(
          '习惯提醒',
          `该打卡了: ${name}`,
          hour,
          minute,
          undefined,
          { type: 'habit' }
        );
        if (nid) notificationIds.push(nid);
      } else if (frequency === 'specific_days' && frequencyDays) {
        for (const day of frequencyDays) {
          const nid = await NotificationService.scheduleRepeatingNotification(
            '习惯提醒',
            `该打卡了: ${name}`,
            hour,
            minute,
            day,
            { type: 'habit' }
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
    const { habits, currentHabitDailyTotals, currentHabitLogs } = get();
    const habit = habits.find(h => h.id === habitId);
    const target = habit?.targetValue || 1;
    const key = format(new Date(timestamp), 'yyyy-MM-dd');
    const currentTotal = currentHabitDailyTotals[key]?.totalValue || 0;
    if (currentTotal >= target) {
      throw new Error('今日已达目标');
    }
    const remaining = Math.max(0, target - currentTotal);
    const adjustedValue = Math.min(value || 1, remaining);
    const newLog: HabitLog = {
      id: Date.now().toString(),
      habitId,
      timestamp,
      value: adjustedValue,
      note,
      imageUri,
    };
    const prevLogs = currentHabitLogs;
    const prevTotals = currentHabitDailyTotals;
    const optimisticLogs = habitId ? [...prevLogs, newLog] : prevLogs;
    const optimisticTotals = { ...prevTotals };
    const t = optimisticTotals[key] || { totalValue: 0, count: 0 };
    t.totalValue += adjustedValue;
    t.count += 1;
    optimisticTotals[key] = t;
    set({ currentHabitLogs: optimisticLogs, currentHabitDailyTotals: optimisticTotals });

    await DB.addHabitLog(newLog);

    const monthISO = dateISO || new Date().toISOString();
    InteractionManager.runAfterInteractions(() => {
      Promise.all([
        get().fetchHabitLogs(habitId),
        get().fetchLogsForMonth(monthISO, true),
        dateISO ? get().fetchLogsForDate(dateISO) : Promise.resolve(),
        get().fetchHabits(true),
      ]).catch(() => {});
    });
  },

  updateLog: async (log: HabitLog) => {
    const prevLogs = get().currentHabitLogs;
    const prevTotals = get().currentHabitDailyTotals;
    const key = format(new Date(log.timestamp), 'yyyy-MM-dd');
    const old = prevLogs.find(l => l.id === log.id);
    const diff = (log.value || 0) - (old?.value || 0);
    const updatedLogs = prevLogs.map(l => (l.id === log.id ? { ...l, ...log } : l));
    const updatedTotals = { ...prevTotals };
    const t = updatedTotals[key] || { totalValue: 0, count: 0 };
    t.totalValue += diff;
    updatedTotals[key] = t;
    set({ currentHabitLogs: updatedLogs, currentHabitDailyTotals: updatedTotals });

    await DB.updateHabitLog(log);
    InteractionManager.runAfterInteractions(() => {
      Promise.all([
        get().fetchHabits(true),
        get().fetchHabitLogs(log.habitId),
        get().fetchLogsForMonth(log.timestamp, true),
        get().fetchLogsForDate(log.timestamp),
      ]).catch(() => {});
    });
  },

  deleteLog: async (id: string, habitId: string) => {
    const prevLogs = get().currentHabitLogs;
    const prevTotals = get().currentHabitDailyTotals;
    const target = prevLogs.find(l => l.id === id);
    const updatedLogs = prevLogs.filter(l => l.id !== id);
    const updatedTotals = { ...prevTotals };
    if (target) {
      const key = format(new Date(target.timestamp), 'yyyy-MM-dd');
      const t = updatedTotals[key] || { totalValue: 0, count: 0 };
      t.totalValue -= target.value || 1;
      t.count = Math.max(0, t.count - 1);
      updatedTotals[key] = t;
    }
    set({ currentHabitLogs: updatedLogs, currentHabitDailyTotals: updatedTotals });

    await DB.deleteHabitLog(id);
    InteractionManager.runAfterInteractions(() => {
      Promise.all([
        get().fetchHabits(true),
        get().fetchHabitLogs(habitId),
        get().fetchLogsForMonth(new Date().toISOString(), true),
      ]).catch(() => {});
    });
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

             // Safety Net for Updates: Schedule a one-time notification for today if the time is in the future
             const now = new Date();
             const todayTarget = new Date();
             todayTarget.setHours(hour, minute, 0, 0);
             
             if (todayTarget > now) {
                console.log('Update Habit: Scheduling one-time catch-up notification for today');
                const nid = await NotificationService.scheduleNotification(
                    '习惯提醒',
                    `该打卡了: ${updatedHabit.name}`,
                    todayTarget,
                    { type: 'habit_onetime' }
                );
                if (nid) updatedHabit.notificationIds.push(nid);
             }
             
             if (updatedHabit.frequency === 'daily') {
                 const nid = await NotificationService.scheduleRepeatingNotification(
                     '习惯提醒',
                     `该打卡了: ${updatedHabit.name}`,
                     hour,
                     minute,
                     undefined,
                     { type: 'habit' }
                 );
                 if (nid) updatedHabit.notificationIds.push(nid);
             } else if (updatedHabit.frequency === 'specific_days' && updatedHabit.frequencyDays) {
                 for (const day of updatedHabit.frequencyDays) {
                     const nid = await NotificationService.scheduleRepeatingNotification(
                         '习惯提醒',
                         `该打卡了: ${updatedHabit.name}`,
                         hour,
                         minute,
                         day,
                         { type: 'habit' }
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
