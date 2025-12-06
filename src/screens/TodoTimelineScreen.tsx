import React, { useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, InteractionManager } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useTodoStore } from '../store/useTodoStore';
import { Todo } from '../types';
import { format, parseISO, isSameDay } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

export const TodoTimelineScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { todos, fetchTodos } = useTodoStore();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchTodos();
    });

    return () => task.cancel();
  }, []);

  // Filter for today's todos
  const sortedTodos = useMemo(() => {
    const today = new Date();
    const todayTodos = todos.filter(todo => {
       const created = parseISO(todo.createdAt);
       const due = todo.dueDate ? parseISO(todo.dueDate) : null;
       const reminder = todo.reminderTime ? parseISO(todo.reminderTime) : null;
       
       return isSameDay(created, today) || 
              (due && isSameDay(due, today)) || 
              (reminder && isSameDay(reminder, today));
    });

    // Helper to get display time
    const getDisplayTime = (todo: Todo) => {
      if (todo.reminderTime) return todo.reminderTime;
      return todo.createdAt;
    };

    return [...todayTodos].sort((a, b) => {
      const timeA = getDisplayTime(a);
      const timeB = getDisplayTime(b);
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });
  }, [todos]);

  const getDisplayTime = (todo: Todo) => {
    if (todo.reminderTime) return todo.reminderTime;
    return todo.createdAt;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollContent}>
        {sortedTodos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>今天没有待办事项</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {sortedTodos.map((todo, index) => {
              const displayTime = getDisplayTime(todo);
              const timeStr = format(parseISO(displayTime), 'HH:mm');
              const isLast = index === sortedTodos.length - 1;

              return (
                <View key={todo.id} style={styles.timelineItem}>
                  {/* Time Column */}
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{timeStr}</Text>
                  </View>

                  {/* Line Column */}
                  <View style={styles.lineWeb}>
                    <View style={[styles.dot, { backgroundColor: todo.isCompleted ? theme.colors.primary : theme.colors.outline }]} />
                    {!isLast && <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />}
                  </View>

                  {/* Content Column */}
                  <View style={styles.contentColumn}>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                      <Text 
                        style={[
                          styles.todoContent, 
                          todo.isCompleted && { textDecorationLine: 'line-through', color: theme.colors.outline }
                        ]}
                      >
                        {todo.content}
                      </Text>
                      {todo.category && (
                        <Text style={[styles.category, { color: theme.colors.secondary }]}>
                          {todo.category}
                        </Text>
                      )}
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
