import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme, Surface } from 'react-native-paper';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { HabitLog } from '../types';

interface HabitCalendarProps {
  logs: HabitLog[];
  targetValue: number;
  onDatePress: (date: Date) => void;
}

export const HabitCalendar = ({ logs, targetValue, onDatePress }: HabitCalendarProps) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  const getDailyProgress = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd'); // Compare just date part
    const dayLogs = logs.filter(log => log.timestamp.startsWith(dateStr));
    const totalValue = dayLogs.reduce((sum, log) => sum + (log.value || 1), 0);
    return { totalValue, count: dayLogs.length };
  };

  const days = getDaysInMonth();
  const weeks = [];
  let week = [];
  days.forEach((day, index) => {
    week.push(day);
    if ((index + 1) % 7 === 0) {
      weeks.push(week);
      week = [];
    }
  });

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} />
        <Text variant="titleMedium" style={styles.monthTitle}>
          {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
        </Text>
        <IconButton icon="chevron-right" onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} />
      </View>

      {/* Weekdays Header */}
      <View style={styles.weekRow}>
        {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
          <Text key={i} style={[styles.dayCell, styles.weekdayText]}>{d}</Text>
        ))}
      </View>

      {/* Days */}
      {weeks.map((weekDays, wIndex) => (
        <View key={wIndex} style={styles.weekRow}>
          {weekDays.map((day, dIndex) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const { totalValue } = getDailyProgress(day);
            const isCompleted = totalValue >= targetValue;
            const hasSomeProgress = totalValue > 0;
            const isTodayDate = isToday(day);

            return (
              <TouchableOpacity
                key={dIndex}
                style={[styles.dayCell]}
                onPress={() => onDatePress(day)}
              >
                <View style={[
                  styles.dayCircle,
                  hasSomeProgress && { backgroundColor: isCompleted ? theme.colors.primary : theme.colors.primaryContainer },
                  isTodayDate && !hasSomeProgress && { borderWidth: 1, borderColor: theme.colors.primary }
                ]}>
                  <Text style={[
                    styles.dayText,
                    !isCurrentMonth && { opacity: 0.3 },
                    hasSomeProgress && { color: isCompleted ? '#FFF' : theme.colors.primary }
                  ]}>
                    {format(day, 'd')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthTitle: {
    fontWeight: 'bold',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayText: {
    color: '#888',
    fontSize: 12,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
  },
});
