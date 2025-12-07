import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Switch, Divider, useTheme, Text, Portal, Dialog } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/useSettingsStore';
import { useHabitStore } from '../store/useHabitStore';
import { exportData, importData } from '../utils/backup';

import { useTodoStore } from '../store/useTodoStore';

export const SettingsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode, isVibrationEnabled, toggleVibration } = useSettingsStore();
  const fetchHabits = useHabitStore((state) => state.fetchHabits);
  const { fetchTodos, fetchCategories } = useTodoStore();
  const [visible, setVisible] = React.useState(false);

  const showDialog = () => setVisible(true);
  const hideDialog = () => setVisible(false);

  const handleExport = () => {
    exportData();
  };

  const handleImport = () => {
    importData(() => {
      // Refresh data after successful import
      fetchHabits();
      fetchTodos();
      fetchCategories();
    });
  };

  const getThemeLabel = (mode: string) => {
    switch (mode) {
      case 'light': return '白';
      case 'dark': return '黑';
      case 'mario': return '马里奥';
      case 'splatoon': return '斯普拉遁3';
      default: return '白';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.colors.surface }]}>
        <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>设置</Text>
      </View>
      <List.Section>
        <List.Subheader>常规</List.Subheader>
        <List.Item
          title="主题"
          description={getThemeLabel(themeMode)}
          onPress={showDialog}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="震动反馈"
          description="完成任务时震动"
          right={() => <Switch value={isVibrationEnabled} onValueChange={toggleVibration} />}
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

      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog}>
          <Dialog.Title>选择主题</Dialog.Title>
          <Dialog.Content>
            <List.Item
                title="白"
                onPress={() => { setThemeMode('light'); hideDialog(); }}
                right={themeMode === 'light' ? props => <List.Icon {...props} icon="check" /> : undefined}
            />
            <List.Item
                title="黑"
                onPress={() => { setThemeMode('dark'); hideDialog(); }}
                right={themeMode === 'dark' ? props => <List.Icon {...props} icon="check" /> : undefined}
            />
            <List.Item
                title="马里奥"
                onPress={() => { setThemeMode('mario'); hideDialog(); }}
                right={themeMode === 'mario' ? props => <List.Icon {...props} icon="check" /> : undefined}
            />
            <List.Item
                title="斯普拉遁3"
                onPress={() => { setThemeMode('splatoon'); hideDialog(); }}
                right={themeMode === 'splatoon' ? props => <List.Icon {...props} icon="check" /> : undefined}
            />
          </Dialog.Content>
        </Dialog>
      </Portal>
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
