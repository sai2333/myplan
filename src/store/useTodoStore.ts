import { create } from 'zustand';
import { Todo } from '../types';
import * as DB from '../db';
import * as NotificationService from '../services/notification';

interface TodoState {
  todos: Todo[];
  categories: string[];
  loading: boolean;
  loaded: boolean;
  fetchTodos: (force?: boolean) => Promise<void>;
  addTodo: (content: string, dueDate?: string, reminderTime?: string, note?: string, relatedHabitId?: string, categories?: string[], autoPostpone?: boolean) => Promise<void>;
  updateTodo: (todo: Todo) => Promise<void>;
  toggleTodo: (id: string, isCompleted: boolean) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  categories: [],
  loading: false,
  loaded: false,

  fetchTodos: async (force = false) => {
    if (get().loaded && !force) return;
    set({ loading: true });
    try {
      await DB.initDB();
      let todos = await DB.getTodos();

      // Auto Postpone Logic
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const updates: Todo[] = [];

      todos.forEach(t => {
        if (!t.isCompleted && t.autoPostpone && t.dueDate) {
          const dueStr = t.dueDate.split('T')[0];
          if (dueStr < todayStr) {
             // Move to today
             // Preserve time if possible, or just set to current time
             updates.push({ ...t, dueDate: today.toISOString() });
          }
        }
      });

      if (updates.length > 0) {
          for (const t of updates) {
              await DB.updateTodo(t);
          }
          // Reflect changes in local list
          todos = todos.map(t => {
              const found = updates.find(u => u.id === t.id);
              return found || t;
          });
      }

      set({ todos, loading: false, loaded: true });
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    try {
      await DB.initDB();
      const categories = await DB.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  },

  addCategory: async (category: string) => {
    if (!category || !category.trim()) return;
    try {
      await DB.initDB();
      await DB.addCategory(category.trim());
      await get().fetchCategories();
    } catch (error) {
      console.error('Failed to add category:', error);
      throw error;
    }
  },

  addTodo: async (content: string, dueDate?: string, reminderTime?: string, note?: string, relatedHabitId?: string, categories?: string[], autoPostpone?: boolean) => {
    let notificationId: string | undefined;

    if (reminderTime) {
      const triggerDate = new Date(reminderTime);
      // Remove strict future check to allow near-past scheduling (service handles it)
      notificationId = await NotificationService.scheduleNotification(
        '待办提醒',
        content,
        triggerDate
      );
    }

    const newTodo: Todo = {
      id: Date.now().toString(),
      content,
      isCompleted: false,
      dueDate,
      reminderTime,
      note,
      relatedHabitId,
      categories,
      notificationId,
      autoPostpone: !!autoPostpone,
      createdAt: new Date().toISOString(),
    };

    await DB.addTodo(newTodo);
    await get().fetchTodos(true);
  },

  updateTodo: async (updatedTodo: Todo) => {
    const oldTodo = get().todos.find(t => t.id === updatedTodo.id);
    let notificationId = updatedTodo.notificationId;

    // Check if reminder changed
    const oldReminder = oldTodo?.reminderTime;
    const newReminder = updatedTodo.reminderTime;
    const reminderChanged = oldReminder !== newReminder;

    if (reminderChanged) {
      // Cancel old notification if it exists
      if (oldTodo?.notificationId) {
        await NotificationService.cancelNotification(oldTodo.notificationId);
        notificationId = undefined;
      }

      // Schedule new notification if needed
      if (newReminder) {
        const triggerDate = new Date(newReminder);
        // Remove strict future check to allow near-past scheduling
        notificationId = await NotificationService.scheduleNotification(
          '待办提醒',
          updatedTodo.content,
          triggerDate
        );
      }
    } else if (updatedTodo.content !== oldTodo?.content && notificationId) {
        // If content changed but reminder time didn't, strictly we might want to update the notification body.
        // But expo-notifications doesn't support "update", only cancel and reschedule.
        // Let's reschedule if future.
        if (newReminder && new Date(newReminder) > new Date()) {
             await NotificationService.cancelNotification(notificationId);
             notificationId = await NotificationService.scheduleNotification(
                '待办提醒',
                updatedTodo.content,
                new Date(newReminder)
             );
        }
    }

    const finalTodo = { ...updatedTodo, notificationId };
    await DB.updateTodo(finalTodo);
    await get().fetchTodos(true);
  },

  toggleTodo: async (id: string, isCompleted: boolean) => {
    // Optional: Cancel notification if completed? 
    // For now, let's keep it simple. Or strictly:
    const todo = get().todos.find(t => t.id === id);
    if (isCompleted && todo?.notificationId) {
        await NotificationService.cancelNotification(todo.notificationId);
        // Note: We might want to clear notificationId from DB, but keeping it is fine as long as we know it's cancelled or don't care.
        // If we uncheck, we technically should reschedule if time hasn't passed, but that requires more logic.
    }

    const completedAt = isCompleted ? new Date().toISOString() : null;
    await DB.toggleTodo(id, isCompleted, completedAt);
    await get().fetchTodos(true);
  },

  deleteTodo: async (id: string) => {
    const todo = get().todos.find(t => t.id === id);
    if (todo?.notificationId) {
      await NotificationService.cancelNotification(todo.notificationId);
    }
    await DB.deleteTodo(id);
    await get().fetchTodos(true);
  },
}));
