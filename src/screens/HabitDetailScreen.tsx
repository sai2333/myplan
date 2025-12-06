import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image, Platform } from 'react-native';
import { Title, Text, Button, useTheme, Paragraph, List, Portal, Modal, TextInput, IconButton, Divider, Card, Snackbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useHabitStore } from '../store/useHabitStore';
import { HabitCalendar } from '../components/HabitCalendar';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { calculateHabitStats } from '../utils/stats';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { HabitLog } from '../types';
import * as ImagePicker from 'expo-image-picker';
import RNDateTimePicker from '@react-native-community/datetimepicker';

export const HabitDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const theme = useTheme();
  const { id } = route.params as { id: string };
  const { habits, archiveHabit, fetchHabitLogs, currentHabitLogs, logHabit, updateLog, deleteLog, updateHabit } = useHabitStore();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<HabitLog | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState('');
  
  // Form states
  const [logValue, setLogValue] = useState('1');
  const [logNote, setLogNote] = useState('');
  const [logImage, setLogImage] = useState<string | undefined>(undefined);

  const habit = habits.find(h => h.id === id);

  const stats = useMemo(() => {
    if (!habit) return null;
    return calculateHabitStats(habit, currentHabitLogs);
  }, [habit, currentHabitLogs]);

  useEffect(() => {
    fetchHabitLogs(id);
  }, [id]);

  if (!habit) {
    return (
      <View style={styles.container}>
        <Text>未找到习惯</Text>
      </View>
    );
  }

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
        setShowTimePicker(false);
        if (selectedDate && event.type !== 'dismissed') {
            await updateHabit({
                id: habit.id,
                reminderTime: selectedDate.toISOString()
            });
        }
    } else {
        // iOS
        if (selectedDate) {
            setTempDate(selectedDate);
        }
    }
  };

  const confirmIOSDate = async () => {
      setShowTimePicker(false);
      await updateHabit({ id: habit.id, reminderTime: tempDate.toISOString() });
  };

  const onEditTimePress = () => {
      setTempDate(habit.reminderTime ? new Date(habit.reminderTime) : new Date());
      setShowTimePicker(true);
  };

  const handleDatePress = (date: Date) => {
    if (modalVisible || isSaving) return;
    setSelectedDate(date);
    setEditingLog(null);
    setLogValue('1');
    setLogNote('');
    setLogImage(undefined);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLogImage(result.assets[0].uri);
    }
  };

  const getLogsForSelectedDate = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return currentHabitLogs.filter(log => log.timestamp.startsWith(dateStr));
  };

  const handleSaveLog = async () => {
    if (!selectedDate) return;
    if (isSaving) return;
    setIsSaving(true);
    const value = parseFloat(logValue) || 0;
    
    if (editingLog) {
      // Update
      try {
        await updateLog({
          ...editingLog,
          value,
          note: logNote,
          imageUri: logImage
        });
        setSnackbarText('记录已更新');
        setSnackbarVisible(true);
        setModalVisible(false);
      } catch (e) {
        setSnackbarText('更新失败');
        setSnackbarVisible(true);
      }
    } else {
      // Create new
      // For simplicity, we use the current time but with the selected date
      const now = new Date();
      const timestamp = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        now.getHours(),
        now.getMinutes()
      ).toISOString();
      try {
        await logHabit(id, value, logNote, timestamp, logImage);
        setSnackbarText('记录已添加');
        setSnackbarVisible(true);
        setModalVisible(false);
      } catch (e) {
        setSnackbarText('添加失败');
        setSnackbarVisible(true);
      }
    }
    
    setEditingLog(null);
    setLogValue('1');
    setLogNote('');
    setLogImage(undefined);
    setIsSaving(false);
  };

  const handleEditPress = (log: HabitLog) => {
    setEditingLog(log);
    setLogValue(String(log.value));
    setLogNote(log.note || '');
    setLogImage(log.imageUri);
  };

  const handleDeleteLog = async (logId: string) => {
    Alert.alert('确认删除', '要删除这条记录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        if (deletingId) return;
        setDeletingId(logId);
        try {
          await deleteLog(logId, id);
          setSnackbarText('已删除');
          setSnackbarVisible(true);
        } catch (e) {
          setSnackbarText('删除失败');
          setSnackbarVisible(true);
        }
        setDeletingId(null);
        if (editingLog?.id === logId) {
          setEditingLog(null);
          setLogValue('1');
          setLogNote('');
          setLogImage(undefined);
        }
      }}
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      '删除习惯',
      '确定要删除这个习惯吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive', 
          onPress: async () => {
            await archiveHabit(id);
            navigation.goBack();
          } 
        },
      ]
    );
  };

  const selectedLogs = getLogsForSelectedDate();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={{ color: theme.colors.onBackground, marginBottom: 16, textAlign: 'center' }}>{habit.name}</Title>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>当前连续</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats?.bestStreak || 0}</Text>
            <Text style={styles.statLabel}>历史最高</Text>
        </View>
        <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats?.totalDays || 0}</Text>
            <Text style={styles.statLabel}>累计打卡</Text>
        </View>
      </View>

      <HabitCalendar 
        logs={currentHabitLogs} 
        targetValue={habit.targetValue || 1} 
        onDatePress={handleDatePress} 
      />

      <HabitHeatmap 
        logs={currentHabitLogs} 
        targetValue={habit.targetValue || 1}
        color={habit.color}
      />

      <View style={styles.infoContainer}>
        <List.Item
          title="目标描述"
          description={habit.goal || '无'}
          left={props => <List.Icon {...props} icon="target" />}
        />
        <List.Item
          title="分类"
          description={habit.category || '默认'}
          left={props => <List.Icon {...props} icon="tag" />}
        />
        <List.Item
          title="每日目标次数"
          description={String(habit.targetValue || 1)}
          left={props => <List.Icon {...props} icon="counter" />}
        />
        <List.Item
          title="频率"
          description={habit.frequency === 'daily' ? '每天' : habit.frequency}
          left={props => <List.Icon {...props} icon="calendar-clock" />}
        />
        <List.Item
          title="提醒时间"
          description={habit.reminderTime ? format(new Date(habit.reminderTime), 'HH:mm') : '未设置'}
          left={props => <List.Icon {...props} icon="bell" />}
          right={props => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 {habit.reminderTime && (
                     <IconButton icon="bell-off" onPress={() => updateHabit({ id: habit.id, reminderTime: '' })} />
                 )}
                 <IconButton icon="pencil" onPress={onEditTimePress} />
            </View>
          )}
        />
      </View>

      {showTimePicker && Platform.OS === 'android' && (
        <RNDateTimePicker
          value={habit.reminderTime ? new Date(habit.reminderTime) : new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {showTimePicker && Platform.OS === 'ios' && (
          <Portal>
              <Modal visible={true} onDismiss={() => setShowTimePicker(false)} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
                   <Title style={styles.modalTitle}>选择提醒时间</Title>
                   <View style={{ alignItems: 'center', marginVertical: 20 }}>
                       <RNDateTimePicker 
                          value={tempDate}
                          mode="time"
                          display="spinner"
                          onChange={handleTimeChange}
                       />
                   </View>
                   <View style={styles.modalActions}>
                       <Button onPress={() => setShowTimePicker(false)} style={{ marginRight: 8 }}>取消</Button>
                       <Button mode="contained" onPress={confirmIOSDate}>确定</Button>
                   </View>
              </Modal>
          </Portal>
      )}

      <View style={styles.actions}>
        <Button 
          mode="contained" 
          onPress={handleDelete} 
          style={{ backgroundColor: theme.colors.error }}
        >
          删除习惯
        </Button>
      </View>

      {/* Edit Log Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          <Title style={styles.modalTitle}>
            {selectedDate ? format(selectedDate, 'yyyy年M月d日', { locale: zhCN }) : ''} 打卡记录
          </Title>
          
          <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
            {selectedLogs.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#888', marginVertical: 10 }}>暂无记录</Text>
            ) : (
              selectedLogs.map(log => (
                <View key={log.id} style={styles.logItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold' }}>数值: {log.value}</Text>
                    {log.note ? <Text style={{ fontSize: 12, color: '#666' }}>{log.note}</Text> : null}
                    {log.imageUri ? (
                        <Image source={{ uri: log.imageUri }} style={styles.logImageThumbnail} />
                    ) : null}
                    <Text style={{ fontSize: 10, color: '#999' }}>{format(new Date(log.timestamp), 'HH:mm')}</Text>
                  </View>
                  <IconButton icon="pencil" size={20} onPress={() => handleEditPress(log)} />
                  <IconButton icon="delete" size={20} iconColor={theme.colors.error} disabled={deletingId === log.id || isSaving} onPress={() => handleDeleteLog(log.id)} />
                </View>
              ))
            )}
          </ScrollView>

          <Divider style={{ marginBottom: 16 }} />
          
          <Text style={{ marginBottom: 8, fontWeight: 'bold' }}>{editingLog ? '编辑记录' : '新增记录'}</Text>
          
          <View style={styles.formRow}>
            <TextInput
              label="数值"
              value={logValue}
              onChangeText={setLogValue}
              keyboardType="numeric"
              mode="outlined"
              style={[styles.input, { flex: 1, marginRight: 8 }]}
            />
             <TextInput
              label="备注 (可选)"
              value={logNote}
              onChangeText={setLogNote}
              mode="outlined"
              style={[styles.input, { flex: 2 }]}
            />
          </View>

          <View style={styles.imagePickerRow}>
              <Button icon="camera" mode="outlined" onPress={pickImage}>
                  {logImage ? '更换图片' : '添加图片'}
              </Button>
              {logImage && (
                  <View style={styles.previewContainer}>
                      <Image source={{ uri: logImage }} style={styles.imagePreview} />
                      <IconButton 
                        icon="close-circle" 
                        size={20} 
                        onPress={() => setLogImage(undefined)} 
                        style={styles.removeImageBtn}
                      />
                  </View>
              )}
          </View>
          
          <View style={styles.modalActions}>
            {editingLog && (
              <Button onPress={() => {
                setEditingLog(null);
                setLogValue('1');
                setLogNote('');
                setLogImage(undefined);
              }} style={{ marginRight: 8 }}>
                取消编辑
              </Button>
            )}
            <Button mode="contained" onPress={handleSaveLog} loading={isSaving} disabled={isSaving}>
              {editingLog ? '更新' : '添加'}
            </Button>
          </View>

          <Button onPress={() => setModalVisible(false)} style={{ marginTop: 16 }}>
            关闭
          </Button>
        </Modal>
      </Portal>

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000}>
        {snackbarText}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#eee',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  actions: {
    marginTop: 20,
    marginBottom: 40,
    width: '100%',
  },
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewContainer: {
      marginLeft: 16,
      position: 'relative',
  },
  imagePreview: {
      width: 60,
      height: 60,
      borderRadius: 8,
  },
  removeImageBtn: {
      position: 'absolute',
      top: -10,
      right: -10,
      margin: 0,
  },
  logImageThumbnail: {
      width: 40,
      height: 40,
      borderRadius: 4,
      marginTop: 4,
  },
  input: {
    backgroundColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
