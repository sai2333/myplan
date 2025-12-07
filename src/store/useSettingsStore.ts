import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  isDarkTheme: boolean;
  isVibrationEnabled: boolean;
  toggleTheme: () => void;
  toggleVibration: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isDarkTheme: false,
      isVibrationEnabled: true, // Default to true
      toggleTheme: () => set((state) => ({ isDarkTheme: !state.isDarkTheme })),
      toggleVibration: () => set((state) => ({ isVibrationEnabled: !state.isVibrationEnabled })),
      setTheme: (isDark) => set({ isDarkTheme: isDark }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
