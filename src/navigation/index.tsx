import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../store/useSettingsStore';

import { HomeScreen } from '../screens/HomeScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddHabitScreen } from '../screens/AddHabitScreen';
import { HabitDetailScreen } from '../screens/HabitDetailScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { FocusScreen } from '../screens/FocusScreen';
import { TodoTimelineScreen } from '../screens/TodoTimelineScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Focus') {
            iconName = focused ? 'timer' : 'timer-outline';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        sceneStyle: { backgroundColor: 'transparent' }, // Important for transparent background
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: '日程' }} />
      <Tab.Screen name="Focus" component={FocusScreen} options={{ title: '专注' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '统计' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const theme = useTheme();
  const themeMode = useSettingsStore((state) => state.themeMode);

  const navigationTheme = React.useMemo(() => {
    const baseTheme = (themeMode === 'dark' || themeMode === 'splatoon') ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: theme.colors.background, // Sync background color
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.outline,
        primary: theme.colors.primary,
      },
    };
  }, [themeMode, theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          contentStyle: { backgroundColor: 'transparent' }, // Important for transparent background
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="AddHabit" 
          component={AddHabitScreen} 
          options={{ title: '新建习惯', presentation: 'modal' }} 
        />
        <Stack.Screen 
          name="HabitDetail" 
          component={HabitDetailScreen} 
          options={{ title: '习惯详情' }} 
        />
        <Stack.Screen 
          name="TodoTimeline" 
          component={TodoTimelineScreen} 
          options={{ title: '今日待办时间轴' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
