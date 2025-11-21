# HDB FitX - Community Fitness Protocol

HDB FitX is a gamified community fitness application. It encourages workouts through a "witness" verification system and AI-generated coaching.

---

## 🚀 Features

*   **AI Coach FitX**: Custom workout generation powered by Google Gemini AI.
*   **Witness Verification**: 'BTO-style' proof-of-work where peers verify your exercise logs.
*   **Gamification**: Rank up from 'Recruit' to 'Encik' with avatar customization.
*   **Authentication**: Google Sign-In (Firebase Auth) and guest access.
*   **Firestore Database**: Persistent data storage for users, workouts, logs, and notifications.

---

## 🛠️ Tech Stack & Integrations

This project was built using the following technologies:

*   **Frontend Framework**: React (v19) + Vite (v6)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (implied via class names) + Lucide React Icons
*   **Backend / Database**: Firebase (Auth, Firestore)
*   **AI Integration**: Google Gemini API (`@google/genai`)
*   **Deployment**: Vercel

### Key Integrations

1.  **Firebase Auth**: Handles user authentication via Google Sign-In.
2.  **Google Gemini API**: Provides the "Coach FitX" persona for chat and workout planning.
3.  **Vercel**: Hosting provider with continuous deployment from GitHub.

---

## 💻 How to Run Locally

### Prerequisites
*   Node.js (v18+ recommended)
*   A Google Cloud Project with **Firebase** enabled
*   A **Gemini API Key** (from Google AI Studio)

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/BenLim88/HDB_FitX.git
    cd hdb-fitx
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory. You can use `.env.local` as well.
    
    ```env
    # Firebase Configuration (Get these from Firebase Console > Project Settings)
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id

    # Google Gemini AI
    GEMINI_API_KEY=your_gemini_api_key
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173` (or the port shown in terminal).

---

## 🚢 Deployment Guide

### 1. Push to GitHub
Ensure all your changes are committed and pushed.
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel
You can deploy using the Vercel CLI or the Vercel Dashboard.

**Using CLI:**
```bash
npm i -g vercel
vercel
```
Follow the prompts (accept defaults).

### 3. Configure Production Secrets
After deployment, your app will fail to login if you don't set the environment variables on Vercel.

1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Select your project > **Settings** > **Environment Variables**.
3.  Copy-paste all key-value pairs from your local `.env` file.
4.  **Redeploy** the application (Deployments > Redeploy) for changes to take effect.

### 4. Enable Firestore Database (Required for Production!)
**⚠️ IMPORTANT**: Without Firestore, all user data will be lost on page refresh or deployment!

1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Firestore Database** > **Create Database**.
3.  Choose **Start in test mode** (for now - you can add security rules later).
4.  Select a location closest to your users (e.g., `asia-southeast1` for Singapore).
5.  Click **Enable**.

The app will automatically seed initial data (workouts, venues, sample users) on first load.

### 5. Authorize Domain in Firebase (Crucial!)
If "Sign in with Google" fails on the live site:
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Authentication** > **Settings** > **Authorized domains**.
3.  Add your Vercel domain (e.g., `hdb-fitx.vercel.app`).

---

## 📂 Project Structure

```
hdb-fitx/
├── components/         # React UI Components (Auth, Dashboard, etc.)
├── services/           # Business Logic
│   ├── dataService.ts  # Handles user data (Mock + Firebase adapter)
│   └── geminiService.ts# Handles AI interaction
├── firebaseConfig.ts   # Firebase initialization
├── types.ts            # TypeScript interfaces
├── .env                # API Keys (GitIgnored)
└── vite.config.ts      # Vite Configuration
```

---

## 📝 Development Notes & Common Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local dev server |
| `npm run build` | Builds project for production |
| `npm run preview` | Previews the production build locally |
| `git pull origin main --rebase` | Syncs local code with remote (resolves conflicts) |

---

### Recent Updates
*   **Firestore Migration**: Migrated from in-memory storage to Firebase Firestore for persistent data storage.
*   **Data Persistence**: All user data (logs, workouts, profiles) now persists across deployments and page refreshes.
*   **Auth Integration**: Migrated from pure mock auth to real Firebase Google Sign-In.
*   **Security**: Moved hardcoded API keys to environment variables.
*   **Deployment**: Configured for Vercel deployment.

---

## 🔥 Firestore Setup (Production)

### Why Firestore?
Previously, the app used in-memory storage, which meant:
- ❌ Data was lost on page refresh
- ❌ Data was lost on deployment
- ❌ Each user had isolated data

Now with Firestore:
- ✅ Data persists across deployments
- ✅ Data persists across page refreshes
- ✅ Shared data across all users (leaderboards, pinned WODs)

### Collections Structure
The app uses the following Firestore collections:
- `users` - User profiles and settings
- `workouts` - Workout definitions
- `logs` - Workout completion logs
- `venues` - Training locations
- `pinnedWods` - Pinned Workouts of the Day
- `notifications` - User notifications

### Automatic Seeding
On first load, the app automatically seeds Firestore with:
- Initial workout templates
- Sample venues
- Mock user data (for testing)

This only happens if collections are empty, so existing data won't be overwritten.
