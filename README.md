# expo-specs

## Goal

This app is built as a cross-platform mobile application using React Native and Expo, with Gluestack UI for the interface, type-safe TypeScript, and Firebase for backend, auth, and user data.

---

## Tech Stack

### React Native

- Cross-platform mobile app (iOS and Android) from a single codebase
- Native components and APIs via the React Native runtime
- Hot reload and fast refresh for development

### Expo with Expo Router

- Managed workflow and tooling (build, OTA updates, EAS)
- File-based routing with Expo Router for screens and navigation
- Deep linking and type-safe navigation
- Simple project setup and consistent dev experience

### Gluestack UI

- Universal components that work on React Native and web (same API)
- Copy-paste style: add only the components you need; you own and can edit the code
- Styling with Tailwind CSS via NativeWind—flexible and familiar if you know Tailwind
- TypeScript and accessibility built in; no vendor lock-in
- Actively maintained (v3); similar philosophy to shadcn/ui but for mobile + web

### TypeScript

- Static types for components, hooks, and API calls
- Better editor support (autocomplete, refactors)
- Fewer runtime errors and clearer contracts
- Typed Firebase and app models

### Firebase Firestore

- NoSQL document database in the cloud
- Real-time listeners for live data
- Offline support and sync
- Scalable backend without managing servers

### Firebase Auth & User Tables

- Sign-in (email/password, Google, Apple, etc.)
- User tables in Firestore for profiles and app-specific data
- Secure rules to protect user data
- Session and token handling for authenticated requests
