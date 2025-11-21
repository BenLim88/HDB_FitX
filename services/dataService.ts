
import { Log, Notification, User, VerificationStatus, Workout, GroupType, AthleteType, Gender, Venue, PinnedWOD, UserCategory } from '../types';
import { MOCK_LOGS, MOCK_USERS, MOCK_WORKOUTS, MOCK_VENUES } from '../constants';
import { auth, googleProvider } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';

// In-memory storage for the session
let users = [...MOCK_USERS].map(u => ({ ...u, category: UserCategory.ADULT })); // Migration: Add category
let logs = [...MOCK_LOGS];
let venues = [...MOCK_VENUES];
let workouts = [...MOCK_WORKOUTS].map(w => ({ ...w, is_kids_friendly: false })); // Migration: Add kids flag
let pinnedWods: PinnedWOD[] = []; // New mock storage for pinned WODs
let notifications: Notification[] = [
    {
        id: 'n1',
        target_user_id: 'u1',
        type: 'witness_request',
        message: 'Lauren Weeks requests verification for "Void Deck Sprint"',
        payload: { log_id: 'l_pending_1' },
        read: false
    }
];

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DataService = {
  // --- AUTH SIMULATION ---
  loginWithGoogle: async (): Promise<User | null> => {
      try {
          const result = await signInWithPopup(auth, googleProvider);
          const fbUser = result.user;
          
          // Check if user exists in our local mock db
          let user = users.find(u => u.id === fbUser.uid);
          
          if (!user) {
              // Create new user from Google data
              user = {
                  id: fbUser.uid,
                  name: fbUser.displayName || 'Unknown Athlete',
                  title: 'Mr', // Default
                  gender: Gender.UNSPECIFIED,
                  group_id: GroupType.NONE,
                  athlete_type: AthleteType.GENERIC,
                  is_admin: false,
                  avatar_url: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
                  category: UserCategory.ADULT
              };
              users.push(user);
          }
          return user;
      } catch (error) {
          console.error("Google Sign In Error", error);
          return null;
      }
  },

  login: async (emailOrId: string, password: string): Promise<User | null> => {
    await delay(800);
    
    if (!emailOrId || !password) return null;

    // MASTER ADMIN CHECK
    if (emailOrId === 'Admin' && password === 'Administrator123') {
        const masterAdmin: User = {
            id: 'master_admin',
            name: 'Master Admin',
            title: 'Dr',
            gender: Gender.UNSPECIFIED,
            group_id: GroupType.NONE,
            athlete_type: AthleteType.GENERIC,
            is_admin: true,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminMaster',
            category: UserCategory.ADULT
        };
        // Ensure master admin is in the users list if not already
        if (!users.find(u => u.id === masterAdmin.id)) {
            users.push(masterAdmin);
        }
        return masterAdmin;
    }

    // GUEST ACCOUNT CHECK
    if (emailOrId === 'Guest' && password === 'guest123') {
        const guestUser: User = {
            id: 'guest',
            name: 'Guest',
            title: 'Mr',
            gender: Gender.UNSPECIFIED,
            group_id: GroupType.NONE,
            athlete_type: AthleteType.GENERIC,
            is_admin: false,
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
            category: UserCategory.ADULT
        };
        // Ensure guest is in the users list if not already
        if (!users.find(u => u.id === guestUser.id)) {
            users.push(guestUser);
        }
        return guestUser;
    }

    // Normal User Check (Mock)
    const foundUser = users.find(u => 
        u.name.toLowerCase() === emailOrId.toLowerCase() || 
        u.id === emailOrId
    );

    if (foundUser) return foundUser;

    return null; 
  },

  register: async (data: { name: string, title: string, gender: Gender, group_id: GroupType, athlete_type: AthleteType, category: UserCategory }): Promise<User> => {
    await delay(1200);
    const newUser: User = {
        id: `u_${Date.now()}`,
        name: data.name,
        title: data.title,
        gender: data.gender,
        group_id: data.group_id,
        athlete_type: data.athlete_type,
        is_admin: false, // Default to user
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
        category: data.category
    };
    users.push(newUser);
    return newUser;
  },

  // --- USER MANAGEMENT (ADMIN) ---
  updateUser: async (updatedUser: User): Promise<User> => {
    await delay(500);
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = updatedUser;
        return updatedUser;
    }
    throw new Error("User not found");
  },

  deleteUser: async (userId: string): Promise<void> => {
    await delay(500);
    users = users.filter(u => u.id !== userId);
    logs = logs.filter(l => l.user_id !== userId);
  },

  // --- VENUE MANAGEMENT (ADMIN) ---
  getVenues: async (): Promise<Venue[]> => {
      await delay(300);
      return [...venues];
  },

  addVenue: async (venue: Venue): Promise<Venue> => {
      await delay(500);
      venues.push(venue);
      return venue;
  },

  updateVenue: async (venue: Venue): Promise<Venue> => {
      await delay(500);
      const index = venues.findIndex(v => v.id === venue.id);
      if (index !== -1) {
          venues[index] = venue;
          return venue;
      }
      throw new Error("Venue not found");
  },

  deleteVenue: async (venueId: string): Promise<void> => {
      await delay(300);
      venues = venues.filter(v => v.id !== venueId);
  },

  // --- PINNED WOD MANAGEMENT ---
  getPinnedWODs: async (): Promise<PinnedWOD[]> => {
      await delay(300);
      return [...pinnedWods];
  },

  addPinnedWOD: async (wod: Omit<PinnedWOD, 'id' | 'participants'>): Promise<PinnedWOD> => {
      await delay(500);
      const newWod: PinnedWOD = {
          ...wod,
          id: `pw_${Date.now()}`,
          participants: []
      };
      pinnedWods.unshift(newWod); // Add to top
      return newWod;
  },

  deletePinnedWOD: async (id: string): Promise<void> => {
      await delay(300);
      pinnedWods = pinnedWods.filter(w => w.id !== id);
  },

  joinPinnedWOD: async (pinnedWodId: string, userId: string): Promise<PinnedWOD> => {
      await delay(400);
      const index = pinnedWods.findIndex(w => w.id === pinnedWodId);
      if (index === -1) throw new Error("WOD not found");
      
      if (!pinnedWods[index].participants.includes(userId)) {
          pinnedWods[index].participants.push(userId);
      }
      return pinnedWods[index];
  },

  unjoinPinnedWOD: async (pinnedWodId: string, userId: string): Promise<PinnedWOD> => {
      await delay(300);
      const index = pinnedWods.findIndex(w => w.id === pinnedWodId);
      if (index === -1) throw new Error("WOD not found");

      pinnedWods[index].participants = pinnedWods[index].participants.filter(id => id !== userId);
      return pinnedWods[index];
  },

  // --- WORKOUT MANAGEMENT (ADMIN) ---
  addWorkout: async (workout: Workout): Promise<Workout> => {
      await delay(500);
      const newWorkout = { ...workout, id: `w_${Date.now()}` };
      workouts.push(newWorkout);
      return newWorkout;
  },

  updateWorkout: async (workout: Workout): Promise<Workout> => {
      await delay(500);
      const index = workouts.findIndex(w => w.id === workout.id);
      if (index !== -1) {
          workouts[index] = workout;
          return workout;
      }
      throw new Error("Workout not found");
  },

  deleteWorkout: async (id: string): Promise<void> => {
      await delay(300);
      workouts = workouts.filter(w => w.id !== id);
  },

  // --- EXISTING METHODS ---
  getCurrentUser: async (): Promise<User | null> => {
    await delay(100);
    return null; 
  },

  getAllUsers: async (): Promise<User[]> => {
    await delay(300);
    return [...users]; // Return copy
  },

  getWorkouts: async (): Promise<Workout[]> => {
    await delay(300);
    return [...workouts]; // Return copy
  },

  getLogs: async (): Promise<Log[]> => {
    await delay(300);
    // CRITICAL FIX: Return a shallow copy ([...logs]) so React detects a new array reference.
    // Otherwise, React sees the same array reference and won't re-render stats.
    return [...logs].sort((a, b) => b.timestamp - a.timestamp);
  },

  saveLog: async (log: Omit<Log, 'id' | 'user_name' | 'workout_name'>): Promise<Log> => {
    await delay(600);
    const user = users.find(u => u.id === log.user_id);
    const workout = workouts.find(w => w.id === log.workout_id);
    
    const newLog: Log = {
      ...log,
      id: `log_${Date.now()}`,
      user_name: user?.name || 'Unknown',
      workout_name: workout?.name || 'Custom',
    };

    logs.unshift(newLog);

    // If witness is requested, create a notification
    if (newLog.witness_id) {
      notifications.push({
        id: `notif_${Date.now()}`,
        target_user_id: newLog.witness_id,
        type: 'witness_request',
        message: `${user?.name} requests verification for ${workout?.name}`,
        payload: { log_id: newLog.id },
        read: false
      });
    }

    return newLog;
  },

  getNotifications: async (userId: string): Promise<Notification[]> => {
    await delay(300);
    return notifications.filter(n => n.target_user_id === userId);
  },

  verifyLog: async (logId: string, verifierId: string, status: VerificationStatus): Promise<void> => {
    await delay(500);
    const logIndex = logs.findIndex(l => l.id === logId);
    if (logIndex > -1) {
      logs[logIndex].verification_status = status;
      if (status === VerificationStatus.VERIFIED) {
          const verifier = users.find(u => u.id === verifierId);
          logs[logIndex].witness_name = verifier?.name;
      }
    }
    // Remove notification related to this log
    notifications = notifications.filter(n => n.payload.log_id !== logId);
  }
};
