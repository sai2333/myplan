import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'mario' | 'splatoon';

interface SettingsState {
  themeMode: ThemeMode;
  isVibrationEnabled: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleVibration: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      isVibrationEnabled: true, // Default to true
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleVibration: () => set((state) => ({ isVibrationEnabled: !state.isVibrationEnabled })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Migration logic if needed (optional, assuming new install or fresh start for this feature)
        // If we really wanted to migrate, we'd need to inspect the persisted state manually or use a versioned persist.
        // For now, defaulting to 'light' if undefined is fine, or it will pick up the persisted 'themeMode' if it exists.
        // If user had 'isDarkTheme' persisted but not 'themeMode', it might default to 'light'.
      }
    }
  )
);
