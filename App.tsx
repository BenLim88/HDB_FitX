
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_USERS, CURRENT_USER_ID } from './constants';
import { User, Log, Notification, Workout, VerificationStatus, Gender, GroupType, AthleteType, ScalingTier, Venue, PinnedWOD, UserCategory } from './types';
import { DataService } from './services/dataService';
import { GeminiService } from './services/geminiService';
import Navbar from './components/Navbar';
import ActiveWorkout from './components/ActiveWorkout';
import WitnessInbox from './components/WitnessInbox';
import AdminDashboard from './components/AdminDashboard';
import AuthScreen from './components/AuthScreen';
import DIYWorkout from './components/DIYWorkout';
import { Trophy, Flame, MapPin, ChevronRight, Bot, Loader2, ShieldAlert, Filter, Dumbbell, Settings, Edit2, Save, X, RefreshCcw, Search, Calendar, Wand2, Star, RotateCcw, Pin, Users, Baby } from 'lucide-react';
import { MOCK_EXERCISES } from './constants';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

// --- SUB-COMPONENTS (Inline for single-file simplicity requirement where possible) ---

// 1. Home Tab
const HomeTab: React.FC<{ 
  user: User, 
  workouts: Workout[], 
  pinnedWods: PinnedWOD[], 
  onStartWorkout: (w: Workout) => void, 
  onStartDIY: () => void,
  onJoinPinned: (id: string) => void,
  onUnjoinPinned: (id: string) => void,
  allUsers: User[]
}> = ({ user, workouts, pinnedWods, onStartWorkout, onStartDIY, onJoinPinned, onUnjoinPinned, allUsers }) => {
    const [aiTip, setAiTip] = useState<string>('');
    const [loadingTip, setLoadingTip] = useState(false);
    const [showParticipants, setShowParticipants] = useState<string | null>(null); // ID of WOD to show list for
    const [workoutCategoryFilter, setWorkoutCategoryFilter] = useState<string>('All');

    const handleGetTip = async () => {
        setLoadingTip(true);
        const tip = await GeminiService.generateAdvice(`Give me a short, aggressive motivation tip for a ${user.athlete_type} athlete.`);
        setAiTip(tip);
        setLoadingTip(false);
    };

    const isKid = user.category === UserCategory.KID;
    
    // Helper function to categorize workouts
    const getWorkoutCategory = (workout: Workout): string => {
        if (workout.is_kids_friendly) return 'Kids Friendly';
        const name = workout.name.toLowerCase();
        if (name.includes('hyrox')) return 'Hyrox';
        if (name.includes('murph') || name.includes('fran') || name.includes('grace') || name.includes('cindy')) return 'CrossFit';
        if (workout.components.some(c => {
            const ex = MOCK_EXERCISES.find(e => e.id === c.exercise_id);
            return ex?.category === 'Bodyweight';
        })) return 'Calisthenics';
        return 'General';
    };

    // Filter workouts based on user category and selected filter
    const baseFilteredWorkouts = isKid 
        ? workouts.filter(w => w.is_kids_friendly) 
        : workouts;
    
    const filteredWorkouts = useMemo(() => {
        if (workoutCategoryFilter === 'All') return baseFilteredWorkouts;
        return baseFilteredWorkouts.filter(w => {
            const category = getWorkoutCategory(w);
            return category === workoutCategoryFilter;
        });
    }, [baseFilteredWorkouts, workoutCategoryFilter]);
    
    const featuredWorkouts = filteredWorkouts.filter(w => w.is_featured);
    const otherWorkouts = filteredWorkouts.filter(w => !w.is_featured);

    // Get available categories
    const availableCategories = useMemo(() => {
        const categories = new Set<string>();
        baseFilteredWorkouts.forEach(w => {
            categories.add(getWorkoutCategory(w));
        });
        return ['All', ...Array.from(categories).sort()];
    }, [baseFilteredWorkouts]);

    return (
        <div className="p-5 space-y-6 pb-24">
            <header className="flex justify-between items-end">
                <div>
                    <p className={`${isKid ? 'text-blue-600' : 'text-slate-400'} text-sm font-medium uppercase tracking-wider`}>Welcome Back</p>
                    <h1 className={`text-3xl font-black ${isKid ? 'text-blue-900' : 'text-white'} italic uppercase`}>{user.title}. {user.name}</h1>
                    <span className={`inline-block px-2 py-0.5 mt-1 rounded ${isKid ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-800 text-slate-300 border-slate-700'} text-xs font-bold border`}>
                        {user.group_id} • {user.athlete_type}
                    </span>
                </div>
                <div className={`w-12 h-12 rounded-full ${isKid ? 'bg-blue-100 border-blue-300' : 'bg-slate-800 border-slate-700'} border overflow-hidden`}>
                    <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                </div>
            </header>

            {/* PINNED WOD SECTION */}
            {pinnedWods.length > 0 && (
                <section>
                     <h2 className={`${isKid ? 'text-blue-900' : 'text-white'} font-bold text-lg mb-3 flex items-center gap-2`}>
                        <Pin size={20} className="text-blue-500" fill="currentColor" />
                        Command Directives
                    </h2>
                    <div className="space-y-3">
                        {pinnedWods.map(pw => {
                             const isJoined = pw.participants.includes(user.id);
                             const startDate = new Date(pw.intended_date);
                             const endDate = new Date(pw.deadline);
                             
                             // Find actual workout obj
                             const fullWorkout = workouts.find(w => w.id === pw.workout_id);

                             return (
                                 <div key={pw.id} className={`${isKid ? 'bg-white border-4 border-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-slate-900 border-4 border-yellow-500 shadow-lg shadow-yellow-500/30'} rounded-xl p-4 relative overflow-hidden`}>
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                     
                                     <div className="relative z-10">
                                         <div className="flex justify-between items-start mb-2">
                                             <div>
                                                 <span className="text-[10px] font-bold bg-yellow-500/30 text-yellow-600 px-2 py-1 rounded mb-2 inline-block border border-yellow-500/50">
                                                     ⚡ PRIORITY MISSION ⚡
                                                 </span>
                                                 <h3 className={`text-xl font-black ${isKid ? 'text-blue-900' : 'text-white'} italic uppercase`}>{pw.workout_name}</h3>
                                             </div>
                                             {isJoined ? (
                                                 <div className="bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                                     COMMITTED
                                                 </div>
                                             ) : (
                                                 <button 
                                                    onClick={() => onJoinPinned(pw.id)}
                                                    className={`${isKid ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300' : 'bg-slate-800 hover:bg-blue-600 text-white border-slate-700'} text-[10px] font-bold px-3 py-1.5 rounded border transition-colors`}
                                                 >
                                                     ACCEPT
                                                 </button>
                                             )}
                                         </div>

                                         <div className="flex flex-col gap-1 mb-4">
                                             <div className={`flex items-center gap-2 text-xs ${isKid ? 'text-blue-600' : 'text-slate-400'}`}>
                                                 <Calendar size={12} /> 
                                                 <span className={`font-bold ${isKid ? 'text-blue-800' : 'text-slate-300'}`}>Start:</span> {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </div>
                                             <div className={`flex items-center gap-2 text-xs ${isKid ? 'text-blue-600' : 'text-slate-400'}`}>
                                                 <Calendar size={12} /> 
                                                 <span className={`font-bold ${isKid ? 'text-blue-800' : 'text-slate-300'}`}>Deadline:</span> {endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </div>
                                         </div>

                                         {/* Participants Preview */}
                                         <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isKid ? 'border-blue-200' : 'border-slate-800'}`}>
                                             <button 
                                                onClick={() => setShowParticipants(showParticipants === pw.id ? null : pw.id)}
                                                className={`flex items-center gap-2 text-xs ${isKid ? 'text-blue-600 hover:text-blue-800' : 'text-slate-400 hover:text-white'}`}
                                             >
                                                 <Users size={14} /> 
                                                 <span className="font-bold">{pw.participants.length}</span> Soldiers Committed
                                             </button>
                                             
                                             <div className="flex gap-2">
                                                 {isJoined && (
                                                     <button onClick={() => onUnjoinPinned(pw.id)} className="text-[10px] text-red-400 hover:underline">
                                                         Abort
                                                     </button>
                                                 )}
                                                 <button 
                                                    onClick={() => fullWorkout && onStartWorkout(fullWorkout)}
                                                    className={`flex items-center gap-1 text-xs font-bold ${isKid ? 'text-blue-600 hover:text-blue-800' : 'text-blue-400 hover:text-blue-300'}`}
                                                >
                                                     Execute <ChevronRight size={14} />
                                                 </button>
                                             </div>
                                         </div>

                                         {/* Participant List Expansion */}
                                         {showParticipants === pw.id && (
                                             <div className={`mt-3 p-3 ${isKid ? 'bg-blue-50 border-blue-200' : 'bg-slate-950 border-slate-800'} rounded-lg border animate-in slide-in-from-top-2`}>
                                                 <h4 className={`text-[10px] font-bold ${isKid ? 'text-blue-700' : 'text-slate-500'} uppercase mb-2`}>Roster</h4>
                                                 <div className="space-y-2 max-h-32 overflow-y-auto">
                                                     {pw.participants.map(uid => {
                                                         const u = allUsers.find(user => user.id === uid);
                                                         return u ? (
                                                             <div key={uid} className="flex items-center gap-2">
                                                                 <div className={`w-5 h-5 rounded-full ${isKid ? 'bg-blue-100' : 'bg-slate-800'} overflow-hidden`}>
                                                                     <img src={u.avatar_url} className="w-full h-full object-cover" />
                                                                 </div>
                                                                 <span className={`text-xs ${isKid ? 'text-blue-800' : 'text-slate-300'}`}>{u.name}</span>
                                                             </div>
                                                         ) : null;
                                                     })}
                                                     {pw.participants.length === 0 && <span className={`text-xs ${isKid ? 'text-blue-500' : 'text-slate-600'} italic`}>No personnel yet.</span>}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             );
                        })}
                    </div>
                </section>
            )}

            {/* AI Coach Section */}
            <div className={`${isKid ? 'bg-gradient-to-br from-blue-100 to-blue-50 border-blue-300' : 'bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/30'} border p-4 rounded-xl relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Bot size={64} />
                </div>
                <div className="relative z-10">
                    <h3 className={`${isKid ? 'text-blue-600' : 'text-indigo-400'} text-xs font-bold uppercase flex items-center gap-2`}>
                        <Bot size={14} /> Coach FitX AI
                    </h3>
                    <p className={`${isKid ? 'text-blue-800' : 'text-slate-200'} text-sm mt-2 font-medium italic min-h-[3rem]`}>
                        {loadingTip ? <Loader2 className="animate-spin" /> : (aiTip || "Ready to crush it? Tap below for your daily briefing.")}
                    </p>
                    {!aiTip && (
                        <button 
                            onClick={handleGetTip}
                            className={`mt-3 text-xs ${isKid ? 'bg-blue-500 hover:bg-blue-400' : 'bg-indigo-600 hover:bg-indigo-500'} text-white px-3 py-1.5 rounded font-bold transition-colors`}
                        >
                            Get Motivated
                        </button>
                    )}
                </div>
            </div>

            {/* FEATURED WORKOUTS */}
            {featuredWorkouts.length > 0 && (
                <section>
                    <h2 className={`${isKid ? 'text-blue-900' : 'text-white'} font-bold text-lg mb-3 flex items-center gap-2`}>
                        <Star size={20} className="text-yellow-500" fill="currentColor" />
                        Featured Operations
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                        {featuredWorkouts.map(w => (
                            <button 
                                key={w.id}
                                onClick={() => onStartWorkout(w)}
                                className={`snap-center min-w-[85%] ${isKid ? 'bg-white border-2 border-yellow-400' : 'bg-slate-900 border-2 border-yellow-500/30'} p-5 rounded-2xl text-left transition-all active:scale-95 group relative overflow-hidden`}
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                                <div className="relative z-10">
                                    <h3 className={`${isKid ? 'text-blue-900' : 'text-white'} font-black text-xl uppercase italic leading-tight group-hover:text-yellow-500 transition-colors`}>{w.name}</h3>
                                    <div className="flex gap-2 mt-2 mb-3 flex-wrap">
                                         <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                                            Featured
                                         </span>
                                         <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-800 text-slate-400 border-slate-700'} border`}>
                                            {w.scheme}
                                         </span>
                                         {w.is_kids_friendly && (
                                             <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                                 <Baby size={10} /> Kid Friendly
                                             </span>
                                         )}
                                    </div>
                                    <p className={`${isKid ? 'text-blue-700' : 'text-slate-400'} text-xs line-clamp-2 mb-2`}>{w.description}</p>
                                    <div className={`text-xs font-bold ${isKid ? 'text-blue-900' : 'text-white'} flex items-center gap-1`}>
                                        Start Mission <ChevronRight size={14} className="text-yellow-500" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* DIY / Quick Start Card */}
            <button 
                onClick={onStartDIY}
                className={`w-full ${isKid ? 'bg-white border-blue-200 hover:border-blue-400' : 'bg-slate-900 border-slate-800 hover:border-orange-500'} border p-4 rounded-xl text-left transition-colors group relative overflow-hidden`}
            >
                 <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Dumbbell size={80} />
                 </div>
                 <div className="relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className={`${isKid ? 'text-blue-900' : 'text-white'} font-bold text-lg italic uppercase flex items-center gap-2`}>
                            <Wand2 size={18} className={isKid ? 'text-blue-500' : 'text-orange-500'} /> DIY / Free Train
                        </h3>
                        <ChevronRight size={18} className={isKid ? 'text-blue-400 group-hover:text-blue-600' : 'text-slate-600 group-hover:text-orange-500'} />
                    </div>
                    <p className={`${isKid ? 'text-blue-700' : 'text-slate-400'} text-xs pr-8`}>
                        Custom session or AI-generated workout. Log your own time/reps. No leaderboard submission.
                    </p>
                 </div>
            </button>

            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className={`${isKid ? 'text-blue-900' : 'text-white'} font-bold text-lg flex items-center gap-2`}>
                        <Flame size={20} className={isKid ? 'text-blue-500' : 'text-orange-500'} />
                        Standard Protocol
                    </h2>
                </div>

                {/* Category Filter */}
                <div className="mb-4">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {availableCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setWorkoutCategoryFilter(cat)}
                                className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                    workoutCategoryFilter === cat
                                        ? (isKid ? 'bg-blue-500 text-white' : 'bg-orange-600 text-white')
                                        : (isKid ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-800 text-slate-400 border border-slate-700')
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Group workouts by category */}
                {workoutCategoryFilter === 'All' ? (
                    // Show all workouts grouped by category
                    (() => {
                        const grouped = new Map<string, Workout[]>();
                        otherWorkouts.forEach(w => {
                            const category = getWorkoutCategory(w);
                            if (!grouped.has(category)) {
                                grouped.set(category, []);
                            }
                            grouped.get(category)!.push(w);
                        });

                        return Array.from(grouped.entries()).map(([category, categoryWorkouts]) => (
                            <div key={category} className="mb-6">
                                <h3 className={`${isKid ? 'text-blue-800' : 'text-slate-300'} font-bold text-sm uppercase mb-3 flex items-center gap-2`}>
                                    {category === 'Kids Friendly' && <Baby size={14} className="text-blue-500" />}
                                    {category}
                                </h3>
                                <div className="grid gap-3">
                                    {categoryWorkouts.map(w => (
                                        <button 
                                            key={w.id}
                                            onClick={() => onStartWorkout(w)}
                                            className={`${isKid ? 'bg-white hover:bg-blue-50 border-blue-200' : 'bg-slate-900 hover:bg-slate-800 border-slate-800'} border p-4 rounded-xl text-left transition-colors group`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`${isKid ? 'text-blue-900 group-hover:text-blue-600' : 'text-white group-hover:text-orange-500'} font-bold text-lg transition-colors`}>{w.name}</h3>
                                                        {w.is_kids_friendly && (
                                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                                                <Baby size={10} /> Kid Friendly
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`${isKid ? 'text-blue-700' : 'text-slate-400'} text-xs mt-1 line-clamp-2`}>{w.description}</p>
                                                </div>
                                                <ChevronRight className={isKid ? 'text-blue-400' : 'text-slate-600'} />
                                            </div>
                                            <div className="mt-3 flex gap-2 flex-wrap">
                                                <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                                    {w.components.length} Exercises
                                                </span>
                                                <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                                    {w.scheme}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ));
                    })()
                ) : (
                    // Show filtered workouts
                    <div className="grid gap-3">
                        {otherWorkouts.length > 0 ? (
                            otherWorkouts.map(w => (
                                <button 
                                    key={w.id}
                                    onClick={() => onStartWorkout(w)}
                                    className={`${isKid ? 'bg-white hover:bg-blue-50 border-blue-200' : 'bg-slate-900 hover:bg-slate-800 border-slate-800'} border p-4 rounded-xl text-left transition-colors group`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`${isKid ? 'text-blue-900 group-hover:text-blue-600' : 'text-white group-hover:text-orange-500'} font-bold text-lg transition-colors`}>{w.name}</h3>
                                                {w.is_kids_friendly && (
                                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                                        <Baby size={10} /> Kid Friendly
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`${isKid ? 'text-blue-700' : 'text-slate-400'} text-xs mt-1 line-clamp-2`}>{w.description}</p>
                                        </div>
                                        <ChevronRight className={isKid ? 'text-blue-400' : 'text-slate-600'} />
                                    </div>
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                        <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                            {w.components.length} Exercises
                                        </span>
                                        <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                            {w.scheme}
                                        </span>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className={`text-center py-8 ${isKid ? 'text-blue-600' : 'text-slate-500'} text-sm`}>
                                No workouts found in this category.
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

// 2. Leaderboard Tab
const LeaderboardTab: React.FC<{ logs: Log[], workouts: Workout[], allUsers: User[] }> = ({ logs, workouts, allUsers }) => {
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('all');
    const [workoutNameSearch, setWorkoutNameSearch] = useState('');
    const [selectedGender, setSelectedGender] = useState<string>('all');
    const [selectedVerification, setSelectedVerification] = useState<string>('all');
    const [selectedTier, setSelectedTier] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const filteredLogs = useMemo(() => {
        let tempLogs = logs;
        
        // 1. Filter by Workout ID
        if (selectedWorkoutId !== 'all') {
            tempLogs = tempLogs.filter(log => log.workout_id === selectedWorkoutId);
        }

        // 1b. Filter by Workout Name Text
        if (workoutNameSearch) {
            tempLogs = tempLogs.filter(log => log.workout_name.toLowerCase().includes(workoutNameSearch.toLowerCase()));
        }

        // 2. Filter by Gender
        if (selectedGender !== 'all') {
            tempLogs = tempLogs.filter(log => {
                const user = allUsers.find(u => u.id === log.user_id);
                return user?.gender === selectedGender;
            });
        }

        // 2b. Filter by Category
        if (selectedCategory !== 'all') {
            tempLogs = tempLogs.filter(log => {
                const user = allUsers.find(u => u.id === log.user_id);
                return user?.category === selectedCategory;
            });
        }

        // 3. Filter by Verification
        if (selectedVerification !== 'all') {
            tempLogs = tempLogs.filter(log => log.verification_status === selectedVerification);
        }

        // 4. Filter by Tier
        if (selectedTier !== 'all') {
            tempLogs = tempLogs.filter(log => log.difficulty_tier === selectedTier);
        }

        // 5. SORTING
        return tempLogs.sort((a, b) => {
            // Priority 1: Verification Status (Verified first)
            if (a.verification_status === VerificationStatus.VERIFIED && b.verification_status !== VerificationStatus.VERIFIED) {
                return -1;
            }
            if (a.verification_status !== VerificationStatus.VERIFIED && b.verification_status === VerificationStatus.VERIFIED) {
                return 1;
            }

            // Priority 2: Result (Time/Score)
            // If a specific workout is selected, we can compare results.
            if (selectedWorkoutId !== 'all') {
                // Ascending Time (assuming For Time is default for now)
                return a.total_time_seconds - b.total_time_seconds;
            }

            // Priority 3: Fallback to Date (Newest First)
            return b.timestamp - a.timestamp;
        });

    }, [logs, selectedWorkoutId, workoutNameSearch, selectedGender, selectedVerification, selectedTier, selectedCategory, allUsers]);

    return (
        <div className="p-5 space-y-4 pb-24">
             <header className="flex items-center justify-between">
                 <h2 className="text-2xl font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                    <Trophy className="text-yellow-500" />
                    Leaderboard
                </h2>
             </header>
            
            {/* Filters */}
            <div className="flex flex-col gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                
                {/* Row 1: Name Search */}
                <div className="relative w-full">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                        type="text"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-orange-500"
                        placeholder="Search Workout Name..."
                        value={workoutNameSearch}
                        onChange={(e) => setWorkoutNameSearch(e.target.value)}
                    />
                </div>

                {/* Row 2: Workout Selector (Dropdown) */}
                <div className="relative w-full">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select 
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white text-sm appearance-none outline-none focus:border-orange-500"
                        value={selectedWorkoutId}
                        onChange={(e) => setSelectedWorkoutId(e.target.value)}
                    >
                        <option value="all">All Workouts (Dropdown)</option>
                        {workouts.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                {/* Row 3: Gender & Tier */}
                <div className="flex gap-2">
                     <div className="relative flex-1">
                        <select 
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-3 text-white text-sm appearance-none outline-none focus:border-orange-500"
                            value={selectedGender}
                            onChange={(e) => setSelectedGender(e.target.value)}
                        >
                            <option value="all">Any Gender</option>
                            {Object.values(Gender).map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative flex-1">
                        <select 
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-3 text-white text-sm appearance-none outline-none focus:border-orange-500"
                            value={selectedTier}
                            onChange={(e) => setSelectedTier(e.target.value)}
                        >
                            <option value="all">Any Tier</option>
                            {Object.values(ScalingTier).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {/* Row 4: Status & Category */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select 
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-3 text-white text-sm appearance-none outline-none focus:border-orange-500"
                            value={selectedVerification}
                            onChange={(e) => setSelectedVerification(e.target.value)}
                        >
                            <option value="all">Any Status</option>
                            <option value={VerificationStatus.VERIFIED}>Verified Only</option>
                            <option value={VerificationStatus.UNVERIFIED}>Unverified</option>
                        </select>
                    </div>
                    <div className="relative flex-1">
                        <select 
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-3 text-white text-sm appearance-none outline-none focus:border-orange-500"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">Any Age Group</option>
                            <option value={UserCategory.ADULT}>Adults</option>
                            <option value={UserCategory.KID}>Kids</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                        No records found matching filters.
                    </div>
                ) : (
                    filteredLogs.map((log, idx) => {
                        // Format Timestamp
                        const dateObj = new Date(log.timestamp);
                        const dateDisplay = dateObj.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        // Find user for avatar
                        const user = allUsers.find(u => u.id === log.user_id);

                        return (
                            <div key={log.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 flex items-center justify-center text-lg font-black text-slate-500 italic shrink-0">
                                    #{idx + 1}
                                </div>
                                {user && (
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold text-sm truncate">{log.user_name}</h4>
                                    <p className="text-xs text-orange-500 truncate">{log.workout_name}</p>
                                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                                        <span className="text-[10px] text-slate-400 border border-slate-700 px-1 rounded">{log.difficulty_tier}</span>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Calendar size={10} /> {dateDisplay}
                                        </span>
                                        {/* VENUE DISPLAY */}
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]" title={log.location}>
                                             <MapPin size={10} /> {log.location}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className="text-white font-mono font-bold">{log.score_display}</div>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        {log.verification_status === VerificationStatus.VERIFIED ? (
                                            <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-500 italic">Unverified</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    )
}

// --- MAIN APP ---

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Track auth loading state
  const [activeTab, setActiveTab] = useState('home');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]); // New Venue State
  const [pinnedWods, setPinnedWods] = useState<PinnedWOD[]>([]); // New Pinned WOD State

  // Workout State
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [activeDIY, setActiveDIY] = useState(false); // DIY Mode State

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<Partial<User>>({});
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('avataaars'); // Default
  const [uploadedAvatarFile, setUploadedAvatarFile] = useState<File | null>(null);
  const [uploadedAvatarPreview, setUploadedAvatarPreview] = useState<string | null>(null);

  // Restore user session on mount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const restoreSession = async () => {
      try {
        // Check localStorage for saved user first
        const savedUser = localStorage.getItem('hdb_fitx_user');
        if (savedUser) {
          const user = JSON.parse(savedUser) as User;
          // Ensure user exists in the users array for updates to work
          await DataService.updateUser(user); // This will add user if not exists
          setCurrentUser(user);
          setIsLoadingAuth(false);
          return;
        }

        // Check Firebase auth state (for Google sign-in users)
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in with Google, restore their session
            const allUsers = await DataService.getAllUsers();
            let user = allUsers.find(u => u.id === firebaseUser.uid);
            
            if (!user) {
              // Create user if doesn't exist
              user = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Unknown Athlete',
                title: 'Mr',
                gender: Gender.UNSPECIFIED,
                group_id: GroupType.NONE,
                athlete_type: AthleteType.GENERIC,
                is_admin: false,
                avatar_url: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                category: UserCategory.ADULT
              };
              // Add to users array
              await DataService.updateUser(user);
            }
            
            setCurrentUser(user);
            localStorage.setItem('hdb_fitx_user', JSON.stringify(user));
          }
          setIsLoadingAuth(false);
        });
      } catch (error) {
        console.error('Error restoring session:', error);
        setIsLoadingAuth(false);
      }
    };

    restoreSession();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('hdb_fitx_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('hdb_fitx_user');
    }
  }, [currentUser]);

  // Initialize data when user logs in
  useEffect(() => {
    if (currentUser && !isLoadingAuth) {
        const initData = async () => {
            const w = await DataService.getWorkouts();
            setWorkouts(w);
            const users = await DataService.getAllUsers();
            setAllUsers(users);
            const v = await DataService.getVenues(); // Load Venues
            setVenues(v);
            refreshData();
        };
        initData();
    }
  }, [currentUser, isLoadingAuth]);

  const refreshData = async () => {
    const l = await DataService.getLogs();
    setLogs(l);
    const pw = await DataService.getPinnedWODs();
    setPinnedWods(pw);
    if (currentUser) {
        const n = await DataService.getNotifications(currentUser.id);
        setNotifications(n);
    }
  };

  // Poll for notifications (simulating realtime)
  useEffect(() => {
    if (currentUser) {
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleStartWorkout = (workout: Workout) => {
    setActiveWorkout(workout);
    setActiveDIY(false);
    setActiveTab('workout');
  };

  const handleStartDIY = () => {
      setActiveDIY(true);
      setActiveWorkout(null);
      setActiveTab('workout');
  };

  // Compute User Stats (Personal Bests)
  const userStats = useMemo(() => {
    if (!currentUser || logs.length === 0) return [];
    
    const userLogs = logs.filter(l => l.user_id === currentUser.id);
    const uniqueWorkouts = new Map<string, Log>();

    userLogs.forEach(log => {
        const existing = uniqueWorkouts.get(log.workout_id);
        
        // UPDATE: Logic for "Best" score. 
        // If existing score is 'worse', replace it.
        // Since 'score_display' is string, we rely on 'total_time_seconds' as the sortable metric for now.
        // Default rule: Lower time is better (For Time).
        // For logs with identical time (rare, or AMRAP cap), we prefer the NEWER log.
        
        if (!existing) {
            uniqueWorkouts.set(log.workout_id, log);
        } else {
            if (log.total_time_seconds < existing.total_time_seconds) {
                uniqueWorkouts.set(log.workout_id, log);
            } else if (log.total_time_seconds === existing.total_time_seconds) {
                // Tie-breaker: Newer timestamp wins
                if (log.timestamp > existing.timestamp) {
                    uniqueWorkouts.set(log.workout_id, log);
                }
            }
        }
    });

    // Convert map to array and slice top 4
    return Array.from(uniqueWorkouts.values()).slice(0, 4);
  }, [currentUser, logs]);


  const handleEditProfileStart = () => {
      if (!currentUser) return;
      setEditProfileForm({ ...currentUser });
      setAvatarPrompt(''); 
      setUploadedAvatarFile(null);
      setUploadedAvatarPreview(null);
      
      // Attempt to parse style from current avatar URL to pre-select the dropdown
      const url = currentUser.avatar_url || '';
      if (url.includes('robohash.org')) {
          if (url.includes('set=set4')) setAvatarStyle('cats');
          else if (url.includes('set=set2')) setAvatarStyle('monsters');
      } else if (url.includes('api.dicebear.com')) {
          if (url.includes('/bottts/')) setAvatarStyle('bottts');
          else if (url.includes('/pixel-art/')) setAvatarStyle('pixel-art');
          else if (url.includes('/adventurer/')) setAvatarStyle('adventurer');
          else if (url.includes('/fun-emoji/')) setAvatarStyle('fun-emoji');
          else setAvatarStyle('avataaars');
      } else {
          setAvatarStyle('avataaars');
      }

      setIsEditingProfile(true);
  }

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validate file type
          if (!file.type.startsWith('image/')) {
              alert('Please select an image file');
              return;
          }
          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
              alert('Image size must be less than 5MB');
              return;
          }
          setUploadedAvatarFile(file);
          // Create preview using FileReader (base64)
          const reader = new FileReader();
          reader.onloadend = () => {
              setUploadedAvatarPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  }

  const getAvatarUrl = (style: string, seed: string) => {
      const s = encodeURIComponent(seed);
      if (style === 'cats') return `https://robohash.org/${s}.png?set=set4`;
      if (style === 'monsters') return `https://robohash.org/${s}.png?set=set2`;
      return `https://api.dicebear.com/7.x/${style}/svg?seed=${s}`;
  };

  const handleSaveProfile = async () => {
      if (!currentUser || !editProfileForm) return;
      
      let updatedUser = { ...currentUser, ...editProfileForm };
      
      // Priority 1: Uploaded file (highest priority) - convert to base64
      if (uploadedAvatarFile && uploadedAvatarPreview) {
          updatedUser.avatar_url = uploadedAvatarPreview; // Store base64 string
      }
      // Priority 2: Generated avatar (if no file uploaded and prompt/style changed)
      else if (avatarPrompt || avatarStyle) {
          const seed = avatarPrompt || currentUser.name;
          updatedUser.avatar_url = getAvatarUrl(avatarStyle, seed);
      }
      // Priority 3: Keep existing avatar_url if nothing changed

      try {
          await DataService.updateUser(updatedUser as User);
          setCurrentUser(updatedUser as User);
          localStorage.setItem('hdb_fitx_user', JSON.stringify(updatedUser));
          setIsEditingProfile(false);
          // Reset upload state
          setUploadedAvatarFile(null);
          setUploadedAvatarPreview(null);
      } catch (e) {
          alert("Failed to update profile.");
      }
  }

  // Callback when Admin adds/removes workouts
  const handleUpdateWorkouts = (updatedWorkouts: Workout[]) => {
      setWorkouts(updatedWorkouts);
  };

  // Callback when Admin adds/removes venues
  const handleUpdateVenues = (updatedVenues: Venue[]) => {
      setVenues(updatedVenues);
  }

  const handleJoinPinned = async (wodId: string) => {
      if (!currentUser) return;
      await DataService.joinPinnedWOD(wodId, currentUser.id);
      refreshData();
  };

  const handleUnjoinPinned = async (wodId: string) => {
      if (!currentUser) return;
      await DataService.unjoinPinnedWOD(wodId, currentUser.id);
      refreshData();
  };

  // Show loading state while checking auth
  if (isLoadingAuth) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
              <div className="text-center">
                  <Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={48} />
                  <p className="text-slate-400 text-sm">Loading...</p>
              </div>
          </div>
      );
  }

  // If no user, show Auth Screen
  if (!currentUser) {
      return <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  const isKid = currentUser.category === UserCategory.KID;
  const themeClasses = isKid 
    ? 'min-h-screen bg-blue-50 font-sans pb-safe-area' 
    : 'min-h-screen bg-slate-950 font-sans pb-safe-area';
  const mainClasses = isKid
    ? 'max-w-md mx-auto min-h-screen bg-white shadow-2xl shadow-blue-200 relative'
    : 'max-w-md mx-auto min-h-screen bg-slate-950 shadow-2xl shadow-black relative';

  return (
    <div className={themeClasses}>
      <main className={mainClasses}>
        
        {/* 
          PERSISTENT ACTIVE WORKOUT LAYER 
          We keep this mounted but hidden if the tab isn't 'workout' so the timer persists.
          This handles both standard active workout AND DIY active mode.
        */}
        
        {/* Standard Workout */}
        {activeWorkout && (
            <div className={activeTab === 'workout' ? 'block h-full' : 'hidden'}>
                <ActiveWorkout 
                    workout={activeWorkout} 
                    currentUser={currentUser} 
                    allUsers={allUsers}
                    venues={venues} 
                    onExit={() => {
                        setActiveWorkout(null);
                        setActiveTab('home');
                    }}
                    onComplete={() => {
                        setActiveWorkout(null);
                        setActiveTab('leaderboard');
                        refreshData();
                    }} 
                />
            </div>
        )}

        {/* DIY Workout */}
        {activeDIY && (
             <div className={activeTab === 'workout' ? 'block h-full' : 'hidden'}>
                 <DIYWorkout 
                    onExit={() => {
                        setActiveDIY(false);
                        setActiveTab('home');
                    }}
                 />
             </div>
        )}

        {/* TAB CONTENT LAYER - Only show if not in active workout view or if we need to show empty state */}
        <div className={activeTab !== 'workout' || (!activeWorkout && !activeDIY) ? 'block' : 'hidden'}>
            
            {activeTab === 'home' && (
                <HomeTab 
                    user={currentUser} 
                    workouts={workouts} 
                    pinnedWods={pinnedWods}
                    onStartWorkout={handleStartWorkout} 
                    onStartDIY={handleStartDIY} 
                    onJoinPinned={handleJoinPinned}
                    onUnjoinPinned={handleUnjoinPinned}
                    allUsers={allUsers}
                />
            )}
            
            {activeTab === 'leaderboard' && (
                <LeaderboardTab logs={logs} workouts={workouts} allUsers={allUsers} />
            )}
            
            {activeTab === 'inbox' && (
                <WitnessInbox notifications={notifications} currentUserId={currentUser.id} refreshData={refreshData} />
            )}

            {activeTab === 'admin' && (
                <AdminDashboard 
                    initialWorkouts={workouts} 
                    onUpdateWorkouts={handleUpdateWorkouts} 
                    initialVenues={venues}
                    onUpdateVenues={handleUpdateVenues}
                />
            )}

            {activeTab === 'profile' && (
                <div className={`p-5 text-center ${isKid ? 'text-blue-600' : 'text-slate-400'} pt-12 pb-32`}>
                    {!isEditingProfile ? (
                        // VIEW PROFILE MODE
                        <>
                             <div className={`w-28 h-28 rounded-full ${isKid ? 'bg-blue-100 border-4 border-blue-500 shadow-blue-500/20' : 'bg-slate-800 border-4 border-orange-500 shadow-orange-500/20'} overflow-hidden mx-auto mb-4 shadow-lg relative group`}>
                                <img src={currentUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            
                            <h1 className={`text-3xl font-black ${isKid ? 'text-blue-900' : 'text-white'} uppercase italic`}>{currentUser.title} {currentUser.name}</h1>
                            
                            <div className="flex justify-center gap-2 mt-3">
                                <span className={`px-3 py-1 ${isKid ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-800 text-slate-300 border-slate-700'} rounded text-xs font-bold border`}>{currentUser.category}</span>
                                <span className={`px-3 py-1 ${isKid ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-800 text-slate-300 border-slate-700'} rounded text-xs font-bold border`}>{currentUser.group_id}</span>
                                <span className={`px-3 py-1 ${isKid ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-slate-800 text-orange-500 border-slate-700'} rounded text-xs font-bold border`}>{currentUser.athlete_type}</span>
                            </div>

                            <div className="mt-6 flex justify-center">
                                <button 
                                    onClick={handleEditProfileStart}
                                    className={`flex items-center gap-2 text-xs font-bold ${isKid ? 'text-blue-600 hover:text-blue-800 bg-blue-50 border-blue-200' : 'text-slate-500 hover:text-white bg-slate-900 border-slate-800'} border px-4 py-2 rounded-full transition-all`}
                                >
                                    <Edit2 size={14} /> Edit Details
                                </button>
                            </div>
                            
                            {currentUser.is_admin && (
                                <button 
                                    onClick={() => setActiveTab('admin')}
                                    className="mt-6 flex items-center justify-center gap-2 w-full py-4 bg-red-900/20 border border-red-500/30 text-red-400 font-bold rounded-lg hover:bg-red-900/40 transition-all"
                                >
                                    <ShieldAlert size={18} /> Admin Panel
                                </button>
                            )}

                            <div className={`mt-8 p-4 ${isKid ? 'bg-blue-50 border-blue-200' : 'bg-slate-900 border-slate-800'} rounded-lg border`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className={`text-sm font-bold ${isKid ? 'text-blue-800' : 'text-slate-300'} uppercase tracking-wider`}>Personal Bests (All Statuses)</h3>
                                    <button onClick={() => refreshData()} className={`${isKid ? 'text-blue-500 hover:text-blue-700' : 'text-slate-500 hover:text-orange-500'} transition-colors`} title="Refresh Stats">
                                        <RotateCcw size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {userStats.length > 0 ? (
                                        userStats.map(stat => (
                                            <div key={stat.id} className={`text-center p-3 ${isKid ? 'bg-white border-blue-200' : 'bg-slate-950 border-slate-800'} rounded border flex flex-col justify-center min-h-[80px]`}>
                                                <div className={`text-lg font-mono font-bold ${isKid ? 'text-blue-900' : 'text-white'} truncate leading-none mb-1`}>{stat.score_display}</div>
                                                <div className={`text-[10px] uppercase ${isKid ? 'text-blue-600' : 'text-slate-500'} font-bold line-clamp-2 leading-tight`}>{stat.workout_name}</div>
                                                 {stat.verification_status === VerificationStatus.VERIFIED && <div className="text-[8px] text-green-500 font-bold mt-1">VERIFIED</div>}
                                            </div>
                                        ))
                                    ) : (
                                        <div className={`col-span-2 text-center text-xs ${isKid ? 'text-blue-500' : 'text-slate-500'} italic py-4`}>
                                            No records found. Log a standard workout!
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={async () => {
                                    // Sign out from Firebase if signed in
                                    try {
                                        await signOut(auth);
                                    } catch (error) {
                                        console.error('Firebase sign out error:', error);
                                    }
                                    // Clear local state
                                    setCurrentUser(null);
                                    localStorage.removeItem('hdb_fitx_user');
                                }}
                                className={`mt-12 ${isKid ? 'text-blue-500' : 'text-slate-600'} text-sm font-bold hover:${isKid ? 'text-blue-700' : 'text-white'} flex items-center justify-center gap-2 w-full`}
                            >
                                Log Out
                            </button>
                        </>
                    ) : (
                        // EDIT PROFILE MODE
                        <div className="animate-in slide-in-from-bottom-4 fade-in">
                            <h2 className={`text-xl font-black ${isKid ? 'text-blue-900' : 'text-white'} uppercase italic mb-6`}>Update Personnel</h2>
                            
                            {/* Avatar Editor */}
                             <div className={`flex items-center gap-4 mb-6 ${isKid ? 'bg-blue-50 border-blue-200' : 'bg-slate-900 border-slate-800'} p-3 rounded-lg border`}>
                                <div className={`w-16 h-16 rounded-full ${isKid ? 'bg-white border-blue-300' : 'bg-slate-950 border-slate-700'} border overflow-hidden shrink-0`}>
                                    <img 
                                        src={
                                            uploadedAvatarPreview 
                                                ? uploadedAvatarPreview 
                                                : (avatarPrompt ? getAvatarUrl(avatarStyle, avatarPrompt) : (editProfileForm.avatar_url || ''))
                                        } 
                                        alt="avatar preview" 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    {/* Upload Photo Option */}
                                    <div>
                                        <label className={`text-[10px] font-bold ${isKid ? 'text-blue-600' : 'text-slate-500'} block mb-1 text-left`}>Upload Photo</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarFileSelect}
                                            className="hidden"
                                            id="avatar-upload"
                                        />
                                        <label
                                            htmlFor="avatar-upload"
                                            className={`block w-full ${isKid ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'} border rounded px-3 py-2 text-xs font-bold cursor-pointer text-center transition-colors`}
                                        >
                                            {uploadedAvatarFile ? 'Change Photo' : 'Choose Photo'}
                                        </label>
                                        {uploadedAvatarFile && (
                                            <button
                                                onClick={() => {
                                                    setUploadedAvatarFile(null);
                                                    setUploadedAvatarPreview(null);
                                                }}
                                                className="mt-1 w-full text-[10px] text-red-400 hover:text-red-300"
                                            >
                                                Remove Uploaded Photo
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Divider */}
                                    <div className={`text-center text-[8px] ${isKid ? 'text-blue-400' : 'text-slate-600'} uppercase font-bold`}>OR</div>
                                    
                                    {/* Generated Avatar Options */}
                                    <div>
                                        <label className={`text-[10px] font-bold ${isKid ? 'text-blue-600' : 'text-slate-500'} block mb-1 text-left`}>Generate Avatar</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={avatarPrompt}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (/^\d*$/.test(val)) setAvatarPrompt(val);
                                                }}
                                                placeholder="Seed number"
                                                className={`flex-1 ${isKid ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white'} border rounded px-3 py-2 text-xs outline-none font-mono`}
                                            />
                                            <button 
                                                onClick={() => setAvatarPrompt(Math.floor(Math.random() * 1000000).toString())} 
                                                className={`p-2 ${isKid ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-slate-800 text-orange-500 hover:bg-slate-700'} rounded`}
                                            >
                                                <RefreshCcw size={14} />
                                            </button>
                                        </div>
                                        <div className="mt-2">
                                            <select
                                                value={avatarStyle}
                                                onChange={(e) => setAvatarStyle(e.target.value)}
                                                className={`w-full ${isKid ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-slate-300'} border rounded px-2 py-1.5 text-[10px] outline-none`}
                                            >
                                                <option value="avataaars">Human (Standard)</option>
                                                <option value="adventurer">Human (RPG)</option>
                                                <option value="fun-emoji">Emoji (Expressive)</option>
                                                <option value="bottts">Mecha (Robots)</option>
                                                <option value="pixel-art">Retro (Pixel)</option>
                                                <option value="cats">Animal (Cats)</option>
                                                <option value="monsters">Creature (Monsters)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 text-left">
                                <div>
                                    <label className={`text-[10px] font-bold ${isKid ? 'text-blue-600' : 'text-slate-500'} uppercase block mb-1`}>Full Name</label>
                                    <div className="flex gap-2">
                                        <select 
                                            className={`${isKid ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-900 border-slate-800 text-white'} border rounded px-3 py-2 text-sm outline-none w-20`}
                                            value={editProfileForm.title}
                                            onChange={e => setEditProfileForm({...editProfileForm, title: e.target.value})}
                                        >
                                             {['Mr', 'Ms', 'Mrs', 'Dr', 'Er', 'Ar', 'Rs', 'Master', 'Miss'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input 
                                            className={`flex-1 ${isKid ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white'} border rounded px-3 py-2 text-sm outline-none`}
                                            value={editProfileForm.name}
                                            onChange={e => setEditProfileForm({...editProfileForm, name: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`text-[10px] font-bold ${isKid ? 'text-blue-600' : 'text-slate-500'} uppercase block mb-1`}>Category</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditProfileForm({...editProfileForm, category: UserCategory.ADULT})}
                                            className={`flex-1 py-2 rounded text-xs font-bold border transition-colors ${
                                                editProfileForm.category === UserCategory.ADULT 
                                                    ? (isKid ? 'bg-orange-500 border-orange-500 text-white' : 'bg-orange-600 border-orange-600 text-white')
                                                    : (isKid ? 'bg-white border-blue-200 text-blue-600' : 'bg-slate-950 border-slate-800 text-slate-400')
                                            }`}
                                        >
                                            ADULT
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditProfileForm({...editProfileForm, category: UserCategory.KID})}
                                            className={`flex-1 py-2 rounded text-xs font-bold border transition-colors ${
                                                editProfileForm.category === UserCategory.KID 
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : (isKid ? 'bg-white border-blue-200 text-blue-600' : 'bg-slate-950 border-slate-800 text-slate-400')
                                            }`}
                                        >
                                            KID
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={`text-[10px] font-bold ${isKid ? 'text-blue-600' : 'text-slate-500'} uppercase block mb-1`}>Group</label>
                                    <select 
                                        className={`w-full ${isKid ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white'} border rounded px-3 py-2 text-sm outline-none`}
                                        value={editProfileForm.group_id}
                                        onChange={e => setEditProfileForm({...editProfileForm, group_id: e.target.value as GroupType})}
                                    >
                                        {Object.values(GroupType).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className={`text-[10px] font-bold ${isKid ? 'text-blue-600' : 'text-slate-500'} uppercase block mb-1`}>Archetype</label>
                                    <select 
                                        className={`w-full ${isKid ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white'} border rounded px-3 py-2 text-sm outline-none`}
                                        value={editProfileForm.athlete_type}
                                        onChange={e => setEditProfileForm({...editProfileForm, athlete_type: e.target.value as AthleteType})}
                                    >
                                        {Object.values(AthleteType).map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button 
                                    onClick={() => setIsEditingProfile(false)}
                                    className={`flex-1 py-3 ${isKid ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : 'bg-slate-800 text-white hover:bg-slate-700'} font-bold rounded-lg uppercase text-xs flex items-center justify-center gap-2`}
                                >
                                    <X size={16} /> Cancel
                                </button>
                                <button 
                                    onClick={handleSaveProfile}
                                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg uppercase text-xs hover:bg-green-500 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty Workout State */}
            {activeTab === 'workout' && !activeWorkout && !activeDIY && (
                <div className="p-8 text-center flex flex-col items-center justify-center h-[80vh]">
                    <Dumbbell size={48} className="text-slate-600 mb-4" />
                    <h2 className="text-white font-bold text-xl">No Active Workout</h2>
                    <p className="text-slate-400 mt-2 text-sm">Go to Home to select a WOD.</p>
                    <button 
                        onClick={() => setActiveTab('home')}
                        className="mt-6 bg-orange-600 text-white px-6 py-2 rounded-full font-bold"
                    >
                        Pick a Workout
                    </button>
                </div>
            )}

        </div>

      </main>
      {currentUser && (
          <Navbar 
            activeTab={activeTab === 'admin' ? 'profile' : activeTab} 
            setActiveTab={setActiveTab} 
            notificationCount={notifications.length} 
          />
      )}
    </div>
  );
};

export default App;
