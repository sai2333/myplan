import { Audio } from 'expo-av';

// Using a local generated sound for completion to ensure it works offline/in China
const soundAsset = require('../../assets/sounds/completion.wav');

export const initAudioMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false, // 只有在前台时播放
      playsInSilentModeIOS: true, // iOS静音模式下也能播放
      shouldDuckAndroid: true, // Android上其他音频降低音量
      playThroughEarpieceAndroid: false, // 使用扬声器而不是听筒
    });
  } catch (error) {
    console.warn('Failed to set audio mode', error);
  }
};

export const playCompletionSound = async () => {
  try {
    // Ensure audio mode is set before playing
    // We can call this lazily or rely on App.tsx calling initAudioMode
    // But calling it here ensures it's set if App.tsx didn't finish or failed
    // However, repeated calls are fine but maybe redundant. Let's rely on App.tsx mostly, 
    // but we can't be sure.
    
    const { sound } = await Audio.Sound.createAsync(
      soundAsset,
      { shouldPlay: true }
    );
    
    // Automatically unload the sound from memory when it finishes playing
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        await sound.unloadAsync();
      }
    });
  } catch (error) {
    console.warn('Failed to play completion sound', error);
  }
};
