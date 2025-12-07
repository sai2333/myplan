import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Switch, Divider, useTheme, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/useSettingsStore';
import { useHabitStore } from '../store/useHabitStore';
import { exportData, importData } from '../utils/backup';

export const SettingsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isDarkTheme, toggleTheme } = useSettingsStore();
  const fetchHabits = useHabitStore((state) => state.fetchHabits);

  const handleExport = () => {
    exportData();
  };

  const handleImport = () => {
    importData(() => {
      // Refresh data after successful import
      fetchHabits();
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.colors.surface }]}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>设置</Text>
      </View>
      <List.Section>
        <List.Subheader>常规</List.Subheader>
        <List.Item
          title="深色模式"
          right={() => <Switch value={isDarkTheme} onValueChange={toggleTheme} />}
        />
        <Divider />
        <List.Item
          title="导出数据"
          description="备份你的习惯和记录"
          left={props => <List.Icon {...props} icon="export" />}
          onPress={handleExport}
        />
        <List.Item
          title="导入数据"
          description="从备份恢复"
          left={props => <List.Icon {...props} icon="import" />}
          onPress={handleImport}
        />
      </List.Section>
      
      <List.Section>
        <List.Subheader>关于</List.Subheader>
        <List.Item title="版本" description="1.0.0" />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
});
