import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, Switch, useTheme, Menu, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const { addTodo, updateTodo, deleteTodo } = useTodoStore();

  const isEditMode = !!todoToEdit;

  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  
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

  useEffect(() => {
    if (visible) {
      if (todoToEdit) {
        // Edit Mode: Populate fields
        setContent(todoToEdit.content);
        setNote(todoToEdit.note || '');
        setCategory(todoToEdit.category || '');
        
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
        setCategory('');
        setHasReminder(false);
        setRelatedHabitId(undefined);
        setRelatedHabitName('');
      }
    }
  }, [visible, defaultDate, todoToEdit]);

  const handleSave = async () => {
    if (!content.trim()) return;

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
              category,
          });
      } else {
          await addTodo(
              content,
              finalDueDate,
              finalReminder,
              note,
              relatedHabitId,
              category
          );
      }
      onDismiss();
    } catch (error) {
      console.error('Failed to save todo:', error);
      // Alert is not imported from react-native-paper, we need react-native's Alert
      const { Alert } = require('react-native');
      Alert.alert('保存失败', '无法保存待办事项，请重试。');
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
                onDismiss();
            }
          } 
        },
      ]
    );
  };

  const selectedHabit = habits.find(h => h.id === relatedHabitId);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleLarge" style={styles.title}>{isEditMode ? '编辑待办事项' : '新增待办事项'}</Text>
        
        <ScrollView style={styles.scrollContent}>
          <TextInput
            label="内容"
            value={content}
            onChangeText={setContent}
            mode="outlined"
            style={styles.input}
            autoFocus
          />

          <View style={styles.row}>
            <Text variant="bodyMedium">日期与时间</Text>
            <View style={{flexDirection: 'row'}}>
                <Button mode="text" onPress={() => setShowDueDatePicker(true)}>
                    {format(dueDate, 'yyyy-MM-dd', { locale: zhCN })}
                </Button>
                <Button mode="text" onPress={() => setShowDueTimePicker(true)}>
                    {format(dueDate, 'HH:mm', { locale: zhCN })}
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

          <TextInput
            label="分组"
            value={category}
            onChangeText={setCategory}
            mode="outlined"
            style={styles.input}
          />

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
            >
                删除
            </Button>
          )}
          <Button onPress={onDismiss} style={styles.button}>取消</Button>
          <Button mode="contained" onPress={handleSave} style={styles.button}>保存</Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
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
});
