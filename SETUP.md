# Configuration Firebase

## Étapes de configuration

1. **Créer un projet Firebase**
   - Allez sur [console.firebase.google.com](https://console.firebase.google.com)
   - Créez un nouveau projet

2. **Activer l'authentification**
   - Dans la console Firebase, allez dans "Authentication"
   - Activez le fournisseur "Google"

3. **Créer une base de données Firestore**
   - Allez dans "Firestore Database"
   - Créez une base de données en mode "production"

4. **Configurer les variables d'environnement**
   - Copiez `.env.example` vers `.env`
   - Dans la console Firebase, allez dans "Project Settings" > "Your apps"
   - Copiez les valeurs de configuration dans votre fichier `.env`

5. **Configuration de Firestore**

Ajoutez ces règles de sécurité dans Firestore :

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

6. **Lancer l'application**
```bash
npm run dev
```