import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, HabitLog, Todo } from '../types';

const HABITS_KEY = 'myplan_habits';
const LOGS_KEY = 'myplan_logs';
const TODOS_KEY = 'myplan_todos';
const CATEGORIES_KEY = 'myplan_categories';

export const initDB = async () => {
  // No initialization needed for AsyncStorage
  // We could check if keys exist, but AsyncStorage handles null gracefully
};

export const getHabits = async (): Promise<Habit[]> => {
  const json = await AsyncStorage.getItem(HABITS_KEY);
  if (!json) return [];
  const habits = JSON.parse(json) as Habit[];
  return habits.filter(h => !h.archived);
};

export const addHabit = async (habit: Habit) => {
  const habits = await getAllHabitsIncludingArchived();
  habits.push({
    ...habit,
    archived: !!habit.archived
  });
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
};

export const deleteHabit = async (id: string) => {
  const habits = await getAllHabitsIncludingArchived();
  const updatedHabits = habits.map(h => 
    h.id === id ? { ...h, archived: true } : h
  );
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(updatedHabits));
};

export const addHabitLog = async (log: HabitLog) => {
  const logs = await getAllLogs();
  logs.push(log);
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

export const getHabitLogs = async (habitId: string): Promise<HabitLog[]> => {
  const logs = await getAllLogs();
  return logs
    .filter(l => l.habitId === habitId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getTodayLogs = async (): Promise<HabitLog[]> => {
  const logs = await getAllLogs();
  const todayStart = new Date().toISOString().split('T')[0];
  return logs.filter(l => l.timestamp.startsWith(todayStart));
};

export const getLogsForDate = async (dateISO: string): Promise<HabitLog[]> => {
  const logs = await getAllLogs();
  const dateStart = dateISO.split('T')[0];
  return logs.filter(l => l.timestamp.startsWith(dateStart));
};

export const getLogsSince = async (dateISO: string): Promise<HabitLog[]> => {
  const logs = await getAllLogs();
  const date = new Date(dateISO).getTime();
  return logs.filter(l => new Date(l.timestamp).getTime() >= date);
};

// Todo Operations
export const getTodos = async (): Promise<Todo[]> => {
  const json = await AsyncStorage.getItem(TODOS_KEY);
  if (!json) return [];
  const todos = JSON.parse(json) as Todo[];
  return todos.map(t => ({
    ...t,
    categories: t.categories || (t.category ? [t.category] : []) // Migration logic
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addTodo = async (todo: Todo) => {
  const todos = await getTodos();
  todos.unshift(todo);
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todos));
};

export const toggleTodo = async (id: string, isCompleted: boolean) => {
  const todos = await getTodos();
  const updatedTodos = todos.map(t => 
    t.id === id ? { ...t, isCompleted } : t
  );
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(updatedTodos));
};

export const updateTodo = async (todo: Todo) => {
  const todos = await getTodos();
  const updatedTodos = todos.map(t => 
    t.id === todo.id ? todo : t
  );
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(updatedTodos));
};

export const deleteTodo = async (id: string) => {
  const todos = await getTodos();
  const updatedTodos = todos.filter(t => t.id !== id);
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(updatedTodos));
};

// Category Operations
export const getCategories = async (): Promise<string[]> => {
  const json = await AsyncStorage.getItem(CATEGORIES_KEY);
  if (!json) return [];
  return JSON.parse(json) as string[];
};

export const addCategory = async (category: string) => {
  const categories = await getCategories();
  if (!categories.includes(category)) {
    categories.push(category);
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }
};

// Backup & Restore
export const getAllHabitsIncludingArchived = async (): Promise<Habit[]> => {
  const json = await AsyncStorage.getItem(HABITS_KEY);
  if (!json) return [];
  return JSON.parse(json) as Habit[];
};

export const getAllLogs = async (): Promise<HabitLog[]> => {
  const json = await AsyncStorage.getItem(LOGS_KEY);
  if (!json) return [];
  return JSON.parse(json) as HabitLog[];
};

export const getAllTodos = async (): Promise<Todo[]> => {
  const json = await AsyncStorage.getItem(TODOS_KEY);
  if (!json) return [];
  return JSON.parse(json) as Todo[];
};

export const restoreData = async (habits: Habit[], logs: HabitLog[], todos: Todo[] = []) => {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todos));
};
