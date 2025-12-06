import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Title, IconButton, useTheme, Checkbox, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addDays, isSameDay, parseISO, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useHabitStore } from '../store/useHabitStore';
import { useTodoStore } from '../store/useTodoStore';
import { Todo } from '../types';
import { TodoModal } from '../components/TodoModal';

export const HomeScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { habits, selectedDateLogs, fetchHabits, fetchLogsForDate, logHabit, loading: habitsLoading } = useHabitStore();
  const { todos, fetchTodos, addTodo, toggleTodo, deleteTodo, loading: todosLoading } = useTodoStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTodoModalVisible, setIsTodoModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>(undefined);
  const insets = useSafeAreaInsets(); // Need to import this

  useEffect(() => {
    fetchHabits();
    fetchTodos();
  }, []);

  useEffect(() => {
    fetchLogsForDate(selectedDate.toISOString());
  }, [selectedDate]);

  // Week Strip Logic (Center around selectedDate)
  const dates = [];
  for (let i = -3; i <= 3; i++) {
    dates.push(addDays(selectedDate, i));
  }

  const getHabitsForDate = (date: Date) => {
    const dayOfWeek = getDay(date); // 0 (Sun) to 6 (Sat)
    return habits.filter(h => {
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'specific_days') {
        return h.frequencyDays?.includes(dayOfWeek);
      }
      return true; 
    });
  };

  const habitsForDate = getHabitsForDate(selectedDate);

  const isHabitCompletedOnDate = (habitId: string) => {
    const logs = selectedDateLogs.filter(log => log.habitId === habitId);
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return false;
    const target = habit.targetValue || 1;
    const totalValue = logs.reduce((sum, log) => sum + (log.value || 1), 0);
    return totalValue >= target;
  };

  const getHabitProgress = (habitId: string) => {
    const logs = selectedDateLogs.filter(log => log.habitId === habitId);
    return logs.reduce((sum, log) => sum + (log.value || 1), 0);
  };

  const displayedTodos = todos.filter(todo => {
    if (todo.dueDate) {
      return isSameDay(parseISO(todo.dueDate), selectedDate);
    }
    // Show todos without due date only on Today
    return isSameDay(selectedDate, new Date());
  });

  const handleCheckHabit = (habitId: string) => {
    logHabit(habitId, 1, undefined, selectedDate.toISOString());
  };

  const handleOpenAddModal = () => {
      setEditingTodo(undefined);
      setIsTodoModalVisible(true);
  };

  const handleOpenEditModal = (todo: Todo) => {
      setEditingTodo(todo);
      setIsTodoModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>今日计划</Text>
        <IconButton
          icon="plus"
          onPress={() => navigation.navigate('AddHabit' as any)}
          iconColor={theme.colors.primary}
        />
      </View>

      {/* Week Calendar Strip */}
      <View style={styles.calendarStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 8}}>
          {dates.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <TouchableOpacity 
                key={index} 
                onPress={() => setSelectedDate(date)}
                style={[
                  styles.dateItem, 
                  isSelected && { backgroundColor: theme.colors.primaryContainer }
                ]}
              >
                <Text style={{ 
                  color: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant,
                  fontWeight: isToday ? 'bold' : 'normal'
                }}>
                  {format(date, 'E', { locale: zhCN })}
                </Text>
                <Text style={[
                  styles.dateNumber, 
                  isSelected && { color: theme.colors.primary, fontWeight: 'bold' },
                  isToday && !isSelected && { color: theme.colors.primary }
                ]}>
                  {format(date, 'd')}
                </Text>
                {isToday && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
            <RefreshControl refreshing={habitsLoading || todosLoading} onRefresh={() => { fetchHabits(); fetchTodos(); }} />
        }
      >
        {/* Habits Section */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>习惯打卡 ({habitsForDate.length})</Title>
          {habitsForDate.length === 0 ? (
             <Text style={{ color: theme.colors.secondary, marginLeft: 16 }}>无习惯安排</Text>
          ) : (
            habitsForDate.map(habit => {
              const completed = isHabitCompletedOnDate(habit.id);
              const progress = getHabitProgress(habit.id);
              const target = habit.targetValue || 1;

              return (
                <Card 
                    key={habit.id} 
                    style={styles.card}
                    onPress={() => navigation.navigate('HabitDetail' as any, { id: habit.id })}
                >
                  <Card.Content style={styles.cardRow}>
                    <View style={{flex: 1}}>
                      <Text style={[
                        styles.habitName,
                        completed && { textDecorationLine: 'line-through', color: theme.colors.outline }
                      ]}>{habit.name}</Text>
                      {target > 1 && (
                        <Text style={{ fontSize: 10, color: theme.colors.secondary }}>
                          进度: {progress}/{target}
                        </Text>
                      )}
                    </View>
                    <IconButton 
                      icon={completed ? "check-circle" : (target > 1 ? "plus-circle" : "checkbox-blank-circle-outline")}
                      iconColor={completed ? theme.colors.primary : theme.colors.outline}
                      onPress={() => !completed && handleCheckHabit(habit.id)}
                      disabled={completed}
                    />
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>

        {/* Todos Section */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>待办事项 ({displayedTodos.length})</Title>
          {displayedTodos.length === 0 ? (
            <Text style={{ color: theme.colors.secondary, marginLeft: 16 }}>
              暂无待办事项
            </Text>
          ) : (
            displayedTodos.map(todo => (
              <Card key={todo.id} style={styles.todoCard} onPress={() => handleOpenEditModal(todo)}>
                <Card.Content style={styles.cardRow}>
                  <Checkbox
                    status={todo.isCompleted ? 'checked' : 'unchecked'}
                    onPress={() => toggleTodo(todo.id, !todo.isCompleted)}
                  />
                  <View style={{flex: 1}}>
                    <Text style={[
                        styles.todoContent,
                        todo.isCompleted && { textDecorationLine: 'line-through', color: theme.colors.outline }
                    ]}>
                        {todo.content}
                    </Text>
                    {todo.reminderTime && (
                        <Text style={{ fontSize: 10, color: theme.colors.primary }}>
                            ⏰ {format(new Date(todo.reminderTime), 'HH:mm')}
                        </Text>
                    )}
                  </View>
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    onPress={() => deleteTodo(todo.id)}
                  />
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
      
      {/* FAB for Quick Add Todo (Bottom Right) - Distinct from Habit Add in Top Right */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleOpenAddModal}
        label="待办"
      />
      
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  calendarStrip: {
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 1,
    marginBottom: 8,
  },
  dateItem: {
    width: 50,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
  },
  dateNumber: {
    fontSize: 18,
    marginTop: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 8,
    borderRadius: 8,
  },
  todoCard: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  habitName: {
    fontSize: 16,
  },
  todoContent: {
    flex: 1,
    marginLeft: 8,
  },
});
