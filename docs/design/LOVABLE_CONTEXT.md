# NETFLAT Mobile App - Context for Redesign

This file contains all necessary information to redesign the NETFLAT mobile application. Ideally, use this context to generate a modern, premium UI/UX using `react-native`, `expo`, and `react-native-reanimated`.

## 1. Project Overview
- **Name**: NETFLAT (Netflix Clone)
- **Platform**: Mobile (iOS & Android) via Expo (React Native)
- **Type**: Streaming App (Video-on-Demand)
- **Monorepo**: Part of a Turborepo workspace.

## 2. Tech Stack Setup
The app is currently set up with the following key dependencies:
- **Framework**: Expo (~52.0.0), React Native (0.76.6)
- **Navigation**: `expo-router` (~4.0.0)
- **State/Data**: `@tanstack/react-query`
- **UI/Animation**: `react-native-reanimated`
- **Video**: `expo-av`
- **Styling**: Currently using `StyleSheet` (Standard React Native). *Goal: Modernize this.*
- **Icons**: No specific vector library installed yet (using text emojis), recommend `lucide-react-native`.
- **Other**: `expo-haptics`, `expo-blur`, `expo-linear-gradient`.

### `package.json` Dependencies
```json
{
    "dependencies": {
        "@react-native-async-storage/async-storage": "^2.2.0",
        "@tanstack/react-query": "^5.62.0",
        "expo": "~52.0.0",
        "expo-av": "~15.0.0",
        "expo-blur": "^15.0.8",
        "expo-haptics": "^15.0.8",
        "expo-linear-gradient": "^15.0.8",
        "expo-router": "~4.0.0",
        "expo-screen-orientation": "^9.0.8",
        "expo-secure-store": "~14.0.0",
        "expo-status-bar": "~2.0.0",
        "react-native-reanimated": "~3.16.1",
        "react-native-safe-area-context": "4.12.0",
        "react-native-screens": "~4.4.0"
    }
}
```

## 3. Data Models (Prisma Schema)
The UI must reflect the data structure below. Key entities:
- **Movie**: `title`, `description`, `posterUrl` (vertical), `backdropUrl` (horizontal), `releaseYear`, `durationSeconds`, `genres`.
- **User/Profile**: `email`, `profiles` (name, avatarUrl, isKids).
- **Interactive**: `Favorite` (My List), `WatchHistory` (Continue Watching), `Rating`.

```prisma
// Users & Profiles
model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String   @unique
  role          UserRole @default(viewer)
  profiles      Profile[]
  // ...
}

model Profile {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  avatarUrl String?
  isKids    Boolean  @default(false)
  // ...
}

// Content
model Movie {
  id              String       @id @default(uuid()) @db.Uuid
  title           String
  description     String?
  posterUrl       String?      // Vertical Poster
  backdropUrl     String?      // Horizontal Banner
  durationSeconds Int?
  releaseYear     Int?
  isPremium       Boolean      @default(false)
  playbackUrl     String?      // HLS Stream URL
  
  genres       MovieGenre[]
  actors       MovieActor[]
  // ...
}

model Genre {
  id   String @id @default(uuid()) @db.Uuid
  name String @unique
  // ...
}

// Rail Configuration (Home Screen sections)
model RailConfig {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   // e.g. "Trending Now"
  type      String   // "trending", "for_you", "continue_watching"
  // ...
}
```

## 4. Current App Structure (Expo Router)
The detailed file structure is as follows:

```
apps/mobile/app/
â”œâ”€â”€ (auth)/
â”‚   â””â”€â”€ login.tsx       # Login Screen
â”œâ”€â”€ (tabs)/
â”‚   â”œâ”€â”€ _layout.tsx     # Tab Bar Navigation
â”‚   â”œâ”€â”€ index.tsx       # Home Screen (Rails)
â”‚   â”œâ”€â”€ search.tsx      # Search Screen
â”‚   â”œâ”€â”€ my-list.tsx     # My List Screen
â”‚   â””â”€â”€ settings.tsx    # Settings/Profile Screen
â”œâ”€â”€ movie/
â”‚   â””â”€â”€ [id].tsx        # Movie Detail Screen
â”œâ”€â”€ player/
â”‚   â””â”€â”€ [id].tsx        # Video Player Screen
â””â”€â”€ _layout.tsx         # Root Layout (Providers)
```

## 5. Design Guidelines (Current & Target)
**Current Colors:**
- Background: `#0d0d0d` (Deep Black/Gray)
- Surface/Card: `#1a1a1a`
- Primary/Brand: `#e50914` (Netflix Red)
- Text Primary: `#ffffff`
- Text Secondary: `#666666` or `#888888`

**Target UI/UX Goals:**
- **Premium Feel**: Use Blur effects (`expo-blur`), Linear Gradients (`expo-linear-gradient`), and smooth transitions.
- **Cinematic**: Focus on large imagery (backdropUrl).
- **Animations**: Use `react-native-reanimated` for shared element transitions (poster opening) and rail scrolling interactions.
- **Haptic Feedback**: Use `expo-haptics` for touch interactions.
