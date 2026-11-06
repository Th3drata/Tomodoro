# 🍅 Tomodoro

[English](README.md) · **Français**

Application de gestion du temps basée sur la technique Pomodoro, développée avec React et Firebase.

## ✨ Fonctionnalités

- ⏱️ **Timer Pomodoro personnalisable** : Concentrez-vous avec des sessions de travail et pauses configurables
- 📊 **Statistiques détaillées** : Visualisez votre productivité avec des graphiques (aujourd'hui, semaine, mois)
- 📅 **Calendrier** : Suivez vos sessions passées et votre historique
- 🔐 **Authentification** : Connexion avec Firebase pour sauvegarder vos données
- 🎨 **Thèmes personnalisables** : Changez la couleur de l'interface selon vos préférences
- 📱 **Responsive** : Fonctionne sur desktop et mobile

## 🚀 Installation

### Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn

### Étapes

1. Clonez le dépôt :
```bash
git clone https://github.com/Th3drata/Tomodoro.git
cd Tomodoro
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez Firebase :
   - Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
   - Ajoutez votre configuration Firebase dans `src/firebase/`

4. Lancez le serveur de développement :
```bash
npm run dev
```

## 📦 Scripts disponibles

- `npm run dev` : Lance le serveur de développement
- `npm run build` : Compile l'application pour la production
- `npm run lint` : Vérifie le code avec ESLint
- `npm run preview` : Prévisualise la version de production

## 🛠️ Technologies utilisées

- **React** 19.1.1 - Interface utilisateur
- **Vite** - Build tool et dev server
- **Firebase** - Authentification et base de données
- **Recharts** - Graphiques et visualisations
- **Vercel Analytics** - Analytics
- **React Colorful** - Sélecteur de couleurs

## 📁 Structure du projet

```
Tomodoro/
├── src/
│   ├── components/     # Composants React (Timer, Sessions, Calendar, Login)
│   ├── firebase/       # Configuration et services Firebase
│   ├── App.jsx         # Composant principal
│   └── main.jsx        # Point d'entrée
├── public/             # Assets statiques
└── dist/               # Build de production
```

## 🎯 Utilisation

1. **Connexion** : Connectez-vous avec votre compte pour sauvegarder vos données
2. **Timer** : Lancez une session Pomodoro en choisissant une catégorie
3. **Statistiques** : Consultez vos graphiques de productivité
4. **Paramètres** : Personnalisez la durée des sessions et l'apparence

## 📝 Licence

Ce projet est à usage éducatif.