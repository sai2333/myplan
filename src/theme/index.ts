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

export const splatoonTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#E1F803', // Neon Yellow
    secondary: '#603BFF', // Neon Purple/Blue
    tertiary: '#F60594', // Neon Pink
    background: 'transparent', // Transparent to show ink splats
    surface: 'rgba(20, 20, 20, 0.8)', // Semi-transparent dark surface
    error: '#FF4500',
    onPrimary: '#000000',
    onSecondary: '#FFFFFF',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    // Custom
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
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

export const marioTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#E70012', // Mario Red
    secondary: '#FFD700', // Coin Gold
    background: 'transparent', // Sky Blue -> Transparent to show background component
    surface: '#FFFFFF', // White
    error: '#B22222', // Firebrick
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    // Custom
    textPrimary: '#000000',
    textSecondary: '#4A4A4A',
  },
  fonts: configureFonts({config: fontConfig}),
};
