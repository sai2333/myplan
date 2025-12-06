import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

export const registerForPushNotificationsAsync = async (): Promise<string | undefined> => {
  let token;

  if (Platform.OS === 'android') {
    // Changing channel ID to force update settings since user cannot uninstall in Expo Go
    await Notifications.setNotificationChannelAsync('myplan-alerts', {
      name: '待办事项提醒',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('权限未开启', '请在设置中开启通知权限以接收提醒。');
    return;
  }

  // We don't strictly need the push token for local notifications, but it's good practice to have the flow.
  // token = (await Notifications.getExpoPushTokenAsync()).data;

  return 'granted';
};

export const ensureChannelExists = async () => {
  if (Platform.OS === 'android') {
    const channel = await Notifications.getNotificationChannelAsync('myplan-alerts');
    if (!channel) {
       await Notifications.setNotificationChannelAsync('myplan-alerts', {
          name: '待办事项提醒',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          sound: 'default',
        });
    }
  }
};

export const scheduleNotification = async (title: string, body: string, triggerDate: Date): Promise<string> => {
  try {
    // Ensure channel exists before scheduling
    await ensureChannelExists();

    // Check if date is in the past
    if (triggerDate.getTime() <= Date.now()) {
        console.log('Trigger date is in the past, scheduling for immediate delivery');
        // If strict past check is needed we could return here, but often users want to see it work.
        // However, scheduling in the past might not work on all platforms reliably for "future" scheduler.
        // Let's just schedule it; usually the OS handles it by firing immediately or ignoring.
        // Better yet, if it's very close (like within seconds), let it slide.
        // If it's significantly in the past, maybe we shouldn't schedule?
        // For the user's case: they set 14:21:00 at 14:21:05. This is "past".
        // Let's allow it. The OS might fire it immediately.
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true, // 'default' is also valid, but true usually maps to default sound
        vibrate: [0, 250, 250, 250], // Force vibration
        priority: Notifications.AndroidNotificationPriority.MAX,
        channelId: 'myplan-alerts', // Updated channel ID
      },
      trigger: triggerDate, // passing a Date object schedules it for that time
    });
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return '';
  }
};

export const scheduleRepeatingNotification = async (title: string, body: string, hour: number, minute: number, weekday?: number): Promise<string> => {
  try {
    await ensureChannelExists();
    
    const trigger: any = {
      hour,
      minute,
      repeats: true,
    };
    
    if (weekday !== undefined) {
        // weekday in Expo: 1-7 (Sun-Sat)
        // weekday from input (JS Date): 0-6 (Sun-Sat)
        trigger.weekday = weekday + 1;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority.MAX,
        channelId: 'myplan-alerts',
      },
      trigger,
    });
    return id;
  } catch (error) {
    console.error('Error scheduling repeating notification:', error);
    return '';
  }
};

export const cancelNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

export const getAllScheduledNotifications = async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
}
