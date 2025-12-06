import { Audio } from 'expo-av';

// Using a local generated sound for completion to ensure it works offline/in China
const soundAsset = require('../../assets/sounds/completion.wav');

export const playCompletionSound = async () => {
  try {
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
