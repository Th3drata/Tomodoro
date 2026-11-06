# 🍅 Tomodoro

**English** · [Français](README.fr.md)

A time management app based on the Pomodoro technique, built with React and Firebase. The interface is in French.

## ✨ Features

- ⏱️ **Customizable Pomodoro timer**: focus with configurable work sessions and breaks
- 📊 **Detailed statistics**: track your productivity with charts (today, week, month)
- 📅 **Calendar**: review your past sessions and history
- 🔐 **Authentication**: sign in with Firebase to save your data
- 🎨 **Custom themes**: change the interface color to your liking
- 📱 **Responsive**: works on desktop and mobile

## 🚀 Installation

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Steps

1. Clone the repository:
```bash
git clone https://github.com/Th3drata/Tomodoro.git
cd Tomodoro
```

2. Install the dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Add your Firebase configuration in `src/firebase/`

4. Start the development server:
```bash
npm run dev
```

## 📦 Available scripts

- `npm run dev`: starts the development server
- `npm run build`: builds the app for production
- `npm run lint`: checks the code with ESLint
- `npm run preview`: previews the production build

## 🛠️ Tech stack

- **React** 19.1.1 - User interface
- **Vite** - Build tool and dev server
- **Firebase** - Authentication and database
- **Recharts** - Charts and visualizations
- **Vercel Analytics** - Analytics
- **React Colorful** - Color picker

## 📁 Project structure

```
Tomodoro/
├── src/
│   ├── components/     # React components (Timer, Sessions, Calendar, Login)
│   ├── firebase/       # Firebase configuration and services
│   ├── App.jsx         # Main component
│   └── main.jsx        # Entry point
├── public/             # Static assets
└── dist/               # Production build
```

## 🎯 Usage

1. **Sign in**: log in with your account to save your data
2. **Timer**: start a Pomodoro session by choosing a category
3. **Statistics**: check your productivity charts
4. **Settings**: customize session lengths and the look of the app

## 📝 License

This project is for educational use.
