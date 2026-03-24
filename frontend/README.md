# 🍽️ Restaurant Table & Order App

A cross-platform mobile application for managing restaurant tables and orders, built with **React Native** and **Expo**.

## Platforms

- ✅ **iOS** (iPhone & iPad)
- ✅ **Android**
- ✅ **Web**

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native | Cross-platform mobile framework |
| Expo SDK 52 | Development tooling & platform APIs |
| TypeScript | Type-safe development |
| Expo Router | File-based navigation |
| React Native StyleSheet | Styling |

## Project Structure

```
├── app/                  # Screens & navigation (Expo Router)
│   ├── (tabs)/           # Tab-based navigation
│   │   ├── _layout.tsx   # Tab navigator config
│   │   ├── index.tsx     # Home screen
│   │   ├── tables.tsx    # Tables management
│   │   ├── orders.tsx    # Orders management
│   │   └── settings.tsx  # Settings screen
│   ├── _layout.tsx       # Root layout
│   └── +not-found.tsx    # 404 screen
├── components/           # Reusable UI components
├── constants/            # App constants (colors, themes)
├── hooks/                # Custom React hooks
├── assets/               # Static assets (images, fonts)
└── app.json              # Expo configuration
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For iOS: Xcode (macOS only)
- For Android: Android Studio / Expo Go app

### Installation

```bash
npm install
```

### Running the App

```bash
# Start development server (all platforms)
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android

# Web
npx expo start --web
```

### Running on Physical Device

1. Install the **Expo Go** app on your iOS or Android device
2. Start the dev server with `npx expo start`
3. Scan the QR code displayed in the terminal

## Features

- **Home Dashboard** — Overview of active tables and pending orders
- **Table Management** — View and manage restaurant table statuses (available, occupied, reserved)
- **Order Tracking** — Track orders by status (pending, preparing, served)
- **Settings** — App configuration and management

## License

This project is private and proprietary.
