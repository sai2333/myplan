import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, InteractionManager } from 'react-native';
import { Text, Title, Card, useTheme, Divider, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/useHabitStore';
import { useTodoStore } from '../store/useTodoStore';
import { getLogsSince } from '../db';
import { subDays, format, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { HabitLog } from '../types';

export const StatsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { habits, todayLogs } = useHabitStore();
  const { todos, fetchTodos } = useTodoStore();
  const [weeklyData, setWeeklyData] = useState<{ date: Date; count: number }[]>([]);
  const [annualLogs, setAnnualLogs] = useState<HabitLog[]>([]);

  const totalHabits = habits.length;
  const completedToday = todayLogs.length;
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  // Todo Stats
  const totalTodos = todos.length;
  const activeTodos = todos.filter(t => !t.isCompleted).length;
  const completedTodos = todos.filter(t => t.isCompleted).length;
  const todoCompletionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  const [ready, setReady] = useState(false);

  const loadData = async () => {
    const today = new Date();
    
    // Weekly Data
    const sevenDaysAgo = subDays(today, 6);
    const recentLogs = await getLogsSince(sevenDaysAgo.toISOString());
    const wData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const count = recentLogs.filter(log => isSameDay(parseISO(log.timestamp), date)).length;
      wData.push({ date, count });
    }
    setWeeklyData(wData);

    // Annual Data for Heatmap
    const oneYearAgo = subDays(today, 365);
    const yearLogs = await getLogsSince(oneYearAgo.toISOString());
    setAnnualLogs(yearLogs);
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setReady(true);
      fetchTodos();
      loadData();
    });

    return () => task.cancel();
  }, [todayLogs]); // Reload when today's logs change

  if (!ready) {
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
            <Text>加载统计数据...</Text>
        </View>
    );
  }

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1); // Avoid division by zero

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <Title style={[styles.title, { color: theme.colors.onBackground }]}>数据统计</Title>
      
      {/* Habits Overview */}
      <Text style={styles.sectionTitle}>习惯概览</Text>
      <View style={styles.grid}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{totalHabits}</Title>
            <Text style={styles.cardLabel}>总习惯</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>{completedToday}</Title>
            <Text style={styles.cardLabel}>今日打卡</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>{completionRate}%</Title>
            <Text style={styles.cardLabel}>今日完成率</Text>
          </Card.Content>
        </Card>
      </View>

      <Divider style={styles.divider} />

      {/* Todos Overview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>待办概览</Text>
        <IconButton 
          icon="timeline-clock" 
          size={20} 
          onPress={() => navigation.navigate('TodoTimeline')} 
          style={{ margin: 0 }}
        />
      </View>
      <View style={styles.grid}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{activeTodos}</Title>
            <Text style={styles.cardLabel}>待完成</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>{completedTodos}</Title>
            <Text style={styles.cardLabel}>已完成</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>{todoCompletionRate}%</Title>
            <Text style={styles.cardLabel}>总完成率</Text>
          </Card.Content>
        </Card>
      </View>

      <Divider style={styles.divider} />

      {/* Charts */}
      <Text style={styles.sectionTitle}>趋势分析</Text>
      
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={{ marginBottom: 16, fontSize: 16 }}>近7天打卡趋势</Title>
          <View style={styles.chartContainer}>
            {weeklyData.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: `${(item.count / maxCount) * 100}%`,
                        backgroundColor: theme.colors.primary 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.dayLabel}>
                  {format(item.date, 'E', { locale: zhCN })}
                </Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.chartCard, { marginTop: 16 }]}>
        <Card.Content>
           <HabitHeatmap 
             logs={annualLogs} 
             maxValue={5} 
             title="年度打卡热力图"
             color={theme.colors.secondary}
           />
        </Card.Content>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cardLabel: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
  },
  chartCard: {
    marginBottom: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingBottom: 10,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  divider: {
      marginVertical: 16,
  }
});
