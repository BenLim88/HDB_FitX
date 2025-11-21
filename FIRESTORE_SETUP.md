# Firestore Setup Guide

## Quick Fix for Production Mode Issues

If you're having trouble logging in with Admin credentials or seeding data in production mode, follow these steps:

### Step 1: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database** → **Rules** tab
3. Copy and paste the rules from `firestore.rules` file
4. Click **Publish**

### Step 1b: Update Firebase Storage Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Storage** → **Rules** tab
3. Copy and paste the rules from `storage.rules` file
4. Click **Publish**

### Step 2: Manually Create Admin User (If Needed)

If Admin login still doesn't work, manually create the admin user:

1. Go to **Firestore Database** → **Data** tab
2. Click **Start collection**
3. Collection ID: `users`
4. Document ID: `master_admin`
5. Add these fields:
   ```
   id: master_admin (string)
   name: Master Admin (string)
   title: Dr (string)
   gender: UNSPECIFIED (string)
   group_id: NONE (string)
   athlete_type: GENERIC (string)
   is_admin: true (boolean)
   avatar_url: https://api.dicebear.com/7.x/avataaars/svg?seed=AdminMaster (string)
   category: Adult (string)
   ```
6. Click **Save**

### Step 3: Test Login

1. Try logging in with:
   - Username: `Admin`
   - Password: `Administrator123`

2. After successful login, the app will automatically seed workouts, venues, and other initial data.

### Step 4: Verify Seed Data

1. Go to **Firestore Database** → **Data** tab
2. You should see these collections:
   - `workouts` (should have multiple workout documents)
   - `venues` (should have multiple venue documents)
   - `users` (should have admin + mock users)
   - `logs` (should have sample workout logs)

## Troubleshooting

### Issue: "Permission denied" errors
- **Solution**: Make sure you've updated the security rules from `firestore.rules`
- Check that rules are published (not just saved)

### Issue: Admin login works but seed data doesn't load
- **Solution**: The seed function runs automatically after admin login
- Check browser console for any error messages
- Try refreshing the page after logging in

### Issue: Can't create admin user manually
- **Solution**: Temporarily switch to "Test mode" in Firestore rules
- Create the admin user
- Switch back to production mode with the updated rules

## Security Rules Explanation

The updated rules allow:
- ✅ Admin/Guest accounts to be created without Firebase Auth (for mock login)
- ✅ Initial seeding of workouts/venues/logs (if documents don't exist)
- ✅ Authenticated users to create their own logs and profiles
- ✅ Admins to manage all data
- ✅ Public read access for leaderboards and workouts

