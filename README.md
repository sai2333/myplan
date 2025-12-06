# MyPlan - Habit Tracker

This app was generated based on the Project Document and UI Design Suggestions.

## Tech Stack
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **UI Library**: React Native Paper
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **State Management**: Zustand
- **Database**: Expo SQLite
- **Icons**: Ionicons (@expo/vector-icons)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run start
   ```
   - Press `a` for Android (requires Android Studio/Emulator or connected device)
   - Press `i` for iOS (requires macOS and Xcode)
   - Scan the QR code with Expo Go app on your phone.

## Project Structure

- `src/components`: Reusable UI components
- `src/screens`: App screens (Home, Stats, Settings, etc.)
- `src/navigation`: Navigation configuration
- `src/store`: Zustand store for state management
- `src/db`: SQLite database setup and queries
- `src/theme`: App theme configuration (Colors, Fonts)
- `src/types`: TypeScript definitions

## Features Implemented
- **Habit Management**: Create, List, Delete habits.
- **Tracking**: Mark habits as completed for the day.
- **Persistence**: Data is saved locally using SQLite.
- **Theming**: Olive Green and Orange theme as requested.
