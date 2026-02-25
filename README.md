# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Firebase & auth setup

1. **Install Firebase** – Done. (`npx expo install firebase` already run.)
2. **Add your Firebase credentials** – Paste your Web app config into `lib/firebase.config.ts` (see `lib/firebase.config.example.ts` for the shape). Test the connection by logging in on the User Auth page.
3. **Sign in with Google** – Pinned for later. The "Sign in with Google" button opens a modal with the title *Sign In with Google is a work in progress* and step-by-step instructions for enabling it when you’re ready.

## Firestore (saved designs)

Firestore is used to store each user’s saved designs. If you haven’t already:

1. **Create a Firestore database** – In [Firebase Console](https://console.firebase.google.com) → your project → **Build** → **Firestore Database** → **Create database** (start in test mode or production with rules).
2. **Security rules** – Rules in [firebase/firestore.rules](firebase/firestore.rules) restrict `users/{userId}/savedDesigns` so only the signed-in user can read/write their own documents. Deploy from project root: `firebase deploy --only firestore`. See [firebase/README.md](firebase/README.md).

Once the database exists and your app has the correct `projectId` in `lib/firebase.config.ts`, saving a design from the Marketplace will create documents under `users/<uid>/savedDesigns/`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
