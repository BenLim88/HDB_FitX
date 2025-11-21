
import { AthleteType, GroupType, Log, ScalingTier, User, VerificationStatus, Workout, Exercise, WorkoutScheme, Gender, Venue, UserCategory } from './types';

export const APP_NAME = "HDB FitX";

// Mock Users
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Hunter McIntyre', title: 'Mr', gender: Gender.MALE, group_id: GroupType.EAPG, athlete_type: AthleteType.HYROX, is_admin: true, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HunterMcIntyre', category: UserCategory.ADULT },
  { id: 'u2', name: 'Lauren Weeks', title: 'Ms', gender: Gender.FEMALE, group_id: GroupType.PLG, athlete_type: AthleteType.HYROX, is_admin: false, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LaurenWeeks', category: UserCategory.ADULT },
  { id: 'u3', name: 'Hong Beom-seok', title: 'Mr', gender: Gender.MALE, group_id: GroupType.HMG, athlete_type: AthleteType.HYROX, is_admin: false, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HongBeomseok', category: UserCategory.ADULT },
];

export const CURRENT_USER_ID = 'u1'; 

// Mock Venues
export const MOCK_VENUES: Venue[] = [
    { id: 'v1', name: 'HDB AeroGym (Tampines)', type: 'HDB' },
    { id: 'v2', name: 'Bedok Reservoir Fitness Corner', type: 'Outdoor' },
    { id: 'v3', name: 'Jurong West ActiveSG', type: 'Commercial' },
    { id: 'v4', name: 'Home Gym', type: 'Home' },
    { id: 'v5', name: 'External / Commercial Gym', type: 'Commercial' },
    { id: 'v6', name: 'Open Void Deck', type: 'HDB' },
    { id: 'v_custom', name: 'Other Location', type: 'Other' }
];

// Extensive Exercise List
export const MOCK_EXERCISES: Exercise[] = [
    { id: 'run', name: 'Run', type: 'distance', category: 'Cardio' },
    { id: 'ski', name: 'Ski Erg', type: 'distance', category: 'Cardio' },
    { id: 'row', name: 'Row', type: 'distance', category: 'Cardio' },
    { id: 'sled_push', name: 'Sled Push', type: 'distance', category: 'Strength' },
    { id: 'sled_pull', name: 'Sled Pull', type: 'distance', category: 'Strength' },
    { id: 'burpee_broad', name: 'Burpee Broad Jump', type: 'distance', category: 'Plyo' },
    { id: 'farmers', name: 'Farmers Carry', type: 'distance', category: 'Strength' },
    { id: 'lunge', name: 'Sandbag Lunges', type: 'distance', category: 'Strength' },
    { id: 'wallball', name: 'Wall Balls', type: 'reps', category: 'Cardio' },
    { id: 'thruster', name: 'Thrusters', type: 'reps', category: 'Weightlifting' },
    { id: 'pullup', name: 'Pull-ups', type: 'reps', category: 'Gymnastics' },
    { id: 'pushup', name: 'Push-ups', type: 'reps', category: 'Gymnastics' },
    { id: 'air_squat', name: 'Air Squats', type: 'reps', category: 'Gymnastics' },
    { id: 'clean_jerk', name: 'Clean & Jerk', type: 'reps', category: 'Weightlifting' },
    { id: 'snatch', name: 'Snatch', type: 'reps', category: 'Weightlifting' },
    { id: 'du', name: 'Double Unders', type: 'reps', category: 'Cardio' },
    { id: 'box_jump', name: 'Box Jumps', type: 'reps', category: 'Plyo' },
    { id: 'deadlift', name: 'Deadlift', type: 'reps', category: 'Powerlifting' },
    { id: 'bench', name: 'Bench Press', type: 'reps', category: 'Powerlifting' },
    { id: 'sprint', name: 'Shuttle Sprint', type: 'distance', category: 'Cardio' },
    { id: 'burpee', name: 'Burpee', type: 'reps', category: 'Plyo' },
];

// Mock Workouts (Hyrox, CrossFit, HDB Specials)
export const MOCK_WORKOUTS: Workout[] = [
  {
    id: 'w_hyrox_pro',
    name: 'HYROX Simulation (RX)',
    description: 'The ultimate fitness race simulation. 8km running + 8 workouts.',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 5400, // 90 mins
    rest_type: 'manual',
    is_featured: true,
    components: [
      { exercise_id: 'ski', target: '1000m Ski', order: 1 },
      { exercise_id: 'sled_push', target: '50m Sled Push', weight: '152kg', order: 2 },
      { exercise_id: 'sled_pull', target: '50m Sled Pull', weight: '103kg', order: 3 },
      { exercise_id: 'burpee_broad', target: '80m Burpee Broad Jump', order: 4 },
      { exercise_id: 'row', target: '1000m Row', order: 5 },
      { exercise_id: 'farmers', target: '200m Farmers Carry', weight: '2x32kg', order: 6 },
      { exercise_id: 'lunge', target: '100m Sandbag Lunges', weight: '30kg', order: 7 },
      { exercise_id: 'wallball', target: '100 Wall Balls', weight: '9kg', order: 8 },
    ],
    scaling: {
      [ScalingTier.RX]: 'Full Weights (Men 152/103kg)',
      [ScalingTier.ADVANCED]: 'Open Weights (Men 102/78kg)',
      [ScalingTier.INTERMEDIATE]: 'Doubles (Split Reps/Dist)',
      [ScalingTier.BEGINNER]: 'Bodyweight movements / 50% dist',
    }
  },
  {
    id: 'w_murph',
    name: 'Murph',
    description: 'Hero WOD. Partition the gymnastics as needed.',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 3600,
    rest_type: 'none',
    is_featured: true,
    components: [
      { exercise_id: 'run', target: '1.6km Run', order: 1 },
      { exercise_id: 'pullup', target: '100 Pull-ups', order: 2 },
      { exercise_id: 'pushup', target: '200 Push-ups', order: 3 },
      { exercise_id: 'air_squat', target: '300 Air Squats', order: 4 },
      { exercise_id: 'run', target: '1.6km Run', order: 5 },
    ],
    scaling: {
      [ScalingTier.RX]: 'Vest (9/6kg)',
      [ScalingTier.ADVANCED]: 'No Vest',
      [ScalingTier.INTERMEDIATE]: 'Half Reps (50/100/150)',
      [ScalingTier.BEGINNER]: 'Ring Rows, Knee Pushups, 800m Run',
    }
  },
  {
    id: 'w_fran',
    name: 'Fran',
    description: '21-15-9 Reps for time.',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 600,
    rest_type: 'none',
    is_featured: false,
    components: [
      { exercise_id: 'thruster', target: '21 Thrusters', weight: '43/30kg', order: 1 },
      { exercise_id: 'pullup', target: '21 Pull-ups', order: 2 },
      { exercise_id: 'thruster', target: '15 Thrusters', weight: '43/30kg', order: 3 },
      { exercise_id: 'pullup', target: '15 Pull-ups', order: 4 },
      { exercise_id: 'thruster', target: '9 Thrusters', weight: '43/30kg', order: 5 },
      { exercise_id: 'pullup', target: '9 Pull-ups', order: 6 },
    ],
    scaling: {
      [ScalingTier.RX]: 'RX Weight',
      [ScalingTier.ADVANCED]: '30/20kg',
      [ScalingTier.INTERMEDIATE]: '20/15kg, Jumping Pull-ups',
      [ScalingTier.BEGINNER]: 'PVC Pipe Thrusters, Ring Rows',
    }
  },
  {
    id: 'w_grace',
    name: 'Grace',
    description: '30 Clean and Jerks for time.',
    scheme: WorkoutScheme.FOR_TIME,
    rest_type: 'none',
    is_featured: false,
    components: [
      { exercise_id: 'clean_jerk', target: '30 Clean & Jerks', weight: '61/43kg', order: 1 },
    ],
    scaling: {
      [ScalingTier.RX]: 'RX Weight',
      [ScalingTier.ADVANCED]: '43/30kg',
      [ScalingTier.INTERMEDIATE]: '30/20kg',
      [ScalingTier.BEGINNER]: 'Broomstick/Empty Bar',
    }
  },
  {
    id: 'w_cindy',
    name: 'Cindy',
    description: '5 Pull-ups, 10 Push-ups, 15 Squats.',
    scheme: WorkoutScheme.AMRAP,
    time_cap_seconds: 1200, // 20 mins
    rest_type: 'none',
    is_featured: false,
    components: [
      { exercise_id: 'pullup', target: '5 Pull-ups', order: 1 },
      { exercise_id: 'pushup', target: '10 Push-ups', order: 2 },
      { exercise_id: 'air_squat', target: '15 Air Squats', order: 3 },
    ],
    scaling: {
      [ScalingTier.RX]: 'Strict Pull-ups',
      [ScalingTier.ADVANCED]: 'Kipping Pull-ups',
      [ScalingTier.INTERMEDIATE]: 'Jumping Pull-ups / Bands',
      [ScalingTier.BEGINNER]: 'Ring Rows, Knee Pushups',
    }
  },
  {
    id: 'w_hdb_sprint',
    name: 'Void Deck Sprint',
    description: 'High intensity interval training utilizing the MPH pillars.',
    scheme: WorkoutScheme.FOR_TIME,
    rest_type: 'fixed',
    rest_seconds: 60,
    is_featured: false,
    components: [
      { exercise_id: 'sprint', target: '10 x 10m Shuttle', order: 1 },
      { exercise_id: 'burpee', target: '50 Burpees', order: 2 },
      { exercise_id: 'lunge', target: '100m Walking Lunges', order: 3 },
    ],
    scaling: {
      [ScalingTier.RX]: 'Unbroken',
      [ScalingTier.ADVANCED]: '1 min rest between movements',
      [ScalingTier.INTERMEDIATE]: '30 Burpees, 50m Lunges',
      [ScalingTier.BEGINNER]: 'Walk/Jog, Step-ups',
    }
  }
];

// Initial Logs for Leaderboard
export const MOCK_LOGS: Log[] = [
  {
    id: 'l1',
    user_id: 'u1',
    user_name: 'Hunter McIntyre',
    workout_id: 'w_hyrox_pro',
    workout_name: 'HYROX Simulation (RX)',
    timestamp: Date.now() - 86400000,
    location: 'Singapore HYROX Arena',
    total_time_seconds: 3202, // 53:22
    score_display: '53:22',
    notes: 'Men\'s Pro Division - World Record Pace',
    difficulty_tier: ScalingTier.RX,
    verification_status: VerificationStatus.VERIFIED,
    witness_id: 'u2',
    witness_name: 'Lauren Weeks'
  },
  {
    id: 'l2',
    user_id: 'u2',
    user_name: 'Lauren Weeks',
    workout_id: 'w_hyrox_pro',
    workout_name: 'HYROX Simulation (RX)',
    timestamp: Date.now() - 100000,
    location: 'Singapore HYROX Arena',
    total_time_seconds: 3382, // 56:22
    score_display: '56:22',
    notes: 'Women\'s Pro Division - Elite Performance',
    difficulty_tier: ScalingTier.RX,
    verification_status: VerificationStatus.VERIFIED,
    witness_id: 'u1',
    witness_name: 'Hunter McIntyre'
  },
   {
    id: 'l3',
    user_id: 'u3',
    user_name: 'Hong Beom-seok',
    workout_id: 'w_hyrox_pro',
    workout_name: 'HYROX Simulation (RX)',
    timestamp: Date.now() - 200000,
    location: 'Seoul HYROX Arena',
    total_time_seconds: 3515, // 58:35
    score_display: '58:35',
    notes: 'Best Solo HYROX Time - Men\'s Open, Seoul 2025',
    difficulty_tier: ScalingTier.RX,
    verification_status: VerificationStatus.VERIFIED,
    witness_id: 'u1',
    witness_name: 'Hunter McIntyre'
  },
  {
    id: 'l4',
    user_id: 'u3',
    user_name: 'Hong Beom-seok',
    workout_id: 'w_hyrox_pro',
    workout_name: 'HYROX Simulation (RX)',
    timestamp: Date.now() - 300000,
    location: 'Singapore HYROX Arena',
    total_time_seconds: 3626, // 1:00:26
    score_display: '1:00:26',
    notes: 'Men\'s Pro Division (Single Race) - Singapore 2025',
    difficulty_tier: ScalingTier.RX,
    verification_status: VerificationStatus.VERIFIED,
    witness_id: 'u1',
    witness_name: 'Hunter McIntyre'
  }
];