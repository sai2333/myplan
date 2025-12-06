import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity, Keyboard, Modal as RNModal, TouchableWithoutFeedback, Animated, Dimensions, Easing } from 'react-native';
import { Portal, Text, Button, TextInput, Switch, useTheme, Menu, Divider, Chip, Dialog, Checkbox } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useHabitStore } from '../store/useHabitStore';
import { useTodoStore } from '../store/useTodoStore';
import { Todo } from '../types';

interface TodoModalProps {
  visible: boolean;
  onDismiss: () => void;
  defaultDate?: Date;
  todoToEdit?: Todo; // Optional: if provided, we are in edit mode
}

export const TodoModal = ({ visible, onDismiss, defaultDate, todoToEdit }: TodoModalProps) => {
  const theme = useTheme();
  const { habits } = useHabitStore();
  const { addTodo, updateTodo, deleteTodo, categories, fetchCategories } = useTodoStore();

  const isEditMode = !!todoToEdit;

  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [autoPostpone, setAutoPostpone] = useState(false);
  
  // Date & Time
  const [dueDate, setDueDate] = useState(new Date());
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showDueTimePicker, setShowDueTimePicker] = useState(false);
  
  // Reminder
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  // Related Habit
  const [showHabitMenu, setShowHabitMenu] = useState(false);
  const [relatedHabitId, setRelatedHabitId] = useState<string | undefined>(undefined);
  const [relatedHabitName, setRelatedHabitName] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
        // Reset values
        fadeAnim.setValue(0);
        translateYAnim.setValue(SCREEN_HEIGHT);
        
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(translateYAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 25, // Increased damping for less bounce, faster settle
                stiffness: 120, // Increased stiffness for faster movement
                mass: 0.8, // Reduced mass for faster acceleration
            })
        ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
      Keyboard.dismiss();
      Animated.parallel([
          Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
              toValue: SCREEN_HEIGHT,
              duration: 200, // Reduced duration for faster exit
              useNativeDriver: true,
          })
      ]).start(() => {
          onDismiss();
      });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Only adjust padding on iOS, Android handles keyboard resize natively or via softInputMode
        if (Platform.OS === 'ios') {
            setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (Platform.OS === 'ios') {
            setKeyboardHeight(0);
        }
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      fetchCategories();
      if (todoToEdit) {
        // Edit Mode: Populate fields
        setContent(todoToEdit.content);
        setNote(todoToEdit.note || '');
        // Handle migration from single category to multiple
        if (todoToEdit.categories && todoToEdit.categories.length > 0) {
          setSelectedCategories(todoToEdit.categories);
        } else if (todoToEdit.category) {
          setSelectedCategories([todoToEdit.category]);
        } else {
          setSelectedCategories([]);
        }
        
        setAutoPostpone(!!todoToEdit.autoPostpone);
        
        // Logic: Initialize Due Date and Reminder independently
        const now = new Date();
        now.setSeconds(0, 0);

        // 1. Set Due Date
        if (todoToEdit.dueDate) {
            setDueDate(new Date(todoToEdit.dueDate));
        } else {
            setDueDate(now);
        }

        // 2. Set Reminder
        if (todoToEdit.reminderTime) {
            setReminderTime(new Date(todoToEdit.reminderTime));
            setHasReminder(true);
        } else {
            // Default reminder time to due date (or now) if not set
            // This makes it convenient if user toggles reminder on
            const baseTime = todoToEdit.dueDate ? new Date(todoToEdit.dueDate) : now;
            setReminderTime(baseTime);
            setHasReminder(false);
        }

        setRelatedHabitId(todoToEdit.relatedHabitId);
        const habit = habits.find(h => h.id === todoToEdit.relatedHabitId);
        setRelatedHabitName(habit ? habit.name : '');

      } else {
        // Add Mode: Reset fields
        const now = new Date();
        now.setSeconds(0, 0); // Reset seconds and milliseconds
        const initialDate = defaultDate || now;
        if (defaultDate) {
            // If defaultDate is provided (e.g. from schedule view), it might have time info or be start of day.
            // Let's ensure we respect it but maybe default time to now if it's just a date?
            // For now, just use it. But reset seconds if it's "now" context.
            // Actually, if defaultDate is passed from ScheduleScreen, it's usually 00:00:00 or specific.
            // If it's selectedDate (00:00:00), we might want to set time to current time?
            // But let's stick to simple logic: reset seconds of whatever is passed or generated.
             const d = new Date(initialDate);
             d.setSeconds(0, 0);
             setDueDate(d);
             setReminderTime(d);
        } else {
             setDueDate(now);
             setReminderTime(now);
        }
        
        setContent('');
        setNote('');
        setSelectedCategories([]);
        setAutoPostpone(false);
        setHasReminder(false);
        setRelatedHabitId(undefined);
        setRelatedHabitName('');
      }
    }
  }, [visible, defaultDate, todoToEdit]);

  const handleSave = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      // Force reset seconds/milliseconds one last time before saving to ensure precision
      const cleanDueDate = new Date(dueDate);
      cleanDueDate.setSeconds(0, 0);
      
      let cleanReminderTime = new Date(reminderTime);
      cleanReminderTime.setSeconds(0, 0);

      const finalDueDate = cleanDueDate.toISOString();
      const finalReminder = hasReminder ? cleanReminderTime.toISOString() : undefined;

      if (isEditMode && todoToEdit) {
          await updateTodo({
              ...todoToEdit,
              content,
              dueDate: finalDueDate,
              reminderTime: finalReminder,
              note,
              relatedHabitId,
              categories: selectedCategories,
              autoPostpone,
          });
      } else {
          await addTodo(
              content,
              finalDueDate,
              finalReminder,
              note,
              relatedHabitId,
              selectedCategories,
              autoPostpone
          );
      }
      handleDismiss();
    } catch (error) {
      console.error('Failed to save todo:', error);
      // Alert is not imported from react-native-paper, we need react-native's Alert
      const { Alert } = require('react-native');
      Alert.alert('保存失败', '无法保存待办事项，请重试。');
    } finally {
      setLoading(false);
    }
  };

  const onDueDateChange = (event: any, selectedDate?: Date) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      // Preserve time from current dueDate, update date
      const newDate = new Date(selectedDate);
      newDate.setHours(dueDate.getHours());
      newDate.setMinutes(dueDate.getMinutes());
      newDate.setSeconds(0, 0);
      setDueDate(newDate);
    }
  };

  const onDueTimeChange = (event: any, selectedDate?: Date) => {
    setShowDueTimePicker(false);
    if (selectedDate) {
      // Preserve date from current dueDate, update time
      const newDate = new Date(dueDate);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0, 0);
      setDueDate(newDate);
    }
  };

  const onReminderDateChange = (event: any, selectedDate?: Date) => {
    setShowReminderDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(reminderTime.getHours());
      newDate.setMinutes(reminderTime.getMinutes());
      newDate.setSeconds(0, 0);
      setReminderTime(newDate);
    }
  };

  const onReminderTimeChange = (event: any, selectedDate?: Date) => {
    setShowReminderTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(reminderTime);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0, 0);
      setReminderTime(newDate);
    }
  };

  const handleDelete = () => {
    const { Alert } = require('react-native');
    Alert.alert(
      '删除待办',
      '确定要删除这条待办事项吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive', 
          onPress: async () => {
            if (todoToEdit) {
                await deleteTodo(todoToEdit.id);
                handleDismiss();
            }
          } 
        },
      ]
    );
  };

  const selectedHabit = habits.find(h => h.id === relatedHabitId);

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleDismiss}
    >
        <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={handleDismiss}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

          <TouchableWithoutFeedback>
            <Animated.View style={[
                styles.container, 
                { 
                    backgroundColor: theme.colors.background,
                    paddingBottom: 20 + keyboardHeight,
                    transform: [{ translateY: translateYAnim }]
                }
            ]}>
              <Text variant="titleLarge" style={styles.title}>{isEditMode ? '编辑待办事项' : '新增待办事项'}</Text>
              
              <ScrollView style={styles.scrollContent}>
                <TextInput
                  label="内容"
                  value={content}
                  onChangeText={setContent}
                  mode="outlined"
                  style={styles.input}
                  // autoFocus removed
                />

                <View style={styles.row}>
            <Text variant="bodyMedium">日期与时间</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Button mode="text" onPress={() => setShowDueDatePicker(true)}>
                    {format(dueDate, 'yyyy-MM-dd', { locale: zhCN })}
                </Button>
                <Button mode="text" onPress={() => setShowDueTimePicker(true)}>
                    {format(dueDate, 'HH:mm', { locale: zhCN })}
                </Button>
                <Button mode="text" compact onPress={() => {
                    const newDate = new Date(dueDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setDueDate(newDate);
                    if (hasReminder) {
                        const newReminder = new Date(reminderTime);
                        newReminder.setDate(newReminder.getDate() + 1);
                        setReminderTime(newReminder);
                    }
                }}>
                    +1天
                </Button>
            </View>
          </View>

          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={onDueDateChange}
            />
          )}
          {showDueTimePicker && (
            <DateTimePicker
              value={dueDate}
              mode="time"
              display="default"
              onChange={onDueTimeChange}
            />
          )}

          <View style={styles.row}>
            <Text variant="bodyMedium">自动顺延</Text>
            <Switch value={autoPostpone} onValueChange={setAutoPostpone} />
          </View>
          <Text variant="bodySmall" style={{color: '#999', marginBottom: 12, marginTop: -8, marginLeft: 4}}>
              未完成的任务将自动延期到第二天
          </Text>

          <View style={styles.row}>
            <Text variant="bodyMedium">开启提醒</Text>
            <Switch value={hasReminder} onValueChange={setHasReminder} />
          </View>

          {hasReminder && (
             <View style={styles.subRow}>
               <Text variant="bodySmall" style={{marginRight: 8}}>提醒时间:</Text>
               <Button mode="outlined" compact onPress={() => setShowReminderDatePicker(true)} style={{marginRight: 8}}>
                  {format(reminderTime, 'MM-dd', { locale: zhCN })}
               </Button>
               <Button mode="outlined" compact onPress={() => setShowReminderTimePicker(true)}>
                  {format(reminderTime, 'HH:mm', { locale: zhCN })}
               </Button>
             </View>
          )}

          {showReminderDatePicker && (
            <DateTimePicker
              value={reminderTime}
              mode="date"
              display="default"
              onChange={onReminderDateChange}
            />
          )}
          {showReminderTimePicker && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              display="default"
              onChange={onReminderTimeChange}
            />
          )}

          <TextInput
            label="备注"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            multiline
            style={styles.input}
          />

          <View style={styles.categoryContainer}>
            <View style={styles.row}>
                <Text variant="bodyMedium">分组</Text>
                <Button mode="text" onPress={() => setShowCategoryModal(true)}>
                    {selectedCategories.length > 0 ? '编辑分组' : '选择分组'}
                </Button>
            </View>
            
            <View style={styles.chipsContainer}>
                {selectedCategories.map((cat, index) => (
                    <Chip
                        key={index}
                        onClose={() => setSelectedCategories(prev => prev.filter(c => c !== cat))}
                        style={styles.chip}
                    >
                        {cat}
                    </Chip>
                ))}
                {selectedCategories.length === 0 && (
                    <Text variant="bodySmall" style={{ color: '#999', marginLeft: 4 }}>未选择任何分组</Text>
                )}
            </View>
          </View>

          <RNModal visible={showCategoryModal} transparent={true} animationType="fade" onRequestClose={() => setShowCategoryModal(false)}>
             <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20}}>
                <View style={{backgroundColor: theme.colors.background, borderRadius: 8, maxHeight: '80%'}}>
                    <Text style={{fontSize: 18, fontWeight: 'bold', padding: 16, textAlign: 'center', color: theme.colors.onSurface}}>选择分组</Text>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                        {categories.length === 0 ? (
                            <Text style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无分组，请在首页添加</Text>
                        ) : (
                            categories.map((cat, index) => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={styles.categoryItem}
                                        onPress={() => {
                                            if (isSelected) {
                                                setSelectedCategories(prev => prev.filter(c => c !== cat));
                                            } else {
                                                setSelectedCategories(prev => [...prev, cat]);
                                            }
                                        }}
                                    >
                                        <Checkbox.Android 
                                            status={isSelected ? 'checked' : 'unchecked'} 
                                            onPress={() => {
                                                if (isSelected) {
                                                    setSelectedCategories(prev => prev.filter(c => c !== cat));
                                                } else {
                                                    setSelectedCategories(prev => [...prev, cat]);
                                                }
                                            }}
                                        />
                                        <Text style={{ marginLeft: 8, fontSize: 16 }}>{cat}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                    <View style={{padding: 8, flexDirection: 'row', justifyContent: 'flex-end'}}>
                        <Button onPress={() => setShowCategoryModal(false)}>完成</Button>
                    </View>
                </View>
             </View>
          </RNModal>

          <Menu
            visible={showHabitMenu}
            onDismiss={() => setShowHabitMenu(false)}
            anchor={
              <Button mode="outlined" onPress={() => setShowHabitMenu(true)} style={styles.input}>
                {selectedHabit ? `关联习惯: ${selectedHabit.name}` : '关联习惯 (可选)'}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setRelatedHabitId(undefined); setShowHabitMenu(false); }} title="无" />
            <Divider />
            {habits.map(habit => (
              <Menu.Item 
                key={habit.id} 
                onPress={() => { 
                  setRelatedHabitId(habit.id); 
                  setRelatedHabitName(habit.name);
                  setShowHabitMenu(false); 
                }} 
                title={habit.name} 
              />
            ))}
          </Menu>

        </ScrollView>

        <View style={styles.actions}>
          {isEditMode && (
            <Button 
                onPress={handleDelete} 
                textColor={theme.colors.error} 
                style={[styles.button, { marginRight: 'auto', marginLeft: 0 }]}
                disabled={loading}
            >
                删除
            </Button>
          )}
          <Button onPress={handleDismiss} style={styles.button} disabled={loading}>取消</Button>
          <Button mode="contained" onPress={handleSave} style={styles.button} loading={loading} disabled={loading}>保存</Button>
        </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    // backgroundColor removed, handled by backdrop
  },
  backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    padding: 20,
    // margin: 20, // Removed for drawer style
    borderTopLeftRadius: 16, // Rounded top corners
    borderTopRightRadius: 16,
    // borderRadius: 8, // Removed
    maxHeight: '90%', // Increased max height
    width: '100%', // Full width
    alignSelf: 'center', // Ensure center alignment
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollContent: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    marginLeft: 8,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
