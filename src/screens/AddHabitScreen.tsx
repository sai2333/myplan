import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Title, HelperText, useTheme, SegmentedButtons, Chip, Text, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useHabitStore } from '../store/useHabitStore';

export const AddHabitScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { createHabit } = useHabitStore();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [targetValue, setTargetValue] = useState('1');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'specific_days'>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [loading, setLoading] = useState(false);

  const toggleDay = (day: number) => {
    if (frequencyDays.includes(day)) {
      setFrequencyDays(frequencyDays.filter(d => d !== day));
    } else {
      setFrequencyDays([...frequencyDays, day].sort());
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const target = parseInt(targetValue) || 1;
      const reminder = hasReminder ? reminderTime.toISOString() : undefined;
      await createHabit(name, goal, target, category, frequency, frequencyDays, reminder);
      navigation.goBack();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Title style={[styles.title, { color: theme.colors.onBackground }]}>创建新习惯</Title>
        
        <TextInput
          label="习惯名称"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="例如：读书"
          activeOutlineColor={theme.colors.primary}
        />
        <HelperText type="info" visible={true}>
          给你的习惯起一个清晰的名字。
        </HelperText>

        <TextInput
          label="目标描述 (可选)"
          value={goal}
          onChangeText={setGoal}
          mode="outlined"
          style={styles.input}
          placeholder="例如：30分钟"
          activeOutlineColor={theme.colors.primary}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <TextInput
              label="每日目标次数"
              value={targetValue}
              onChangeText={(text) => setTargetValue(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              placeholder="1"
              activeOutlineColor={theme.colors.primary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <TextInput
              label="分类 (可选)"
              value={category}
              onChangeText={setCategory}
              mode="outlined"
              style={styles.input}
              placeholder="例如：健康"
              activeOutlineColor={theme.colors.primary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>频率</Text>
          <SegmentedButtons
            value={frequency}
            onValueChange={value => setFrequency(value as any)}
            buttons={[
              { value: 'daily', label: '每天' },
              { value: 'specific_days', label: '特定日期' },
            ]}
            style={styles.segmentedButton}
          />
          
          {frequency === 'specific_days' && (
            <View style={styles.daysContainer}>
              {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                <Chip 
                  key={index} 
                  selected={frequencyDays.includes(index)}
                  onPress={() => toggleDay(index)}
                  style={styles.dayChip}
                  showSelectedOverlay
                >
                  {day}
                </Chip>
              ))}
            </View>
          )}
          <HelperText type="info" visible={frequency === 'specific_days' && frequencyDays.length === 0}>
            请至少选择一天。
          </HelperText>
        </View>

        <View style={styles.section}>
            <View style={styles.switchRow}>
                <Text style={[styles.label, { marginBottom: 0 }]}>提醒</Text>
                <Switch value={hasReminder} onValueChange={setHasReminder} color={theme.colors.primary} />
            </View>
            
            {hasReminder && (
                <View style={styles.timeContainer}>
                    <Button mode="outlined" onPress={() => setShowTimePicker(true)}>
                        {format(reminderTime, 'HH:mm')}
                    </Button>
                    <HelperText type="info">将在设定时间发送通知</HelperText>
                </View>
            )}

            {showTimePicker && (
                <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                        setShowTimePicker(Platform.OS === 'ios');
                        if (date) setReminderTime(date);
                    }}
                />
            )}
        </View>

        <Button 
          mode="contained" 
          onPress={handleSave} 
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          loading={loading}
          disabled={!name.trim() || loading || (frequency === 'specific_days' && frequencyDays.length === 0)}
        >
          保存习惯
        </Button>
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
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  section: {
    marginBottom: 16,
    marginTop: 8,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  segmentedButton: {
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
  },
});
