import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { format, subWeeks, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';
import { HabitLog } from '../types';

interface HabitHeatmapProps {
  logs: HabitLog[];
  targetValue?: number; // If provided, used for binary/threshold coloring
  maxValue?: number; // If provided, used for gradient scaling (e.g. 5)
  color?: string;
  title?: string;
}

export const HabitHeatmap = ({ logs, targetValue, maxValue, color, title }: HabitHeatmapProps) => {
  const theme = useTheme();
  const activeColor = color || theme.colors.primary;
  const inactiveColor = theme.colors.surfaceVariant;

  // Helper to get color with opacity
  const getColor = (value: number, isCompleted: boolean) => {
    if (value === 0) return inactiveColor;
    
    if (maxValue) {
        // Gradient mode
        const opacity = Math.min(Math.max(value / maxValue, 0.2), 1);
        // Hex opacity: 0.2 -> 33, 1.0 -> FF
        const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
        return `${activeColor}${alpha}`;
    } else {
        // Threshold mode (default)
        const threshold = targetValue || 1;
        return value >= threshold ? activeColor : `${activeColor}80`;
    }
  };
  const today = new Date();
  const endDate = today;
  // Start from 52 weeks ago, aligned to start of week (Sunday)
  const startDate = startOfWeek(subWeeks(today, 51)); // 52 weeks including current

  // Process logs into a map for O(1) lookup
  const logsMap: Record<string, number> = {};
  logs.forEach(log => {
    const dateStr = format(new Date(log.timestamp), 'yyyy-MM-dd');
    logsMap[dateStr] = (logsMap[dateStr] || 0) + log.value;
  });

  // Generate weeks
  const weeks = [];
  let currentDate = startDate;
  
  // 52 weeks
  for (let w = 0; w < 52; w++) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const value = logsMap[dateStr] || 0;
      const isCompleted = value >= (targetValue || 1);
      const hasData = value > 0;
      
      weekDays.push({
        date: currentDate,
        dateStr,
        value,
        isCompleted,
        hasData
      });
      
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(weekDays);
  }

  const handleDayPress = (dateStr: string, value: number) => {
    Alert.alert(dateStr, `完成值: ${value}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || '年度热力图'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {weeks.map((week, wIndex) => (
            <View key={wIndex} style={styles.column}>
              {week.map((day, dIndex) => (
                <TouchableOpacity
                  key={day.dateStr}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: getColor(day.value, day.isCompleted)
                    }
                  ]}
                  onPress={() => handleDayPress(day.dateStr, day.value)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={[styles.cell, { backgroundColor: inactiveColor }]} />
        {maxValue ? (
            <>
                <View style={[styles.cell, { backgroundColor: activeColor + '66' }]} />
                <View style={[styles.cell, { backgroundColor: activeColor }]} />
            </>
        ) : (
            <View style={[styles.cell, { backgroundColor: activeColor }]} />
        )}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

const CELL_SIZE = 12;
const GAP = 2;

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
  },
  column: {
    marginRight: GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
    marginBottom: GAP,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingRight: 4,
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  }
});
