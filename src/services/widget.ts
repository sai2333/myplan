import { requestWidgetUpdate } from 'react-native-android-widget';
import * as DB from '../db';
import { renderHabitWidget } from '../widgets/HabitWidget';
import { renderTodoWidget } from '../widgets/TodoWidget';
import { getDay, isSameDay, parseISO, startOfDay, isBefore, format } from 'date-fns';

// Logic to prepare data for HabitWidget
const getHabitWidgetData = async () => {
    const habits = await DB.getHabits();
    const today = new Date();
    const dayOfWeek = getDay(today);
    
    // Filter habits for today
    const todaysHabits = habits.filter(h => {
      if (h.archived) return false;
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'specific_days') {
        return h.frequencyDays?.includes(dayOfWeek);
      }
      return true; 
    });

    // Get logs
    const logs = await DB.getTodayLogs();

    return todaysHabits.map(h => {
        const hLogs = logs.filter(l => l.habitId === h.id);
        const totalValue = hLogs.reduce((sum, log) => sum + (log.value || 1), 0);
        return {
            id: h.id,
            name: h.name,
            targetValue: h.targetValue || 1,
            currentValue: totalValue
        };
    });
};

// Logic to prepare data for TodoWidget
const getTodoWidgetData = async () => {
    const todos = await DB.getTodos();
    const today = new Date();
    
    return todos.filter(t => {
      if (t.isCompleted) return false; // Only show pending for widget
      if (t.dueDate) {
          const due = parseISO(t.dueDate);
          // Show overdue or today
          return isSameDay(due, today) || isBefore(due, startOfDay(today));
      }
      // If no due date, show it!
      return true;
    }).sort((a, b) => {
        // Sort: Overdue/Today first (has due date), then others
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return 0;
    })
      .slice(0, 10)
      .map(t => ({
          id: t.id,
          content: t.content,
          isCompleted: t.isCompleted,
          isOverdue: t.dueDate ? isBefore(parseISO(t.dueDate), startOfDay(today)) : false,
          time: t.reminderTime ? format(new Date(t.reminderTime), 'HH:mm') : undefined
      }));
};

export const updateAllWidgets = async () => {
    try {
        const theme = await DB.getWidgetTheme();
        
        // Update Habit Widget
        const habitData = await getHabitWidgetData();
        requestWidgetUpdate({
            widgetName: 'HabitWidget',
            renderWidget: () => renderHabitWidget(habitData, theme),
            widgetNotFound: () => {}
        });

        // Update Todo Widget
        const todoData = await getTodoWidgetData();
        requestWidgetUpdate({
            widgetName: 'TodoWidget',
            renderWidget: () => renderTodoWidget(todoData, theme),
            widgetNotFound: () => {}
        });
        
    } catch (error) {
        console.error('Failed to update widgets:', error);
    }
};
