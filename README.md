# HDB FitX - Community Fitness Protocol

HDB FitX is a gamified community fitness application. It encourages workouts through a "witness" verification system and AI-generated coaching.

---

## 🚀 Features

*   **AI Coach FitX**: Custom workout generation powered by Google Gemini AI.
*   **Witness Verification**: 'BTO-style' proof-of-work where peers verify your exercise logs.
*   **Gamification**: Rank up from 'Recruit' to 'Encik' with avatar customization.
*   **Authentication**: Google Sign-In (Firebase Auth) and guest access.
*   **Mock Data Layer**: Simulates a backend for rapid prototyping (easily switchable to real Firestore).

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

### 4. Authorize Domain in Firebase (Crucial!)
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
*   **Auth Integration**: Migrated from pure mock auth to real Firebase Google Sign-In.
*   **Security**: Moved hardcoded API keys to environment variables.
*   **Deployment**: Configured for Vercel deployment.
