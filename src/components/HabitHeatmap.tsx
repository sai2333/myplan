import React, { useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { format, subWeeks, startOfWeek, addDays, isSameDay, subDays, getMonth, isSameMonth, parseISO, differenceInWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { HabitLog } from '../types';

interface HabitHeatmapProps {
  logs: HabitLog[];
  targetValue?: number; // If provided, used for binary/threshold coloring
  maxValue?: number; // If provided, used for gradient scaling (e.g. 5)
  color?: string;
  title?: string;
  endDate?: Date;
}

export const HabitHeatmap = ({ logs, targetValue, maxValue, color, title, endDate = new Date() }: HabitHeatmapProps) => {
  const theme = useTheme();
  const activeColor = color || theme.colors.primary;
  const inactiveColor = theme.colors.surfaceVariant;
  const backgroundColor = theme.colors.surface;

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

  // Calculate effective end date: max(endDate, maxLogDate)
  let effectiveEndDate = endDate;
  logs.forEach(log => {
      const logDate = parseISO(log.timestamp);
      if (logDate > effectiveEndDate) {
          effectiveEndDate = logDate;
      }
  });

  // Start from 52 weeks ago from the effective end date
  const startDate = startOfWeek(subWeeks(effectiveEndDate, 52), { weekStartsOn: 0 });

  // Process logs into a map for O(1) lookup
  const logsMap: Record<string, number> = {};
  logs.forEach(log => {
    const dateStr = format(new Date(log.timestamp), 'yyyy-MM-dd');
    logsMap[dateStr] = (logsMap[dateStr] || 0) + log.value;
  });

  // Generate weeks
  const weeks = [];
  let currentDate = startDate;
  
  // Calculate number of weeks needed to cover from startDate to effectiveEndDate
  // Add a buffer week to ensure coverage
  const weeksCount = differenceInWeeks(effectiveEndDate, startDate) + 2;

  for (let w = 0; w < weeksCount; w++) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const value = logsMap[dateStr] || 0;
      const isCompleted = value >= (targetValue || 1);
      
      // Only render if date is not in the future (relative to effectiveEndDate)
      const isFuture = currentDate > effectiveEndDate;

      weekDays.push({
        date: currentDate,
        dateStr,
        value,
        isCompleted,
        isFuture
      });
      
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(weekDays);
  }

  const handleDayPress = (dateStr: string, value: number) => {
    Alert.alert(dateStr, `完成值: ${value}`);
  };

  // Generate Month Labels
  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const firstDayOfWeek = week[0].date;
    const month = getMonth(firstDayOfWeek);
    if (month !== lastMonth) {
      monthLabels.push({ index, label: format(firstDayOfWeek, 'MMM', { locale: zhCN }) });
      lastMonth = month;
    }
  });

  const CELL_SIZE = 12;
  const GAP = 3;
  const DAY_LABEL_WIDTH = 20;

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [logs, endDate]); // Re-scroll when data changes

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.contentContainer}>
        {/* Day Labels (Left) */}
        <View style={styles.dayLabelsColumn}>
            <View style={{ height: 35 }} /> 
            <Text style={styles.dayLabelText}>一</Text>
            <View style={{ height: GAP + CELL_SIZE }} /> 
            <Text style={styles.dayLabelText}>三</Text>
            <View style={{ height: GAP + CELL_SIZE }} /> 
            <Text style={styles.dayLabelText}>五</Text>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
            <View>
                {/* Month Labels Row */}
                <View style={styles.monthLabelsRow}>
                    {monthLabels.map((m, i) => (
                        <Text 
                            key={i} 
                            style={[
                                styles.monthLabelText, 
                                { position: 'absolute', left: m.index * (CELL_SIZE + GAP) }
                            ]}
                        >
                            {m.label}
                        </Text>
                    ))}
                </View>

                {/* Grid */}
                <View style={styles.grid}>
                {weeks.map((week, wIndex) => (
                    <View key={wIndex} style={styles.column}>
                    {week.map((day, dIndex) => {
                        // Only show placeholder if it's a future date AND has no data
                        if (day.isFuture && day.value === 0) return <View key={day.dateStr} style={styles.cellPlaceholder} />;
                        return (
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
                        );
                    })}
                    </View>
                ))}
                </View>
            </View>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>少</Text>
        <View style={[styles.cell, { backgroundColor: inactiveColor }]} />
        {maxValue ? (
            <>
                <View style={[styles.cell, { backgroundColor: activeColor + '66' }]} />
                <View style={[styles.cell, { backgroundColor: activeColor }]} />
            </>
        ) : (
            <View style={[styles.cell, { backgroundColor: activeColor }]} />
        )}
        <Text style={styles.legendText}>多</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  contentContainer: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  dayLabelsColumn: {
    width: 20,
    paddingTop: 0,
    marginRight: 4,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 9,
    color: '#999',
    height: 12,
    marginBottom: 3 + 12 + 3, // GAP + CELL_SIZE + GAP (approx for skipping rows)
  },
  scrollContent: {
    paddingRight: 16,
  },
  monthLabelsRow: {
    flexDirection: 'row',
    height: 16,
    position: 'relative',
    marginBottom: 4,
  },
  monthLabelText: {
    fontSize: 10,
    color: '#666',
    width: 30,
  },
  grid: {
    flexDirection: 'row',
  },
  column: {
    marginRight: 3,
  },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginBottom: 3,
  },
  cellPlaceholder: {
    width: 12,
    height: 12,
    marginBottom: 3,
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
