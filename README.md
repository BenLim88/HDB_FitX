# HDB FitX - Community Fitness Protocol

HDB FitX is a gamified community fitness application. It encourages workouts through a "witness" verification system, AI-generated coaching, and collaborative workout building.

---

## 🚀 Features

### Core Features
*   **AI Coach FitX**: Custom workout generation powered by Google Gemini AI with **personalized motivation** based on your athlete archetype and recent workout activity.
*   **Witness Verification**: 'BTO-style' proof-of-work where peers verify your exercise logs.
*   **Gamification**: Rank up from 'Recruit' to 'Encik' with avatar customization.
*   **Authentication**: Google Sign-In (Firebase Auth) and guest access.
*   **Firestore Database**: Persistent data storage for users, workouts, logs, and notifications.

### 🤖 Personalized AI Motivation (NEW!)
Coach FitX now provides tailored motivation based on:
*   **Your Archetype**: Hyrox, CrossFit, Calisthenics, Hybrid, Runner, Strength, Bodybuilder
*   **Recent Activity**: Analyzes your last 7 days of workouts
*   **Workout Recommendations**: Specific exercises for your training style
*   **Singapore-style Tough Love**: Encik-style motivation to keep you on track!

### 🤝 Collaborative Workout Builder (NEW!)
Build workouts together with your community:
*   **Real-time Collaboration**: Admins can initiate collaborative workout sessions
*   **Suggestion System**: Collaborators can suggest adding, removing, or modifying exercises
*   **New Exercise Proposals**: Propose exercises not in the database (admin approval required)
*   **Live Chat**: Built-in chat for discussing workout ideas with collaborators
*   **Drag-to-Reorder**: Initiators can drag and drop to reorder exercises
*   **Invite System**: Add collaborators by searching and inviting users

### User Collaboration Limits
| Feature | Regular Users | Admins |
|---------|--------------|--------|
| Max active collabs | **1** | Unlimited |
| Collab validity | **3 days** | No expiration |
| Add to workout library | ❌ No | ✅ Yes |
| Start new collab | Via Collab tab | Via Admin Panel |

### Workout Rounds System
*   **Multi-Round Workouts**: Define how many times to repeat all exercises
*   **Round Indicators**: Visual separators between rounds during workout execution
*   **Progress Tracking**: Shows current round progress (e.g., "Round 2/3")

### 🏃 HYROX Division Workouts (NEW!)
Complete official HYROX race simulations:

| Division | Description | Sled Push/Pull (Men) | Sled Push/Pull (Women) |
|----------|-------------|---------------------|------------------------|
| **Individual Open (Men)** | Standard men's division | 102kg / 78kg | - |
| **Individual Open (Women)** | Standard women's division | - | 70kg / 52kg |
| **Individual Pro (Men)** | Elite men's weights | 152kg / 103kg | - |
| **Individual Pro (Women)** | Elite women's weights | - | 102kg / 78kg |
| **Men's Doubles** | Partners alternate/split | 102kg / 78kg | - |
| **Women's Doubles** | Partners alternate/split | - | 70kg / 52kg |
| **Mixed Doubles** | Male + Female team | Gender-specific | Gender-specific |
| **Pro Doubles** | Elite partner division | Pro weights | Pro weights |

### 💀 Deadly Dozen Workout
12 grueling labours testing strength, endurance, and mental fortitude:

| # | Exercise | Reps/Distance | Men's Weight | Women's Weight |
|---|----------|---------------|--------------|----------------|
| 1 | Farmers Carry (KB) | 240m | 2×24kg | 2×16kg |
| 2 | KB Deadlift | 60 reps | 32kg | 24kg |
| 3 | DB Lunges | 60m | 2×12.5kg | 2×7.5kg |
| 4 | DB Snatch (Alt) | 60 reps | 15kg | 9kg |
| 5 | Burpee Broad Jump | 60m | BW | BW |
| 6 | Goblet Squat | 60 reps | 16kg | 12kg |
| 7 | Front Carry (WP) | 240m | 25kg | 20kg |
| 8 | Push Press (DB) | 60 reps | 2×12.5kg | 2×6kg |
| 9 | Bear Crawl | 120m | BW | BW |
| 10 | Clean & Press (WP) | 60 reps | 15kg | 10kg |
| 11 | Overhead Carry (WP) | 180m | 15kg | 10kg |
| 12 | Devil Press (DB) | 20 reps | 2×10kg | 2×5kg |

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
├── components/
│   ├── ActiveWorkout.tsx           # Workout execution with timer & rounds
│   ├── AdminDashboard.tsx          # Admin panel for managing content
│   ├── AuthScreen.tsx              # Login/Registration screen
│   ├── CollaborativeWorkoutBuilder.tsx  # 🆕 Collaborative workout builder
│   ├── DIYWorkout.tsx              # Custom workout creator
│   ├── Navbar.tsx                  # Bottom navigation with Collab tab
│   └── WitnessInbox.tsx            # Notifications & verification requests
├── services/
│   ├── dataService.ts              # Firebase CRUD operations
│   └── geminiService.ts            # Google Gemini AI integration
├── App.tsx                         # Main application component
├── firebaseConfig.ts               # Firebase initialization
├── types.ts                        # TypeScript interfaces
├── constants.ts                    # Mock data & exercises
├── firestore.rules                 # Firestore security rules
├── .env                            # API Keys (GitIgnored)
└── vite.config.ts                  # Vite Configuration
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

#### v1.4.0 - HYROX Division Workouts (Latest)
*   **🏃 HYROX Individual Open**: Men's and Women's Open division simulations
*   **🏆 HYROX Individual Pro**: Elite Pro division with heavier weights
*   **👥 HYROX Doubles**: Men's, Women's, Mixed, and Pro Doubles formats
*   **💀 Deadly Dozen**: 12 grueling labours workout (Men's & Women's)
*   **🏋️ New Exercises**: KB Deadlift, DB Snatch, Goblet Squat, Bear Crawl, Devil Press, Carries, and more

#### v1.3.0 - Personalized AI Motivation
*   **🤖 Personalized Tips**: AI motivation tailored to your athlete archetype
*   **📊 Activity Analysis**: Recommendations based on last 7 days of workouts
*   **💪 Archetype-Specific**: Different advice for Hyrox, CrossFit, Calisthenics, etc.
*   **🔄 Refresh Tips**: Get new personalized motivation anytime

#### v1.2.0 - Collaborative Workout Builder
*   **🤝 Collaborative Workouts**: Build workouts together with community members
*   **💬 Real-time Chat**: Chat with collaborators while building workouts
*   **📝 Suggestion System**: Propose exercise additions, removals, and modifications
*   **✨ New Exercise Proposals**: Suggest exercises not in the database
*   **🔄 Drag-to-Reorder**: Initiators can reorder exercises via drag & drop
*   **👥 User Collab Limits**: Regular users limited to 1 active collab with 3-day expiry
*   **🔔 Collab Notifications**: Get notified of invites, suggestions, and updates
*   **📱 Collab Tab**: New dedicated tab in navigation for all users

#### v1.1.0 - Workout Enhancements
*   **🔁 Workout Rounds**: Support for multi-round workouts (repeat all exercises X times)
*   **📊 Round Progress**: Visual indicators showing current round during execution
*   **🎯 Rounds Picker**: Stepper-style picker for setting workout rounds in Admin
*   **🔧 Exercise Lookup Fix**: Custom exercises from collabs now display correctly
*   **🚪 Logout Fix**: Fixed race condition causing immediate re-login after logout

#### v1.0.0 - Foundation
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

| Collection | Description |
|------------|-------------|
| `users` | User profiles and settings |
| `workouts` | Workout definitions |
| `logs` | Workout completion logs |
| `venues` | Training locations |
| `pinnedWods` | Pinned Workouts of the Day |
| `notifications` | User notifications (witness requests, collab invites, etc.) |
| `exercises` | Custom exercises (from collaborations) |
| `collaborativeWorkouts` | 🆕 Collaborative workout sessions |
| `collabSuggestions` | 🆕 Exercise suggestions for collabs |
| `collabMessages` | 🆕 Chat messages for collabs |

### Automatic Seeding
On first load, the app automatically seeds Firestore with:
- Initial workout templates
- Sample venues
- Mock user data (for testing)
- Default exercises

This only happens if collections are empty, so existing data won't be overwritten.

---

## 🤝 Collaborative Workout Builder Guide

### For Admins
1. Go to **Profile** → **Admin Panel** → **Collabs** tab
2. Click **Start New Collaboration**
3. Enter workout details (name, description, scheme, category)
4. Search and invite collaborators
5. Click **Create & Start Building**

### For Regular Users
1. Go to **Collab** tab in bottom navigation
2. Click **Start Collaboration (3-Day Limit)** if you don't have an active collab
3. Or wait for an admin to invite you

### During Collaboration
- **Workout Tab**: View current exercises, suggest additions/removals
- **Suggestions Tab**: View pending suggestions (admins can accept/reject)
- **Chat Tab**: Discuss ideas with collaborators

### Finalizing
- **Admin-initiated**: "Finalize & Add to Library" adds workout to the library
- **User-initiated**: "Complete Collaboration" closes the collab (not added to library)

---

## 🔧 Troubleshooting

### Common Issues

**Logout doesn't work / Immediately logs back in**
- This was fixed in v1.1.0. The issue was a race condition with background data refresh.

**Exercise names not showing in workout**
- Ensure custom exercises from Firestore are loaded. Check browser console for errors.

**Collaboration permission errors**
- Update Firestore security rules to include `collaborativeWorkouts`, `collabSuggestions`, and `collabMessages` collections.

**Can't create more than 1 collaboration (regular users)**
- Regular users are limited to 1 active collaboration at a time. Complete or wait for the current one to expire (3 days).

---

## 🔐 Firestore Security Rules

Make sure your `firestore.rules` includes rules for all collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for all collections (adjust for production)
    match /{collection}/{docId} {
      allow read, write: if true;
    }
  }
}
```

**Note**: For production, implement proper authentication-based rules.
