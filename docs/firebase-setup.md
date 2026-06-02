# Firebase setup for Finance Management (quick guide)

1. Create a Firebase project in the Firebase Console.
2. Enable Authentication -> Email/Password (and Google optionally).
3. Create a Firestore database (production mode) and paste the security rules from `README` or below.
4. In _Project Settings_ -> _General_ -> your app config, copy the Web config values and populate a local `.env.local` using `.env.example`.

Example `.env.local` (fill with your values):

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=finance-management-e5a17.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=finance-management-e5a17
VITE_FIREBASE_STORAGE_BUCKET=finance-management-e5a17.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=255336602199
VITE_FIREBASE_APP_ID=1:255336602199:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-XXXX
```

Run a quick SDK init check locally:

```bash
# ensure dependencies installed
npm install

# load .env.local automatically (script uses dotenv)
node --experimental-modules scripts/test-firebase-connection.mjs
```

If the script prints the `projectId`, SDK initialized correctly. Most read/write operations need an authenticated user — use the app UI (register/login) to test creating `fixedExpenses` and `variableExpenses`.

## Firestore security rules (recommended)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /fixedExpenses/{expenseId} {
        allow read, create: if request.auth != null && request.auth.uid == userId;
        allow update, delete: if request.auth != null && request.auth.uid == userId;
      }
      match /variableExpenses/{expenseId} {
        allow read, create: if request.auth != null && request.auth.uid == userId;
        allow update, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

If you want, I can also generate a small browser snippet to add a test user and a test document via the app code.
