# Firebase configuration

This folder holds Firestore security rules and (when added) Cloud Functions config.

## Firestore rules

- **firestore.rules** – Only the signed-in user can read/write `users/{userId}/savedDesigns`. All other paths are denied.

### Deploy rules

From the **project root**:

```bash
firebase deploy --only firestore
```

If you haven’t linked the project yet:

```bash
firebase use --add
```

You can also copy the contents of `firestore.rules` into Firebase Console → Firestore → Rules and publish there.
