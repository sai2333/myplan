import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import { getAllHabitsIncludingArchived, getAllLogs, getAllTodos, restoreData } from '../db';
import { Habit, HabitLog, Todo } from '../types';

export const exportData = async () => {
  try {
    const habits = await getAllHabitsIncludingArchived();
    const logs = await getAllLogs();
    const todos = await getAllTodos();

    const backupData = {
      version: 2, // Incremented version for new schema support
      timestamp: new Date().toISOString(),
      data: {
        habits,
        logs,
        todos,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);

    if (Platform.OS === 'web') {
        // Web implementation: create a Blob and download
        try {
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `myplan_backup_${new Date().getTime()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert('导出成功', '文件已开始下载');
        } catch (e) {
           console.error(e);
           Alert.alert('导出失败', 'Web 端导出出错');
        }
        return;
    }

    const fileName = `myplan_backup_${new Date().getTime()}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath);
    } else {
      Alert.alert('无法分享', '当前设备不支持分享功能');
    }
  } catch (error) {
    console.error('Export failed:', error);
    Alert.alert('导出失败', '请重试');
  }
};

export const importData = async (onSuccess?: () => void) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const file = result.assets[0];
    if (!file) return;

    let content: string;

    if (Platform.OS === 'web') {
       try {
         const response = await fetch(file.uri);
         content = await response.text();
       } catch (e) {
         console.error("Web file read error:", e);
         Alert.alert('读取失败', '无法读取文件内容');
         return;
       }
    } else {
       content = await FileSystem.readAsStringAsync(file.uri);
    }

    const backupData = JSON.parse(content);

    if (!backupData || !backupData.data || !backupData.data.habits) {
      Alert.alert('无效的备份文件', '无法解析文件内容');
      return;
    }

    const { habits, logs, todos } = backupData.data as { habits: Habit[]; logs: HabitLog[]; todos?: Todo[] };

    Alert.alert(
      '确认恢复',
      `将恢复 ${habits.length} 个习惯、${logs.length} 条记录和 ${todos?.length || 0} 个待办，这将覆盖当前所有数据。确定吗？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '恢复', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await restoreData(habits, logs, todos || []);
              Alert.alert('恢复成功', '数据已恢复');
              if (onSuccess) onSuccess();
            } catch (e) {
              console.error(e);
              Alert.alert('恢复失败', '数据库操作出错');
            }
          } 
        },
      ]
    );

  } catch (error) {
    console.error('Import failed:', error);
    Alert.alert('导入失败', '请重试');
  }
};
