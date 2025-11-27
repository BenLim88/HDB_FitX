
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_USERS, CURRENT_USER_ID } from './constants';
import { User, Log, Notification, Workout, VerificationStatus, Gender, GroupType, AthleteType, ScalingTier, Venue, PinnedWOD, UserCategory, WorldRecord, Exercise, CollaborativeWorkout, CollaborationStatus } from './types';
import { DataService } from './services/dataService';
import { GeminiService } from './services/geminiService';
import Navbar from './components/Navbar';
import ActiveWorkout from './components/ActiveWorkout';
import WitnessInbox from './components/WitnessInbox';
import AdminDashboard from './components/AdminDashboard';
import CollaborativeWorkoutBuilder from './components/CollaborativeWorkoutBuilder';
import AuthScreen from './components/AuthScreen';
import DIYWorkout from './components/DIYWorkout';
import { Trophy, Flame, MapPin, ChevronRight, ChevronDown, ChevronUp, Bot, Loader2, ShieldAlert, Filter, Dumbbell, Settings, Edit2, Save, X, RefreshCcw, Search, Calendar, Wand2, Star, RotateCcw, Pin, Users, Baby, Trash2, Check, UsersRound, Zap, Play } from 'lucide-react';
import { MOCK_EXERCISES, WORLD_RECORDS } from './constants';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- SUB-COMPONENTS (Inline for single-file simplicity requirement where possible) ---

// 1. Home Tab
const HomeTab: React.FC<{ 
  user: User, 
  workouts: Workout[], 
  logs: Log[], // Add logs for personalized recommendations
  pinnedWods: PinnedWOD[], 
  onStartWorkout: (w: Workout) => void, 
  onStartDIY: (initialComponents?: { id: string; name: string; target: string; weight?: string; sets: number }[]) => void,
  onJoinPinned: (id: string) => void,
  onUnjoinPinned: (id: string) => void,
  onUnpinWOD?: (id: string) => void, // Add unpin handler
  onAssignWorkout: (targetUserId: string, workoutId: string, workoutName: string) => Promise<void>,
  allUsers: User[],
  collabWorkouts?: CollaborativeWorkout[],
  onOpenCollab?: (collab: CollaborativeWorkout) => void,
  // AI State (lifted to parent to persist across tab navigation)
  aiTip: string,
  setAiTip: (tip: string) => void,
  loadingTip: boolean,
  setLoadingTip: (loading: boolean) => void,
  suggestedWorkout: { id: string; name: string; target: string; weight?: string; sets: number }[] | null,
  setSuggestedWorkout: (workout: { id: string; name: string; target: string; weight?: string; sets: number }[] | null) => void,
  isGeneratingWorkout: boolean,
  setIsGeneratingWorkout: (generating: boolean) => void
}> = ({ user, workouts, logs, pinnedWods, onStartWorkout, onStartDIY, onJoinPinned, onUnjoinPinned, onUnpinWOD, onAssignWorkout, allUsers, collabWorkouts = [], onOpenCollab, aiTip, setAiTip, loadingTip, setLoadingTip, suggestedWorkout, setSuggestedWorkout, isGeneratingWorkout, setIsGeneratingWorkout }) => {
    const [showParticipants, setShowParticipants] = useState<string | null>(null); // ID of WOD to show list for
    const [workoutCategoryFilter, setWorkoutCategoryFilter] = useState<string>('All');
    
    // Assign Modal State
    const [assigningWorkoutId, setAssigningWorkoutId] = useState<string | null>(null);
    const [assignSearchTerm, setAssignSearchTerm] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedAthleteIds, setSelectedAthleteIds] = useState<Set<string>>(new Set());
    
    // Get personalized AI assessment based on archetype, workout history, and category-specific leaderboard
    const handleGetTip = async () => {
        setLoadingTip(true);
        
        // Get user's recent workout logs (last 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const userLogsWeek = logs.filter(l => l.user_id === user.id && l.timestamp > sevenDaysAgo);
        const userLogsMonth = logs.filter(l => l.user_id === user.id && l.timestamp > thirtyDaysAgo);
        const allUserLogs = logs.filter(l => l.user_id === user.id);
        
        // Calculate workout stats
        const weeklyWorkouts = userLogsWeek.length;
        const monthlyWorkouts = userLogsMonth.length;
        const totalWorkouts = allUserLogs.length;
        const recentWorkoutNames = userLogsWeek.slice(0, 5).map(l => l.workout_name);
        
        // Days since last workout
        const daysSinceLastWorkout = allUserLogs.length > 0
            ? Math.floor((Date.now() - Math.max(...allUserLogs.map(l => l.timestamp))) / (1000 * 60 * 60 * 1000 * 24))
            : null;
        
        // Workout frequency analysis
        const avgWorkoutsPerWeek = monthlyWorkouts > 0 ? (monthlyWorkouts / 4).toFixed(1) : '0';
        
        // ===== CATEGORY-SPECIFIC LEADERBOARD ANALYSIS =====
        // Group all logs by workout category
        const workoutCategoryMap = new Map<string, string>(); // workout_id -> category
        workouts.forEach(w => {
            workoutCategoryMap.set(w.id, w.category || 'General');
        });
        
        // Count workouts per user per category
        const categoryUserCounts = new Map<string, Map<string, number>>(); // category -> (user_id -> count)
        logs.forEach(l => {
            const category = workoutCategoryMap.get(l.workout_id) || 'General';
            if (!categoryUserCounts.has(category)) {
                categoryUserCounts.set(category, new Map());
            }
            const userCounts = categoryUserCounts.get(category)!;
            userCounts.set(l.user_id, (userCounts.get(l.user_id) || 0) + 1);
        });
        
        // Calculate user's rank in each category they've participated in
        const userCategoryRankings: { category: string; rank: number; total: number; count: number }[] = [];
        const userCategoryParticipation: { category: string; count: number }[] = [];
        
        categoryUserCounts.forEach((userCounts, category) => {
            const userCount = userCounts.get(user.id) || 0;
            if (userCount > 0) {
                const sortedByCount = Array.from(userCounts.entries()).sort((a, b) => b[1] - a[1]);
                const rank = sortedByCount.findIndex(([id]) => id === user.id) + 1;
                userCategoryRankings.push({
                    category,
                    rank,
                    total: sortedByCount.length,
                    count: userCount
                });
                userCategoryParticipation.push({ category, count: userCount });
            }
        });
        
        // Sort by rank (best first) for strengths, and by count (lowest first) for weaknesses
        const strengthCategories = [...userCategoryRankings]
            .filter(r => r.rank <= 3 && r.total >= 2) // Top 3 with at least 2 participants
            .sort((a, b) => a.rank - b.rank)
            .slice(0, 3);
        
        const improvementCategories = [...userCategoryRankings]
            .filter(r => r.rank > Math.ceil(r.total / 2)) // Bottom half
            .sort((a, b) => b.rank - a.rank)
            .slice(0, 2);
        
        // Categories user hasn't tried
        const allCategories = new Set<string>(workouts.map(w => w.category || 'General'));
        const userCategories = new Set<string>(userCategoryParticipation.map(p => p.category));
        const unexploredCategories = Array.from(allCategories).filter(c => !userCategories.has(c));
        
        // Build category-specific leaderboard context
        let categoryLeaderboardContext = '';
        
        if (strengthCategories.length > 0) {
            const strengthsText = strengthCategories
                .map(r => `${r.category} (#${r.rank} of ${r.total}, ${r.count} workouts)`)
                .join(', ');
            categoryLeaderboardContext += `Strong categories: ${strengthsText}. `;
        }
        
        if (improvementCategories.length > 0) {
            const improvementText = improvementCategories
                .map(r => `${r.category} (#${r.rank} of ${r.total})`)
                .join(', ');
            categoryLeaderboardContext += `Areas for improvement: ${improvementText}. `;
        }
        
        if (unexploredCategories.length > 0 && unexploredCategories.length <= 4) {
            categoryLeaderboardContext += `Unexplored categories: ${unexploredCategories.join(', ')}. `;
        }
        
        // Most active category
        const mostActiveCategory = userCategoryParticipation.length > 0
            ? userCategoryParticipation.sort((a, b) => b.count - a.count)[0]
            : null;
        
        if (mostActiveCategory) {
            categoryLeaderboardContext += `Most trained category: ${mostActiveCategory.category} (${mostActiveCategory.count} sessions). `;
        }
        
        // Overall activity summary
        const overallSummary = `Total workouts logged: ${totalWorkouts}. Monthly average: ${avgWorkoutsPerWeek} sessions/week.`;
        
        // Build professional assessment context
        let performanceAssessment = '';
        if (weeklyWorkouts === 0 && daysSinceLastWorkout !== null && daysSinceLastWorkout > 7) {
            performanceAssessment = `Training Status: ${daysSinceLastWorkout} days since last recorded workout. Training consistency has declined significantly. Recommend immediate resumption of training protocol.`;
        } else if (weeklyWorkouts === 0) {
            performanceAssessment = `Training Status: No workouts logged this week. Current training frequency is below optimal levels for maintaining fitness gains.`;
        } else if (weeklyWorkouts >= 5) {
            performanceAssessment = `Training Status: Excellent training volume with ${weeklyWorkouts} sessions this week. Current output demonstrates strong commitment. Recent activities: ${recentWorkoutNames.join(', ')}.`;
        } else if (weeklyWorkouts >= 3) {
            performanceAssessment = `Training Status: Solid training consistency with ${weeklyWorkouts} sessions this week. On track for maintenance goals. Recent activities: ${recentWorkoutNames.join(', ')}.`;
        } else {
            performanceAssessment = `Training Status: ${weeklyWorkouts} session(s) logged this week. Consider increasing frequency to 3-4 sessions for optimal progress. Recent: ${recentWorkoutNames.join(', ')}.`;
        }
        
        // Archetype alignment check
        const archetypeCategory = user.athlete_type === 'Hyrox' ? 'Hyrox' 
            : user.athlete_type === 'CrossFit' ? 'CrossFit'
            : user.athlete_type === 'Calisthenics' ? 'Calisthenics'
            : user.athlete_type === 'Runner' ? 'Cardio'
            : user.athlete_type === 'Strength' || user.athlete_type === 'Bodybuilder' ? 'Street Lift'
            : null;
        
        let archetypeAlignmentNote = '';
        if (archetypeCategory && mostActiveCategory) {
            if (mostActiveCategory.category === archetypeCategory) {
                archetypeAlignmentNote = `Training alignment: Good - most active category (${mostActiveCategory.category}) matches athlete archetype (${user.athlete_type}).`;
            } else {
                const archetypeWorkouts = userCategoryParticipation.find(p => p.category === archetypeCategory);
                if (archetypeWorkouts) {
                    archetypeAlignmentNote = `Training alignment: Note - athlete archetype is ${user.athlete_type}, but most training is in ${mostActiveCategory.category}. Consider increasing ${archetypeCategory} workouts.`;
                } else {
                    archetypeAlignmentNote = `Training alignment: Gap identified - athlete archetype is ${user.athlete_type}, but no ${archetypeCategory} workouts logged. Recommend exploring this category.`;
                }
            }
        }
        
        // Archetype-specific recommendations
        const archetypeRecommendations: Record<string, string> = {
            'Hyrox': 'Archetype focus: Running endurance, sled work, rowing, and functional fitness stations. Prioritize race-simulation training.',
            'CrossFit': 'Archetype focus: Varied functional movements, Olympic lifting technique, and high-intensity metabolic conditioning.',
            'Calisthenics': 'Archetype focus: Bodyweight skill progressions, movement control, and strength-to-weight ratio optimization.',
            'Hybrid': 'Archetype focus: Balanced programming combining strength, conditioning, and functional fitness elements.',
            'Runner': 'Archetype focus: Running volume progression, tempo work, interval training, and lower body strength.',
            'Strength': 'Archetype focus: Compound lifts, progressive overload protocols, and adequate recovery periods.',
            'Bodybuilder': 'Archetype focus: Muscle isolation, hypertrophy protocols, and mind-muscle connection.',
            'Generic': 'Archetype focus: Balanced training across strength, conditioning, and mobility domains.'
        };
        
        const recommendation = archetypeRecommendations[user.athlete_type] || archetypeRecommendations['Generic'];
        
        const prompt = `
You are Coach FitX, a professional fitness consultant providing a performance assessment.
Athlete: ${user.name}
Training archetype: ${user.athlete_type}

${performanceAssessment}

Category Performance Analysis:
${categoryLeaderboardContext || 'No category-specific data available yet.'}

${archetypeAlignmentNote}

${overallSummary}

${recommendation}

Provide a CONCISE professional assessment (3-4 sentences) that includes:
1. A brief evaluation of their training consistency and volume
2. Their competitive standing in specific workout categories (mention actual rankings like "#2 in Hyrox" if applicable)
3. Whether their training aligns with their archetype, and specific category recommendations
4. One actionable next step

Maintain a professional tone throughout. Avoid slang or casual language. Be analytical, specific, and constructive.
        `.trim();
        
        const tip = await GeminiService.generateAdvice(prompt);
        setAiTip(tip);
        setLoadingTip(false);
    };

    // Generate AI-suggested workout based on archetype and training gaps
    const handleGenerateSuggestedWorkout = async () => {
        setIsGeneratingWorkout(true);
        setSuggestedWorkout(null);
        
        // Build context for workout generation
        const archetypeWorkouts: Record<string, string> = {
            'Hyrox': 'Create a Hyrox-style workout with running intervals, sled pushes, rowing, burpee broad jumps, farmer carries, and wall balls. Include 4-6 exercises.',
            'CrossFit': 'Create a CrossFit-style WOD with varied functional movements. Can include Olympic lifts (snatch, clean), gymnastics (pull-ups, muscle-ups), and cardio. Format as AMRAP or For Time.',
            'Calisthenics': 'Create a bodyweight-focused workout with progressions. Include pull-ups, dips, push-up variations, pistol squats, and core work.',
            'Hybrid': 'Create a balanced workout mixing strength and conditioning. Include compound lifts with cardio intervals.',
            'Runner': 'Create a running-focused workout with intervals and leg strength. Include tempo runs, hill sprints, and lower body exercises.',
            'Strength': 'Create a strength-focused workout with compound lifts. Focus on squat, deadlift, bench, or overhead press with appropriate rep ranges.',
            'Bodybuilder': 'Create a hypertrophy-focused workout targeting specific muscle groups. Include isolation exercises with moderate reps.',
            'Generic': 'Create a well-rounded workout with a mix of cardio, strength, and core exercises.'
        };
        
        const workoutPrompt = archetypeWorkouts[user.athlete_type] || archetypeWorkouts['Generic'];
        
        try {
            const generated = await GeminiService.generateWorkoutPlan(workoutPrompt);
            
            if (Array.isArray(generated) && generated.length > 0) {
                const timestamp = Date.now();
                const mapped = generated.map((g: any, i: number) => ({
                    id: `ai_${timestamp}_${i}`,
                    name: g.name || 'Exercise',
                    target: g.target || '10 reps',
                    weight: g.weight,
                    sets: typeof g.sets === 'number' ? g.sets : 1
                }));
                setSuggestedWorkout(mapped);
            } else {
                alert("Could not generate workout. Please try again.");
            }
        } catch (e) {
            console.error("Workout generation error:", e);
            alert("Failed to generate workout. Please try again.");
        } finally {
            setIsGeneratingWorkout(false);
        }
    };

    const toggleAthleteSelection = (userId: string) => {
        setSelectedAthleteIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleConfirmAssignMultiple = async () => {
        const workout = workouts.find(w => w.id === assigningWorkoutId);
        if (!workout || selectedAthleteIds.size === 0) return;
        
        const selectedUsers = allUsers.filter(u => selectedAthleteIds.has(u.id));
        const names = selectedUsers.map(u => u.name).join(', ');
        
        if (confirm(`Assign "${workout.name}" to ${selectedUsers.length} athlete(s)?\n\n${names}`)) {
            setIsAssigning(true);
            try {
                // Assign to all selected athletes
                for (const targetUser of selectedUsers) {
                    await onAssignWorkout(targetUser.id, workout.id, workout.name);
                }
                alert(`Workout assigned to ${selectedUsers.length} athlete(s)!`);
                setAssigningWorkoutId(null);
                setAssignSearchTerm('');
                setSelectedAthleteIds(new Set());
            } catch (error) {
                console.error("Error assigning workout", error);
                alert("Failed to assign workout to some athletes");
            } finally {
                setIsAssigning(false);
            }
        }
    };

    const isKid = user.category === UserCategory.KID;
    
    // Helper function to categorize workouts
    const getWorkoutCategory = (workout: Workout): string => {
        // Priority 1: Use explicit category if set
        if (workout.category) return workout.category;
        
        // Priority 2: Kids Friendly flag
        if (workout.is_kids_friendly) return 'Kids Friendly';
        
        // Priority 3: Fallback to auto-detection
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
            {/* ASSIGN WORKOUT MODAL */}
            {assigningWorkoutId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className={`${isKid ? 'bg-white' : 'bg-slate-900'} border ${isKid ? 'border-blue-200' : 'border-slate-800'} w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`${isKid ? 'text-blue-900' : 'text-white'} font-bold text-lg flex items-center gap-2`}>
                                <Users size={20} className={isKid ? 'text-blue-500' : 'text-orange-500'} /> Assign to Athletes
                            </h3>
                            <button onClick={() => { setAssigningWorkoutId(null); setSelectedAthleteIds(new Set()); }} className="p-2 text-slate-500 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Selection count */}
                        {selectedAthleteIds.size > 0 && (
                            <div className={`mb-3 px-3 py-2 rounded-lg text-sm font-medium ${isKid ? 'bg-blue-100 text-blue-800' : 'bg-orange-500/20 text-orange-400'}`}>
                                {selectedAthleteIds.size} athlete{selectedAthleteIds.size > 1 ? 's' : ''} selected
                            </div>
                        )}
                        
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                className={`w-full ${isKid ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white'} border rounded-lg py-3 pl-10 pr-4 outline-none focus:border-blue-500`}
                                placeholder="Search athlete..."
                                value={assignSearchTerm}
                                onChange={e => setAssignSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4">
                            {allUsers
                                .filter(u => u.id !== user.id && u.name.toLowerCase().includes(assignSearchTerm.toLowerCase()))
                                .map(u => {
                                    const isSelected = selectedAthleteIds.has(u.id);
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => toggleAthleteSelection(u.id)}
                                            disabled={isAssigning}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                isSelected
                                                    ? isKid 
                                                        ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400' 
                                                        : 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500'
                                                    : isKid 
                                                        ? 'bg-white border-blue-100 hover:border-blue-400 hover:bg-blue-50' 
                                                        : 'bg-slate-950 border-slate-800 hover:border-orange-500 hover:bg-slate-900'
                                            }`}
                                        >
                                            {/* Checkbox indicator */}
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isSelected
                                                    ? isKid ? 'bg-blue-500 border-blue-500' : 'bg-orange-500 border-orange-500'
                                                    : isKid ? 'border-blue-300' : 'border-slate-600'
                                            }`}>
                                                {isSelected && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                <img src={u.avatar_url} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className={`${isKid ? 'text-blue-900' : 'text-white'} font-bold text-sm`}>{u.name}</p>
                                                <p className="text-xs text-slate-500">{u.athlete_type}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            {allUsers.filter(u => u.id !== user.id && u.name.toLowerCase().includes(assignSearchTerm.toLowerCase())).length === 0 && (
                                <div className="text-center py-8 text-slate-500 italic text-sm">
                                    No athletes found.
                                </div>
                            )}
                        </div>
                        
                        {/* Confirm Button */}
                        <button
                            onClick={handleConfirmAssignMultiple}
                            disabled={isAssigning || selectedAthleteIds.size === 0}
                            className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                selectedAthleteIds.size === 0
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : isKid
                                        ? 'bg-blue-500 hover:bg-blue-400 text-white'
                                        : 'bg-orange-600 hover:bg-orange-500 text-white'
                            }`}
                        >
                            {isAssigning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    Assign to {selectedAthleteIds.size || '...'} Athlete{selectedAthleteIds.size !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

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
                        HQ Directives
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
                                             <div className="flex-1">
                                                 <span className="text-[10px] font-bold bg-yellow-500/30 text-yellow-600 px-2 py-1 rounded mb-2 inline-block border border-yellow-500/50">
                                                     ⚡ PRIORITY MISSION ⚡
                                                 </span>
                                                 <h3 className={`text-xl font-black ${isKid ? 'text-blue-900' : 'text-white'} italic uppercase`}>{pw.workout_name}</h3>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                 {user.is_admin && onUnpinWOD && (
                                                     <button 
                                                        onClick={() => {
                                                            if (confirm(`Unpin "${pw.workout_name}"? This will remove it from all users' Home tabs.`)) {
                                                                onUnpinWOD(pw.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                                                        title="Unpin Workout"
                                                     >
                                                         <Pin size={16} className="rotate-45" />
                                                     </button>
                                                 )}
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

            {/* MY COLLABORATIONS SECTION */}
            {collabWorkouts.length > 0 && (
                <section>
                    <h2 className={`${isKid ? 'text-blue-900' : 'text-white'} font-bold text-lg mb-3 flex items-center gap-2`}>
                        <Users size={20} className="text-purple-500" />
                        My Collaborations
                    </h2>
                    <div className="space-y-3">
                        {collabWorkouts.filter(c => c.status === CollaborationStatus.ACTIVE).map(collab => (
                            <div 
                                key={collab.id}
                                onClick={() => onOpenCollab && onOpenCollab(collab)}
                                className={`${isKid ? 'bg-white border-purple-200 hover:border-purple-400' : 'bg-slate-900 border-purple-500/30 hover:border-purple-500'} border p-4 rounded-xl cursor-pointer transition-colors`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className={`font-bold ${isKid ? 'text-purple-900' : 'text-white'}`}>{collab.name}</h3>
                                        <p className={`text-xs ${isKid ? 'text-purple-600' : 'text-slate-400'}`}>
                                            {collab.initiator_id === user.id ? 'You are the admin' : `By ${collab.initiator_name}`}
                                        </p>
                                    </div>
                                    <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                                        {collab.components.length} exercises
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {allUsers.filter(u => collab.collaborator_ids.includes(u.id) || u.id === collab.initiator_id).slice(0, 4).map(u => (
                                            <div key={u.id} className={`w-6 h-6 rounded-full overflow-hidden border-2 ${isKid ? 'border-white' : 'border-slate-900'}`}>
                                                <img src={u.avatar_url} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                    <span className={`text-xs ${isKid ? 'text-purple-600' : 'text-slate-500'}`}>
                                        {collab.collaborator_ids.length + 1} collaborators
                                    </span>
                                    <ChevronRight className={`ml-auto ${isKid ? 'text-purple-400' : 'text-purple-500'}`} size={16} />
                                </div>
                            </div>
                        ))}
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
                    <p className={`${isKid ? 'text-blue-600' : 'text-slate-500'} text-[10px] mt-1`}>
                        Personalized for {user.athlete_type} athletes
                    </p>
                    
                    {/* Assessment Section */}
                    <p className={`${isKid ? 'text-blue-800' : 'text-slate-200'} text-sm mt-2 font-medium italic min-h-[3rem]`}>
                        {loadingTip ? <Loader2 className="animate-spin" /> : (aiTip || "Get your personalized assessment and AI-generated workout recommendation!")}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                        {!aiTip ? (
                            <button 
                                onClick={handleGetTip}
                                disabled={loadingTip}
                                className={`text-xs ${isKid ? 'bg-blue-500 hover:bg-blue-400' : 'bg-indigo-600 hover:bg-indigo-500'} disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1`}
                            >
                                <Zap size={12} /> Get Assessment
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setAiTip(''); handleGetTip(); }}
                                disabled={loadingTip}
                                className={`text-xs ${isKid ? 'bg-blue-400/80 hover:bg-blue-400' : 'bg-indigo-500/50 hover:bg-indigo-500'} disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1`}
                            >
                                <RefreshCcw size={12} /> Refresh
                            </button>
                        )}
                        
                        {/* Generate Workout Button */}
                        <button 
                            onClick={handleGenerateSuggestedWorkout}
                            disabled={isGeneratingWorkout}
                            className={`text-xs ${isKid ? 'bg-green-500 hover:bg-green-400' : 'bg-green-600 hover:bg-green-500'} disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1`}
                        >
                            {isGeneratingWorkout ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            {isGeneratingWorkout ? 'Generating...' : 'Generate Workout'}
                        </button>
                    </div>
                    
                    {/* Suggested Workout Display */}
                    {suggestedWorkout && suggestedWorkout.length > 0 && (
                        <div className={`mt-4 p-3 rounded-lg ${isKid ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-500/30'}`}>
                            <h4 className={`${isKid ? 'text-green-700' : 'text-green-400'} text-xs font-bold uppercase mb-2 flex items-center gap-1`}>
                                <Dumbbell size={12} /> AI Suggested Workout ({user.athlete_type})
                            </h4>
                            <ul className="space-y-1">
                                {suggestedWorkout.map((ex, i) => (
                                    <li key={ex.id} className={`${isKid ? 'text-green-800' : 'text-green-200'} text-xs flex items-start gap-2`}>
                                        <span className={`${isKid ? 'text-green-600' : 'text-green-500'} font-bold`}>{i + 1}.</span>
                                        <span>
                                            <strong>{ex.name}</strong> - {ex.target}
                                            {ex.weight && ` @ ${ex.weight}`}
                                            {ex.sets > 1 && ` (${ex.sets} sets)`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-2 mt-3">
                                <button 
                                    onClick={() => onStartDIY(suggestedWorkout)}
                                    className={`flex-1 text-xs ${isKid ? 'bg-green-600 hover:bg-green-500' : 'bg-green-600 hover:bg-green-500'} text-white px-3 py-2 rounded font-bold transition-colors flex items-center justify-center gap-1`}
                                >
                                    <Play size={12} fill="currentColor" /> Start This Workout
                                </button>
                                <button 
                                    onClick={() => setSuggestedWorkout(null)}
                                    className={`text-xs ${isKid ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'} px-3 py-2 rounded font-bold transition-colors`}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            <p className={`${isKid ? 'text-green-600' : 'text-green-500/70'} text-[10px] mt-2 text-center`}>
                                You can customize this workout in the FREE Train builder
                            </p>
                        </div>
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
                                    <div className={`text-xs font-bold ${isKid ? 'text-blue-900' : 'text-white'} flex items-center gap-1 mt-auto`}>
                                        Start Mission <ChevronRight size={14} className="text-yellow-500" />
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAssigningWorkoutId(w.id);
                                        }}
                                        className="absolute bottom-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors z-20"
                                        title="Assign to Athlete"
                                    >
                                        <Users size={16} />
                                    </button>
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
                            <div className="flex justify-between items-end mt-3">
                                <div className="flex gap-2 flex-wrap">
                                    <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                        {w.components.length} Exercises
                                    </span>
                                    <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                        {w.scheme}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAssigningWorkoutId(w.id);
                                    }}
                                    className={`p-2 rounded-full ${isKid ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'} transition-colors`}
                                    title="Assign to Athlete"
                                >
                                    <Users size={14} />
                                </button>
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
                                    <div className="flex justify-between items-end mt-3">
                                        <div className="flex gap-2 flex-wrap">
                                            <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                                {w.components.length} Exercises
                                            </span>
                                            <span className={`text-[10px] ${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-950 text-slate-400 border-slate-800'} px-2 py-1 rounded border`}>
                                                {w.scheme}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAssigningWorkoutId(w.id);
                                            }}
                                            className={`p-2 rounded-full ${isKid ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'} transition-colors`}
                                            title="Assign to Athlete"
                                        >
                                            <Users size={14} />
                                        </button>
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
    const [isWorldRecordsExpanded, setIsWorldRecordsExpanded] = useState<boolean>(false);

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

    // Filter world records based on current filters
    const filteredWorldRecords = useMemo(() => {
        let tempRecords = WORLD_RECORDS;
        
        // Filter by Workout ID
        if (selectedWorkoutId !== 'all') {
            tempRecords = tempRecords.filter(wr => wr.workout_id === selectedWorkoutId);
        }
        
        // Filter by Workout Name Text
        if (workoutNameSearch) {
            tempRecords = tempRecords.filter(wr => wr.workout_name.toLowerCase().includes(workoutNameSearch.toLowerCase()));
        }
        
        // Filter by Gender
        if (selectedGender !== 'all') {
            tempRecords = tempRecords.filter(wr => wr.gender === selectedGender);
        }
        
        return tempRecords;
    }, [selectedWorkoutId, workoutNameSearch, selectedGender]);

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
                {/* World Records Section */}
                {filteredWorldRecords.length > 0 && (
                    <div className="mb-6">
                        <button
                            onClick={() => setIsWorldRecordsExpanded(!isWorldRecordsExpanded)}
                            className="w-full text-left mb-3"
                        >
                            <h3 className="text-sm font-bold text-yellow-400 uppercase flex items-center gap-2 hover:text-yellow-300 transition-colors">
                                <Star size={16} className="fill-yellow-400" /> World Records
                                <span className="text-[10px] text-yellow-500/70 ml-auto">
                                    {filteredWorldRecords.length} record{filteredWorldRecords.length !== 1 ? 's' : ''}
                                </span>
                                {isWorldRecordsExpanded ? (
                                    <ChevronUp size={16} className="ml-auto" />
                                ) : (
                                    <ChevronDown size={16} className="ml-auto" />
                                )}
                            </h3>
                        </button>
                        {isWorldRecordsExpanded && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                {filteredWorldRecords.map((wr) => (
                                    <div key={wr.id} className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border-2 border-yellow-500/50 p-3 rounded-xl flex items-center gap-3 shadow-lg shadow-yellow-500/10">
                                        <div className="w-8 h-8 flex items-center justify-center text-lg font-black text-yellow-400 italic shrink-0">
                                            <Star size={20} className="fill-yellow-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-white font-bold text-sm truncate">{wr.athlete_name}</h4>
                                                <span className="text-[10px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold">
                                                    WR
                                                </span>
                                            </div>
                                            <p className="text-xs text-yellow-300 truncate">{wr.workout_name}</p>
                                            <div className="flex flex-wrap gap-2 mt-1 items-center">
                                                {wr.division && (
                                                    <span className="text-[10px] text-yellow-400 border border-yellow-500/30 px-1 rounded" title="Division">{wr.division}</span>
                                                )}
                                                <span className="text-[10px] text-yellow-300/70 border border-yellow-500/20 px-1 rounded" title="Category">{wr.category}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <div className="text-yellow-400 font-mono font-bold text-lg">{wr.record_display}</div>
                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold">
                                                    World Record
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Regular Leaderboard */}
                {filteredLogs.length === 0 && filteredWorldRecords.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                        No records found matching filters.
                    </div>
                ) : (
                    <>
                        {filteredWorldRecords.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Community Leaderboard</h3>
                            </div>
                        )}
                        {filteredLogs.map((log, idx) => {
                        // Format Timestamp
                        const dateObj = new Date(log.timestamp);
                        const dateDisplay = dateObj.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        // Find user for avatar and current name
                        const user = allUsers.find(u => u.id === log.user_id);
                        // Use current user name if available, otherwise fall back to stored name
                        const displayName = user?.name || log.user_name;

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
                                    <h4 className="text-white font-bold text-sm truncate">{displayName}</h4>
                                    <p className="text-xs text-orange-500 truncate">{log.workout_name}</p>
                                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                                        <span className="text-[10px] text-slate-400 border border-slate-700 px-1 rounded">{log.difficulty_tier}</span>
                                        {user && user.group_id && user.group_id !== 'None' && (
                                            <span className="text-[10px] text-blue-400 border border-blue-700 px-1 rounded" title="Group">{user.group_id}</span>
                                        )}
                                        {user && user.athlete_type && user.athlete_type !== 'Generic' && (
                                            <span className="text-[10px] text-purple-400 border border-purple-700 px-1 rounded" title="Archetype">{user.athlete_type}</span>
                                        )}
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
                        })}
                    </>
                )}
            </div>
        </div>
    )
}

// --- MAIN APP ---

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Track auth loading state
  // Restore active tab from localStorage, default to 'home'
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('hdb_fitx_activeTab');
    // Validate that saved tab is a valid tab name
    const validTabs = ['home', 'workout', 'leaderboard', 'profile', 'inbox', 'admin', 'collab'];
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab;
    }
    return 'home';
  });
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]); // New Venue State
  const [pinnedWods, setPinnedWods] = useState<PinnedWOD[]>([]); // New Pinned WOD State
  const [pendingCollabId, setPendingCollabId] = useState<string | null>(null); // For navigating to specific collab
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]); // Custom exercises from Firestore
  
  // AI Coach State (lifted from HomeTab to persist across tab navigation)
  const [aiTip, setAiTip] = useState<string>('');
  const [loadingTip, setLoadingTip] = useState(false);
  const [suggestedWorkout, setSuggestedWorkout] = useState<{ id: string; name: string; target: string; weight?: string; sets: number }[] | null>(null);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [userCollabs, setUserCollabs] = useState<CollaborativeWorkout[]>([]); // User's collaborations
  const [activeCollab, setActiveCollab] = useState<CollaborativeWorkout | null>(null); // For viewing collaboration directly

  // Workout State
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [activeDIY, setActiveDIY] = useState(false); // DIY Mode State
  const [diyInitialComponents, setDiyInitialComponents] = useState<{ id: string; name: string; target: string; weight?: string; sets: number }[] | undefined>(undefined);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<Partial<User>>({});
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('avataaars'); // Default
  const [uploadedAvatarFile, setUploadedAvatarFile] = useState<File | null>(null);
  const [uploadedAvatarPreview, setUploadedAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('hdb_fitx_activeTab', activeTab);
    }
  }, [activeTab]);

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
            const ex = await DataService.getExercises(); // Load custom exercises from Firestore
            setCustomExercises(ex);
            // Load user's collaborations
            if (currentUser) {
                const collabs = await DataService.getCollaborativeWorkouts(currentUser.id);
                setUserCollabs(collabs);
            }
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
    // Refresh workouts to sync Featured status across all admins
    const w = await DataService.getWorkouts();
    setWorkouts(w);
    if (currentUser) {
        const n = await DataService.getNotifications(currentUser.id);
        setNotifications(n);
        // Refresh current user data from Firestore (in case admin status changed)
        const allUsers = await DataService.getAllUsers();
        const updatedUser = allUsers.find(u => u.id === currentUser.id);
        // Only update if user is still logged in (check localStorage to avoid race condition on logout)
        if (updatedUser && localStorage.getItem('hdb_fitx_user')) {
            setCurrentUser(updatedUser);
            localStorage.setItem('hdb_fitx_user', JSON.stringify(updatedUser));
        }
    }
  };

  // Poll for notifications (simulating realtime)
  useEffect(() => {
    if (currentUser) {
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Refresh current user when profile tab is opened (to catch admin status changes)
  useEffect(() => {
    if (activeTab === 'profile' && currentUser) {
        const refreshCurrentUser = async () => {
            const allUsers = await DataService.getAllUsers();
            const updatedUser = allUsers.find(u => u.id === currentUser.id);
            // Only update if user is still logged in (check localStorage to avoid race condition on logout)
            if (updatedUser && localStorage.getItem('hdb_fitx_user')) {
                setCurrentUser(updatedUser);
                localStorage.setItem('hdb_fitx_user', JSON.stringify(updatedUser));
            }
        };
        refreshCurrentUser();
    }
  }, [activeTab, currentUser?.id]);

  const handleStartWorkout = (workout: Workout) => {
    setActiveWorkout(workout);
    setActiveDIY(false);
    setActiveTab('workout');
  };

  const handleStartDIY = (initialComponents?: { id: string; name: string; target: string; weight?: string; sets: number }[]) => {
      setDiyInitialComponents(initialComponents);
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
      // Check if it's a Firebase Storage URL (starts with https://firebasestorage.googleapis.com)
      const isFirebaseStorageUrl = url.startsWith('https://firebasestorage.googleapis.com');
      // Check if it's a base64 data URL
      const isBase64Url = url.startsWith('data:image');
      
      if (isFirebaseStorageUrl || isBase64Url) {
          // User has uploaded a photo, don't set avatarStyle (keep it null/empty to preserve uploaded photo)
          setAvatarStyle('');
      } else if (url.includes('robohash.org')) {
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
      
      setIsUploadingAvatar(true);
      let updatedUser = { ...currentUser, ...editProfileForm };
      
      try {
          // Priority 1: Uploaded file (highest priority) - upload to Firebase Storage
          if (uploadedAvatarFile) {
              try {
                  // Create a reference to the storage location
                  const fileExtension = uploadedAvatarFile.name.split('.').pop() || 'jpg';
                  const fileName = `avatars/${currentUser.id}_${Date.now()}.${fileExtension}`;
                  const storageRef = ref(storage, fileName);
                  
                  // Upload the file
                  await uploadBytes(storageRef, uploadedAvatarFile);
                  
                  // Get the download URL
                  const downloadURL = await getDownloadURL(storageRef);
                  updatedUser.avatar_url = downloadURL;
                  
                  console.log('Avatar uploaded to Firebase Storage:', downloadURL);
              } catch (uploadError) {
                  console.error('Error uploading avatar:', uploadError);
                  alert('Failed to upload photo. Please try again.');
                  setIsUploadingAvatar(false);
                  return;
              }
          }
          // Priority 2: Generated avatar (only if user explicitly changed prompt/style)
          // Regenerate if avatarPrompt is set (user entered a seed number) OR if avatarStyle changed
          else if (avatarPrompt && avatarPrompt.trim() !== '') {
              // User entered a seed number - generate avatar
              const seed = avatarPrompt.trim();
              updatedUser.avatar_url = getAvatarUrl(avatarStyle || 'avataaars', seed);
          } else if (avatarStyle && avatarStyle !== '' && !currentUser.avatar_url?.startsWith('https://firebasestorage.googleapis.com') && !currentUser.avatar_url?.startsWith('data:image')) {
              // User changed avatar style but didn't enter a seed - use name as seed
              const seed = editProfileForm.name || currentUser.name;
          updatedUser.avatar_url = getAvatarUrl(avatarStyle, seed);
      }
          // Priority 3: Keep existing avatar_url if nothing changed
          // Preserve existing avatar_url (especially Firebase Storage URLs and base64 URLs)
          else {
              // Keep the existing avatar_url from editProfileForm (which includes currentUser.avatar_url)
              updatedUser.avatar_url = editProfileForm.avatar_url || currentUser.avatar_url;
          }

          await DataService.updateUser(updatedUser as User);
          setCurrentUser(updatedUser as User);
          localStorage.setItem('hdb_fitx_user', JSON.stringify(updatedUser));
          setIsEditingProfile(false);
          // Reset upload state
          setUploadedAvatarFile(null);
          setUploadedAvatarPreview(null);
      } catch (e: any) {
          const errorMessage = e?.message || "Failed to update profile. Please try again.";
          alert(errorMessage);
          console.error("Profile update error:", e);
      } finally {
          setIsUploadingAvatar(false);
      }
  }

  // Callback when Admin adds/removes workouts
  const handleUpdateWorkouts = async (updatedWorkouts: Workout[]) => {
      setWorkouts(updatedWorkouts);
      // Also refresh from Firestore to ensure we have the latest data
      try {
          const refreshedWorkouts = await DataService.getWorkouts();
          setWorkouts(refreshedWorkouts);
      } catch (error) {
          console.error('Error refreshing workouts:', error);
          // Keep the updated workouts even if refresh fails
      }
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

  const handleUnpinWOD = async (wodId: string) => {
      if (!currentUser || !currentUser.is_admin) {
          alert('Only administrators can unpin workouts.');
          return;
      }
      try {
          console.log('Unpinning WOD:', wodId);
          await DataService.deletePinnedWOD(wodId);
          console.log('WOD unpinned successfully');
          refreshData();
      } catch (error) {
          console.error('Error unpinning WOD:', error);
          alert(`Failed to unpin workout: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
      }
  };

  const handleAssignWorkout = async (targetUserId: string, workoutId: string, workoutName: string) => {
      if (!currentUser) return;
      await DataService.assignWorkout(targetUserId, workoutId, workoutName, currentUser.name);
  };

  const handleStartAssignedWorkout = (workoutId: string) => {
      const workout = workouts.find(w => w.id === workoutId);
      if (workout) {
          handleStartWorkout(workout);
      } else {
          alert('Assigned workout not found. It might have been deleted.');
      }
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
    ? 'w-full max-w-md lg:max-w-4xl xl:max-w-6xl 2xl:max-w-[2248px] mx-auto min-h-screen bg-white shadow-2xl shadow-blue-200 relative'
    : 'w-full max-w-md lg:max-w-4xl xl:max-w-6xl 2xl:max-w-[2248px] mx-auto min-h-screen bg-slate-950 shadow-2xl shadow-black relative';

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
                    exercises={customExercises}
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
                        setDiyInitialComponents(undefined);
                        setActiveTab('home');
                    }}
                    initialComponents={diyInitialComponents}
                 />
             </div>
        )}

        {/* TAB CONTENT LAYER - Only show if not in active workout view or if we need to show empty state */}
        <div className={activeTab !== 'workout' || (!activeWorkout && !activeDIY) ? 'block' : 'hidden'}>
            
            {activeTab === 'home' && (
                <HomeTab 
                    user={currentUser} 
                    workouts={workouts}
                    logs={logs}
                    pinnedWods={pinnedWods}
                    onStartWorkout={handleStartWorkout} 
                    onStartDIY={handleStartDIY} 
                    onJoinPinned={handleJoinPinned}
                    onUnjoinPinned={handleUnjoinPinned}
                    onUnpinWOD={currentUser.is_admin ? handleUnpinWOD : undefined}
                    onAssignWorkout={handleAssignWorkout}
                    allUsers={allUsers}
                    collabWorkouts={userCollabs}
                    onOpenCollab={(collab) => {
                        setActiveCollab(collab);
                        setActiveTab('collab');
                    }}
                    // AI State (persisted across tab navigation)
                    aiTip={aiTip}
                    setAiTip={setAiTip}
                    loadingTip={loadingTip}
                    setLoadingTip={setLoadingTip}
                    suggestedWorkout={suggestedWorkout}
                    setSuggestedWorkout={setSuggestedWorkout}
                    isGeneratingWorkout={isGeneratingWorkout}
                    setIsGeneratingWorkout={setIsGeneratingWorkout}
                />
            )}
            
            {activeTab === 'leaderboard' && (
                <LeaderboardTab logs={logs} workouts={workouts} allUsers={allUsers} />
            )}
            
            {activeTab === 'inbox' && (
                <WitnessInbox 
                  notifications={notifications} 
                  currentUserId={currentUser.id} 
                  refreshData={refreshData}
                  onNavigateToHome={() => setActiveTab('home')}
                  onStartAssignedWorkout={handleStartAssignedWorkout}
                  onNavigateToCollab={async (collabId) => {
                    // Navigate to collab tab and open the specific collaboration
                    const collab = await DataService.getCollaborativeWorkout(collabId);
                    if (collab) {
                      setActiveCollab(collab);
                      setActiveTab('collab');
                    }
                  }}
                  onNavigateToProfile={() => setActiveTab('profile')}
                />
            )}

            {activeTab === 'admin' && (
                <AdminDashboard 
                    initialWorkouts={workouts} 
                    onUpdateWorkouts={handleUpdateWorkouts} 
                    initialVenues={venues}
                    onUpdateVenues={handleUpdateVenues}
                    currentUser={currentUser}
                    pendingCollabId={pendingCollabId}
                    onClearPendingCollab={() => setPendingCollabId(null)}
                />
            )}

            {/* COLLAB TAB - For all users to view/participate in collaborations */}
            {activeTab === 'collab' && (
                activeCollab ? (
                    <CollaborativeWorkoutBuilder
                        collabWorkout={activeCollab}
                        currentUser={currentUser}
                        allUsers={allUsers}
                        exercises={customExercises}
                        onBack={() => { 
                            setActiveCollab(null);
                            // Refresh collabs
                            DataService.getCollaborativeWorkouts(currentUser.id).then(setUserCollabs);
                        }}
                        onRefresh={async () => {
                            const updated = await DataService.getCollaborativeWorkout(activeCollab.id);
                            if (updated) setActiveCollab(updated);
                        }}
                    />
                ) : (
                    <div className={`p-5 pb-24 ${isKid ? 'bg-blue-50' : ''}`}>
                        <div className="mb-6">
                            <h1 className={`text-2xl font-black ${isKid ? 'text-blue-900' : 'text-white'} uppercase italic`}>Collaborations</h1>
                            <p className={`text-sm ${isKid ? 'text-blue-600' : 'text-slate-400'}`}>Build workouts together with your community</p>
                        </div>

                        {/* User Collab Restrictions Info */}
                        {!currentUser.is_admin && (() => {
                            const activeUserCollabs = userCollabs.filter(c => 
                                c.status === CollaborationStatus.ACTIVE && 
                                c.initiator_id === currentUser.id
                            );
                            const hasActiveCollab = activeUserCollabs.length > 0;
                            
                            return hasActiveCollab ? (
                                <div className={`mb-4 p-3 rounded-lg border ${isKid ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                                    <p className="text-xs font-bold">⚠️ You can only have 1 active collaboration at a time</p>
                                    <p className="text-[10px] mt-1 opacity-80">Complete or wait for your current collab to expire before starting a new one.</p>
                                </div>
                            ) : null;
                        })()}

                        {/* Start Collaboration Button for Users */}
                        {!currentUser.is_admin && (() => {
                            const activeUserCollabs = userCollabs.filter(c => 
                                c.status === CollaborationStatus.ACTIVE && 
                                c.initiator_id === currentUser.id
                            );
                            const canStartNew = activeUserCollabs.length === 0;
                            
                            return canStartNew ? (
                                <button
                                    onClick={async () => {
                                        const name = prompt('Enter a name for your collaboration:');
                                        if (!name) return;
                                        
                                        try {
                                            const newCollab = await DataService.createCollaborativeWorkout(
                                                currentUser,
                                                { name, description: '' },
                                                []
                                            );
                                            // Refresh collabs
                                            const collabs = await DataService.getCollaborativeWorkouts(currentUser.id);
                                            setUserCollabs(collabs);
                                            setActiveCollab(newCollab);
                                        } catch (error) {
                                            console.error('Error creating collaboration:', error);
                                            alert('Failed to create collaboration');
                                        }
                                    }}
                                    className={`w-full mb-4 py-3 ${isKid ? 'bg-blue-500 hover:bg-blue-400' : 'bg-purple-600 hover:bg-purple-500'} text-white font-bold uppercase rounded-xl flex items-center justify-center gap-2`}
                                >
                                    <UsersRound size={18} /> Start Collaboration (3-Day Limit)
                                </button>
                            ) : null;
                        })()}

                        {/* Admin: Link to Admin Panel */}
                        {currentUser.is_admin && (
                            <button
                                onClick={() => setActiveTab('admin')}
                                className="w-full mb-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase rounded-xl flex items-center justify-center gap-2"
                            >
                                <ShieldAlert size={18} /> Manage Collabs in Admin Panel
                            </button>
                        )}

                        {userCollabs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                <UsersRound size={64} className="opacity-30 mb-4" />
                                <p className="text-lg font-bold">No Collaborations Yet</p>
                                <p className="text-sm text-center mt-2">
                                    {currentUser.is_admin 
                                        ? "Use Admin Panel to create collaborations" 
                                        : "Start one above or wait for an invite!"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {userCollabs.map(collab => {
                                    // Calculate expiration info for user collabs
                                    const isExpiring = collab.expires_at && collab.status === CollaborationStatus.ACTIVE;
                                    const expiresIn = collab.expires_at ? Math.max(0, collab.expires_at - Date.now()) : 0;
                                    const hoursLeft = Math.floor(expiresIn / (1000 * 60 * 60));
                                    const daysLeft = Math.floor(hoursLeft / 24);
                                    
                                    return (
                                        <button
                                            key={collab.id}
                                            onClick={() => setActiveCollab(collab)}
                                            className={`w-full ${isKid ? 'bg-white border-blue-200 hover:border-blue-400' : 'bg-slate-900 border-slate-800 hover:border-purple-500/50'} border p-4 rounded-xl text-left transition-colors`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className={`font-bold ${isKid ? 'text-blue-900' : 'text-white'}`}>{collab.name}</h4>
                                                    <p className={`text-xs ${isKid ? 'text-blue-600' : 'text-slate-500'}`}>
                                                        {collab.initiator_id === currentUser.id ? 'You started this' : `By ${collab.initiator_name}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                                        collab.status === CollaborationStatus.ACTIVE 
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : collab.status === CollaborationStatus.FINALIZED
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {collab.status}
                                                    </span>
                                                    {isExpiring && (
                                                        <p className={`text-[10px] mt-1 ${hoursLeft < 24 ? 'text-red-400' : 'text-orange-400'}`}>
                                                            ⏰ {daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h` : `${hoursLeft}h`} left
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-4 text-xs ${isKid ? 'text-blue-500' : 'text-slate-400'}`}>
                                                <span className="flex items-center gap-1">
                                                    <Dumbbell size={12} /> {collab.components.length} exercises
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} /> {collab.collaborator_ids.length + 1} people
                                                </span>
                                                {!collab.initiator_is_admin && (
                                                    <span className="text-purple-400 text-[10px]">Community</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )
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
                                    <h3 className={`text-sm font-bold ${isKid ? 'text-blue-800' : 'text-slate-300'} uppercase tracking-wider`}>Personal Bests</h3>
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
                            
                            {/* Workout History Section */}
                            <div className={`mt-6 p-4 ${isKid ? 'bg-blue-50 border-blue-200' : 'bg-slate-900 border-slate-800'} rounded-lg border`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className={`text-sm font-bold ${isKid ? 'text-blue-800' : 'text-slate-300'} uppercase tracking-wider`}>Workout History</h3>
                                    <button onClick={() => refreshData()} className={`${isKid ? 'text-blue-500 hover:text-blue-700' : 'text-slate-500 hover:text-orange-500'} transition-colors`} title="Refresh History">
                                        <RotateCcw size={14} />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                    {(() => {
                                        // Get logs for current user (or all logs if admin)
                                        const userLogs = currentUser.is_admin 
                                            ? logs.sort((a, b) => b.timestamp - a.timestamp)
                                            : logs.filter(l => l.user_id === currentUser.id).sort((a, b) => b.timestamp - a.timestamp);
                                        
                                        if (userLogs.length === 0) {
                                            return (
                                                <div className={`text-center text-xs ${isKid ? 'text-blue-500' : 'text-slate-500'} italic py-4`}>
                                                    No workout history yet. Start logging workouts!
                                                </div>
                                            );
                                        }
                                        
                                        return userLogs.map(log => {
                                            const dateObj = new Date(log.timestamp);
                                            const dateDisplay = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                            const workout = workouts.find(w => w.id === log.workout_id);
                                            // Find user to get current name
                                            const logUser = allUsers.find(u => u.id === log.user_id);
                                            const displayName = logUser?.name || log.user_name;
                                            
                                            return (
                                                <div key={log.id} className={`p-3 ${isKid ? 'bg-white border-blue-200' : 'bg-slate-950 border-slate-800'} rounded border flex items-start justify-between gap-3`}>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className={`text-sm font-bold ${isKid ? 'text-blue-900' : 'text-white'} truncate`}>{log.workout_name}</h4>
                                                            {currentUser.is_admin && (
                                                                <span className={`text-[10px] ${isKid ? 'text-blue-600' : 'text-slate-400'} truncate`}>
                                                                    by {displayName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`text-lg font-mono font-bold ${isKid ? 'text-blue-800' : 'text-orange-500'} mb-1`}>
                                                            {log.score_display}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 items-center text-[10px]">
                                                            <span className={`${isKid ? 'text-blue-600' : 'text-slate-400'} flex items-center gap-1`}>
                                                                <Calendar size={10} /> {dateDisplay}
                                                            </span>
                                                            <span className={`${isKid ? 'text-blue-600' : 'text-slate-400'} flex items-center gap-1 truncate max-w-[120px]`} title={log.location}>
                                                                <MapPin size={10} /> {log.location}
                                                            </span>
                                                            <span className={`${isKid ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-800 text-slate-400 border-slate-700'} border px-1.5 py-0.5 rounded`}>
                                                                {log.difficulty_tier}
                                                            </span>
                                                            {log.verification_status === VerificationStatus.VERIFIED && (
                                                                <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                                                    <Check size={10} /> Verified
                                                                </span>
                                                            )}
                                                        </div>
                                                        {log.notes && (
                                                            <p className={`text-[10px] ${isKid ? 'text-blue-600' : 'text-slate-500'} italic mt-2 line-clamp-2`}>
                                                                "{log.notes}"
                                                            </p>
                                                        )}
                                                        {/* Witness Selection */}
                                                        <div className={`mt-3 pt-2 border-t ${isKid ? 'border-blue-200' : 'border-slate-700'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] ${isKid ? 'text-blue-600' : 'text-slate-400'} font-bold`}>Witness:</span>
                                                                <select
                                                                    value={log.witness_id || ''}
                                                                    onChange={async (e) => {
                                                                        const newWitnessId = e.target.value || null;
                                                                        try {
                                                                            await DataService.updateLogWitness(log.id, newWitnessId);
                                                                            refreshData();
                                                                        } catch (error) {
                                                                            console.error('Error updating witness:', error);
                                                                            alert('Failed to update witness. Please try again.');
                                                                        }
                                                                    }}
                                                                    className={`flex-1 text-[10px] ${isKid ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-800 border-slate-700 text-white'} border rounded px-2 py-1 outline-none`}
                                                                >
                                                                    <option value="">No Witness (Unverified)</option>
                                                                    {allUsers
                                                                        .filter(u => u.id !== log.user_id && !u.is_admin)
                                                                        .map(u => (
                                                                            <option key={u.id} value={u.id}>
                                                                                {u.name} {log.witness_id === u.id ? '(Current)' : ''}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                            </div>
                                                            {log.witness_name && (
                                                                <p className={`text-[10px] ${isKid ? 'text-blue-600' : 'text-slate-400'} mt-1`}>
                                                                    Verified by: {log.witness_name}
                                                                </p>
                                                            )}
                                                            {log.witness_id && !log.witness_name && log.verification_status === VerificationStatus.PENDING && (
                                                                <p className={`text-[10px] ${isKid ? 'text-blue-500' : 'text-orange-400'} mt-1 italic`}>
                                                                    Awaiting verification...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 shrink-0">
                            <button 
                                                            onClick={async () => {
                                                                if (confirm(`Delete this workout log? This will remove it from the leaderboard.`)) {
                                                                    try {
                                                                        await DataService.deleteLog(log.id);
                                                                        refreshData();
                                                                    } catch (error) {
                                                                        console.error('Error deleting log:', error);
                                                                        alert('Failed to delete workout log. Please try again.');
                                                                    }
                                                                }
                                                            }}
                                                            className={`p-2 ${isKid ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-red-400 hover:text-red-300 hover:bg-red-500/20'} rounded transition-colors`}
                                                            title="Delete Workout Log"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
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
                                                : (avatarPrompt ? getAvatarUrl(avatarStyle || 'avataaars', avatarPrompt) : (editProfileForm.avatar_url || ''))
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
                                             <option value="">-</option>
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
                                    <label className={`text-[10px] font-bold ${isKid ? 'text-blue-600' : 'text-slate-500'} uppercase block mb-1`}>Gender</label>
                                    <select 
                                        className={`w-full ${isKid ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white'} border rounded px-3 py-2 text-sm outline-none`}
                                        value={editProfileForm.gender}
                                        onChange={e => setEditProfileForm({...editProfileForm, gender: e.target.value as Gender})}
                                    >
                                        {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
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
                                    disabled={isUploadingAvatar}
                                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg uppercase text-xs hover:bg-green-500 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploadingAvatar ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Uploading...
                                        </>
                                    ) : (
                                        <>
                                    <Save size={16} /> Save
                                        </>
                                    )}
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
            notificationCount={notifications.filter(n => !n.read).length}
            collabCount={userCollabs.filter(c => c.status === 'active').length}
          />
      )}
    </div>
  );
};

export default App;
