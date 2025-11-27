
import { Log, Notification, User, VerificationStatus, Workout, GroupType, AthleteType, Gender, Venue, PinnedWOD, UserCategory, Exercise, CollaborativeWorkout, WorkoutSuggestion, CollaborationMessage, CollaborationStatus, SuggestionStatus, SuggestionType, WorkoutScheme, ScalingTier } from '../types';
import { MOCK_LOGS, MOCK_USERS, MOCK_WORKOUTS, MOCK_VENUES, MOCK_EXERCISES } from '../constants';
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
  NOTIFICATIONS: 'notifications',
  EXERCISES: 'exercises',
  COLLAB_WORKOUTS: 'collaborativeWorkouts',
  COLLAB_SUGGESTIONS: 'collabSuggestions',
  COLLAB_MESSAGES: 'collabMessages'
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
      
      // Always check and seed exercises independently (they might be missing even if other data exists)
      try {
        const exercisesSnapshot = await getDocs(collection(db, COLLECTIONS.EXERCISES));
        if (exercisesSnapshot.empty) {
          console.log('Seeding exercises...');
          const exercisesBatch = writeBatch(db);
          let batchCount = 0;
          for (const exercise of MOCK_EXERCISES) {
            const exerciseRef = doc(db, COLLECTIONS.EXERCISES, exercise.id);
            exercisesBatch.set(exerciseRef, exercise);
            batchCount++;
            // Firestore batch limit is 500, commit in chunks if needed
            if (batchCount >= 450) {
              await exercisesBatch.commit();
              batchCount = 0;
            }
          }
          if (batchCount > 0) {
            await exercisesBatch.commit();
          }
          console.log('Exercises seeded successfully');
        } else {
          console.log('Exercises already exist, skipping seed');
        }
      } catch (error) {
        console.error('Error seeding exercises:', error);
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
              title: '', // Empty - user should set their own designation
              gender: Gender.UNSPECIFIED,
              group_id: GroupType.NONE,
              athlete_type: AthleteType.GENERIC,
              is_admin: false,
              avatar_url: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
              category: UserCategory.ADULT
          };
          
          await setDoc(userRef, newUser);
          
          // Create welcome notification prompting user to update their profile
          await DataService.addNotification({
              target_user_id: newUser.id,
              type: 'profile_reminder',
              message: `Welcome to HDB FitX, ${newUser.name}! Please update your profile to set your designation, gender, group, and athlete type.`,
              payload: { action: 'update_profile' },
              read: false
          });
          
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

  register: async (data: { name: string, title?: string, gender: Gender, group_id: GroupType, athlete_type: AthleteType, category: UserCategory }): Promise<User> => {
    await seedDatabase(); // Ensure database is seeded
    
    const newUser: User = {
        id: `u_${Date.now()}`,
        name: data.name,
        title: data.title || '', // Empty by default - user should set their own designation
        gender: data.gender,
        group_id: data.group_id,
        athlete_type: data.athlete_type,
        is_admin: false, // Default to user
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
        category: data.category
    };
    
    const userRef = doc(db, COLLECTIONS.USERS, newUser.id);
    await setDoc(userRef, newUser);
    
    // Create welcome notification prompting user to update their profile
    await DataService.addNotification({
        target_user_id: newUser.id,
        type: 'profile_reminder',
        message: `Welcome to HDB FitX, ${newUser.name}! Please update your profile to complete your registration.`,
        payload: { action: 'update_profile' },
        read: false
    });
    
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

  assignWorkout: async (targetUserId: string, workoutId: string, workoutName: string, assignerName: string): Promise<void> => {
      await DataService.addNotification({
          target_user_id: targetUserId,
          type: 'workout_assignment',
          message: `${assignerName} assigned you a workout: ${workoutName}`,
          payload: {
              workout_id: workoutId
          },
          read: false
      });
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
      try {
          if (!id || typeof id !== 'string' || id.trim() === '') {
              throw new Error('Invalid workout ID provided');
          }
          
          // Sanitize ID - remove any invalid characters
          const sanitizedId = id.trim();
          
          console.log('Deleting workout:', sanitizedId);
          console.log('Collection name:', COLLECTIONS.WORKOUTS);
          
          const workoutRef = doc(db, COLLECTIONS.WORKOUTS, sanitizedId);
          
          // Check if document exists before deleting
          const workoutSnap = await getDoc(workoutRef);
          if (!workoutSnap.exists()) {
              console.warn('Workout document does not exist:', sanitizedId);
              throw new Error('Workout not found');
          }
          
          console.log('Document exists, proceeding with deletion...');
          await deleteDoc(workoutRef);
          console.log('Workout deleted successfully:', sanitizedId);
      } catch (error) {
          console.error('Error deleting workout:', error);
          console.error('Error details:', {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
              id: id
          });
          throw error;
      }
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
      return workoutsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Workout));
  },

  // Sync new workouts from MOCK_WORKOUTS that don't exist in Firestore
  syncNewWorkouts: async (): Promise<{ added: number; existing: number }> => {
      try {
          const workoutsSnapshot = await getDocs(collection(db, COLLECTIONS.WORKOUTS));
          const existingIds = new Set(workoutsSnapshot.docs.map(doc => doc.id));
          
          const batch = writeBatch(db);
          let addedCount = 0;
          
          for (const workout of MOCK_WORKOUTS) {
              if (!existingIds.has(workout.id)) {
                  const workoutRef = doc(db, COLLECTIONS.WORKOUTS, workout.id);
                  batch.set(workoutRef, { ...workout, is_kids_friendly: workout.is_kids_friendly || false });
                  addedCount++;
              }
          }
          
          if (addedCount > 0) {
              await batch.commit();
          }
          
          console.log(`Synced workouts: ${addedCount} added, ${existingIds.size} already existed`);
          return { added: addedCount, existing: existingIds.size };
      } catch (error) {
          console.error('Error syncing workouts:', error);
          throw error;
      }
  },

  // Sync new exercises from MOCK_EXERCISES that don't exist in Firestore
  syncNewExercises: async (): Promise<{ added: number; existing: number }> => {
      try {
          const exercisesSnapshot = await getDocs(collection(db, COLLECTIONS.EXERCISES));
          const existingIds = new Set(exercisesSnapshot.docs.map(doc => doc.id));
          
          const batch = writeBatch(db);
          let addedCount = 0;
          
          for (const exercise of MOCK_EXERCISES) {
              if (!existingIds.has(exercise.id)) {
                  const exerciseRef = doc(db, COLLECTIONS.EXERCISES, exercise.id);
                  batch.set(exerciseRef, exercise);
                  addedCount++;
              }
          }
          
          if (addedCount > 0) {
              await batch.commit();
          }
          
          console.log(`Synced exercises: ${addedCount} added, ${existingIds.size} already existed`);
          return { added: addedCount, existing: existingIds.size };
      } catch (error) {
          console.error('Error syncing exercises:', error);
          throw error;
      }
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

  // --- EXERCISE MANAGEMENT ---
  getExercises: async (): Promise<Exercise[]> => {
      try {
          await seedDatabase(); // Ensure database is seeded
          const exercisesSnapshot = await getDocs(collection(db, COLLECTIONS.EXERCISES));
          return exercisesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Exercise));
      } catch (error) {
          console.error('Error fetching exercises:', error);
          return [];
      }
  },

  addExercise: async (exercise: Omit<Exercise, 'id'>): Promise<Exercise> => {
      try {
          const docRef = await addDoc(collection(db, COLLECTIONS.EXERCISES), exercise);
          const newExercise = { ...exercise, id: docRef.id };
          console.log('Exercise added successfully:', newExercise.id);
          return newExercise;
      } catch (error) {
          console.error('Error adding exercise:', error);
          throw error;
      }
  },

  deleteExercise: async (id: string): Promise<void> => {
      try {
          console.log('Deleting exercise:', id);
          const exerciseRef = doc(db, COLLECTIONS.EXERCISES, id);
          await deleteDoc(exerciseRef);
          console.log('Exercise deleted successfully');
      } catch (error) {
          console.error('Error deleting exercise:', error);
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
  },

  // ============ COLLABORATIVE WORKOUT METHODS ============

  // Create a new collaborative workout session
  createCollaborativeWorkout: async (
    initiator: User,
    workoutData: Partial<CollaborativeWorkout>,
    invitedUserIds: string[]
  ): Promise<CollaborativeWorkout> => {
    try {
      const now = Date.now();
      const isAdmin = initiator.is_admin;
      
      // For non-admin users, set expiration to 3 days from now
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      
      const collabData: Omit<CollaborativeWorkout, 'id'> = {
        name: workoutData.name || 'Untitled Collaboration',
        description: workoutData.description || '',
        scheme: workoutData.scheme || WorkoutScheme.FOR_TIME,
        rest_type: workoutData.rest_type || 'none',
        rounds: workoutData.rounds || 1,
        category: workoutData.category || 'General',
        is_kids_friendly: workoutData.is_kids_friendly || false,
        components: workoutData.components || [],
        scaling: workoutData.scaling || {
          [ScalingTier.RX]: 'RX',
          [ScalingTier.ADVANCED]: 'Scaled',
          [ScalingTier.INTERMEDIATE]: 'Scaled',
          [ScalingTier.BEGINNER]: 'Foundation'
        },
        initiator_id: initiator.id,
        initiator_name: initiator.name,
        initiator_is_admin: isAdmin,
        collaborator_ids: invitedUserIds,
        status: CollaborationStatus.ACTIVE,
        created_at: now,
        updated_at: now,
        expires_at: isAdmin ? undefined : now + THREE_DAYS_MS
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.COLLAB_WORKOUTS), removeUndefined(collabData));
      
      // Send notifications to invited collaborators
      for (const userId of invitedUserIds) {
        await DataService.addNotification({
          target_user_id: userId,
          type: 'collab_invite',
          message: `${initiator.name} invited you to collaborate on "${collabData.name}"`,
          payload: { collab_workout_id: docRef.id },
          read: false
        });
      }

      return { ...collabData, id: docRef.id };
    } catch (error) {
      console.error('Error creating collaborative workout:', error);
      throw error;
    }
  },

  // Get all collaborative workouts for a user (as initiator or collaborator)
  getCollaborativeWorkouts: async (userId: string): Promise<CollaborativeWorkout[]> => {
    try {
      const allCollabs: CollaborativeWorkout[] = [];
      const now = Date.now();
      
      // Get where user is initiator
      const initiatorQuery = query(
        collection(db, COLLECTIONS.COLLAB_WORKOUTS),
        where('initiator_id', '==', userId)
      );
      const initiatorSnap = await getDocs(initiatorQuery);
      initiatorSnap.docs.forEach(d => {
        allCollabs.push({ ...d.data(), id: d.id } as CollaborativeWorkout);
      });

      // Get where user is collaborator
      const collabQuery = query(
        collection(db, COLLECTIONS.COLLAB_WORKOUTS),
        where('collaborator_ids', 'array-contains', userId)
      );
      const collabSnap = await getDocs(collabQuery);
      collabSnap.docs.forEach(d => {
        // Avoid duplicates
        if (!allCollabs.find(c => c.id === d.id)) {
          allCollabs.push({ ...d.data(), id: d.id } as CollaborativeWorkout);
        }
      });

      // Check for expired collabs and auto-cancel them
      for (const collab of allCollabs) {
        if (collab.status === CollaborationStatus.ACTIVE && 
            collab.expires_at && 
            collab.expires_at < now) {
          // Auto-expire this collab
          try {
            await updateDoc(doc(db, COLLECTIONS.COLLAB_WORKOUTS, collab.id), {
              status: CollaborationStatus.CANCELLED,
              updated_at: now
            });
            collab.status = CollaborationStatus.CANCELLED;
          } catch (e) {
            console.error('Error auto-expiring collab:', e);
          }
        }
      }

      return allCollabs.sort((a, b) => b.updated_at - a.updated_at);
    } catch (error) {
      console.error('Error fetching collaborative workouts:', error);
      return [];
    }
  },

  // Get a single collaborative workout by ID
  getCollaborativeWorkout: async (id: string): Promise<CollaborativeWorkout | null> => {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.COLLAB_WORKOUTS, id));
      if (!docSnap.exists()) return null;
      return { ...docSnap.data(), id: docSnap.id } as CollaborativeWorkout;
    } catch (error) {
      console.error('Error fetching collaborative workout:', error);
      return null;
    }
  },

  // Update collaborative workout
  updateCollaborativeWorkout: async (id: string, updates: Partial<CollaborativeWorkout>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTIONS.COLLAB_WORKOUTS, id);
      await updateDoc(docRef, removeUndefined({ ...updates, updated_at: Date.now() }));
    } catch (error) {
      console.error('Error updating collaborative workout:', error);
      throw error;
    }
  },

  // Add a collaborator to the workout
  addCollaborator: async (collabId: string, userId: string, inviterName: string): Promise<void> => {
    try {
      const collab = await DataService.getCollaborativeWorkout(collabId);
      if (!collab) throw new Error('Collaboration not found');
      
      if (!collab.collaborator_ids.includes(userId)) {
        await updateDoc(doc(db, COLLECTIONS.COLLAB_WORKOUTS, collabId), {
          collaborator_ids: [...collab.collaborator_ids, userId],
          updated_at: Date.now()
        });

        // Send notification
        await DataService.addNotification({
          target_user_id: userId,
          type: 'collab_invite',
          message: `${inviterName} invited you to collaborate on "${collab.name}"`,
          payload: { collab_workout_id: collabId },
          read: false
        });
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  },

  // Submit a suggestion for a collaborative workout
  submitSuggestion: async (suggestion: Omit<WorkoutSuggestion, 'id'>): Promise<WorkoutSuggestion> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.COLLAB_SUGGESTIONS), removeUndefined(suggestion));
      
      // Notify the initiator
      const collab = await DataService.getCollaborativeWorkout(suggestion.collab_workout_id);
      if (collab && collab.initiator_id !== suggestion.suggester_id) {
        await DataService.addNotification({
          target_user_id: collab.initiator_id,
          type: 'collab_suggestion',
          message: `${suggestion.suggester_name} made a suggestion for "${collab.name}"`,
          payload: { collab_workout_id: suggestion.collab_workout_id, suggestion_id: docRef.id },
          read: false
        });
      }

      return { ...suggestion, id: docRef.id };
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      throw error;
    }
  },

  // Get all suggestions for a collaborative workout
  getSuggestions: async (collabWorkoutId: string): Promise<WorkoutSuggestion[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.COLLAB_SUGGESTIONS),
        where('collab_workout_id', '==', collabWorkoutId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ ...d.data(), id: d.id } as WorkoutSuggestion))
        .sort((a, b) => b.created_at - a.created_at);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  },

  // Resolve a suggestion (accept or reject)
  resolveSuggestion: async (
    suggestionId: string,
    status: SuggestionStatus,
    resolverId: string,
    collabWorkoutId: string
  ): Promise<void> => {
    try {
      const suggestionRef = doc(db, COLLECTIONS.COLLAB_SUGGESTIONS, suggestionId);
      const suggestionSnap = await getDoc(suggestionRef);
      
      if (!suggestionSnap.exists()) throw new Error('Suggestion not found');
      
      const suggestion = suggestionSnap.data() as WorkoutSuggestion;
      
      await updateDoc(suggestionRef, {
        status,
        resolved_at: Date.now(),
        resolved_by: resolverId
      });

      // If accepted, apply the change to the collaborative workout
      if (status === SuggestionStatus.ACCEPTED) {
        const collab = await DataService.getCollaborativeWorkout(collabWorkoutId);
        if (!collab) return;

        let updatedComponents = [...collab.components];

        if (suggestion.type === SuggestionType.ADD_EXERCISE || suggestion.type === SuggestionType.ADD_NEW_EXERCISE) {
          if (suggestion.proposed_component) {
            const newComponent = {
              exercise_id: suggestion.proposed_component.exercise_id || `custom_${Date.now()}`,
              target: suggestion.proposed_component.target,
              weight: suggestion.proposed_component.weight,
              sets: suggestion.proposed_component.sets,
              order: updatedComponents.length + 1
            };
            updatedComponents.push(newComponent);

            // If it's a new exercise, add it to the exercises collection
            if (suggestion.type === SuggestionType.ADD_NEW_EXERCISE && suggestion.proposed_exercise) {
              const exerciseId = `custom_${Date.now()}`;
              await setDoc(doc(db, COLLECTIONS.EXERCISES, exerciseId), {
                id: exerciseId,
                name: suggestion.proposed_exercise.name,
                type: suggestion.proposed_exercise.type,
                category: suggestion.proposed_exercise.category
              });
              // Update the component with the new exercise ID
              updatedComponents[updatedComponents.length - 1].exercise_id = exerciseId;
            }
          }
        } else if (suggestion.type === SuggestionType.REMOVE_EXERCISE) {
          if (suggestion.target_component_order !== undefined) {
            updatedComponents = updatedComponents.filter(c => c.order !== suggestion.target_component_order);
            // Reorder remaining components
            updatedComponents = updatedComponents.map((c, i) => ({ ...c, order: i + 1 }));
          }
        } else if (suggestion.type === SuggestionType.MODIFY_EXERCISE) {
          if (suggestion.proposed_component && suggestion.target_component_order !== undefined) {
            const idx = updatedComponents.findIndex(c => c.order === suggestion.target_component_order);
            if (idx >= 0) {
              updatedComponents[idx] = {
                ...updatedComponents[idx],
                exercise_id: suggestion.proposed_component.exercise_id || updatedComponents[idx].exercise_id,
                target: suggestion.proposed_component.target,
                weight: suggestion.proposed_component.weight,
                sets: suggestion.proposed_component.sets
              };
            }
          }
        }

        await DataService.updateCollaborativeWorkout(collabWorkoutId, {
          components: updatedComponents
        });
      }

      // Notify the suggester of the resolution
      if (suggestion.suggester_id !== resolverId) {
        const users = await DataService.getAllUsers();
        const resolver = users.find(u => u.id === resolverId);
        await DataService.addNotification({
          target_user_id: suggestion.suggester_id,
          type: 'collab_update',
          message: `${resolver?.name || 'Admin'} ${status === SuggestionStatus.ACCEPTED ? 'accepted' : 'rejected'} your suggestion`,
          payload: { collab_workout_id: collabWorkoutId, suggestion_id: suggestionId },
          read: false
        });
      }
    } catch (error) {
      console.error('Error resolving suggestion:', error);
      throw error;
    }
  },

  // Send a chat message
  sendCollabMessage: async (message: Omit<CollaborationMessage, 'id'>): Promise<CollaborationMessage> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.COLLAB_MESSAGES), removeUndefined(message));
      return { ...message, id: docRef.id };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get chat messages for a collaborative workout
  getCollabMessages: async (collabWorkoutId: string): Promise<CollaborationMessage[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.COLLAB_MESSAGES),
        where('collab_workout_id', '==', collabWorkoutId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ ...d.data(), id: d.id } as CollaborationMessage))
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  // Finalize collaborative workout and convert to regular workout
  finalizeCollaborativeWorkout: async (collabId: string, initiatorId: string): Promise<Workout> => {
    try {
      const collab = await DataService.getCollaborativeWorkout(collabId);
      if (!collab) throw new Error('Collaboration not found');
      if (collab.initiator_id !== initiatorId) throw new Error('Only initiator can finalize');

      // Create the regular workout
      const workoutData: Omit<Workout, 'id'> = {
        name: collab.name,
        description: collab.description,
        scheme: collab.scheme,
        time_cap_seconds: collab.time_cap_seconds,
        rest_type: collab.rest_type,
        rest_seconds: collab.rest_seconds,
        rounds: collab.rounds,
        components: collab.components,
        scaling: collab.scaling,
        is_featured: false,
        is_kids_friendly: collab.is_kids_friendly,
        category: collab.category
      };

      const newWorkout = await DataService.addWorkout(workoutData);

      // Mark collaboration as finalized
      await updateDoc(doc(db, COLLECTIONS.COLLAB_WORKOUTS, collabId), {
        status: CollaborationStatus.FINALIZED,
        updated_at: Date.now()
      });

      // Notify all collaborators
      for (const userId of collab.collaborator_ids) {
        await DataService.addNotification({
          target_user_id: userId,
          type: 'collab_update',
          message: `"${collab.name}" has been finalized and is now available!`,
          payload: { collab_workout_id: collabId, workout_id: newWorkout.id },
          read: false
        });
      }

      return newWorkout;
    } catch (error) {
      console.error('Error finalizing collaborative workout:', error);
      throw error;
    }
  },

  // Cancel a collaborative workout
  cancelCollaborativeWorkout: async (collabId: string, initiatorId: string): Promise<void> => {
    try {
      const collab = await DataService.getCollaborativeWorkout(collabId);
      if (!collab) throw new Error('Collaboration not found');
      if (collab.initiator_id !== initiatorId) throw new Error('Only initiator can cancel');

      await updateDoc(doc(db, COLLECTIONS.COLLAB_WORKOUTS, collabId), {
        status: CollaborationStatus.CANCELLED,
        updated_at: Date.now()
      });

      // Notify all collaborators
      for (const userId of collab.collaborator_ids) {
        await DataService.addNotification({
          target_user_id: userId,
          type: 'collab_update',
          message: `"${collab.name}" collaboration has been cancelled`,
          payload: { collab_workout_id: collabId },
          read: false
        });
      }
    } catch (error) {
      console.error('Error cancelling collaborative workout:', error);
      throw error;
    }
  }
};
