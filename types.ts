
export enum GroupType {
  EAPG = 'EAPG',
  PLG = 'PLG',
  HMG = 'HMG',
  FG = 'FG',
  BRI = 'BRI',
  ISG = 'ISG',
  NONE = 'NONE'
}

export enum AthleteType {
  HYROX = 'Hyrox',
  CROSSFIT = 'CrossFit',
  CALISTHENICS = 'Calisthenics',
  HYBRID = 'Hybrid',
  RUNNER = 'Runner',
  STRENGTH = 'Strength',
  BODYBUILDER = 'Bodybuilder',
  GENERIC = 'Generic'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  UNSPECIFIED = 'Unspecified'
}

export enum UserCategory {
  ADULT = 'Adult',
  KID = 'Kid'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified'
}

export enum ScalingTier {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  RX = 'RX' // Formerly Pro
}

export enum WorkoutScheme {
  FOR_TIME = 'For Time',
  AMRAP = 'AMRAP',
  EMOM = 'EMOM',
  TABATA = 'Tabata',
  MIXED = 'Mixed'
}

export interface User {
  id: string;
  name: string;
  title: string;
  gender: Gender;
  group_id: GroupType;
  athlete_type: AthleteType;
  is_admin: boolean;
  avatar_url?: string;
  category: UserCategory;
}

export interface Exercise {
  id: string;
  name: string;
  type: 'time' | 'reps' | 'load' | 'distance';
  category: string;
}

export interface Venue {
  id: string;
  name: string;
  type: 'HDB' | 'Commercial' | 'Outdoor' | 'Home' | 'Other';
  is_custom?: boolean; // If created by user ad-hoc (logic for future)
}

export interface WorkoutComponent {
  exercise_id: string;
  target: string; // e.g., "100 reps" or "Run 1km"
  weight?: string; // e.g. "20kg" or "BW"
  order: number;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  scheme: WorkoutScheme;
  time_cap_seconds?: number; // For AMRAP duration or Time Cap
  rest_type: 'fixed' | 'manual' | 'none';
  rest_seconds?: number;
  components: WorkoutComponent[];
  scaling: Record<ScalingTier, string>; // Description of scaling
  is_featured?: boolean;
  is_kids_friendly?: boolean;
}

export interface Log {
  id: string;
  user_id: string;
  user_name: string; // Denormalized for easier leaderboard
  workout_id: string;
  workout_name: string;
  timestamp: number;
  location: string;
  total_time_seconds: number;
  score_display: string; // e.g., "24:10" or "150 reps"
  notes: string;
  difficulty_tier: ScalingTier;
  verification_status: VerificationStatus;
  witness_id: string | null;
  witness_name?: string;
}

export interface Notification {
  id: string;
  target_user_id: string;
  type: 'witness_request' | 'system';
  message: string;
  payload: {
    log_id?: string;
  };
  read: boolean;
}

export interface PinnedWOD {
  id: string;
  workout_id: string;
  workout_name: string;
  intended_date: number; // Timestamp
  deadline: number; // Timestamp
  participants: string[]; // Array of User IDs
}
