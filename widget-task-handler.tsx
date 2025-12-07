import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { ToastAndroid } from 'react-native';
import { renderHabitWidget } from './src/widgets/HabitWidget';
import { renderTodoWidget } from './src/widgets/TodoWidget';
import * as DB from './src/db';
import { getDay, format, isSameDay, parseISO, startOfDay, isBefore } from 'date-fns';

// Helper to fetch and render Habit Widget
async function updateHabitWidget(props) {
  console.log('[Widget] Updating Habit Widget...');
  try {
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

    const widgetData = todaysHabits.map(h => {
        const hLogs = logs.filter(l => l.habitId === h.id);
        const totalValue = hLogs.reduce((sum, log) => sum + (log.value || 1), 0);
        return {
            id: h.id,
            name: h.name,
            targetValue: h.targetValue || 1,
            currentValue: totalValue
        };
    });

    console.log(`[Widget] Rendering Habit Widget with ${widgetData.length} habits`);
    const theme = await DB.getWidgetTheme();
    props.renderWidget(await renderHabitWidget(widgetData, theme));
  } catch (error) {
    console.error('[Widget] Error updating habit widget:', error);
  }
}

// Helper to fetch and render Todo Widget
async function updateTodoWidget(props) {
  console.log('[Widget] Updating Todo Widget...');
  try {
    const todos = await DB.getTodos();
    const today = new Date();
    
    const widgetTodos = todos.filter(t => {
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

    console.log(`[Widget] Rendering Todo Widget with ${widgetTodos.length} todos`);
    const theme = await DB.getWidgetTheme();
    props.renderWidget(await renderTodoWidget(widgetTodos, theme));
  } catch (error) {
    console.error('[Widget] Error updating todo widget:', error);
  }
}


export async function widgetTaskHandler(props) {
  // CONSOLE LOGGING FOR DEBUGGING
  console.log('==========================================');
  console.log('[Widget] Handler Triggered!');
  console.log('[Widget] Props:', JSON.stringify(props, null, 2));

  // Ultra-safe entry point
  try {
      const widgetAction = props.widgetAction;
      const widgetInfo = props.widgetInfo;
      const clickAction = props.clickAction || props.extra?.clickAction;
      const clickActionData = props.clickActionData || props.extra?.clickActionData;

      console.log(`[Widget] Action: ${widgetAction}, ClickAction: ${clickAction}`);

      // Initialize DB
      try {
          await DB.initDB();
          console.log('[Widget] DB Initialized');
      } catch (e) {
          console.error('[Widget] DB Init failed', e);
      }

      // Handle Update
      if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
          console.log('[Widget] Processing System Update');
          if (widgetInfo?.widgetName === 'HabitWidget') {
              await updateHabitWidget(props);
          } else if (widgetInfo?.widgetName === 'TodoWidget') {
              await updateTodoWidget(props);
          }
          return;
      }

      // Determine Action
      let effectiveAction = widgetAction;
      // Fix: check for 'WIDGET_CLICK' (uppercase) as seen in logs
      if (widgetAction === 'WIDGET_CLICK' || widgetAction === 'widget_click') {
          if (clickAction) {
              effectiveAction = clickAction;
          } else {
              // Fallback inference
              if (clickActionData?.habitId) effectiveAction = 'LOG_HABIT';
              if (clickActionData?.todoId) effectiveAction = 'TOGGLE_TODO';
          }
      }

      console.log(`[Widget] Effective Action: ${effectiveAction}`);

      if (effectiveAction === 'LOG_HABIT') {
          const habitId = clickActionData?.habitId;
          console.log(`[Widget] Processing LOG_HABIT for ${habitId}`);
          
          if (habitId) {
              ToastAndroid.show('正在打卡...', ToastAndroid.SHORT);
              const habits = await DB.getHabits();
              const habit = habits.find(h => h.id === habitId);
              
              const log = {
                  id: Date.now().toString(),
                  habitId,
                  timestamp: new Date().toISOString(),
                  value: 1
              };
              await DB.addHabitLog(log);
              
              if (habit) {
                  console.log(`[Widget] Habit found: ${habit.name}`);
                  ToastAndroid.show(`已打卡: ${habit.name}`, ToastAndroid.SHORT);
              } else {
                  console.log('[Widget] Habit not found');
                  ToastAndroid.show('打卡成功', ToastAndroid.SHORT);
              }
              
              await updateHabitWidget(props);
          } else {
             console.error('[Widget] No habitId provided');
          }
      } else if (effectiveAction === 'TOGGLE_TODO') {
          const todoId = clickActionData?.todoId;
          console.log(`[Widget] Processing TOGGLE_TODO for ${todoId}`);
          
          if (todoId) {
              // ToastAndroid.show('处理待办...', ToastAndroid.SHORT);
              const todos = await DB.getTodos();
              const todo = todos.find(t => t.id === todoId);
              if (todo) {
                  console.log(`[Widget] Todo found: ${todo.content}, current status: ${todo.isCompleted}`);
                  const newStatus = !todo.isCompleted;
                  await DB.toggleTodo(todoId, newStatus);
                  ToastAndroid.show(newStatus ? '已完成' : '已撤销', ToastAndroid.SHORT);
                  await updateTodoWidget(props);
              } else {
                  console.log('[Widget] Todo not found');
              }
          } else {
              console.error('[Widget] No todoId provided');
          }
      } else {
          console.warn(`[Widget] Unhandled action: ${effectiveAction}`);
      }
  } catch (err) {
      console.error('[Widget] FATAL ERROR', err);
      ToastAndroid.show(`Widget Error: ${err.message}`, ToastAndroid.LONG);
  }
}

registerWidgetTaskHandler(widgetTaskHandler);
