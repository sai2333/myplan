import React, { useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, InteractionManager } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useTodoStore } from '../store/useTodoStore';
import { useHabitStore } from '../store/useHabitStore';
import { Todo, HabitLog } from '../types';
import { format, parseISO, isSameDay } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

export const TodoTimelineScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { todos, fetchTodos } = useTodoStore();
  const { habits, todayLogs, fetchHabits } = useHabitStore();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchTodos();
      fetchHabits(); // Ensure we have habits and logs
    });

    return () => task.cancel();
  }, []);

  // Combine and sort items
  const timelineItems = useMemo(() => {
    const today = new Date();
    const items: { 
      id: string; 
      type: 'todo' | 'habit'; 
      time: string; 
      content: string; 
      category?: string;
      isCompleted: boolean;
    }[] = [];

    // 1. Completed Todos (using completedAt)
    todos.forEach(todo => {
      if (todo.isCompleted && todo.completedAt) {
        const completedTime = parseISO(todo.completedAt);
        if (isSameDay(completedTime, today)) {
          items.push({
            id: todo.id,
            type: 'todo',
            time: todo.completedAt,
            content: todo.content,
            category: todo.category,
            isCompleted: true
          });
        }
      }
    });

    // 2. Habit Logs (already today's logs from store, but double check timestamp)
    todayLogs.forEach(log => {
      const logTime = parseISO(log.timestamp);
      if (isSameDay(logTime, today)) {
        const habit = habits.find(h => h.id === log.habitId);
        if (habit) {
           items.push({
             id: log.id,
             type: 'habit',
             time: log.timestamp,
             content: `${habit.name} (打卡)`,
             category: habit.category,
             isCompleted: true
           });
        }
      }
    });

    return items.sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });
  }, [todos, todayLogs, habits]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollContent}>
        {timelineItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>今天还没有完成任何事项</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {timelineItems.map((item, index) => {
              const timeStr = format(parseISO(item.time), 'HH:mm');
              const isLast = index === timelineItems.length - 1;

              return (
                <View key={item.id} style={styles.timelineItem}>
                  {/* Time Column */}
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{timeStr}</Text>
                  </View>

                  {/* Line Column */}
                  <View style={styles.lineWeb}>
                    <View style={[
                      styles.dot, 
                      { backgroundColor: item.type === 'habit' ? theme.colors.secondary : theme.colors.primary }
                    ]} />
                    {!isLast && <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />}
                  </View>

                  {/* Content Column */}
                  <View style={styles.contentColumn}>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                      <Text 
                        style={[
                          styles.todoContent, 
                          { textDecorationLine: 'none', color: theme.colors.onSurface }
                        ]}
                      >
                        {item.content}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                         {item.category && (
                            <Text style={[styles.category, { color: theme.colors.secondary }]}>
                              {item.category}
                            </Text>
                         )}
                         <Text style={[styles.category, { color: theme.colors.outline, marginLeft: 8 }]}>
                             {item.type === 'habit' ? '习惯' : '待办'}
                         </Text>
                      </View>
                    </Surface>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 50,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0, 
    minHeight: 60,
  },
  timeColumn: {
    width: 50,
    alignItems: 'flex-end',
    paddingRight: 10,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  lineWeb: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: -2,
    marginBottom: -4,
  },
  contentColumn: {
    flex: 1,
    paddingBottom: 20,
    paddingLeft: 8,
  },
  card: {
    padding: 12,
    borderRadius: 8,
  },
  todoContent: {
    fontSize: 14,
  },
  category: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  }
});
