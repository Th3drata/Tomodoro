# Firebase setup

## Setup steps

1. **Create a Firebase project**
   - Go to [console.firebase.google.com](https://console.firebase.google.com)
   - Create a new project

2. **Enable authentication**
   - In the Firebase console, go to "Authentication"
   - Enable the "Google" provider

3. **Create a Firestore database**
   - Go to "Firestore Database"
   - Create a database in "production" mode

4. **Set the environment variables**
   - Copy `.env.example` to `.env`
   - In the Firebase console, go to "Project Settings" > "Your apps"
   - Copy the configuration values into your `.env` file

5. **Configure Firestore**

Add these security rules in Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. **Start the app**
```bash
npm run dev
```
