import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Vibration } from 'react-native';
import { Text, Button, ProgressBar, useTheme, IconButton, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const FocusScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Default 25 minutes in seconds
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && !isPaused) {
      interval = setInterval(() => {
        if (endTimeRef.current) {
          const now = Date.now();
          const remaining = Math.ceil((endTimeRef.current - now) / 1000);
          
          if (remaining <= 0) {
            setTimeLeft(0);
            setIsActive(false);
            setIsPaused(false);
            endTimeRef.current = null;
            clearInterval(interval);
            Vibration.vibrate([1000, 1000, 1000]);
          } else {
            setTimeLeft(remaining);
          }
        }
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    endTimeRef.current = Date.now() + timeLeft * 1000;
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
    endTimeRef.current = null;
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(initialTime);
    endTimeRef.current = null;
  };

  const handleSetDuration = (minutes: number) => {
    const seconds = minutes * 60;
    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsActive(false);
    setIsPaused(false);
    endTimeRef.current = null;
  };

  const progress = initialTime > 0 ? (initialTime - timeLeft) / initialTime : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>专注</Text>
      </View>

      <View style={styles.content}>
        <Surface style={[styles.timerContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={4}>
          <Text variant="displayLarge" style={[styles.timerText, { color: theme.colors.primary }]}>
            {formatTime(timeLeft)}
          </Text>
          <ProgressBar 
            progress={progress} 
            color={theme.colors.primary} 
            style={styles.progressBar} 
          />
          <Text variant="bodyMedium" style={{ marginTop: 10, opacity: 0.7 }}>
            {isActive ? (isPaused ? '已暂停' : '专注中...') : '准备开始'}
          </Text>
        </Surface>

        <View style={styles.controls}>
          {!isActive ? (
            <Button 
              mode="contained" 
              onPress={handleStart} 
              style={styles.mainButton}
              contentStyle={{ height: 60 }}
              labelStyle={{ fontSize: 20 }}
              icon="play"
            >
              开始专注
            </Button>
          ) : (
            <View style={styles.activeControls}>
              {isPaused ? (
                <Button 
                  mode="contained" 
                  onPress={handleStart} 
                  style={[styles.controlButton, { backgroundColor: theme.colors.primary }]}
                  icon="play"
                >
                  继续
                </Button>
              ) : (
                <Button 
                  mode="contained" 
                  onPress={handlePause} 
                  style={[styles.controlButton, { backgroundColor: theme.colors.secondary }]}
                  icon="pause"
                >
                  暂停
                </Button>
              )}
              <Button 
                mode="outlined" 
                onPress={handleReset} 
                style={styles.controlButton}
                icon="stop"
              >
                停止
              </Button>
            </View>
          )}
        </View>

        <View style={styles.presets}>
          <Text variant="titleMedium" style={{ marginBottom: 15 }}>快速设定</Text>
          <View style={styles.presetButtons}>
            {[5, 15, 25, 45, 60].map((min) => (
              <Button 
                key={min} 
                mode={initialTime === min * 60 ? "contained-tonal" : "outlined"} 
                onPress={() => handleSetDuration(min)}
                style={styles.presetButton}
                compact
              >
                {min}分钟
              </Button>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  timerContainer: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  timerText: {
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '60%',
    height: 8,
    borderRadius: 4,
    marginTop: 20,
  },
  controls: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  mainButton: {
    width: '80%',
    borderRadius: 30,
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  controlButton: {
    minWidth: 120,
    borderRadius: 30,
  },
  presets: {
    width: '100%',
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  presetButton: {
    borderRadius: 20,
  }
});
