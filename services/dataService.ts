
import { Log, Notification, User, VerificationStatus, Workout, GroupType, AthleteType, Gender, Venue, PinnedWOD, UserCategory } from '../types';
import { MOCK_LOGS, MOCK_USERS, MOCK_WORKOUTS, MOCK_VENUES } from '../constants';
import { auth, googleProvider, db } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  setDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

// Firestore Collection Names
const COLLECTIONS = {
  USERS: 'users',
  LOGS: 'logs',
  WORKOUTS: 'workouts',
  VENUES: 'venues',
  PINNED_WODS: 'pinnedWods',
  NOTIFICATIONS: 'notifications'
};

// Seed flag to prevent multiple seed operations
let seedingPromise: Promise<void> | null = null;

// Helper: Convert Firestore timestamp to number
const timestampToNumber = (timestamp: any): number => {
  if (!timestamp) return Date.now();
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  if (timestamp.toDate) {
    return timestamp.toDate().getTime();
  }
  return typeof timestamp === 'number' ? timestamp : Date.now();
};

// Helper: Convert number to Firestore timestamp
const numberToTimestamp = (num: number): Timestamp => {
  return Timestamp.fromMillis(num);
};

// Helper function to recursively remove undefined values (Firestore doesn't accept undefined)
const removeUndefined = (obj: any): any => {
  if (obj === undefined) {
      return undefined; // Signal to omit this field
  }
  if (obj === null) {
      return null; // Keep null values
  }
  if (Array.isArray(obj)) {
      const cleaned = obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
      return cleaned; // Always return array (even if empty)
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value !== undefined) {
              const cleanedValue = removeUndefined(value);
              // Only add if cleaned value is not undefined
              if (cleanedValue !== undefined) {
                  cleaned[key] = cleanedValue;
              }
          }
      });
      return cleaned; // Always return object (even if empty)
  }
  return obj;
};

// Seed initial data if collections are empty
const seedDatabase = async (): Promise<void> => {
  // If already seeding, wait for that promise
  if (seedingPromise) {
    return seedingPromise;
  }
  
  seedingPromise = (async () => {
    try {
      // Check if workouts collection exists and has data
      const workoutsSnapshot = await getDocs(collection(db, COLLECTIONS.WORKOUTS));
      if (workoutsSnapshot.empty) {
        console.log('Seeding database with initial data...');
        
        // Seed in smaller batches to avoid hitting limits
        try {
          // Seed Workouts first (most important)
          const workoutsBatch = writeBatch(db);
          let batchCount = 0;
          for (const workout of MOCK_WORKOUTS.map(w => ({ ...w, is_kids_friendly: w.is_kids_friendly || false }))) {
            const workoutRef = doc(db, COLLECTIONS.WORKOUTS, workout.id);
            workoutsBatch.set(workoutRef, workout);
            batchCount++;
            // Firestore batch limit is 500, commit in chunks if needed
            if (batchCount >= 450) {
              await workoutsBatch.commit();
              batchCount = 0;
            }
          }
          if (batchCount > 0) {
            await workoutsBatch.commit();
          }
          console.log('Workouts seeded');
        } catch (error) {
          console.error('Error seeding workouts:', error);
        }
        
        try {
          // Seed Venues
          const venuesBatch = writeBatch(db);
          for (const venue of MOCK_VENUES) {
            const venueRef = doc(db, COLLECTIONS.VENUES, venue.id);
            venuesBatch.set(venueRef, venue);
          }
          await venuesBatch.commit();
          console.log('Venues seeded');
        } catch (error) {
          console.error('Error seeding venues:', error);
        }
        
        try {
          // Seed Users (skip if admin/guest already exist)
          const usersBatch = writeBatch(db);
          for (const user of MOCK_USERS.map(u => ({ ...u, category: UserCategory.ADULT }))) {
            // Skip if user already exists (like master_admin or guest)
            const userRef = doc(db, COLLECTIONS.USERS, user.id);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              usersBatch.set(userRef, user);
            }
          }
          await usersBatch.commit();
          console.log('Users seeded');
        } catch (error) {
          console.error('Error seeding users:', error);
        }
        
        try {
          // Seed Logs
          const logsBatch = writeBatch(db);
          for (const log of MOCK_LOGS) {
            const logRef = doc(db, COLLECTIONS.LOGS, log.id);
            logsBatch.set(logRef, {
              ...log,
              timestamp: numberToTimestamp(log.timestamp)
            });
          }
          await logsBatch.commit();
          console.log('Logs seeded');
        } catch (error) {
          console.error('Error seeding logs:', error);
        }
        
        console.log('Database seeded successfully!');
      } else {
        console.log('Database already has data, skipping seed');
      }
    } catch (error) {
      console.error('Error checking/seeding database:', error);
      // Don't throw - allow app to continue even if seeding fails
    }
  })();
  
  return seedingPromise;
};

export const DataService = {
  // --- AUTH ---
  loginWithGoogle: async (): Promise<User | null> => {
      try {
          await seedDatabase(); // Ensure database is seeded
          const result = await signInWithPopup(auth, googleProvider);
          const fbUser = result.user;
          
          // Check if user exists in Firestore
          const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
              return userSnap.data() as User;
          }
          
          // Create new user from Google data
          const newUser: User = {
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
          
          await setDoc(userRef, newUser);
          return newUser;
      } catch (error) {
          console.error("Google Sign In Error", error);
          return null;
      }
  },

  login: async (emailOrId: string, password: string): Promise<User | null> => {
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
        // Ensure master admin exists in Firestore
        try {
            const adminRef = doc(db, COLLECTIONS.USERS, 'master_admin');
            const adminSnap = await getDoc(adminRef);
            if (!adminSnap.exists()) {
                await setDoc(adminRef, masterAdmin);
                console.log('Master Admin created in Firestore');
            }
            // Try to seed database after admin is created
            await seedDatabase();
            return masterAdmin;
        } catch (error) {
            console.error('Error creating/accessing admin user:', error);
            // Return admin anyway for local fallback
            return masterAdmin;
        }
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
        // Ensure guest exists in Firestore
        try {
            const guestRef = doc(db, COLLECTIONS.USERS, 'guest');
            const guestSnap = await getDoc(guestRef);
            if (!guestSnap.exists()) {
                await setDoc(guestRef, guestUser);
                console.log('Guest user created in Firestore');
            }
            return guestUser;
        } catch (error) {
            console.error('Error creating/accessing guest user:', error);
            // Return guest anyway for local fallback
            return guestUser;
        }
    }

    // Normal User Check - search by name or id in Firestore
    const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    const foundUser = usersSnapshot.docs.find(doc => {
        const user = doc.data() as User;
        return user.name.toLowerCase() === emailOrId.toLowerCase() || user.id === emailOrId;
    });

    if (foundUser) return foundUser.data() as User;

    return null; 
  },

  register: async (data: { name: string, title: string, gender: Gender, group_id: GroupType, athlete_type: AthleteType, category: UserCategory }): Promise<User> => {
    await seedDatabase(); // Ensure database is seeded
    
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
    
    const userRef = doc(db, COLLECTIONS.USERS, newUser.id);
    await setDoc(userRef, newUser);
    return newUser;
  },

  // --- USER MANAGEMENT (ADMIN) ---
  updateUser: async (updatedUser: User): Promise<User> => {
    const userRef = doc(db, COLLECTIONS.USERS, updatedUser.id);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        await updateDoc(userRef, updatedUser as any);
    } else {
        // If user not found, create them (e.g., restored from localStorage)
        await setDoc(userRef, updatedUser);
    }
    return updatedUser;
  },

  deleteUser: async (userId: string): Promise<void> => {
    // Delete user
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(userRef);
    
    // Delete user's logs
    const logsQuery = query(collection(db, COLLECTIONS.LOGS), where('user_id', '==', userId));
    const logsSnapshot = await getDocs(logsQuery);
    const batch = writeBatch(db);
    logsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
  },

  // --- VENUE MANAGEMENT (ADMIN) ---
  getVenues: async (): Promise<Venue[]> => {
      await seedDatabase(); // Ensure database is seeded
      const venuesSnapshot = await getDocs(collection(db, COLLECTIONS.VENUES));
      return venuesSnapshot.docs.map(doc => doc.data() as Venue);
  },

  addVenue: async (venue: Venue): Promise<Venue> => {
      const venueRef = doc(db, COLLECTIONS.VENUES, venue.id);
      await setDoc(venueRef, venue);
      return venue;
  },

  updateVenue: async (venue: Venue): Promise<Venue> => {
      const venueRef = doc(db, COLLECTIONS.VENUES, venue.id);
      const venueSnap = await getDoc(venueRef);
      if (!venueSnap.exists()) {
          throw new Error("Venue not found");
      }
      await updateDoc(venueRef, venue as any);
      return venue;
  },

  deleteVenue: async (venueId: string): Promise<void> => {
      const venueRef = doc(db, COLLECTIONS.VENUES, venueId);
      await deleteDoc(venueRef);
  },

  // --- PINNED WOD MANAGEMENT ---
  getPinnedWODs: async (): Promise<PinnedWOD[]> => {
      const pinnedWodsSnapshot = await getDocs(
          query(collection(db, COLLECTIONS.PINNED_WODS), orderBy('intended_date', 'desc'))
      );
      return pinnedWodsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
      } as PinnedWOD));
  },

  addPinnedWOD: async (wod: Omit<PinnedWOD, 'id' | 'participants'>): Promise<PinnedWOD> => {
      const newWod: Omit<PinnedWOD, 'id'> = {
          ...wod,
          participants: [],
          invited_user_ids: wod.invited_user_ids || []
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.PINNED_WODS), newWod);
      return {
          ...newWod,
          id: docRef.id
      };
  },

  deletePinnedWOD: async (id: string): Promise<void> => {
      try {
          console.log('Deleting pinned WOD:', id);
          const wodRef = doc(db, COLLECTIONS.PINNED_WODS, id);
          await deleteDoc(wodRef);
          console.log('Pinned WOD deleted successfully');
      } catch (error) {
          console.error('Error deleting pinned WOD:', error);
          throw error;
      }
  },

  joinPinnedWOD: async (pinnedWodId: string, userId: string): Promise<PinnedWOD> => {
      const wodRef = doc(db, COLLECTIONS.PINNED_WODS, pinnedWodId);
      const wodSnap = await getDoc(wodRef);
      
      if (!wodSnap.exists()) {
          throw new Error("WOD not found");
      }
      
      const wod = wodSnap.data() as PinnedWOD;
      const participants = wod.participants || [];
      
      if (!participants.includes(userId)) {
          await updateDoc(wodRef, {
              participants: [...participants, userId]
          });
          return {
              ...wod,
              id: wodSnap.id,
              participants: [...participants, userId]
          };
      }
      
      return {
          ...wod,
          id: wodSnap.id
      };
  },

  unjoinPinnedWOD: async (pinnedWodId: string, userId: string): Promise<PinnedWOD> => {
      const wodRef = doc(db, COLLECTIONS.PINNED_WODS, pinnedWodId);
      const wodSnap = await getDoc(wodRef);
      
      if (!wodSnap.exists()) {
          throw new Error("WOD not found");
      }
      
      const wod = wodSnap.data() as PinnedWOD;
      const participants = (wod.participants || []).filter(id => id !== userId);
      
      await updateDoc(wodRef, {
          participants
      });
      
      return {
          ...wod,
          id: wodSnap.id,
          participants
      };
  },

  // --- WORKOUT MANAGEMENT (ADMIN) ---
  addWorkout: async (workout: Omit<Workout, 'id'>): Promise<Workout> => {
      // Filter out undefined values recursively before saving to Firestore
      const workoutData = removeUndefined(workout);
      // Ensure we have a valid object
      if (!workoutData || typeof workoutData !== 'object' || Array.isArray(workoutData)) {
          throw new Error('Invalid workout data after cleaning undefined values');
      }
      const docRef = await addDoc(collection(db, COLLECTIONS.WORKOUTS), workoutData);
      const newWorkout = { ...workout, id: docRef.id };
      console.log('Workout added successfully:', newWorkout.id);
      return newWorkout;
  },

  updateWorkout: async (workout: Workout): Promise<Workout> => {
      const workoutRef = doc(db, COLLECTIONS.WORKOUTS, workout.id);
      const workoutSnap = await getDoc(workoutRef);
      if (!workoutSnap.exists()) {
          throw new Error("Workout not found");
      }
      // Filter out undefined values recursively before updating
      const { id, ...workoutWithoutId } = workout;
      const updateData = removeUndefined(workoutWithoutId);
      // Ensure we have a valid object
      if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
          throw new Error('Invalid workout data after cleaning undefined values');
      }
      await updateDoc(workoutRef, updateData);
      return workout;
  },

  deleteWorkout: async (id: string): Promise<void> => {
      const workoutRef = doc(db, COLLECTIONS.WORKOUTS, id);
      await deleteDoc(workoutRef);
  },

  // --- EXISTING METHODS ---
  getCurrentUser: async (): Promise<User | null> => {
    return null; 
  },

  getAllUsers: async (): Promise<User[]> => {
      await seedDatabase(); // Ensure database is seeded
      const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      return usersSnapshot.docs.map(doc => doc.data() as User);
  },

  getWorkouts: async (): Promise<Workout[]> => {
      await seedDatabase(); // Ensure database is seeded
      const workoutsSnapshot = await getDocs(collection(db, COLLECTIONS.WORKOUTS));
      return workoutsSnapshot.docs.map(doc => doc.data() as Workout);
  },

  getLogs: async (): Promise<Log[]> => {
      const logsSnapshot = await getDocs(
          query(collection(db, COLLECTIONS.LOGS), orderBy('timestamp', 'desc'))
      );
      return logsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              ...data,
              id: doc.id,
              timestamp: timestampToNumber(data.timestamp)
          } as Log;
      });
  },

  saveLog: async (log: Omit<Log, 'id' | 'user_name' | 'workout_name'>): Promise<Log> => {
      // Get user and workout names
      const userRef = doc(db, COLLECTIONS.USERS, log.user_id);
      const workoutRef = doc(db, COLLECTIONS.WORKOUTS, log.workout_id);
      const [userSnap, workoutSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(workoutRef)
      ]);
      
      const user = userSnap.data() as User | undefined;
      const workout = workoutSnap.data() as Workout | undefined;
      
      const logData = {
          ...log,
          user_name: user?.name || 'Unknown',
          workout_name: workout?.name || 'Custom',
          timestamp: numberToTimestamp(log.timestamp)
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.LOGS), logData);
      const newLog: Log = {
          ...logData,
          id: docRef.id,
          timestamp: log.timestamp
      };

      // If witness is requested, create a notification
      if (newLog.witness_id) {
          await DataService.addNotification({
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
      try {
          const notificationsQuery = query(
              collection(db, COLLECTIONS.NOTIFICATIONS),
              where('target_user_id', '==', userId)
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);
          const notifications = notificationsSnapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id
          } as Notification));
          console.log(`Fetched ${notifications.length} notifications for user ${userId}`);
          return notifications;
      } catch (error) {
          console.error('Error fetching notifications:', error);
          return [];
      }
  },

  verifyLog: async (logId: string, verifierId: string, status: VerificationStatus): Promise<void> => {
      try {
          console.log(`Verifying log ${logId} with status ${status} by user ${verifierId}`);
          const logRef = doc(db, COLLECTIONS.LOGS, logId);
          const logSnap = await getDoc(logRef);
          
          if (!logSnap.exists()) {
              throw new Error("Log not found");
          }
          
          const updateData: any = {
              verification_status: status
          };
          
          if (status === VerificationStatus.VERIFIED) {
              const verifierRef = doc(db, COLLECTIONS.USERS, verifierId);
              const verifierSnap = await getDoc(verifierRef);
              const verifier = verifierSnap.data() as User | undefined;
              updateData.witness_name = verifier?.name;
          }
          
          await updateDoc(logRef, updateData);
          console.log('Log updated successfully');
          
          // Remove notification related to this log
          const notificationsQuery = query(
              collection(db, COLLECTIONS.NOTIFICATIONS),
              where('payload.log_id', '==', logId)
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);
          if (notificationsSnapshot.docs.length > 0) {
              const batch = writeBatch(db);
              notificationsSnapshot.docs.forEach(doc => {
                  batch.delete(doc.ref);
              });
              await batch.commit();
              console.log(`Deleted ${notificationsSnapshot.docs.length} notification(s) for log ${logId}`);
          }
      } catch (error) {
          console.error('Error verifying log:', error);
          throw error;
      }
  },

  addNotification: async (notification: Omit<Notification, 'id'>): Promise<Notification> => {
      try {
          const docRef = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notification);
          const newNotification: Notification = {
              ...notification,
              id: docRef.id
          };
          console.log('Notification created successfully:', newNotification.id, 'for user:', notification.target_user_id);
          return newNotification;
      } catch (error) {
          console.error('Error creating notification:', error);
          throw error;
      }
  },

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
      const notifRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      await updateDoc(notifRef, {
          read: true
      });
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
      const notifRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      await deleteDoc(notifRef);
  },

  deleteLog: async (logId: string): Promise<void> => {
      try {
          console.log('Deleting log:', logId);
          const logRef = doc(db, COLLECTIONS.LOGS, logId);
          await deleteDoc(logRef);
          console.log('Log deleted successfully');
      } catch (error) {
          console.error('Error deleting log:', error);
          throw error;
      }
  },

  updateLogWitness: async (logId: string, witnessId: string | null): Promise<void> => {
      try {
          console.log(`Updating witness for log ${logId} to ${witnessId || 'null'}`);
          const logRef = doc(db, COLLECTIONS.LOGS, logId);
          const logSnap = await getDoc(logRef);
          
          if (!logSnap.exists()) {
              throw new Error("Log not found");
          }
          
          const logData = logSnap.data();
          const updateData: any = {
              witness_id: witnessId,
              verification_status: witnessId ? VerificationStatus.PENDING : VerificationStatus.UNVERIFIED
          };
          
          // If removing witness, also remove witness_name
          if (!witnessId) {
              updateData.witness_name = null;
          }
          
          await updateDoc(logRef, updateData);
          
          // If adding a witness, create notification
          if (witnessId) {
              const workout = await getDoc(doc(db, COLLECTIONS.WORKOUTS, logData.workout_id));
              const workoutData = workout.data() as Workout | undefined;
              
              await DataService.addNotification({
                  target_user_id: witnessId,
                  type: 'witness_request',
                  message: `${logData.user_name || 'Unknown'} requests verification for "${workoutData?.name || logData.workout_name || 'Workout'}"`,
                  payload: { log_id: logId },
                  read: false
              });
              console.log('Witness notification created');
          }
          
          console.log('Log witness updated successfully');
      } catch (error) {
          console.error('Error updating log witness:', error);
          throw error;
      }
  }
};
