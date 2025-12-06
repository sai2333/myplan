export interface Habit {
  id: string;
  name: string;
  goal: string; // Description
  frequency: 'daily' | 'weekly' | 'specific_days';
  frequencyDays?: number[]; // 0-6 (Sun-Sat) for specific_days
  reminderTime?: string;
  notificationIds?: string[]; // Array of notification IDs scheduled
  createdAt: string;
  archived: boolean;
  targetValue: number; // Daily target count, default 1
  unit?: string; // e.g. "times", "mins", "km"
  category?: string; // e.g. "Health", "Study"
  color?: string; // Hex color for the habit/category
}

export interface HabitLog {
  id: string;
  habitId: string;
  timestamp: string;
  value: number; // Value recorded in this log (usually 1, but can be more)
  note?: string;
  imageUri?: string;
}

export interface Todo {
  id: string;
  content: string;
  isCompleted: boolean;
  dueDate?: string; // ISO Date string (YYYY-MM-DD or ISO timestamp)
  createdAt: string;
  reminderTime?: string; // ISO Date string
  notificationId?: string; // ID of the scheduled notification
  note?: string;
  relatedHabitId?: string;
  category?: string; // Group/Category (Deprecated, use categories)
  categories?: string[]; // Multiple categories
  autoPostpone?: boolean; // Whether to automatically move to the next day if not completed
  completedAt?: string; // ISO Date string of when the todo was completed
}
