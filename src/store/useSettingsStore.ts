import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  isDarkTheme: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isDarkTheme: false,
      toggleTheme: () => set((state) => ({ isDarkTheme: !state.isDarkTheme })),
      setTheme: (isDark) => set({ isDarkTheme: isDark }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
