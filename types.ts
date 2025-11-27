
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
  MIXED = 'Mixed',
  ONE_RM = '1RM'
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
  sets?: number; // Number of sets to complete (defaults to 1 if not specified)
  round?: number; // Round number to group exercises (defaults to 1 if not specified)
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
  rounds?: number; // Number of rounds to repeat all exercises (defaults to 1 if not specified)
  components: WorkoutComponent[];
  scaling: Record<ScalingTier, string>; // Description of scaling
  is_featured?: boolean;
  is_kids_friendly?: boolean;
  category?: string; // Workout category: General, CrossFit, Hyrox, Cardio, Hybrid, Strength, Calisthenics, Kids Friendly
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
  type: 'witness_request' | 'system' | 'pinned_wod_invitation' | 'workout_assignment' | 'collab_invite' | 'collab_suggestion' | 'collab_update';
  message: string;
  payload: {
    log_id?: string;
    pinned_wod_id?: string;
    workout_id?: string;
    collab_workout_id?: string;
    suggestion_id?: string;
  };
  read: boolean;
}

export interface WorldRecord {
  id: string;
  workout_id: string; // Match to workout ID or use pattern matching
  workout_name: string;
  athlete_name: string;
  record_display: string; // e.g., "12:35.36" or "146.64 kg"
  gender: Gender;
  division?: string; // e.g., "Men's Pro", "Women's Open"
  category: string; // e.g., "Pure Running", "Calisthenics", "HYROX", "Murph"
}

export interface PinnedWOD {
  id: string;
  workout_id: string;
  workout_name: string;
  intended_date: number; // Timestamp
  deadline: number; // Timestamp
  participants: string[]; // Array of User IDs
  invited_user_ids?: string[]; // Array of invited User IDs
}

// ============ COLLABORATIVE WORKOUT TYPES ============

export enum CollaborationStatus {
  ACTIVE = 'active',
  FINALIZED = 'finalized',
  CANCELLED = 'cancelled'
}

export enum SuggestionType {
  ADD_EXERCISE = 'add_exercise',
  REMOVE_EXERCISE = 'remove_exercise',
  MODIFY_EXERCISE = 'modify_exercise',
  ADD_NEW_EXERCISE = 'add_new_exercise' // For exercises not in the database
}

export enum SuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export interface CollaborativeWorkout {
  id: string;
  name: string;
  description: string;
  scheme: WorkoutScheme;
  time_cap_seconds?: number;
  rest_type: 'fixed' | 'manual' | 'none';
  rest_seconds?: number;
  rounds?: number;
  category?: string;
  is_kids_friendly?: boolean;
  components: WorkoutComponent[]; // Current accepted components
  scaling: Record<ScalingTier, string>;
  // Collaboration metadata
  initiator_id: string; // Admin who started the collaboration
  initiator_name: string;
  collaborator_ids: string[]; // Users invited to collaborate
  status: CollaborationStatus;
  created_at: number;
  updated_at: number;
}

export interface WorkoutSuggestion {
  id: string;
  collab_workout_id: string;
  suggester_id: string;
  suggester_name: string;
  suggester_avatar?: string;
  type: SuggestionType;
  status: SuggestionStatus;
  // For ADD/MODIFY
  proposed_component?: {
    exercise_id?: string; // Empty if new exercise
    exercise_name: string; // Name (for display or new exercise)
    target: string;
    weight?: string;
    sets?: number;
    order?: number;
  };
  // For new exercise proposals
  proposed_exercise?: {
    name: string;
    type: 'time' | 'reps' | 'load' | 'distance';
    category: string;
  };
  // For REMOVE
  target_component_order?: number; // Which component to remove
  // Metadata
  reason?: string; // Why this suggestion
  created_at: number;
  resolved_at?: number;
  resolved_by?: string;
}

export interface CollaborationMessage {
  id: string;
  collab_workout_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  timestamp: number;
  // Optional: reference to a suggestion
  suggestion_ref?: string;
}
