
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_USERS, CURRENT_USER_ID } from './constants';
import { User, Log, Notification, Workout, VerificationStatus, Gender, GroupType, AthleteType, ScalingTier, Venue, PinnedWOD } from './types';
import { DataService } from './services/dataService';
import { GeminiService } from './services/geminiService';
import Navbar from './components/Navbar';
import ActiveWorkout from './components/ActiveWorkout';
import WitnessInbox from './components/WitnessInbox';
import AdminDashboard from './components/AdminDashboard';
import AuthScreen from './components/AuthScreen';
import DIYWorkout from './components/DIYWorkout';
import { Trophy, Flame, MapPin, ChevronRight, Bot, Loader2, ShieldAlert, Filter, Dumbbell, Settings, Edit2, Save, X, RefreshCcw, Search, Calendar, Wand2, Star, RotateCcw, Pin, Users } from 'lucide-react';

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

    const handleGetTip = async () => {
        setLoadingTip(true);
        const tip = await GeminiService.generateAdvice(`Give me a short, aggressive motivation tip for a ${user.athlete_type} athlete.`);
        setAiTip(tip);
        setLoadingTip(false);
    };

    const featuredWorkouts = workouts.filter(w => w.is_featured);
    const otherWorkouts = workouts.filter(w => !w.is_featured);

    return (
        <div className="p-5 space-y-6 pb-24">
            <header className="flex justify-between items-end">
                <div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Welcome Back</p>
                    <h1 className="text-3xl font-black text-white italic uppercase">{user.title}. {user.name}</h1>
                    <span className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                        {user.group_id} • {user.athlete_type}
                    </span>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                    <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                </div>
            </header>

            {/* PINNED WOD SECTION */}
            {pinnedWods.length > 0 && (
                <section>
                     <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
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
                                 <div key={pw.id} className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                     
                                     <div className="relative z-10">
                                         <div className="flex justify-between items-start mb-2">
                                             <div>
                                                 <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded mb-2 inline-block">
                                                     PRIORITY MISSION
                                                 </span>
                                                 <h3 className="text-xl font-black text-white italic uppercase">{pw.workout_name}</h3>
                                             </div>
                                             {isJoined ? (
                                                 <div className="bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                                     COMMITTED
                                                 </div>
                                             ) : (
                                                 <button 
                                                    onClick={() => onJoinPinned(pw.id)}
                                                    className="bg-slate-800 hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded border border-slate-700 transition-colors"
                                                 >
                                                     ACCEPT
                                                 </button>
                                             )}
                                         </div>

                                         <div className="flex flex-col gap-1 mb-4">
                                             <div className="flex items-center gap-2 text-xs text-slate-400">
                                                 <Calendar size={12} /> 
                                                 <span className="font-bold text-slate-300">Start:</span> {startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </div>
                                             <div className="flex items-center gap-2 text-xs text-slate-400">
                                                 <Calendar size={12} /> 
                                                 <span className="font-bold text-slate-300">Deadline:</span> {endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </div>
                                         </div>

                                         {/* Participants Preview */}
                                         <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
                                             <button 
                                                onClick={() => setShowParticipants(showParticipants === pw.id ? null : pw.id)}
                                                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
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
                                                    className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300"
                                                >
                                                     Execute <ChevronRight size={14} />
                                                 </button>
                                             </div>
                                         </div>

                                         {/* Participant List Expansion */}
                                         {showParticipants === pw.id && (
                                             <div className="mt-3 p-3 bg-slate-950 rounded-lg animate-in slide-in-from-top-2">
                                                 <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Roster</h4>
                                                 <div className="space-y-2 max-h-32 overflow-y-auto">
                                                     {pw.participants.map(uid => {
                                                         const u = allUsers.find(user => user.id === uid);
                                                         return u ? (
                                                             <div key={uid} className="flex items-center gap-2">
                                                                 <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden">
                                                                     <img src={u.avatar_url} className="w-full h-full object-cover" />
                                                                 </div>
                                                                 <span className="text-xs text-slate-300">{u.name}</span>
                                                             </div>
                                                         ) : null;
                                                     })}
                                                     {pw.participants.length === 0 && <span className="text-xs text-slate-600 italic">No personnel yet.</span>}
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
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Bot size={64} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-indigo-400 text-xs font-bold uppercase flex items-center gap-2">
                        <Bot size={14} /> Coach FitX AI
                    </h3>
                    <p className="text-slate-200 text-sm mt-2 font-medium italic min-h-[3rem]">
                        {loadingTip ? <Loader2 className="animate-spin" /> : (aiTip || "Ready to crush it? Tap below for your daily briefing.")}
                    </p>
                    {!aiTip && (
                        <button 
                            onClick={handleGetTip}
                            className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-bold transition-colors"
                        >
                            Get Motivated
                        </button>
                    )}
                </div>
            </div>

            {/* FEATURED WORKOUTS */}
            {featuredWorkouts.length > 0 && (
                <section>
                    <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                        <Star size={20} className="text-yellow-500" fill="currentColor" />
                        Featured Operations
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                        {featuredWorkouts.map(w => (
                            <button 
                                key={w.id}
                                onClick={() => onStartWorkout(w)}
                                className="snap-center min-w-[85%] bg-slate-900 border-2 border-yellow-500/30 p-5 rounded-2xl text-left transition-all active:scale-95 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                                <div className="relative z-10">
                                    <h3 className="text-white font-black text-xl uppercase italic leading-tight group-hover:text-yellow-500 transition-colors">{w.name}</h3>
                                    <div className="flex gap-2 mt-2 mb-3">
                                         <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                                            Featured
                                         </span>
                                         <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                            {w.scheme}
                                         </span>
                                    </div>
                                    <p className="text-slate-400 text-xs line-clamp-2 mb-2">{w.description}</p>
                                    <div className="text-xs font-bold text-white flex items-center gap-1">
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
                className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-left hover:border-orange-500 transition-colors group relative overflow-hidden"
            >
                 <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Dumbbell size={80} />
                 </div>
                 <div className="relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-white font-bold text-lg italic uppercase flex items-center gap-2">
                            <Wand2 size={18} className="text-orange-500" /> DIY / Free Train
                        </h3>
                        <ChevronRight size={18} className="text-slate-600 group-hover:text-orange-500" />
                    </div>
                    <p className="text-slate-400 text-xs pr-8">
                        Custom session or AI-generated workout. Log your own time/reps. No leaderboard submission.
                    </p>
                 </div>
            </button>

            <section>
                <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                    <Flame size={20} className="text-orange-500" />
                    Standard Protocol
                </h2>
                <div className="grid gap-3">
                    {otherWorkouts.map(w => (
                        <button 
                            key={w.id}
                            onClick={() => onStartWorkout(w)}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-xl text-left transition-colors group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-white font-bold text-lg group-hover:text-orange-500 transition-colors">{w.name}</h3>
                                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{w.description}</p>
                                </div>
                                <ChevronRight className="text-slate-600" />
                            </div>
                            <div className="mt-3 flex gap-2">
                                <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-800">
                                    {w.components.length} Exercises
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
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

    }, [logs, selectedWorkoutId, workoutNameSearch, selectedGender, selectedVerification, selectedTier, allUsers]);

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
                
                {/* Row 4: Status */}
                <div className="relative w-full">
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

                        return (
                            <div key={log.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 flex items-center justify-center text-lg font-black text-slate-500 italic">
                                    #{idx + 1}
                                </div>
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

  // Initialize data when user logs in
  useEffect(() => {
    if (currentUser) {
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
  }, [currentUser]);

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

  const getAvatarUrl = (style: string, seed: string) => {
      const s = encodeURIComponent(seed);
      if (style === 'cats') return `https://robohash.org/${s}.png?set=set4`;
      if (style === 'monsters') return `https://robohash.org/${s}.png?set=set2`;
      return `https://api.dicebear.com/7.x/${style}/svg?seed=${s}`;
  };

  const handleSaveProfile = async () => {
      if (!currentUser || !editProfileForm) return;
      
      let updatedUser = { ...currentUser, ...editProfileForm };
      
      // If prompt was entered OR style changed, regenerate avatar
      if (avatarPrompt || avatarStyle) {
          const seed = avatarPrompt || currentUser.name;
          updatedUser.avatar_url = getAvatarUrl(avatarStyle, seed);
      }

      try {
          await DataService.updateUser(updatedUser as User);
          setCurrentUser(updatedUser as User);
          setIsEditingProfile(false);
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

  // If no user, show Auth Screen
  if (!currentUser) {
      return <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-safe-area">
      <main className="max-w-md mx-auto min-h-screen bg-slate-950 shadow-2xl shadow-black relative">
        
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
                <div className="p-5 text-center text-slate-400 pt-12 pb-32">
                    {!isEditingProfile ? (
                        // VIEW PROFILE MODE
                        <>
                             <div className="w-28 h-28 rounded-full bg-slate-800 border-4 border-orange-500 overflow-hidden mx-auto mb-4 shadow-lg shadow-orange-500/20 relative group">
                                <img src={currentUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            
                            <h1 className="text-3xl font-black text-white uppercase italic">{currentUser.title} {currentUser.name}</h1>
                            
                            <div className="flex justify-center gap-2 mt-3">
                                <span className="px-3 py-1 bg-slate-800 rounded text-xs font-bold text-slate-300 border border-slate-700">{currentUser.group_id}</span>
                                <span className="px-3 py-1 bg-slate-800 rounded text-xs font-bold text-orange-500 border border-slate-700">{currentUser.athlete_type}</span>
                            </div>

                            <div className="mt-6 flex justify-center">
                                <button 
                                    onClick={handleEditProfileStart}
                                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2 rounded-full transition-all"
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

                            <div className="mt-8 p-4 bg-slate-900 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Personal Bests (All Statuses)</h3>
                                    <button onClick={() => refreshData()} className="text-slate-500 hover:text-orange-500 transition-colors" title="Refresh Stats">
                                        <RotateCcw size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {userStats.length > 0 ? (
                                        userStats.map(stat => (
                                            <div key={stat.id} className="text-center p-3 bg-slate-950 rounded border border-slate-800 flex flex-col justify-center min-h-[80px]">
                                                <div className="text-lg font-mono font-bold text-white truncate leading-none mb-1">{stat.score_display}</div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold line-clamp-2 leading-tight">{stat.workout_name}</div>
                                                 {stat.verification_status === VerificationStatus.VERIFIED && <div className="text-[8px] text-green-500 font-bold mt-1">VERIFIED</div>}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-center text-xs text-slate-500 italic py-4">
                                            No records found. Log a standard workout!
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setCurrentUser(null)}
                                className="mt-12 text-slate-600 text-sm font-bold hover:text-white flex items-center justify-center gap-2 w-full"
                            >
                                Log Out
                            </button>
                        </>
                    ) : (
                        // EDIT PROFILE MODE
                        <div className="animate-in slide-in-from-bottom-4 fade-in">
                            <h2 className="text-xl font-black text-white uppercase italic mb-6">Update Personnel</h2>
                            
                            {/* Avatar Editor */}
                             <div className="flex items-center gap-4 mb-6 bg-slate-900 p-3 rounded-lg border border-slate-800">
                                <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-700 overflow-hidden shrink-0">
                                    <img 
                                        src={avatarPrompt ? getAvatarUrl(avatarStyle, avatarPrompt) : (editProfileForm.avatar_url || '')} 
                                        alt="avatar preview" 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                                <div className="flex-1">
                                     <label className="text-[10px] font-bold text-slate-500 block mb-1 text-left">New Avatar Seed (Number)</label>
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
                                            placeholder="e.g. 98765"
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white outline-none font-mono"
                                        />
                                        <button 
                                            onClick={() => setAvatarPrompt(Math.floor(Math.random() * 1000000).toString())} 
                                            className="p-2 bg-slate-800 text-orange-500 rounded hover:bg-slate-700"
                                        >
                                            <RefreshCcw size={14} />
                                        </button>
                                     </div>
                                     <div className="mt-2">
                                        <select
                                            value={avatarStyle}
                                            onChange={(e) => setAvatarStyle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[10px] text-slate-300 outline-none"
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

                            <div className="space-y-4 text-left">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                                    <div className="flex gap-2">
                                        <select 
                                            className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none w-20"
                                            value={editProfileForm.title}
                                            onChange={e => setEditProfileForm({...editProfileForm, title: e.target.value})}
                                        >
                                             {['Mr', 'Ms', 'Mrs', 'Dr', 'Er', 'Ar', 'Rs'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input 
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                            value={editProfileForm.name}
                                            onChange={e => setEditProfileForm({...editProfileForm, name: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Group</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                        value={editProfileForm.group_id}
                                        onChange={e => setEditProfileForm({...editProfileForm, group_id: e.target.value as GroupType})}
                                    >
                                        {Object.values(GroupType).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Archetype</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
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
                                    className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-lg uppercase text-xs hover:bg-slate-700 flex items-center justify-center gap-2"
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
