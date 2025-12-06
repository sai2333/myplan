import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Dimensions, Animated } from 'react-native';
import { Text, Card, Title, IconButton, useTheme, Checkbox, FAB, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addDays, isSameDay, parseISO, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useHabitStore } from '../store/useHabitStore';
import { useTodoStore } from '../store/useTodoStore';
import { Todo } from '../types';
import { TodoModal } from '../components/TodoModal';
import { playCompletionSound } from '../utils/sound';

export const HomeScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { habits, selectedDateLogs, fetchHabits, fetchLogsForDate, logHabit, loading: habitsLoading } = useHabitStore();
  const { todos, fetchTodos, addTodo, toggleTodo, deleteTodo, addCategory, loading: todosLoading } = useTodoStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'todo' | 'habit'>('todo');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isTodoModalVisible, setIsTodoModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>(undefined);
  const insets = useSafeAreaInsets();
  
  const { width } = Dimensions.get('window');
  const tabWidth = width / 3;
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [0, tabWidth],
  });

  const handleTabPress = (tab: 'todo' | 'habit') => {
      if (tab === 'todo') {
          scrollRef.current?.scrollTo({ x: 0, animated: true });
      } else {
          scrollRef.current?.scrollTo({ x: width, animated: true });
      }
  };

  const handleScrollEnd = (e: any) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / width);
      if (index === 0) setActiveTab('todo');
      else if (index === 1) setActiveTab('habit');
  };

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

  const handleCheckHabit = async (habitId: string) => {
    await logHabit(habitId, 1, undefined, selectedDate.toISOString());
    playCompletionSound();
  };

  const handleOpenAddModal = () => {
      setEditingTodo(undefined);
      setIsTodoModalVisible(true);
  };

  const handleOpenEditModal = (todo: Todo) => {
      setEditingTodo(todo);
      setIsTodoModalVisible(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await addCategory(newCategoryName);
      setNewCategoryName('');
      setIsCategoryModalVisible(false);
    } catch (error) {
      Alert.alert('错误', '添加分组失败');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>今日计划</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'todo' && styles.activeTabItem]}
            onPress={() => handleTabPress('todo')}
        >
            <Text style={[styles.tabText, activeTab === 'todo' && { color: theme.colors.primary, fontWeight: 'bold' }]}>待办</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'habit' && styles.activeTabItem]}
            onPress={() => handleTabPress('habit')}
        >
            <Text style={[styles.tabText, activeTab === 'habit' && { color: theme.colors.primary, fontWeight: 'bold' }]}>习惯</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => setIsCategoryModalVisible(true)}
        >
            <Text style={styles.tabText}>分组</Text>
        </TouchableOpacity>

        {/* Animated Indicator */}
        <Animated.View 
            style={[
                styles.activeTabIndicator, 
                { 
                    backgroundColor: theme.colors.primary,
                    width: tabWidth * 0.6, // 60% of tab width
                    left: (tabWidth - tabWidth * 0.6) / 2, // Center it within the first tab
                    transform: [{ translateX: indicatorTranslateX }]
                }
            ]} 
        />
      </View>

      <ScrollView 
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Todo Page */}
        <View style={{ width, flex: 1 }}>
            <ScrollView 
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={todosLoading} onRefresh={fetchTodos} />
                }
            >
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
                            onPress={() => {
                                const newValue = !todo.isCompleted;
                                toggleTodo(todo.id, newValue);
                                if (newValue) {
                                    playCompletionSound();
                                }
                            }}
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
        </View>

        {/* Habit Page */}
        <View style={{ width, flex: 1 }}>
            <ScrollView 
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={habitsLoading} onRefresh={fetchHabits} />
                }
            >
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
            </ScrollView>
        </View>
      </ScrollView>
      
      {/* FAB for Quick Add Todo or Habit (Bottom Right) */}
      {activeTab === 'todo' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleOpenAddModal}
          label="待办"
        />
      )}

      {activeTab === 'habit' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('AddHabit' as any)}
          label="习惯"
        />
      )}
      
      <TodoModal
        visible={isTodoModalVisible}
        onDismiss={() => setIsTodoModalVisible(false)}
        defaultDate={selectedDate}
        todoToEdit={editingTodo}
      />

      <Portal>
        <Dialog visible={isCategoryModalVisible} onDismiss={() => setIsCategoryModalVisible(false)} style={{ backgroundColor: theme.colors.background }}>
            <Dialog.Title style={{ color: theme.colors.onSurface }}>添加分组</Dialog.Title>
            <Dialog.Content>
                <TextInput
                    label="分组名称"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    mode="outlined"
                    autoFocus
                />
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setIsCategoryModalVisible(false)}>取消</Button>
                <Button onPress={handleAddCategory}>确定</Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 1,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTabItem: {
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
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
