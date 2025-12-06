import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6B8E23', // Olive Green
    secondary: '#FFA500', // Orange (Accent)
    background: '#F8F8F8', // Light Gray
    surface: '#FFFFFF', // White (Card)
    error: '#DC143C', // Crimson
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#333333',
    onSurface: '#333333',
    // Custom
    textPrimary: '#333333',
    textSecondary: '#666666',
  },
  fonts: configureFonts({config: fontConfig}),
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8CB04D', // Lighter Olive Green for dark mode
    secondary: '#FFB732', // Lighter Orange for dark mode
    background: '#121212', // Dark background
    surface: '#1E1E1E', // Dark surface
    error: '#CF6679', // Error color for dark mode
    onPrimary: '#000000',
    onSecondary: '#000000',
    onBackground: '#E0E0E0',
    onSurface: '#E0E0E0',
    // Custom
    textPrimary: '#E0E0E0',
    textSecondary: '#A0A0A0',
  },
  fonts: configureFonts({config: fontConfig}),
};
