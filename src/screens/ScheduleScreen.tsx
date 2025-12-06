import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, InteractionManager } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, getDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Solar } from 'lunar-javascript';
import { useHabitStore } from '../store/useHabitStore';
import { useTodoStore } from '../store/useTodoStore';
import { Habit, Todo } from '../types';

import { TodoModal } from '../components/TodoModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = SCREEN_WIDTH / 7;
const CELL_HEIGHT = 110; // Taller cells to fit bars

export const ScheduleScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { habits, fetchHabits, monthlyLogs, fetchLogsForMonth } = useHabitStore();
  const { todos, fetchTodos } = useTodoStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTodoModalVisible, setIsTodoModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>(undefined);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
        fetchHabits();
        fetchTodos();
        fetchLogsForMonth(currentMonth.toISOString());
    });

    return () => task.cancel();
  }, [currentMonth]);

  // Calendar Data Generation
  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const calendarDays = getCalendarDays();
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  // Helper: Get Lunar Date Text
  const getLunarText = (date: Date) => {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const jieQi = lunar.getJieQi();
    if (jieQi) return jieQi;
    return lunar.getDayInChinese();
  };

  // Helper: Get Tasks (Habits + Todos) for a date
  const getTasksForDate = (date: Date) => {
    const dayOfWeek = getDay(date);
    const tasks: { id: string, title: string, type: 'habit' | 'todo', color: string, completed: boolean }[] = [];

    // 1. Habits
    habits.forEach(habit => {
      let shouldShow = false;
      if (habit.frequency === 'daily') shouldShow = true;
      else if (habit.frequency === 'specific_days' && habit.frequencyDays?.includes(dayOfWeek)) shouldShow = true;
      
      if (shouldShow) {
        // Check completion in monthlyLogs
        const isCompleted = monthlyLogs.some(log => 
            log.habitId === habit.id && isSameDay(parseISO(log.timestamp), date)
        );

        tasks.push({
          id: habit.id,
          title: habit.name,
          type: 'habit',
          color: theme.colors.secondary, // Use theme secondary
          completed: isCompleted
        });
      }
    });

    // 2. Todos
    todos.forEach(todo => {
      if (todo.dueDate && isSameDay(parseISO(todo.dueDate), date)) {
        tasks.push({
          id: todo.id,
          title: todo.content,
          type: 'todo',
          color: theme.colors.primary, // Use theme primary
          completed: todo.isCompleted
        });
      } else if (!todo.dueDate && isSameDay(date, new Date()) && isSameDay(date, parseISO(todo.createdAt))) {
         // Show today's created todos on today if no due date
         tasks.push({
            id: todo.id,
            title: todo.content,
            type: 'todo',
            color: theme.colors.primary, // Use theme primary
            completed: todo.isCompleted
         });
      }
    });

    return tasks;
  };

  const handleTaskPress = (task: any) => {
      if (task.type === 'habit') {
          navigation.navigate('HabitDetail' as any, { id: task.id });
      } else if (task.type === 'todo') {
          const todo = todos.find(t => t.id === task.id);
          if (todo) {
              setEditingTodo(todo);
              setIsTodoModalVisible(true);
          }
      }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.monthNavigation, { 
          paddingTop: insets.top + 10,
          backgroundColor: theme.colors.surface 
      }]}>
         <Text variant="headlineMedium" style={{fontWeight: 'bold', marginLeft: 16, color: theme.colors.onSurface}}>
            {format(currentMonth, 'M月', { locale: zhCN })}
         </Text>
         <View style={{flexDirection: 'row'}}>
            <IconButton icon="chevron-left" onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} />
            <IconButton icon="chevron-right" onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} />
         </View>
      </View>

      {/* Week Days Header */}
      <View style={[styles.weekDaysRow, { 
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant || '#eee'
      }]}>
        {weekDays.map((day, index) => (
          <Text key={index} style={[styles.weekDayText, { color: theme.colors.onSurfaceVariant || '#999' }]}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.gridContainer}>
            {/* Chunk days into weeks for row-based rendering to handle variable heights */}
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, i) => calendarDays.slice(i * 7, i * 7 + 7)).map((week, weekIndex) => (
                <View key={weekIndex} style={{ flexDirection: 'row' }}>
                    {week.map((date, dayIndex) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        const isCurrentMonth = isSameMonth(date, currentMonth);
                        const lunarText = getLunarText(date);
                        const tasks = getTasksForDate(date);

                        return (
                            <TouchableOpacity 
                                key={dayIndex}
                                style={[
                                    styles.cell, 
                                    { 
                                        minHeight: 100,
                                        borderColor: theme.colors.outlineVariant || '#eee'
                                    }, 
                                    // isSelected && { backgroundColor: theme.colors.secondaryContainer }
                                ]}
                                onPress={() => setSelectedDate(date)}
                            >
                                {/* Date Number & Lunar */}
                                <View style={styles.dateHeader}>
                                    <View style={[
                                        styles.dateNumberContainer,
                                        isToday && { backgroundColor: theme.colors.primary }
                                    ]}>
                                        <Text style={[
                                            styles.dateNumber,
                                            { color: isToday ? theme.colors.onPrimary : (isCurrentMonth ? theme.colors.onSurface : theme.colors.outline) },
                                        ]}>
                                            {isToday ? '今' : format(date, 'd')}
                                        </Text>
                                        {isToday && <Text style={{fontSize: 8, color: theme.colors.onPrimary}}>{lunarText}</Text>}
                                    </View>
                                    
                                    {!isToday && (
                                        <Text style={[
                                            styles.lunarText, 
                                            { color: theme.colors.onSurfaceVariant || '#999' },
                                            lunarText.length === 2 && ['大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪'].includes(lunarText) && { color: theme.colors.primary }
                                        ]}>
                                            {lunarText}
                                        </Text>
                                    )}
                                </View>

                                {/* Tasks Bars */}
                                <View style={styles.tasksContainer}>
                                    {tasks.map((task, i) => (
                                        <TouchableOpacity 
                                            key={`${task.id}-${i}`} 
                                            style={[
                                                styles.taskBar, 
                                                { backgroundColor: task.color },
                                                task.completed && { opacity: 0.6 } // Dim completed items
                                            ]}
                                            onPress={() => handleTaskPress(task)}
                                        >
                                            <Text numberOfLines={1} style={[
                                                styles.taskText,
                                                { color: theme.colors.onPrimary },
                                                task.completed && { textDecorationLine: 'line-through' } // Strike through
                                            ]}>
                                                {task.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
      </ScrollView>

      {/* Optional: Add FAB here too if user wants to add tasks from this view? 
          User didn't specify, but usually good. I'll leave it out for now to match screenshot cleanliness.
      */}
      
      <TodoModal
        visible={isTodoModalVisible}
        onDismiss={() => setIsTodoModalVisible(false)}
        defaultDate={selectedDate}
        todoToEdit={editingTodo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    // backgroundColor removed, set inline
  },
  monthNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      // backgroundColor removed, set inline
      paddingBottom: 8,
  },
  weekDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
      borderBottomWidth: 1,
      // borderBottomColor removed, set inline
  },
  weekDayText: {
    width: CELL_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    // color removed, set inline
  },
  scrollView: {
      flex: 1,
  },
  gridContainer: {
    flexDirection: 'column',
  },
  cell: {
    width: CELL_WIDTH,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    padding: 2,
    // borderColor removed, set inline
  },
  dateHeader: {
    alignItems: 'center',
    marginBottom: 4,
    minHeight: 36, // Ensure space for date and lunar
  },
  dateNumberContainer: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
  },
  todayCircle: {
      // backgroundColor removed, set inline
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  lunarText: {
    fontSize: 10,
    marginTop: 0,
    // color removed, set inline
  },
  tasksContainer: {
      flex: 1,
      width: '100%',
  },
  taskBar: {
      height: 16,
      borderRadius: 2,
      marginBottom: 2,
      justifyContent: 'center',
      paddingHorizontal: 2,
      width: '100%',
  },
  taskText: {
      fontSize: 9,
      fontWeight: 'bold',
      // color removed, set inline
  },
});
