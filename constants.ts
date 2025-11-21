
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
    { id: 'v1', name: 'HDB Hub Aerogym (Toa Payoh)', type: 'HDB' },
    { id: 'v2', name: 'Bedok Reservoir Fitness Corner', type: 'Outdoor' },
    { id: 'v3', name: 'Jurong West ActiveSG', type: 'Commercial' },
    { id: 'v4', name: 'Home Gym', type: 'Home' },
    { id: 'v5', name: 'External / Commercial Gym', type: 'Commercial' },
    { id: 'v6', name: 'Open Void Deck', type: 'HDB' },
    { id: 'v_custom', name: 'Other Location', type: 'Other' },
    
    // Functional / HYROX Gyms
    { id: 'v7', name: 'Mobilus (HYROX Lab) - Official HYROX Training Club & CrossFit Affiliate', type: 'Commercial' },
    { id: 'v8', name: 'UFIT - Official HYROX Training Club (Structured Classes)', type: 'Commercial' },
    { id: 'v9', name: 'Actualize CrossFit - Official HYROX Affiliate Gym & CrossFit', type: 'Commercial' },
    { id: 'v10', name: 'Body Fit Training (BFT) - Official HYROX Training Centre', type: 'Commercial' },
    { id: 'v11', name: 'UNDIVIDED Performance - Dedicated HYROX Training Club', type: 'Commercial' },
    
    // CrossFit Gyms
    { id: 'v12', name: 'Innervate Fitness - Community-driven CrossFit', type: 'Commercial' },
    { id: 'v13', name: 'CrossFit Urban Edge - Dedicated CrossFit Gym', type: 'Commercial' },
    { id: 'v14', name: 'Division Athletics - CrossFit & Functional Fitness', type: 'Commercial' },
    { id: 'v15', name: 'WE ARE ONE Fitness - Singapore\'s Largest Outdoor CrossFit Gym', type: 'Commercial' },
    { id: 'v16', name: 'CrossFit Unit - Dedicated CrossFit Gym', type: 'Commercial' },
    { id: 'v17', name: 'MethodX Singapore - CrossFit, Functional Fitness, & HYROX Pump', type: 'Commercial' },
    
    // Specialty Gyms
    { id: 'v18', name: 'ArkBloc - Bouldering, Calisthenics, & Strongman Training', type: 'Commercial' },
    
    // Boutique / HIIT Gyms
    { id: 'v19', name: 'Barry\'s - High-Intensity Interval Training', type: 'Commercial' },
    { id: 'v20', name: 'Ritual - 30-Minute High-Intensity Strength & Conditioning', type: 'Commercial' },
    { id: 'v21', name: 'F45 Training - Global Functional HIIT Program', type: 'Commercial' },
    
    // Specialty Pods
    { id: 'v22', name: 'The Gym Pod - 24/7 Pay-per-use Private Pods (HYROX setup available)', type: 'Commercial' },
    
    // Commercial Chain Gyms
    { id: 'v23', name: 'Anytime Fitness - Largest 24/7 Chain (90+ Locations)', type: 'Commercial' },
    { id: 'v24', name: 'Fitness First - Premium Commercial Chain & HYROX Club (15+ Locations)', type: 'Commercial' },
    { id: 'v25', name: 'Virgin Active - Luxury/High-end with Pools & Rock Walls (6 Locations)', type: 'Commercial' },
    { id: 'v26', name: 'PURE Fitness - Luxury/High-end & HYROX Affiliate (2 Locations)', type: 'Commercial' },
    { id: 'v27', name: 'ActiveSG Gym - Government-run Affordable Community Gym (Many Locations)', type: 'Commercial' },
    { id: 'v28', name: 'GYMMBOXX - Local Chain with Multiple Locations', type: 'Commercial' },
    { id: 'v29', name: 'EnergyOne Gym - Located in SAFRA Clubs (Multiple Locations)', type: 'Commercial' },
    { id: 'v30', name: '24/7 Fitness - Offers 24/7 Access (Multiple Locations)', type: 'Commercial' },
    
    // Boutique/Specialty Gyms
    { id: 'v31', name: 'Dennis Gym - Bodybuilding & Serious Strength Fitness (6 Locations)', type: 'Commercial' },
    { id: 'v32', name: 'The Strength Yard - Functional Barbell & Progressive Strength Training', type: 'Commercial' },
    { id: 'v33', name: 'Amore Fitness & Define - Ladies-only Option (6 Locations)', type: 'Commercial' }
];

// Extensive Exercise List - Organized by Category
export const MOCK_EXERCISES: Exercise[] = [
    // === CARDIO ===
    { id: 'run', name: 'Run', type: 'distance', category: 'Cardio' },
    { id: 'ski', name: 'Ski Erg', type: 'distance', category: 'Cardio' },
    { id: 'row', name: 'Row', type: 'distance', category: 'Cardio' },
    { id: 'sprint', name: 'Shuttle Sprint', type: 'distance', category: 'Cardio' },
    { id: 'wallball', name: 'Wall Balls', type: 'reps', category: 'Cardio' },
    { id: 'du', name: 'Double Unders', type: 'reps', category: 'Cardio' },
    { id: 'burpee', name: 'Burpee', type: 'reps', category: 'Cardio' },
    { id: 'burpee_broad', name: 'Burpee Broad Jump', type: 'distance', category: 'Cardio' },
    
    // === STRENGTH (Weighted) ===
    { id: 'sled_push', name: 'Sled Push', type: 'distance', category: 'Strength' },
    { id: 'sled_pull', name: 'Sled Pull', type: 'distance', category: 'Strength' },
    { id: 'farmers', name: 'Farmers Carry', type: 'distance', category: 'Strength' },
    { id: 'lunge', name: 'Sandbag Lunges', type: 'distance', category: 'Strength' },
    { id: 'thruster', name: 'Thrusters', type: 'reps', category: 'Strength' },
    { id: 'clean_jerk', name: 'Clean & Jerk', type: 'reps', category: 'Strength' },
    { id: 'snatch', name: 'Snatch', type: 'reps', category: 'Strength' },
    { id: 'deadlift', name: 'Deadlift', type: 'reps', category: 'Strength' },
    { id: 'bench', name: 'Bench Press', type: 'reps', category: 'Strength' },
    
    // === BODYWEIGHT / CALISTHENICS - PUSH ===
    { id: 'pushup', name: 'Standard Push-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'incline_pushup', name: 'Incline Push-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'knee_pushup', name: 'Knee Push-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'decline_pushup', name: 'Decline Push-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'one_arm_pushup', name: 'One-Arm Push-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'diamond_pushup', name: 'Diamond Push-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'wall_pushup', name: 'Wall Push-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'pike_pushup', name: 'Pike Push-ups (Elevated Feet)', type: 'reps', category: 'Bodyweight' },
    { id: 'handstand_pushup', name: 'Handstand Push-ups (Against Wall)', type: 'reps', category: 'Bodyweight' },
    { id: 'planche_tuck', name: 'Planche Progressions (Tuck)', type: 'time', category: 'Bodyweight' },
    { id: 'planche_straddle', name: 'Planche Progressions (Straddle)', type: 'time', category: 'Bodyweight' },
    { id: 'bench_dips', name: 'Bench Dips', type: 'reps', category: 'Bodyweight' },
    { id: 'straight_bar_dips', name: 'Straight Bar Dips', type: 'reps', category: 'Bodyweight' },
    { id: 'parallel_bar_dips', name: 'Parallel Bar Dips', type: 'reps', category: 'Bodyweight' },
    
    // === BODYWEIGHT / CALISTHENICS - PULL ===
    { id: 'pullup', name: 'Standard Pull-ups (Overhand)', type: 'reps', category: 'Bodyweight' },
    { id: 'chinup', name: 'Chin-ups (Underhand)', type: 'reps', category: 'Bodyweight' },
    { id: 'australian_pullup', name: 'Australian Pull-ups (Inverted Rows)', type: 'reps', category: 'Bodyweight' },
    { id: 'scapular_pulls', name: 'Scapular Pulls (Shrugs)', type: 'reps', category: 'Bodyweight' },
    { id: 'negative_pullup', name: 'Negative Pull-ups (Controlled Lowering)', type: 'reps', category: 'Bodyweight' },
    { id: 'assisted_pullup', name: 'Assisted Pull-ups (Bands)', type: 'reps', category: 'Bodyweight' },
    { id: 'l_sit_pullup', name: 'L-Sit Pull-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'explosive_pullup', name: 'Explosive Pull-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'typewriter_pullup', name: 'Typewriter Pull-ups', type: 'reps', category: 'Bodyweight' },
    { id: 'one_arm_pullup', name: 'One-Arm Pull-up Progressions', type: 'reps', category: 'Bodyweight' },
    { id: 'muscle_up', name: 'Muscle-Up (Bar or Rings)', type: 'reps', category: 'Bodyweight' },
    { id: 'front_lever_tuck', name: 'Front Lever Progressions (Tuck)', type: 'time', category: 'Bodyweight' },
    { id: 'front_lever_straddle', name: 'Front Lever Progressions (Straddle)', type: 'time', category: 'Bodyweight' },
    
    // === BODYWEIGHT / CALISTHENICS - LEGS ===
    { id: 'air_squat', name: 'Bodyweight Squats (Air Squats)', type: 'reps', category: 'Bodyweight' },
    { id: 'jump_squat', name: 'Jump Squats', type: 'reps', category: 'Bodyweight' },
    { id: 'pistol_squat', name: 'Pistol Squats (One-Legged)', type: 'reps', category: 'Bodyweight' },
    { id: 'shrimp_squat', name: 'Shrimp Squats', type: 'reps', category: 'Bodyweight' },
    { id: 'sissy_squat', name: 'Sissy Squats (Quad Focus)', type: 'reps', category: 'Bodyweight' },
    { id: 'forward_lunge', name: 'Forward Lunges', type: 'reps', category: 'Bodyweight' },
    { id: 'reverse_lunge', name: 'Reverse Lunges', type: 'reps', category: 'Bodyweight' },
    { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squats', type: 'reps', category: 'Bodyweight' },
    { id: 'glute_bridge', name: 'Glute Bridges', type: 'reps', category: 'Bodyweight' },
    { id: 'single_leg_glute_bridge', name: 'Single-Leg Glute Bridges', type: 'reps', category: 'Bodyweight' },
    { id: 'nordic_curl', name: 'Nordic Curls (Hamstrings)', type: 'reps', category: 'Bodyweight' },
    { id: 'calf_raise', name: 'Calf Raises', type: 'reps', category: 'Bodyweight' },
    { id: 'box_jump', name: 'Box Jumps / Step-Ups', type: 'reps', category: 'Bodyweight' },
    
    // === BODYWEIGHT / CALISTHENICS - CORE ===
    { id: 'plank', name: 'Plank (Forearm or High)', type: 'time', category: 'Bodyweight' },
    { id: 'hollow_body', name: 'Hollow Body Hold', type: 'time', category: 'Bodyweight' },
    { id: 'l_sit', name: 'L-Sit (Full) / V-Sit', type: 'time', category: 'Bodyweight' },
    { id: 'l_sit_tuck', name: 'L-Sit Progressions (Tuck)', type: 'time', category: 'Bodyweight' },
    { id: 'crunch', name: 'Crunches', type: 'reps', category: 'Bodyweight' },
    { id: 'hanging_knee_raise', name: 'Hanging Knee Raises', type: 'reps', category: 'Bodyweight' },
    { id: 'lying_leg_raise', name: 'Lying Leg Raises', type: 'reps', category: 'Bodyweight' },
    { id: 'dragon_flag', name: 'Dragon Flags', type: 'reps', category: 'Bodyweight' },
    { id: 'human_flag', name: 'Human Flag Progressions', type: 'time', category: 'Bodyweight' },
    { id: 'russian_twist', name: 'Russian Twists', type: 'reps', category: 'Bodyweight' },
    { id: 'ab_rollout', name: 'Ab Rollouts (Wheel or Rings)', type: 'reps', category: 'Bodyweight' },
    { id: 'windshield_wiper', name: 'Windshield Wipers (Hanging)', type: 'reps', category: 'Bodyweight' },
    
    // === PLYOMETRIC ===
    { id: 'plyo_box_jump', name: 'Plyometric Box Jumps', type: 'reps', category: 'Plyometric' },
];

// Mock Workouts (Hyrox, CrossFit, HDB Specials)
export const MOCK_WORKOUTS: Workout[] = [
  {
    id: 'w_hyrox_pro',
    name: 'HYROX Simulation (RX)',
    description: 'The ultimate fitness race simulation. 8 x 1km runs alternating with 8 functional stations.',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 5400, // 90 mins
    rest_type: 'manual',
    is_featured: true,
    components: [
      { exercise_id: 'run', target: '1km Run', order: 1 },
      { exercise_id: 'ski', target: '1000m Ski Erg', order: 2 },
      { exercise_id: 'run', target: '1km Run', order: 3 },
      { exercise_id: 'sled_push', target: '50m Sled Push', weight: '152kg', order: 4 },
      { exercise_id: 'run', target: '1km Run', order: 5 },
      { exercise_id: 'sled_pull', target: '50m Sled Pull', weight: '103kg', order: 6 },
      { exercise_id: 'run', target: '1km Run', order: 7 },
      { exercise_id: 'burpee_broad', target: '80m Burpee Broad Jump', order: 8 },
      { exercise_id: 'run', target: '1km Run', order: 9 },
      { exercise_id: 'row', target: '1000m Row', order: 10 },
      { exercise_id: 'run', target: '1km Run', order: 11 },
      { exercise_id: 'farmers', target: '200m Farmers Carry', weight: '2x32kg', order: 12 },
      { exercise_id: 'run', target: '1km Run', order: 13 },
      { exercise_id: 'lunge', target: '100m Sandbag Lunges', weight: '30kg', order: 14 },
      { exercise_id: 'run', target: '1km Run', order: 15 },
      { exercise_id: 'wallball', target: '100 Wall Balls', weight: '9kg', order: 16 },
    ],
    scaling: {
      [ScalingTier.RX]: 'Full Weights (Men 152/103kg, Women 102/78kg)',
      [ScalingTier.ADVANCED]: 'Open Weights (Men 102/78kg, Women 70/52kg)',
      [ScalingTier.INTERMEDIATE]: 'Doubles (Split Reps/Dist, Reduced Weights)',
      [ScalingTier.BEGINNER]: 'Bodyweight movements / 50% distance',
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
  },
  // === KIDS FRIENDLY WORKOUTS ===
  {
    id: 'w_kids_push_power',
    name: 'Push Power Challenge',
    description: 'Fun push-up variations to build upper body strength. Perfect for playground workouts!',
    scheme: WorkoutScheme.AMRAP,
    time_cap_seconds: 600, // 10 mins
    rest_type: 'fixed',
    rest_seconds: 30,
    is_featured: false,
    is_kids_friendly: true,
    components: [
      { exercise_id: 'wall_pushup', target: '10 Wall Push-ups', order: 1 },
      { exercise_id: 'incline_pushup', target: '8 Incline Push-ups', order: 2 },
      { exercise_id: 'knee_pushup', target: '6 Knee Push-ups', order: 3 },
      { exercise_id: 'pushup', target: '5 Standard Push-ups', order: 4 },
    ],
    scaling: {
      [ScalingTier.RX]: 'All exercises as written',
      [ScalingTier.ADVANCED]: 'Reduce reps by 2',
      [ScalingTier.INTERMEDIATE]: 'Reduce reps by 4, add 10s rest',
      [ScalingTier.BEGINNER]: 'Wall Push-ups only, 5 reps each round',
    }
  },
  {
    id: 'w_kids_pull_adventure',
    name: 'Pull Adventure',
    description: 'Build pulling strength with fun variations. Great for monkey bars and pull-up bars!',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 900, // 15 mins
    rest_type: 'manual',
    is_featured: false,
    is_kids_friendly: true,
    components: [
      { exercise_id: 'scapular_pulls', target: '10 Scapular Pulls', order: 1 },
      { exercise_id: 'australian_pullup', target: '8 Australian Pull-ups', order: 2 },
      { exercise_id: 'negative_pullup', target: '5 Negative Pull-ups', order: 3 },
      { exercise_id: 'assisted_pullup', target: '5 Assisted Pull-ups', order: 4 },
    ],
    scaling: {
      [ScalingTier.RX]: 'All exercises as written',
      [ScalingTier.ADVANCED]: 'Reduce reps by 2',
      [ScalingTier.INTERMEDIATE]: 'Scapular Pulls + Australian Pull-ups only',
      [ScalingTier.BEGINNER]: 'Scapular Pulls only, 5 reps',
    }
  },
  {
    id: 'w_kids_leg_blast',
    name: 'Leg Blast',
    description: 'Jump, squat, and lunge your way to strong legs! Perfect for active kids.',
    scheme: WorkoutScheme.AMRAP,
    time_cap_seconds: 600, // 10 mins
    rest_type: 'fixed',
    rest_seconds: 20,
    is_featured: false,
    is_kids_friendly: true,
    components: [
      { exercise_id: 'air_squat', target: '10 Bodyweight Squats', order: 1 },
      { exercise_id: 'jump_squat', target: '8 Jump Squats', order: 2 },
      { exercise_id: 'forward_lunge', target: '6 Forward Lunges (each leg)', order: 3 },
      { exercise_id: 'calf_raise', target: '10 Calf Raises', order: 4 },
    ],
    scaling: {
      [ScalingTier.RX]: 'All exercises as written',
      [ScalingTier.ADVANCED]: 'Reduce reps by 2',
      [ScalingTier.INTERMEDIATE]: 'No jump squats, regular squats only',
      [ScalingTier.BEGINNER]: 'Squats and calf raises only, 5 reps each',
    }
  },
  {
    id: 'w_kids_core_hero',
    name: 'Core Hero',
    description: 'Build a strong core with fun bodyweight exercises. Become a superhero!',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 600, // 10 mins
    rest_type: 'fixed',
    rest_seconds: 15,
    is_featured: false,
    is_kids_friendly: true,
    components: [
      { exercise_id: 'plank', target: '20 Secs Plank', order: 1 },
      { exercise_id: 'crunch', target: '10 Crunches', order: 2 },
      { exercise_id: 'lying_leg_raise', target: '8 Lying Leg Raises', order: 3 },
      { exercise_id: 'russian_twist', target: '10 Russian Twists', order: 4 },
    ],
    scaling: {
      [ScalingTier.RX]: 'All exercises as written',
      [ScalingTier.ADVANCED]: 'Plank 30s, increase other reps by 2',
      [ScalingTier.INTERMEDIATE]: 'Plank 15s, reduce other reps by 2',
      [ScalingTier.BEGINNER]: 'Plank 10s, crunches only, 5 reps',
    }
  },
  {
    id: 'w_kids_full_body_fun',
    name: 'Full Body Fun',
    description: 'Complete workout using push, pull, legs, and core. Perfect for playground fitness!',
    scheme: WorkoutScheme.AMRAP,
    time_cap_seconds: 900, // 15 mins
    rest_type: 'fixed',
    rest_seconds: 30,
    is_featured: true,
    is_kids_friendly: true,
    components: [
      { exercise_id: 'knee_pushup', target: '5 Knee Push-ups', order: 1 },
      { exercise_id: 'australian_pullup', target: '5 Australian Pull-ups', order: 2 },
      { exercise_id: 'air_squat', target: '10 Bodyweight Squats', order: 3 },
      { exercise_id: 'plank', target: '15 Secs Plank', order: 4 },
    ],
    scaling: {
      [ScalingTier.RX]: 'All exercises as written',
      [ScalingTier.ADVANCED]: 'Standard push-ups, increase reps by 2',
      [ScalingTier.INTERMEDIATE]: 'Reduce all reps by 2, plank 10s',
      [ScalingTier.BEGINNER]: 'Wall push-ups, 3 reps each, plank 10s',
    }
  },
  {
    id: 'w_kids_playground_warrior',
    name: 'Playground Warrior',
    description: 'Use playground equipment for a complete bodyweight workout. Adventure time!',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 1200, // 20 mins
    rest_type: 'manual',
    is_featured: false,
    is_kids_friendly: true,
    components: [
      { exercise_id: 'wall_pushup', target: '10 Wall Push-ups', order: 1 },
      { exercise_id: 'scapular_pulls', target: '8 Scapular Pulls', order: 2 },
      { exercise_id: 'jump_squat', target: '10 Jump Squats', order: 3 },
      { exercise_id: 'hanging_knee_raise', target: '5 Hanging Knee Raises', order: 4 },
      { exercise_id: 'box_jump', target: '5 Box Jumps / Step-Ups', order: 5 },
      { exercise_id: 'hollow_body', target: '10 Secs Hollow Body Hold', order: 6 },
    ],
    scaling: {
      [ScalingTier.RX]: 'All exercises as written',
      [ScalingTier.ADVANCED]: 'Increase reps by 2-3',
      [ScalingTier.INTERMEDIATE]: 'Reduce reps by 2, remove hanging knee raises',
      [ScalingTier.BEGINNER]: 'Wall push-ups, squats, and plank only',
    }
  },
  // === RUNNING & ERG CHALLENGES ===
  {
    id: 'w_5km_run',
    name: '5KM Run Challenge',
    description: 'Test your endurance with a 5KM run. Track your time and aim for a personal best!',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 1800, // 30 mins cap
    rest_type: 'none',
    is_featured: true,
    components: [
      { exercise_id: 'run', target: '5KM Run', order: 1 },
    ],
    scaling: {
      [ScalingTier.RX]: '5KM continuous run',
      [ScalingTier.ADVANCED]: '5KM with 1-2 walk breaks allowed',
      [ScalingTier.INTERMEDIATE]: '3KM run, 2KM walk/run',
      [ScalingTier.BEGINNER]: '2KM run/walk intervals',
    }
  },
  {
    id: 'w_10km_run',
    name: '10KM Run Challenge',
    description: 'Push your limits with a 10KM run. Elite endurance challenge for serious runners.',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 3600, // 60 mins cap
    rest_type: 'none',
    is_featured: true,
    components: [
      { exercise_id: 'run', target: '10KM Run', order: 1 },
    ],
    scaling: {
      [ScalingTier.RX]: '10KM continuous run',
      [ScalingTier.ADVANCED]: '10KM with strategic walk breaks',
      [ScalingTier.INTERMEDIATE]: '7KM run, 3KM walk/run',
      [ScalingTier.BEGINNER]: '5KM run/walk intervals',
    }
  },
  {
    id: 'w_rowerg_1km',
    name: 'Rowerg 1KM Fastest Challenge',
    description: 'All-out sprint on the rowing machine. How fast can you complete 1KM?',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 600, // 10 mins cap
    rest_type: 'none',
    is_featured: false,
    components: [
      { exercise_id: 'row', target: '1KM Row', order: 1 },
    ],
    scaling: {
      [ScalingTier.RX]: '1KM continuous row - fastest time',
      [ScalingTier.ADVANCED]: '1KM row with 30s rest at 500m',
      [ScalingTier.INTERMEDIATE]: '750m row - fastest time',
      [ScalingTier.BEGINNER]: '500m row - fastest time',
    }
  },
  {
    id: 'w_skierg_1km',
    name: 'Skierg 1KM Fastest Challenge',
    description: 'Maximum effort on the ski erg. Push through the burn for your fastest 1KM time!',
    scheme: WorkoutScheme.FOR_TIME,
    time_cap_seconds: 600, // 10 mins cap
    rest_type: 'none',
    is_featured: false,
    components: [
      { exercise_id: 'ski', target: '1KM Ski Erg', order: 1 },
    ],
    scaling: {
      [ScalingTier.RX]: '1KM continuous ski - fastest time',
      [ScalingTier.ADVANCED]: '1KM ski with 30s rest at 500m',
      [ScalingTier.INTERMEDIATE]: '750m ski - fastest time',
      [ScalingTier.BEGINNER]: '500m ski - fastest time',
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