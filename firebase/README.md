# Firebase configuration

This folder holds Firestore security rules, Storage CORS, and (when added) Cloud Functions config.

## Storage CORS (AR targets and video)

The camera loads the AR target (`.zpt`) from the app bundle and the **video (`.mp4`)** from Firebase Storage. Using the video as a WebGL texture in the WebView requires CORS headers on the bucket; without them the video can load but appear black. Apply the CORS config once:

**Prerequisite:** [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth login`).

From the **project root**:

```bash
gsutil cors set firebase/cors.json gs://pygmalions-specs.firebasestorage.app
```

This allows `GET` from any origin (`*`). Re-run if you change `firebase/cors.json`.

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
