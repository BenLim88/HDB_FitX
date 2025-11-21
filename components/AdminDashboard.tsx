
import React, { useState, useEffect } from 'react';
import { Exercise, Workout, User, GroupType, AthleteType, WorkoutComponent, ScalingTier, WorkoutScheme, Venue, UserCategory } from '../types';
import { DataService } from '../services/dataService';
import { MOCK_EXERCISES } from '../constants';
import { Plus, Trash2, Dumbbell, LayoutList, Users, Edit, Shield, Save, X, Lock, ChevronRight, ArrowLeft, Timer, Settings, MapPin, Star, Calendar, Pin, Baby } from 'lucide-react';

interface AdminDashboardProps {
  initialWorkouts: Workout[];
  onUpdateWorkouts: (workouts: Workout[]) => void;
  initialVenues: Venue[];
  onUpdateVenues: (venues: Venue[]) => void;
  currentUser: User; // Add currentUser prop
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialWorkouts, onUpdateWorkouts, initialVenues, onUpdateVenues, currentUser }) => {
  // Data States
  const [exercises, setExercises] = useState<Exercise[]>(MOCK_EXERCISES);
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [users, setUsers] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>(initialVenues);

  // UI States
  const [activeTab, setActiveTab] = useState<'exercises' | 'workouts' | 'users' | 'venues'>('exercises');
  const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  // Pin WOD State
  const [pinningWorkoutId, setPinningWorkoutId] = useState<string | null>(null);
  const [intendedDate, setIntendedDate] = useState('');
  const [intendedTime, setIntendedTime] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [inviteFilter, setInviteFilter] = useState<'all' | 'adults' | 'kids' | string>('all'); // 'all', 'adults', 'kids', or athlete_type
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Exercise Form State
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseType, setNewExerciseType] = useState<'reps' | 'time' | 'load' | 'distance'>('reps');
  const [newExerciseCategory, setNewExerciseCategory] = useState('General');

  // Venue Form State
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueType, setNewVenueType] = useState<'HDB' | 'Commercial' | 'Outdoor' | 'Home' | 'Other'>('HDB');

  // User Edit State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  // Workout Builder State
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');
  const [workoutScheme, setWorkoutScheme] = useState<WorkoutScheme>(WorkoutScheme.FOR_TIME);
  const [workoutTimeCap, setWorkoutTimeCap] = useState<string>(''); // Handle as string for input
  const [workoutComponents, setWorkoutComponents] = useState<WorkoutComponent[]>([]);
  const [restType, setRestType] = useState<'fixed' | 'manual' | 'none'>('none');
  const [restSeconds, setRestSeconds] = useState<string>('60');
  const [isKidsFriendly, setIsKidsFriendly] = useState(false);
  const [workoutCategory, setWorkoutCategory] = useState<string>('General');
  
  // Scaling Builder State
  const [scalingRx, setScalingRx] = useState('');
  const [scalingAdv, setScalingAdv] = useState('');
  const [scalingInt, setScalingInt] = useState('');
  const [scalingBeg, setScalingBeg] = useState('');

  // Component Adder State
  const [selectedExId, setSelectedExId] = useState<string>(MOCK_EXERCISES[0]?.id || '');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('Reps');
  const [weightInput, setWeightInput] = useState('');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<string>('All');

  useEffect(() => {
      if (activeTab === 'users') {
          loadUsers();
      }
  }, [activeTab]);

  const loadUsers = async () => {
      const allUsers = await DataService.getAllUsers();
      setUsers(allUsers);
  };

  // --- VENUE HANDLERS ---
  const handleSaveVenue = async () => {
      if (!newVenueName) return;

      const venueData: Venue = {
          id: editingVenueId || `v_${Date.now()}`,
          name: newVenueName,
          type: newVenueType
      };
      
      let updatedVenues;
      if (editingVenueId) {
          // Update existing
          await DataService.updateVenue(venueData);
          updatedVenues = venues.map(v => v.id === editingVenueId ? venueData : v);
      } else {
          // Create new
          const saved = await DataService.addVenue(venueData);
          updatedVenues = [...venues, saved];
      }

      setVenues(updatedVenues);
      onUpdateVenues(updatedVenues);
      
      // Reset form
      setEditingVenueId(null);
      setNewVenueName('');
  };

  const handleEditVenue = (venue: Venue) => {
      setEditingVenueId(venue.id);
      setNewVenueName(venue.name);
      setNewVenueType(venue.type);
  };

  const handleCancelVenueEdit = () => {
      setEditingVenueId(null);
      setNewVenueName('');
  }

  const handleDeleteVenue = async (id: string) => {
      if (confirm("Delete this venue?")) {
          await DataService.deleteVenue(id);
          const updated = venues.filter(v => v.id !== id);
          setVenues(updated);
          onUpdateVenues(updated);
      }
  };

  // --- EXERCISE HANDLERS ---
  const handleAddExercise = () => {
    if(!newExerciseName) return;
    const newEx: Exercise = {
        id: `e_${Date.now()}`,
        name: newExerciseName,
        type: newExerciseType,
        category: newExerciseCategory
    };
    setExercises([...exercises, newEx]);
    setNewExerciseName('');
  };

  const handleDeleteExercise = (id: string) => {
    setExercises(exercises.filter(e => e.id !== id));
  };

  // --- WORKOUT BUILDER HANDLERS ---
  const handleAddComponent = () => {
      if (!selectedExId || !targetValue) return;
      
      const fullTarget = `${targetValue} ${targetUnit}`;

      const newComponent: WorkoutComponent = {
          exercise_id: selectedExId,
          target: fullTarget,
          weight: weightInput || undefined,
          order: workoutComponents.length + 1
      };
      setWorkoutComponents([...workoutComponents, newComponent]);
      setTargetValue('');
      setWeightInput('');
  };

  const removeComponent = (idx: number) => {
      const updated = workoutComponents.filter((_, i) => i !== idx);
      // Re-index orders
      const reordered = updated.map((c, i) => ({ ...c, order: i + 1 }));
      setWorkoutComponents(reordered);
  };

  const startEditingWorkout = (workout: Workout) => {
      setEditingWorkoutId(workout.id);
      setWorkoutName(workout.name);
      setWorkoutDesc(workout.description);
      setWorkoutScheme(workout.scheme);
      setWorkoutTimeCap(workout.time_cap_seconds ? (workout.time_cap_seconds / 60).toString() : '');
      setRestType(workout.rest_type || 'none');
      setRestSeconds(workout.rest_seconds ? workout.rest_seconds.toString() : '60');
      setIsKidsFriendly(workout.is_kids_friendly || false);
      setWorkoutCategory(workout.category || 'General');
      
      // Deep copy components to avoid mutating the original object during editing
      setWorkoutComponents(JSON.parse(JSON.stringify(workout.components)));
      
      setScalingRx(workout.scaling[ScalingTier.RX] || '');
      setScalingAdv(workout.scaling[ScalingTier.ADVANCED] || '');
      setScalingInt(workout.scaling[ScalingTier.INTERMEDIATE] || '');
      setScalingBeg(workout.scaling[ScalingTier.BEGINNER] || '');
      
      setIsCreatingWorkout(true);
  };

  const handleSaveWorkout = () => {
      if (!workoutName || workoutComponents.length === 0) {
          alert("Please provide a name and at least one exercise.");
          return;
      }
      // Preserve is_featured if updating, else default to false
      const existing = workouts.find(w => w.id === editingWorkoutId);
      
      const newWorkout: Workout = {
          id: editingWorkoutId || `w_${Date.now()}`,
          name: workoutName,
          description: workoutDesc,
          scheme: workoutScheme,
          time_cap_seconds: workoutTimeCap ? parseInt(workoutTimeCap) * 60 : undefined,
          rest_type: restType,
          rest_seconds: restType === 'fixed' ? parseInt(restSeconds) : undefined,
          components: workoutComponents,
          scaling: {
              [ScalingTier.RX]: scalingRx || 'RX',
              [ScalingTier.ADVANCED]: scalingAdv || 'Scaled',
              [ScalingTier.INTERMEDIATE]: scalingInt || 'Scaled',
              [ScalingTier.BEGINNER]: scalingBeg || 'Foundation'
          },
          is_featured: existing?.is_featured || false,
          is_kids_friendly: isKidsFriendly,
          category: workoutCategory
      };

      let updatedWorkouts;
      if (editingWorkoutId) {
          updatedWorkouts = workouts.map(w => w.id === editingWorkoutId ? newWorkout : w);
      } else {
          updatedWorkouts = [...workouts, newWorkout];
      }
      
      setWorkouts(updatedWorkouts);
      onUpdateWorkouts(updatedWorkouts); // Propagate to parent

      closeBuilder();
  };

  const toggleFeaturedWorkout = (id: string) => {
      const workout = workouts.find(w => w.id === id);
      if (!workout) return;

      const currentFeaturedCount = workouts.filter(w => w.is_featured).length;
      
      if (!workout.is_featured && currentFeaturedCount >= 3) {
          alert("Maximum 3 workouts can be featured. Un-feature one first.");
          return;
      }

      const updatedWorkouts = workouts.map(w => 
          w.id === id ? { ...w, is_featured: !w.is_featured } : w
      );
      setWorkouts(updatedWorkouts);
      onUpdateWorkouts(updatedWorkouts);
  };

  const closeBuilder = () => {
      setIsCreatingWorkout(false);
      setEditingWorkoutId(null);
      // Reset Form
      setWorkoutName('');
      setWorkoutDesc('');
      setWorkoutTimeCap('');
      setRestType('none');
      setRestSeconds('60');
      setWorkoutComponents([]);
      setScalingRx('');
      setScalingAdv('');
      setScalingInt('');
      setScalingBeg('');
      setIsKidsFriendly(false);
      setWorkoutCategory('General');
  };

  const handleDeleteWorkout = (id: string) => {
      if(confirm("Delete this workout?")) {
          const updatedWorkouts = workouts.filter(w => w.id !== id);
          setWorkouts(updatedWorkouts);
          onUpdateWorkouts(updatedWorkouts); // Propagate
      }
  };

  // --- PIN WOD HANDLERS ---
  const handleStartPinning = async (workoutId: string) => {
      setPinningWorkoutId(workoutId);
      // Set default dates (today and tomorrow)
      const now = new Date();
      setIntendedDate(now.toISOString().split('T')[0]);
      setIntendedTime("08:00");
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeadlineDate(tomorrow.toISOString().split('T')[0]);
      setDeadlineTime("23:59");
      
      // Reset invitation selection
      setInviteFilter('all');
      setSelectedUserIds(new Set());
      
      // Load users if not already loaded
      if (users.length === 0) {
          await loadUsers();
      }
  };

  const handleConfirmPin = async () => {
      if (!pinningWorkoutId || !intendedDate || !deadlineDate) {
          alert('Please fill in all required fields (intended date and deadline date).');
          return;
      }

      // Check if user is admin
      if (!currentUser || !currentUser.is_admin) {
          alert('Only administrators can pin workouts.');
          return;
      }

      const workout = workouts.find(w => w.id === pinningWorkoutId);
      if (!workout) {
          alert('Workout not found.');
          return;
      }

      // Combine date and time to timestamp
      const start = new Date(`${intendedDate}T${intendedTime || '00:00'}`).getTime();
      const end = new Date(`${deadlineDate}T${deadlineTime || '23:59'}`).getTime();

      try {
          // Create pinned WOD
          const pinnedWod = await DataService.addPinnedWOD({
              workout_id: workout.id,
              workout_name: workout.name,
              intended_date: start,
              deadline: end,
              invited_user_ids: Array.from(selectedUserIds)
          });

      // Determine which users to invite
      let usersToInvite: User[] = [];
      
      if (inviteFilter === 'all') {
          usersToInvite = users.filter(u => !u.is_admin); // Exclude admins
      } else if (inviteFilter === 'adults') {
          usersToInvite = users.filter(u => !u.is_admin && u.category === UserCategory.ADULT);
      } else if (inviteFilter === 'kids') {
          usersToInvite = users.filter(u => !u.is_admin && u.category === UserCategory.KID);
      } else {
          // Filter by athlete type
          usersToInvite = users.filter(u => !u.is_admin && u.athlete_type === inviteFilter);
      }

      // If specific users are selected, use those instead
      if (selectedUserIds.size > 0) {
          usersToInvite = users.filter(u => selectedUserIds.has(u.id));
      }

          // Send notifications to selected users
          const dateStr = new Date(start).toLocaleDateString();
          const timeStr = new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          for (const user of usersToInvite) {
              try {
                  const notification = await DataService.addNotification({
                      target_user_id: user.id,
                      type: 'pinned_wod_invitation',
                      message: `New Priority Mission: "${workout.name}" scheduled for ${dateStr} at ${timeStr}`,
                      payload: {
                          pinned_wod_id: pinnedWod.id
                      },
                      read: false
                  });
                  console.log(`Notification created for ${user.name}:`, notification.id);
              } catch (notifError) {
                  console.error(`Failed to send notification to ${user.name}:`, notifError);
                  alert(`Failed to send notification to ${user.name}. Check console for details.`);
              }
          }

          alert(`Pinned "${workout.name}" to the Home Board! ${usersToInvite.length > 0 ? `Invitations sent to ${usersToInvite.length} user(s).` : ''}`);
          setPinningWorkoutId(null);
          setSelectedUserIds(new Set());
          setInviteFilter('all');
      } catch (error) {
          console.error('Error pinning workout:', error);
          alert(`Failed to pin workout: ${error instanceof Error ? error.message : 'Unknown error'}. Check browser console for details.`);
      }
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleEditUser = (user: User) => {
      if (user.id === 'master_admin') return; // UI Protect
      setEditingUserId(user.id);
      setEditForm({ ...user });
  };

  const handleSaveUser = async () => {
      if (!editingUserId || !editForm) {
          alert('No user selected for editing.');
          return;
      }
      
      // Find the original user to preserve required fields
      const originalUser = users.find(u => u.id === editingUserId);
      if (!originalUser) {
          alert('User not found.');
          return;
      }
      
      // Validate required fields
      if (!editForm.name || !editForm.title) {
          alert('Please fill in all required fields (name and title).');
          return;
      }
      
      try {
          // Merge editForm with original user to ensure all required fields are present
          const updatedUser: User = {
              ...originalUser,
              ...editForm,
              id: editingUserId, // Ensure ID is set
              name: editForm.name || originalUser.name,
              title: editForm.title || originalUser.title,
              gender: editForm.gender || originalUser.gender,
              group_id: editForm.group_id || originalUser.group_id,
              athlete_type: editForm.athlete_type || originalUser.athlete_type,
              category: editForm.category || originalUser.category,
              is_admin: editForm.is_admin !== undefined ? editForm.is_admin : originalUser.is_admin,
              avatar_url: editForm.avatar_url || originalUser.avatar_url
          };
          
          console.log('Saving user:', editingUserId, updatedUser);
          const updated = await DataService.updateUser(updatedUser);
          console.log('User updated successfully:', updated);
          setUsers(users.map(u => u.id === updated.id ? updated : u));
          setEditingUserId(null);
          setEditForm({});
          alert('User updated successfully!');
      } catch (e) {
          console.error("Failed to update user", e);
          alert(`Failed to update user: ${e instanceof Error ? e.message : 'Unknown error'}. Check console for details.`);
      }
  };

  const handleDeleteUser = async (userId: string) => {
      if (userId === 'master_admin') {
          alert("Master Admin cannot be deleted.");
          return;
      }
      if (window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
        await DataService.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
      }
  };

  const toggleAdmin = async (user: User) => {
      if (user.id === 'master_admin') {
          alert("Cannot revoke rights from Master Admin.");
          return;
      }
      
      const newAdminStatus = !user.is_admin;
      const confirmMessage = newAdminStatus 
          ? `Promote "${user.name}" to Administrator?`
          : `Revoke Administrator rights from "${user.name}"?`;
      
      if (!confirm(confirmMessage)) {
          return;
      }
      
      try {
          console.log(`Toggling admin status for ${user.name} to ${newAdminStatus}`);
          const updated = { ...user, is_admin: newAdminStatus };
          const result = await DataService.updateUser(updated);
          console.log('Admin status updated successfully:', result);
          setUsers(users.map(u => u.id === result.id ? result : u));
          alert(`${user.name} ${newAdminStatus ? 'promoted to' : 'demoted from'} Administrator.`);
      } catch (e) {
          console.error("Failed to toggle admin status", e);
          alert(`Failed to ${newAdminStatus ? 'promote' : 'demote'} user: ${e instanceof Error ? e.message : 'Unknown error'}. Check console for details.`);
      }
  };

  return (
    <div className="pb-24">
        <div className="bg-slate-900 p-6 pb-8 border-b border-slate-800">
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">Admin Command Center</h1>
            <p className="text-slate-400 text-sm mt-1">Manage global registry and users.</p>
            
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
                <button 
                    onClick={() => { setActiveTab('exercises'); closeBuilder(); }}
                    className={`flex-shrink-0 py-2 px-4 rounded-lg font-bold text-sm transition-colors ${activeTab === 'exercises' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                    Exercises
                </button>
                <button 
                    onClick={() => { setActiveTab('workouts'); closeBuilder(); }}
                    className={`flex-shrink-0 py-2 px-4 rounded-lg font-bold text-sm transition-colors ${activeTab === 'workouts' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                    Workouts
                </button>
                <button 
                    onClick={() => { setActiveTab('venues'); closeBuilder(); }}
                    className={`flex-shrink-0 py-2 px-4 rounded-lg font-bold text-sm transition-colors ${activeTab === 'venues' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                    Venues
                </button>
                <button 
                    onClick={() => { setActiveTab('users'); closeBuilder(); }}
                    className={`flex-shrink-0 py-2 px-4 rounded-lg font-bold text-sm transition-colors ${activeTab === 'users' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                    Users
                </button>
            </div>
        </div>

        {activeTab === 'venues' && (
            <div className="p-4 space-y-6">
                 {/* Add/Edit Venue Form */}
                 <div className={`bg-slate-900 border ${editingVenueId ? 'border-orange-500' : 'border-slate-800'} p-4 rounded-xl transition-colors`}>
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        {editingVenueId ? <Edit size={16} className="text-orange-500" /> : <Plus size={16} className="text-orange-500" />}
                        {editingVenueId ? 'Update Venue Details' : 'Register New Venue'}
                    </h3>
                    <div className="space-y-3">
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                            placeholder="Venue Name (e.g. Tampines Hub Gym)"
                            value={newVenueName}
                            onChange={(e) => setNewVenueName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <select 
                                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                value={newVenueType}
                                onChange={(e) => setNewVenueType(e.target.value as any)}
                            >
                                <option value="HDB">HDB</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Outdoor">Outdoor</option>
                                <option value="Home">Home</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveVenue}
                                className={`flex-1 ${editingVenueId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-slate-800 hover:bg-slate-700'} text-slate-200 font-bold py-2 rounded text-sm transition-colors`}
                            >
                                {editingVenueId ? 'Update Venue' : 'Add Venue'}
                            </button>
                            {editingVenueId && (
                                <button 
                                    onClick={handleCancelVenueEdit}
                                    className="px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded text-sm"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                 </div>

                 {/* Venue List */}
                 <div className="space-y-3">
                    {venues.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No venues registered yet. Add one above.
                        </div>
                    ) : (
                    venues.map(v => (
                        <div key={v.id} className={`bg-slate-900/50 border ${editingVenueId === v.id ? 'border-orange-500/50' : 'border-slate-800'} p-4 rounded-lg flex justify-between items-start`}>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">{v.name}</h4>
                                    <span className="text-[10px] uppercase text-orange-500 font-bold bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-900/40 inline-block mt-1">
                                        {v.type}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => handleEditVenue(v)}
                                    className="p-2 text-slate-600 hover:text-orange-500 transition-colors"
                                >
                                    <Edit size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteVenue(v.id)}
                                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )))}
                 </div>
            </div>
        )}

        {activeTab === 'exercises' && (
            <div className="p-4 space-y-6">
                {/* Add New Form */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <Plus size={16} className="text-orange-500" /> Add New Movement
                    </h3>
                    <div className="space-y-2 mb-2">
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                            placeholder="Exercise Name (e.g., Devil Press)"
                            value={newExerciseName}
                            onChange={(e) => setNewExerciseName(e.target.value)}
                        />
                        <div className="flex gap-2">
                             <select 
                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                value={newExerciseCategory}
                                onChange={(e) => setNewExerciseCategory(e.target.value)}
                            >
                                <option value="General">General</option>
                                <option value="Cardio">Cardio</option>
                                <option value="Strength">Strength</option>
                                <option value="Plyo">Plyometrics</option>
                                <option value="Weightlifting">Weightlifting</option>
                                <option value="Powerlifting">Powerlifting</option>
                                <option value="Bodyweight">Bodyweight</option>
                                <option value="Gymnastics">Gymnastics</option>
                            </select>
                            <select 
                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                value={newExerciseType}
                                onChange={(e) => setNewExerciseType(e.target.value as any)}
                            >
                                <option value="reps">Reps</option>
                                <option value="time">Time</option>
                                <option value="load">Load</option>
                                <option value="distance">Distance</option>
                            </select>
                        </div>
                    </div>
                    <button 
                        onClick={handleAddExercise}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded text-sm transition-colors"
                    >
                        Add to Registry
                    </button>
                </div>

                {/* List */}
                <div className="space-y-2">
                    {exercises.map(ex => (
                        <div key={ex.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
                                    <Dumbbell size={14} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{ex.name}</p>
                                    <p className="text-xs text-slate-500 uppercase">{ex.category} • {ex.type}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeleteExercise(ex.id)}
                                className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'workouts' && (
            <div className="p-4">
                {!isCreatingWorkout ? (
                    <div className="space-y-4">
                        <button 
                            onClick={() => { setIsCreatingWorkout(true); setEditingWorkoutId(null); }}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic tracking-wider rounded-lg shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Build New Workout
                        </button>

                        <div className="space-y-3">
                            {workouts.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    No workouts yet. Click "Build New Workout" to create one.
                                </div>
                            ) : (
                            workouts.map(w => (
                                <div key={w.id} className={`bg-slate-900 border p-4 rounded-xl relative transition-colors ${w.is_featured ? 'border-yellow-500/40 shadow-lg shadow-yellow-500/5' : 'border-slate-800'}`}>
                                    {w.is_featured && (
                                        <div className="absolute -top-2 -left-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                            <Star size={10} fill="black" /> Featured
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mt-1">
                                        <div>
                                            <h3 className="text-white font-bold">{w.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                 <span className="text-[10px] text-orange-500 bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-900/50">{w.scheme}</span>
                                                 {w.time_cap_seconds && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Timer size={10} /> {w.time_cap_seconds / 60}m Cap</span>}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2 line-clamp-1">{w.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleFeaturedWorkout(w.id)}
                                                className={`p-2 hover:bg-slate-800 rounded transition-colors ${w.is_featured ? 'text-yellow-500' : 'text-slate-600 hover:text-yellow-500'}`}
                                                title="Toggle Featured"
                                            >
                                                <Star size={18} fill={w.is_featured ? 'currentColor' : 'none'} />
                                            </button>
                                            <button 
                                                onClick={() => handleStartPinning(w.id)}
                                                className="p-2 text-slate-600 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                                title="Pin WOD"
                                            >
                                                <Pin size={18} />
                                            </button>
                                            <button 
                                                onClick={() => startEditingWorkout(w)}
                                                className="p-2 text-slate-600 hover:text-orange-500 hover:bg-slate-800 rounded transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteWorkout(w.id)}
                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-slate-800 rounded transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )))}
                        </div>

                        {/* PIN WOD MODAL */}
                        {pinningWorkoutId && (() => {
                            // Filter users based on inviteFilter
                            let filteredUsers = users.filter(u => !u.is_admin);
                            
                            if (inviteFilter === 'adults') {
                                filteredUsers = filteredUsers.filter(u => u.category === UserCategory.ADULT);
                            } else if (inviteFilter === 'kids') {
                                filteredUsers = filteredUsers.filter(u => u.category === UserCategory.KID);
                            } else if (inviteFilter !== 'all') {
                                filteredUsers = filteredUsers.filter(u => u.athlete_type === inviteFilter);
                            }

                            const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id));
                            
                            return (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                            <Pin className="text-blue-500" /> Pin Workout
                                        </h3>
                                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Intended Start</label>
                                                <div className="flex gap-2">
                                                    <input type="date" className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm w-full" value={intendedDate} onChange={e => setIntendedDate(e.target.value)} />
                                                    <input type="time" className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm w-full" value={intendedTime} onChange={e => setIntendedTime(e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Deadline (Completion)</label>
                                                <div className="flex gap-2">
                                                    <input type="date" className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm w-full" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} />
                                                    <input type="time" className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm w-full" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} />
                                                </div>
                                            </div>
                                            
                                            {/* User Invitation Section */}
                                            <div className="border-t border-slate-800 pt-4">
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Send Invitations To</label>
                                                
                                                {/* Filter Dropdown */}
                                                <select
                                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm mb-3 outline-none"
                                                    value={inviteFilter}
                                                    onChange={(e) => {
                                                        setInviteFilter(e.target.value);
                                                        setSelectedUserIds(new Set()); // Clear selection when filter changes
                                                    }}
                                                >
                                                    <option value="all">All Users</option>
                                                    <option value="adults">Adults Only</option>
                                                    <option value="kids">Kids Only</option>
                                                    {Array.from(new Set(users.filter(u => !u.is_admin).map(u => u.athlete_type))).map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>

                                                {/* Select All / Deselect All */}
                                                {filteredUsers.length > 0 && (
                                                    <div className="mb-2">
                                                        <button
                                                            onClick={() => {
                                                                if (allFilteredSelected) {
                                                                    // Deselect all filtered users
                                                                    const newSet = new Set(selectedUserIds);
                                                                    filteredUsers.forEach(u => newSet.delete(u.id));
                                                                    setSelectedUserIds(newSet);
                                                                } else {
                                                                    // Select all filtered users
                                                                    const newSet = new Set(selectedUserIds);
                                                                    filteredUsers.forEach(u => newSet.add(u.id));
                                                                    setSelectedUserIds(newSet);
                                                                }
                                                            }}
                                                            className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                                                        >
                                                            {allFilteredSelected ? 'Deselect All' : 'Select All'} ({filteredUsers.length})
                                                        </button>
                                                    </div>
                                                )}

                                                {/* User List */}
                                                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-800 rounded p-2 bg-slate-950">
                                                    {filteredUsers.length === 0 ? (
                                                        <p className="text-xs text-slate-500 text-center py-4">No users match this filter</p>
                                                    ) : (
                                                        filteredUsers.map(user => (
                                                            <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedUserIds.has(user.id)}
                                                                    onChange={(e) => {
                                                                        const newSet = new Set(selectedUserIds);
                                                                        if (e.target.checked) {
                                                                            newSet.add(user.id);
                                                                        } else {
                                                                            newSet.delete(user.id);
                                                                        }
                                                                        setSelectedUserIds(newSet);
                                                                    }}
                                                                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs text-white font-bold truncate">{user.name}</p>
                                                                    <p className="text-[10px] text-slate-500">{user.athlete_type} • {user.category}</p>
                                                                </div>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                                
                                                {selectedUserIds.size > 0 && (
                                                    <p className="text-xs text-blue-400 mt-2 font-bold">
                                                        {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                                            <button onClick={() => {
                                                setPinningWorkoutId(null);
                                                setSelectedUserIds(new Set());
                                                setInviteFilter('all');
                                            }} className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-lg text-xs">CANCEL</button>
                                            <button onClick={handleConfirmPin} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-500">CONFIRM PIN</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                    </div>
                ) : (
                    // WORKOUT BUILDER UI
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={closeBuilder} className="p-1 hover:text-white text-slate-400">
                                <ArrowLeft size={20} />
                            </button>
                            <h3 className="text-white font-bold">{editingWorkoutId ? 'Edit Workout' : 'New Workout'}</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Workout Name</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm outline-none focus:border-orange-500"
                                    placeholder="e.g. 'Friday Sufferfest'"
                                    value={workoutName}
                                    onChange={e => setWorkoutName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm outline-none focus:border-orange-500"
                                    placeholder="Briefing details..."
                                    rows={2}
                                    value={workoutDesc}
                                    onChange={e => setWorkoutDesc(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                <select 
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none focus:border-orange-500"
                                    value={workoutCategory}
                                    onChange={e => setWorkoutCategory(e.target.value)}
                                >
                                    <option value="General">General</option>
                                    <option value="CrossFit">CrossFit</option>
                                    <option value="Hyrox">Hyrox</option>
                                    <option value="Cardio">Cardio</option>
                                    <option value="Hybrid">Hybrid</option>
                                    <option value="Strength">Strength</option>
                                    <option value="Calisthenics">Calisthenics</option>
                                    <option value="Street Lift">Street Lift</option>
                                    <option value="Kids Friendly">Kids Friendly</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Scheme</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                        value={workoutScheme}
                                        onChange={e => setWorkoutScheme(e.target.value as WorkoutScheme)}
                                    >
                                        {Object.values(WorkoutScheme).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time Cap / Duration (Mins)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                        placeholder="e.g. 20"
                                        value={workoutTimeCap}
                                        onChange={e => setWorkoutTimeCap(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Kids Friendly Toggle */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                                <input 
                                    type="checkbox"
                                    id="kidsFriendly"
                                    checked={isKidsFriendly}
                                    onChange={(e) => setIsKidsFriendly(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500"
                                />
                                <label htmlFor="kidsFriendly" className="text-xs font-bold text-slate-500 uppercase cursor-pointer">
                                    Kids Friendly Workout
                                </label>
                            </div>

                            {/* Rest Configuration */}
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rest Type</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                        value={restType}
                                        onChange={e => setRestType(e.target.value as any)}
                                    >
                                        <option value="none">None (Continuous)</option>
                                        <option value="fixed">Fixed Time</option>
                                        <option value="manual">Manual Advance</option>
                                    </select>
                                </div>
                                {restType === 'fixed' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seconds</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                            value={restSeconds}
                                            onChange={e => setRestSeconds(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Scaling Definitions */}
                            <div className="border-t border-slate-800 pt-4">
                                <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Scaling Definitions</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">RX</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                            placeholder="Full weights"
                                            value={scalingRx}
                                            onChange={e => setScalingRx(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">ADVANCED</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                            placeholder="Standard weights"
                                            value={scalingAdv}
                                            onChange={e => setScalingAdv(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">INTERMEDIATE</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                            placeholder="Reduced load/reps"
                                            value={scalingInt}
                                            onChange={e => setScalingInt(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">BEGINNER</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                            placeholder="Regression movements"
                                            value={scalingBeg}
                                            onChange={e => setScalingBeg(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Workout Components</label>
                                
                                {/* List of added components */}
                                {workoutComponents.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        {workoutComponents.map((comp, idx) => {
                                            const ex = exercises.find(e => e.id === comp.exercise_id);
                                            return (
                                                <div key={idx} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-600 font-mono font-bold text-xs">#{idx + 1}</span>
                                                        <div>
                                                            <p className="text-white text-xs font-bold">{ex?.name || 'Unknown'}</p>
                                                            <div className="flex gap-2">
                                                                <span className="text-[10px] text-orange-500">{comp.target}</span>
                                                                {comp.weight && <span className="text-[10px] text-slate-400">@ {comp.weight}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeComponent(idx)} className="text-slate-600 hover:text-red-500">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Adder */}
                                <div className="flex gap-2 items-end flex-wrap">
                                    <div className="w-full">
                                        <label className="text-[10px] text-slate-500 font-bold mb-1 block">Filter by Category</label>
                                        <select 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none mb-2"
                                            value={exerciseCategoryFilter}
                                            onChange={e => {
                                                setExerciseCategoryFilter(e.target.value);
                                                // Reset selected exercise if it's not in filtered list
                                                const filtered = exercises.filter(ex => 
                                                    e.target.value === 'All' || ex.category === e.target.value
                                                );
                                                if (!filtered.find(ex => ex.id === selectedExId)) {
                                                    setSelectedExId(filtered[0]?.id || '');
                                                }
                                            }}
                                        >
                                            <option value="All">All Categories</option>
                                            {Array.from(new Set(exercises.map(e => e.category))).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full">
                                        <label className="text-[10px] text-slate-500 font-bold mb-1 block">Exercise</label>
                                        <select 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                            value={selectedExId}
                                            onChange={e => setSelectedExId(e.target.value)}
                                        >
                                            {exercises
                                                .filter(e => exerciseCategoryFilter === 'All' || e.category === exerciseCategoryFilter)
                                                .map(e => <option key={e.id} value={e.id}>{e.name} ({e.category})</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-[1.5]">
                                        <label className="text-[10px] text-slate-500 font-bold mb-1 block">Amount</label>
                                        <div className="flex gap-1">
                                            <input 
                                                type="number"
                                                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                                value={targetValue}
                                                onChange={e => setTargetValue(e.target.value)}
                                                placeholder="10"
                                            />
                                            <select 
                                                className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                                value={targetUnit}
                                                onChange={e => setTargetUnit(e.target.value)}
                                            >
                                                <option value="Reps">Reps</option>
                                                <option value="Mins">Mins</option>
                                                <option value="Secs">Secs</option>
                                                <option value="Meters">Meters</option>
                                                <option value="Km">Km</option>
                                                <option value="Cals">Cals</option>
                                            </select>
                                        </div>
                                    </div>
                                     <div className="flex-1">
                                        <label className="text-[10px] text-slate-500 font-bold mb-1 block">Weight</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                            value={weightInput}
                                            onChange={e => setWeightInput(e.target.value)}
                                            placeholder="20kg"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAddComponent}
                                        className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded h-[34px] flex items-center"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            <button 
                                onClick={handleSaveWorkout}
                                className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase rounded-lg shadow-lg shadow-green-900/20"
                            >
                                {editingWorkoutId ? 'Update Workout' : 'Save Workout'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'users' && (
             <div className="p-4 space-y-4">
                {users.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        Loading users...
                    </div>
                ) : (
                users.map(user => (
                    <div key={user.id} className={`bg-slate-900 border p-4 rounded-xl flex flex-col gap-3 transition-all ${editingUserId === user.id ? 'border-orange-500' : 'border-slate-800'}`}>
                        {editingUserId === user.id ? (
                            // EDIT MODE
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <select 
                                        className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
                                        value={editForm.title || ''}
                                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                                    >
                                        {['Mr', 'Ms', 'Mrs', 'Dr', 'Er', 'Ar', 'Rs', 'Master', 'Miss'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <input 
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm"
                                        value={editForm.name || ''}
                                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                                        placeholder="User Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select 
                                        className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
                                        value={editForm.group_id || GroupType.NONE}
                                        onChange={e => setEditForm({...editForm, group_id: e.target.value as GroupType})}
                                    >
                                        {Object.values(GroupType).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <select 
                                        className="bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
                                        value={editForm.athlete_type || AthleteType.GENERIC}
                                        onChange={e => setEditForm({...editForm, athlete_type: e.target.value as AthleteType})}
                                    >
                                        {Object.values(AthleteType).map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>Category:</span>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setEditForm({...editForm, category: UserCategory.ADULT})}
                                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                                    editForm.category === UserCategory.ADULT
                                                        ? 'bg-orange-600 border-orange-600 text-white'
                                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                                }`}
                                            >
                                                ADULT
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditForm({...editForm, category: UserCategory.KID})}
                                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                                    editForm.category === UserCategory.KID
                                                        ? 'bg-blue-500 border-blue-500 text-white'
                                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                                }`}
                                            >
                                                KID
                                            </button>
                                        </div>
                                    </label>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleSaveUser} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1">
                                        <Save size={14} /> Save
                                    </button>
                                    <button onClick={() => {
                                        setEditingUserId(null);
                                        setEditForm({});
                                    }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1">
                                        <X size={14} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // VIEW MODE
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${user.is_admin ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-slate-800 border-slate-700 text-slate-400'} overflow-hidden`}>
                                            <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                                {user.title} {user.name}
                                                {user.is_admin && <Shield size={12} className="text-red-500" />}
                                            </h4>
                                            <p className="text-xs text-slate-500">{user.group_id} • {user.athlete_type}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEditUser(user)}
                                            className={`p-2 rounded text-slate-500 hover:text-white ${user.id === 'master_admin' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                            disabled={user.id === 'master_admin'}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)}
                                            className={`p-2 rounded text-slate-500 hover:text-red-500 ${user.id === 'master_admin' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                            disabled={user.id === 'master_admin'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-end">
                                    <button 
                                        onClick={() => toggleAdmin(user)}
                                        disabled={user.id === 'master_admin'}
                                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${user.is_admin ? 'border-red-900 text-red-500' : 'border-slate-700 text-slate-500'} ${user.id === 'master_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {user.is_admin ? 'Revoke Admin' : 'Promote to Admin'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )))}
             </div>
        )}
    </div>
  );
};

export default AdminDashboard;