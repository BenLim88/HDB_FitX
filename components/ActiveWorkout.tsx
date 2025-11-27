
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Square, CheckCircle, SkipForward, Timer, Volume2, VolumeX, X as XIcon, Save, Info, List, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, MapPin, Settings, Trash2 } from 'lucide-react';
import { Workout, ScalingTier, Log, VerificationStatus, User, Venue, Exercise } from '../types';
import { DataService } from '../services/dataService';
import { MOCK_EXERCISES } from '../constants';

interface ActiveWorkoutProps {
  workout: Workout;
  currentUser: User;
  allUsers: User[];
  venues: Venue[];
  exercises?: Exercise[]; // Custom exercises from Firestore (for collaboration workouts)
  onComplete: () => void;
  onExit: () => void;
}

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ workout, currentUser, allUsers, venues, exercises = [], onComplete, onExit }) => {
  // Mode State
  const [isStarted, setIsStarted] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showLogWithoutTimer, setShowLogWithoutTimer] = useState(false);

  // Global Workout State
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeComponentIndex, setActiveComponentIndex] = useState(0);
  const [showFinishScreen, setShowFinishScreen] = useState(false);
  
  // Configuration State
  const [selectedTier, setSelectedTier] = useState<ScalingTier>(ScalingTier.RX);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false); // Combined collapse state
  
  // Venue State
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [customVenueName, setCustomVenueName] = useState('');

  // Rest Timer State
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Finish Form State
  const [selectedWitness, setSelectedWitness] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  
  // Manual Log State (for logging without timer)
  const [manualTimeMinutes, setManualTimeMinutes] = useState('');
  const [manualTimeSeconds, setManualTimeSeconds] = useState('');
  
  // Street Lift (1RM) State
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg'); // kg or lbs
  
  // Max Reps State
  const [maxRepsInput, setMaxRepsInput] = useState('');

  // Refs
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Expand components based on workout.rounds
  // Each round repeats all the workout components
  const totalRounds = workout.rounds || 1;
  const expandedComponents = useMemo(() => {
    const components = [];
    for (let round = 1; round <= totalRounds; round++) {
      workout.components.forEach((comp, idx) => {
        components.push({
          ...comp,
          _roundNumber: round,
          _originalIndex: idx
        });
      });
    }
    return components;
  }, [workout.components, totalRounds]);

  // Calculate current round based on active component index
  const currentRound = useMemo(() => {
    if (expandedComponents.length === 0) return 1;
    return expandedComponents[activeComponentIndex]?._roundNumber || 1;
  }, [activeComponentIndex, expandedComponents]);

  // Helper to find exercise from both MOCK_EXERCISES and custom exercises
  const findExercise = (exerciseId: string) => {
    return MOCK_EXERCISES.find(e => e.id === exerciseId) || 
           exercises.find(e => e.id === exerciseId) ||
           null;
  };

  // Initialize Audio Context
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playBeep = async (freq: number = 440, duration: number = 0.1, type: OscillatorType = 'sine') => {
    if (!audioEnabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Ensure context is running (browsers suspend it by default until user interaction)
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const toggleAudio = async () => {
      // If turning ON, play a test beep
      const newState = !audioEnabled;
      setAudioEnabled(newState);
      
      if (newState && audioContextRef.current) {
          if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
          }
          playBeep(880, 0.15, 'sine'); // High pitch "Ping"
      }
  };

  // Main Workout Timer
  useEffect(() => {
    if (isPlaying && !isResting) {
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isResting]);

  // --- REST TIMER LOGIC ---

  // 1. Timer Tick Effect
  useEffect(() => {
    let restInterval: number;
    
    if (isResting && workout.rest_type === 'fixed') {
      restInterval = window.setInterval(() => {
        setRestTimeRemaining(prev => {
            // Audio Cues
            if (prev <= 4 && prev > 1) playBeep(600, 0.1); // Countdown beeps
            if (prev === 1) playBeep(800, 0.5, 'square'); // Final beep

            // Decrement
            if (prev <= 0) return 0;
            return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(restInterval);
  }, [isResting, workout.rest_type]);

  // 2. Completion Watcher Effect
  useEffect(() => {
    if (isResting && restTimeRemaining <= 0 && workout.rest_type === 'fixed') {
        finishRest();
    }
  }, [restTimeRemaining, isResting, workout.rest_type]);

  const finishRest = () => {
      setIsResting(false);
      setIsPlaying(true); // Auto-resume workout
      playBeep(1000, 0.2, 'sine'); // Go beep
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const startRest = (seconds: number) => {
    setIsPlaying(false);
    setRestTimeRemaining(seconds);
    setIsResting(true);
  };

  const skipRest = () => {
    setRestTimeRemaining(0);
    setIsResting(false);
    setIsPlaying(true);
    playBeep(1000, 0.1);
  };

  const handleNext = () => {
    // Transition Sound
    playBeep(600, 0.1);

    if (activeComponentIndex < expandedComponents.length - 1) {
      const restType = workout.rest_type || 'fixed';
      const restDuration = workout.rest_seconds || 60;

      setActiveComponentIndex(prev => prev + 1);

      if (restType === 'none') {
          setIsPlaying(true);
      } else if (restType === 'manual') {
          setIsResting(true);
          setRestTimeRemaining(0); 
          setIsPlaying(false);
      } else {
          startRest(restDuration);
      }
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    setIsPlaying(false);
    setShowFinishScreen(true);
    playBeep(523.25, 0.1); // C5
    setTimeout(() => playBeep(659.25, 0.1), 150); // E5
    setTimeout(() => playBeep(783.99, 0.4), 300); // G5
  };

  const handleSubmit = async (manualTime?: number, manualWeight?: string) => {
    setIsSubmitting(true);
    
    // Determine Final Location String
    let locationString = 'Unknown';
    if (selectedVenueId) {
        const venue = venues.find(v => v.id === selectedVenueId);
        if (venue) {
            if ((venue.type === 'Commercial' || venue.type === 'Other' || venue.type === 'Home') && customVenueName) {
                locationString = `${venue.name}: ${customVenueName}`;
            } else {
                locationString = venue.name;
            }
        }
    }

    // Check if this is a Street Lift (1RM) workout or Max Reps workout
    const isStreetLift = workout.category === 'Street Lift' || workout.scheme === WorkoutScheme.ONE_RM;
    const isMaxReps = workout.scheme === WorkoutScheme.MAX_REPS;
    
    let finalTimeSeconds: number;
    let scoreDisplay: string;
    
    if (isStreetLift) {
      // For Street Lift, use weight instead of time
      const finalWeight = manualWeight || weightInput;
      if (!finalWeight) {
        alert("Please enter your 1RM weight.");
        setIsSubmitting(false);
        return;
      }
      // Use a placeholder time (0 or 1 second) since it's weight-based
      finalTimeSeconds = 1;
      scoreDisplay = `${finalWeight}${weightUnit}`;
    } else if (isMaxReps) {
      // For Max Reps, use reps count instead of time
      const finalReps = manualWeight || maxRepsInput; // reusing manualWeight param for reps
      if (!finalReps) {
        alert("Please enter your max reps.");
        setIsSubmitting(false);
        return;
      }
      // Use a placeholder time since it's reps-based
      finalTimeSeconds = 1;
      scoreDisplay = `${finalReps} reps`;
    } else {
      // Use manual time if provided, otherwise use elapsed time
      finalTimeSeconds = manualTime !== undefined ? manualTime : elapsedSeconds;
      scoreDisplay = formatTime(finalTimeSeconds);
    }

    try {
      await DataService.saveLog({
        user_id: currentUser.id,
        workout_id: workout.id,
        timestamp: Date.now(),
        location: locationString,
        total_time_seconds: finalTimeSeconds,
        score_display: scoreDisplay,
        notes,
        difficulty_tier: selectedTier,
        verification_status: selectedWitness ? VerificationStatus.PENDING : VerificationStatus.UNVERIFIED,
        witness_id: selectedWitness || null
      });
      onComplete();
    } catch (e) {
      alert("Error saving workout.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDiscard = () => {
    setShowDiscardConfirm(true);
  };
  
  const confirmDiscard = () => {
    onExit();
  };
  
  const cancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  const handleLogWithoutTimer = () => {
    if (!selectedVenueId) {
      alert("Please select a deployment location first.");
      return;
    }
    setShowLogWithoutTimer(true);
  };

  const handleSubmitManualLog = () => {
    const isStreetLift = workout.category === 'Street Lift' || workout.scheme === WorkoutScheme.ONE_RM;
    const isMaxReps = workout.scheme === WorkoutScheme.MAX_REPS;
    
    if (isStreetLift) {
      // For Street Lift, use weight input
      if (!weightInput) {
        alert("Please enter your 1RM weight.");
        return;
      }
      handleSubmit(undefined, weightInput);
    } else if (isMaxReps) {
      // For Max Reps, use reps input
      if (!maxRepsInput) {
        alert("Please enter your max reps.");
        return;
      }
      handleSubmit(undefined, maxRepsInput);
    } else {
      // Parse manual time input
      const minutes = parseInt(manualTimeMinutes) || 0;
      const seconds = parseInt(manualTimeSeconds) || 0;
      const totalSeconds = (minutes * 60) + seconds;

      if (totalSeconds === 0) {
        alert("Please enter a valid time.");
        return;
      }

      handleSubmit(totalSeconds);
    }
  };

  const startMission = async () => {
      if (!selectedVenueId) {
          alert("Please select a deployment location first.");
          return;
      }

      // Ensure audio is unlocked on user interaction
      if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
      }
      playBeep(600, 0.1); // Start beep
      setIsStarted(true);
      setIsPlaying(true); // Auto start timer on mission start
  };

  const handleQuitClick = () => {
      setIsPlaying(false); // Pause
      setShowQuitModal(true);
  };

  const confirmQuit = () => {
      onExit();
  };

  const cancelQuit = () => {
      setShowQuitModal(false);
      if (!isResting && !showFinishScreen) {
          setIsPlaying(true); // Resume only if not in rest or finished
      }
  };

  const currentComponent = expandedComponents[activeComponentIndex];
  const exerciseDetail = currentComponent ? findExercise(currentComponent.exercise_id) : null;

  // --- SCREEN 1A: MANUAL LOG FORM ---
  if (showLogWithoutTimer && !isStarted && !showFinishScreen) {
    const selectedVenue = venues.find(v => v.id === selectedVenueId);
    const showCustomInput = selectedVenue && (selectedVenue.type === 'Commercial' || selectedVenue.type === 'Other' || selectedVenue.type === 'Home');
    const isStreetLift = workout.category === 'Street Lift' || workout.scheme === WorkoutScheme.ONE_RM;
    const isMaxReps = workout.scheme === WorkoutScheme.MAX_REPS;

    return (
      <div className="h-full flex flex-col bg-slate-950 text-white p-5 relative pb-24">
        <button onClick={() => setShowLogWithoutTimer(false)} className="absolute top-5 right-5 text-slate-500 hover:text-white z-50">
          <XIcon size={24} />
        </button>
        
        <h2 className="text-2xl font-black uppercase italic mb-6">Log Workout</h2>
        <p className="text-slate-400 text-sm mb-6">
          {isStreetLift 
            ? 'Log your 1 Rep Max weight result. Perfect for workouts completed on a separate device.'
            : isMaxReps
            ? 'Log your maximum reps achieved. Perfect for workouts completed on a separate device.'
            : 'Log your workout result without using the timer. Perfect for workouts completed on a separate device.'}
        </p>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {isStreetLift ? (
            /* Weight Input for Street Lift */
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1 Rep Max Weight</label>
              <div className="flex gap-2 items-center w-full">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded p-3 text-white text-2xl font-mono font-bold text-center outline-none"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded p-3 text-white text-lg font-bold outline-none shrink-0"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
              {weightInput && (
                <p className="text-sm text-orange-500 font-bold mt-2 text-center">
                  Recorded: {weightInput}{weightUnit}
                </p>
              )}
            </div>
          ) : isMaxReps ? (
            /* Reps Input for Max Reps Workouts */
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Maximum Reps Achieved</label>
              <div className="flex gap-2 items-center w-full">
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={maxRepsInput}
                  onChange={(e) => setMaxRepsInput(e.target.value)}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded p-3 text-white text-2xl font-mono font-bold text-center outline-none"
                />
                <span className="bg-slate-950 border border-slate-800 rounded p-3 text-white text-lg font-bold shrink-0">
                  reps
                </span>
              </div>
              {maxRepsInput && (
                <p className="text-sm text-purple-500 font-bold mt-2 text-center">
                  Recorded: {maxRepsInput} reps
                </p>
              )}
            </div>
          ) : (
            /* Time Input for Regular Workouts */
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Completion Time</label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Minutes"
                    value={manualTimeMinutes}
                    onChange={(e) => setManualTimeMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-lg font-mono outline-none text-center"
                  />
                  <p className="text-[10px] text-slate-500 text-center mt-1">Minutes</p>
                </div>
                <span className="text-2xl font-bold text-slate-500">:</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Seconds"
                    value={manualTimeSeconds}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                        setManualTimeSeconds(val);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-lg font-mono outline-none text-center"
                  />
                  <p className="text-[10px] text-slate-500 text-center mt-1">Seconds</p>
                </div>
              </div>
              {manualTimeMinutes || manualTimeSeconds ? (
                <p className="text-sm text-orange-500 font-bold mt-2 text-center">
                  Total: {formatTime((parseInt(manualTimeMinutes) || 0) * 60 + (parseInt(manualTimeSeconds) || 0))}
                </p>
              ) : null}
            </div>
          )}

          {/* Tier Display */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Completed Tier</label>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded text-white font-bold text-sm">
              {selectedTier}
            </div>
          </div>

          {/* Venue Display/Edit */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <MapPin size={12} /> Deployment Location
            </label>
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-sm outline-none mb-2"
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
            >
              <option value="">-- Select Training Venue --</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.type})</option>)}
            </select>
            
            {showCustomInput && (
              <input 
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                placeholder="Enter specific location name..."
                value={customVenueName}
                onChange={(e) => setCustomVenueName(e.target.value)}
              />
            )}
          </div>

          {/* Witness */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Witness (Optional)</label>
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-sm outline-none"
              value={selectedWitness}
              onChange={(e) => setSelectedWitness(e.target.value)}
            >
              <option value="">No Witness (Unverified)</option>
              {allUsers.filter(u => u.id !== currentUser.id).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {selectedWitness && <p className="text-[10px] text-green-500 mt-1">Verification request will be sent.</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
            <textarea 
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-sm outline-none"
              placeholder="How did it feel?"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={handleSubmitManualLog}
          disabled={isSubmitting || !selectedVenueId || (isStreetLift ? !weightInput : (!manualTimeMinutes && !manualTimeSeconds))}
          className="mt-4 w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase italic tracking-wider rounded-lg shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} /> {isSubmitting ? 'Saving...' : 'Log Result'}
        </button>
      </div>
    );
  }

  // --- SCREEN 1: MISSION BRIEFING (PREVIEW) ---
  if (!isStarted && !showFinishScreen && !showLogWithoutTimer) {
      const selectedVenue = venues.find(v => v.id === selectedVenueId);
      const showCustomInput = selectedVenue && (selectedVenue.type === 'Commercial' || selectedVenue.type === 'Other' || selectedVenue.type === 'Home');

      return (
        <div className="h-full flex flex-col bg-slate-950 text-white p-5 relative pb-24">
            {/* Header */}
            <div className="mb-4 shrink-0">
                <button onClick={onExit} className="absolute top-5 right-5 text-slate-500 hover:text-white z-50">
                    <XIcon size={24} />
                </button>
                <p className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-1">Mission Briefing</p>
                <h1 className="text-3xl font-black uppercase italic leading-tight">{workout.name}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                    <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded border border-slate-800">{workout.scheme}</span>
                    {workout.time_cap_seconds && (
                         <span className="bg-slate-900 text-slate-300 text-[10px] font-bold px-2 py-1 rounded border border-slate-800 flex items-center gap-1">
                            <Timer size={10} /> {workout.time_cap_seconds / 60} MIN CAP
                         </span>
                    )}
                     <span className="bg-slate-900 text-slate-300 text-[10px] font-bold px-2 py-1 rounded border border-slate-800">
                         Rest: {workout.rest_type === 'none' ? 'None' : workout.rest_type === 'manual' ? 'Manual' : `${workout.rest_seconds}s`}
                     </span>
                </div>
                <p className="text-slate-400 text-sm mt-4 leading-relaxed line-clamp-2">{workout.description}</p>
            </div>

            {/* Combined Config Panel (Collapsible) */}
            <div className="mb-4 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shrink-0">
                 <button 
                    onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                    className="w-full p-3 flex items-center justify-between bg-slate-900 hover:bg-slate-800/50 transition-colors"
                 >
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${!selectedVenueId ? 'bg-orange-900/20 text-orange-500 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                            <Settings size={16} />
                        </div>
                        <div className="text-left">
                             <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Config</div>
                             <div className="text-xs text-white font-bold flex items-center gap-1">
                                <span className={selectedTier === ScalingTier.RX ? "text-orange-500" : "text-white"}>{selectedTier}</span>
                                <span className="text-slate-600">•</span>
                                <span className={!selectedVenueId ? "text-orange-500 italic" : "text-slate-300"}>
                                    {selectedVenue?.name || 'Select Location'}
                                </span>
                             </div>
                        </div>
                    </div>
                    {isConfigExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                 </button>
                
                {isConfigExpanded && (
                    <div className="p-3 pt-0 border-t border-slate-800/50 mt-2 animate-in slide-in-from-top-2 duration-200 space-y-3">
                        
                        {/* 1. Difficulty Selector */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Difficulty Tier</label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {Object.values(ScalingTier).map((tier) => (
                                    <button
                                        key={tier}
                                        onClick={() => setSelectedTier(tier)}
                                        className={`py-2 px-1 text-[10px] font-bold rounded border uppercase ${selectedTier === tier ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-800'}`}
                                    >
                                        {tier === ScalingTier.BEGINNER ? 'Beg' : tier === ScalingTier.INTERMEDIATE ? 'Int' : tier === ScalingTier.ADVANCED ? 'Adv' : 'RX'}
                                    </button>
                                ))}
                            </div>
                            <div className="text-xs text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 border-l-2 border-l-orange-500">
                                <span className="font-bold text-orange-500 uppercase text-[10px] mr-1">{selectedTier}:</span>
                                {workout.scaling?.[selectedTier] || "No specific scaling instructions."}
                            </div>
                        </div>

                        {/* 2. Venue Selector */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <MapPin size={12} /> Deployment Location
                            </label>
                            <select 
                                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none mb-2"
                                value={selectedVenueId}
                                onChange={(e) => setSelectedVenueId(e.target.value)}
                            >
                                <option value="">-- Select Training Venue --</option>
                                {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.type})</option>)}
                            </select>
                            
                            {showCustomInput && (
                                <input 
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs outline-none"
                                    placeholder="Enter specific location name..."
                                    value={customVenueName}
                                    onChange={(e) => setCustomVenueName(e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Exercise List (Takes remaining space) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4 custom-scrollbar min-h-0">
                <div className="flex items-center justify-between text-slate-500 font-bold text-xs uppercase mb-1 sticky top-0 bg-slate-950 py-2 z-10">
                    <div className="flex items-center gap-2">
                        <List size={14} /> Mission Parameters
                    </div>
                    {totalRounds > 1 && (
                        <span className="text-orange-500">{totalRounds} Rounds</span>
                    )}
                </div>
                {expandedComponents.map((comp, idx) => {
                     const ex = findExercise(comp.exercise_id);
                     const isNewRound = idx === 0 || expandedComponents[idx - 1]._roundNumber !== comp._roundNumber;
                     return (
                         <React.Fragment key={idx}>
                             {totalRounds > 1 && isNewRound && (
                                 <div className="flex items-center gap-2 mt-3 mb-1">
                                     <div className="h-px flex-1 bg-orange-500/30"></div>
                                     <span className="text-orange-500 text-[10px] font-bold uppercase">Round {comp._roundNumber}</span>
                                     <div className="h-px flex-1 bg-orange-500/30"></div>
                                 </div>
                             )}
                             <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg flex items-center gap-3">
                                 <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center font-mono font-bold text-slate-500 text-[10px] shrink-0">
                                     {comp._originalIndex + 1}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <h4 className="font-bold text-sm text-white truncate">{ex?.name}</h4>
                                     <div className="flex gap-2 mt-0.5">
                                         <span className="text-orange-500 text-xs font-bold">{comp.target}</span>
                                         {comp.weight && <span className="text-slate-500 text-xs font-bold">@ {comp.weight}</span>}
                                     </div>
                                 </div>
                             </div>
                         </React.Fragment>
                     )
                })}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 shrink-0">
                <button 
                    onClick={startMission}
                    disabled={!selectedVenueId}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic tracking-wider rounded-xl shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 animate-pulse disabled:opacity-50 disabled:animate-none"
                >
                    <Play size={20} fill="currentColor" /> Start Mission
                </button>
                
                <button 
                    onClick={handleLogWithoutTimer}
                    disabled={!selectedVenueId}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase text-xs tracking-wider rounded-lg border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Save size={16} /> Log Without Timer
                </button>
            </div>
        </div>
      )
  }

  // --- SCREEN 2: MISSION DEBRIEF (FINISH) ---
  if (showFinishScreen) {
    const isStreetLift = workout.category === 'Street Lift' || workout.scheme === WorkoutScheme.ONE_RM;
    const isMaxReps = workout.scheme === WorkoutScheme.MAX_REPS;
    
    return (
      <div className="h-full flex flex-col p-6 pb-24 relative">
         {/* Discard Confirmation Modal */}
         {showDiscardConfirm && (
           <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
               <div className="flex justify-center mb-4 text-red-500">
                 <AlertTriangle size={48} strokeWidth={1.5} />
               </div>
               <h3 className="text-xl font-black text-white text-center uppercase italic">Discard Result?</h3>
               <p className="text-slate-400 text-center text-sm mt-2 mb-6">This workout result will not be saved. Are you sure you want to discard?</p>
               <div className="flex gap-3">
                 <button onClick={cancelDiscard} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-lg uppercase text-xs hover:bg-slate-700">Cancel</button>
                 <button onClick={confirmDiscard} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg uppercase text-xs hover:bg-red-500">Discard</button>
               </div>
             </div>
           </div>
         )}
         
         <h2 className="text-3xl font-black text-white italic uppercase mb-6 text-center">Mission Complete</h2>
         
         {isStreetLift ? (
           // Street Lift (1RM) - Show Weight Input
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-6">
             <label className="block text-slate-400 text-sm font-bold uppercase mb-3">1 Rep Max Weight</label>
             <div className="flex gap-2 items-center w-full">
               <input
                 type="number"
                 step="0.5"
                 min="0"
                 placeholder="0"
                 value={weightInput}
                 onChange={(e) => setWeightInput(e.target.value)}
                 className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded p-4 text-white text-3xl font-mono font-bold text-center outline-none focus:border-orange-500"
               />
               <select
                 value={weightUnit}
                 onChange={(e) => setWeightUnit(e.target.value)}
                 className="bg-slate-950 border border-slate-800 rounded p-4 text-white text-lg font-bold outline-none focus:border-orange-500 shrink-0"
               >
                 <option value="kg">kg</option>
                 <option value="lbs">lbs</option>
               </select>
             </div>
             {weightInput && (
               <p className="text-sm text-orange-500 font-bold mt-3 text-center">
                 Recorded: {weightInput}{weightUnit}
               </p>
             )}
           </div>
         ) : isMaxReps ? (
           // Max Reps - Show Reps Input
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-6">
             <label className="block text-slate-400 text-sm font-bold uppercase mb-3">Maximum Reps Achieved</label>
             <div className="flex gap-2 items-center w-full">
               <input
                 type="number"
                 step="1"
                 min="0"
                 placeholder="0"
                 value={maxRepsInput}
                 onChange={(e) => setMaxRepsInput(e.target.value)}
                 className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded p-4 text-white text-3xl font-mono font-bold text-center outline-none focus:border-purple-500"
               />
               <span className="bg-slate-950 border border-slate-800 rounded p-4 text-white text-lg font-bold shrink-0">
                 reps
               </span>
             </div>
             {maxRepsInput && (
               <p className="text-sm text-purple-500 font-bold mt-3 text-center">
                 Recorded: {maxRepsInput} reps
               </p>
             )}
           </div>
         ) : (
           // Regular Workout - Show Time
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center mb-6">
             <p className="text-slate-400 text-sm font-bold uppercase">Total Time</p>
             <p className="text-4xl font-mono text-orange-500 font-bold mt-2">{formatTime(elapsedSeconds)}</p>
           </div>
         )}

         <div className="space-y-4 flex-1 overflow-y-auto">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Completed Tier</label>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded text-white font-bold text-sm">
                    {selectedTier}
                </div>
                <p className="text-slate-400 text-[10px] mt-1">Tier selected during briefing.</p>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Witness (Optional)</label>
                <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-sm outline-none"
                    value={selectedWitness}
                    onChange={(e) => setSelectedWitness(e.target.value)}
                >
                    <option value="">No Witness (Unverified)</option>
                    {allUsers.filter(u => u.id !== currentUser.id).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
                {selectedWitness && <p className="text-[10px] text-green-500 mt-1">Verification request will be sent.</p>}
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea 
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-sm outline-none"
                    placeholder="How did it feel?"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>
         </div>

         <div className="flex gap-3 mt-4">
           <button 
             onClick={handleDiscard}
             className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase italic tracking-wider rounded-lg flex items-center justify-center gap-2"
           >
             <Trash2 size={20} /> Discard
           </button>
           <button 
             onClick={() => handleSubmit(undefined, weightInput)}
             disabled={isSubmitting || (isStreetLift && !weightInput)}
             className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase italic tracking-wider rounded-lg shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
           >
             <Save size={20} /> {isSubmitting ? 'Saving...' : 'Log Result'}
           </button>
         </div>
      </div>
    )
  }

  // --- SCREEN 3: ACTIVE TIMER ---
  return (
    <div className={`h-full flex flex-col relative transition-colors duration-500 ${isResting ? 'bg-slate-900' : ''}`}>
      
      {/* Custom Quit Modal */}
      {showQuitModal && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                  <div className="flex justify-center mb-4 text-red-500">
                      <AlertTriangle size={48} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-black text-white text-center uppercase italic">Abort Mission?</h3>
                  <p className="text-slate-400 text-center text-sm mt-2 mb-6">Your current progress will be lost and the workout will be discarded.</p>
                  <div className="flex gap-3">
                      <button onClick={cancelQuit} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-lg uppercase text-xs hover:bg-slate-700">Resume</button>
                      <button onClick={confirmQuit} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg uppercase text-xs hover:bg-red-500">Quit</button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-950 z-10">
        <div>
            <h2 className="text-white font-bold text-sm">{workout.name}</h2>
            <div className="flex gap-2">
                <span className="text-orange-500 text-[10px] font-bold uppercase border border-orange-500/30 px-1 rounded">{workout.scheme}</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase border border-slate-700 px-1 rounded">{selectedTier}</span>
            </div>
        </div>
        <div className="flex gap-3 items-center">
             <button onClick={toggleAudio} className={`transition-colors ${audioEnabled ? 'text-orange-500' : 'text-slate-500'}`}>
                {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
             </button>
             <button 
                onClick={handleQuitClick} 
                className="text-red-500 hover:text-red-400 font-bold border border-red-500/30 rounded px-2 py-1 text-xs flex items-center gap-1 active:scale-95 transition-transform cursor-pointer z-50"
            >
                <XIcon size={14} /> QUIT
             </button>
        </div>
      </header>

      {/* Main Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
         
         {/* Rest Overlay */}
         {isResting && (
             <div className={`absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 ${workout.rest_type === 'fixed' && restTimeRemaining <= 3 ? 'animate-pulse bg-red-900/20' : ''}`}>
                 <p className="text-slate-400 uppercase tracking-widest font-bold text-sm mb-4">Rest & Recover</p>
                 
                 {workout.rest_type === 'fixed' ? (
                     <>
                         <div className="text-8xl font-black text-white font-mono">{restTimeRemaining}</div>
                         <div className="flex gap-4 mt-8">
                            <button onClick={() => setRestTimeRemaining(t => Math.max(0, t - 10))} className="px-4 py-2 bg-slate-800 rounded text-white text-xs font-bold border border-slate-700 active:bg-slate-700">-10s</button>
                            <button onClick={() => setRestTimeRemaining(t => t + 10)} className="px-4 py-2 bg-slate-800 rounded text-white text-xs font-bold border border-slate-700 active:bg-slate-700">+10s</button>
                            <button onClick={skipRest} className="px-6 py-2 bg-orange-600 rounded text-white text-xs font-bold flex items-center gap-2 hover:bg-orange-500 active:scale-95"><SkipForward size={16} /> Skip</button>
                         </div>
                     </>
                 ) : (
                     <div className="flex flex-col items-center">
                        <div className="text-4xl font-black text-white italic uppercase mb-6">Manual Rest</div>
                        <button onClick={skipRest} className="px-8 py-4 bg-orange-600 rounded-full text-white font-bold text-lg shadow-lg shadow-orange-900/40 animate-pulse">
                            READY FOR NEXT SET
                        </button>
                     </div>
                 )}
             </div>
         )}

         <div className="mb-8 w-full flex flex-col items-center">
            <p className="text-slate-500 font-bold uppercase text-sm tracking-wider mb-2">Current Movement</p>
            <h1 className="text-4xl font-black text-white uppercase italic leading-tight mb-2">
                {activeComponentIndex + 1}. {exerciseDetail?.name || 'Exercise'}
            </h1>
            <p className="text-2xl text-orange-500 font-bold">{currentComponent.target}</p>
            {currentComponent.weight && (
                <p className="text-lg text-orange-400 font-bold mt-1 bg-orange-900/20 inline-block px-3 py-1 rounded border border-orange-500/30">
                    @ {currentComponent.weight}
                </p>
            )}
            
            {/* NON-RX SCALING REMINDER */}
            {selectedTier !== ScalingTier.RX && workout.scaling?.[selectedTier] && (
                 <div className="mt-4 px-4 py-2 bg-slate-800/80 rounded-lg border border-slate-700 inline-block max-w-xs backdrop-blur-sm animate-in slide-in-from-bottom-2">
                     <span className="text-[10px] text-orange-400 font-bold uppercase block mb-0.5 tracking-wider">
                         {selectedTier} Modification
                     </span>
                     <span className="text-sm text-slate-200 font-medium">
                         {workout.scaling[selectedTier]}
                     </span>
                 </div>
            )}
         </div>

         <div className="bg-slate-900/50 border border-slate-800 rounded-full w-64 h-64 flex items-center justify-center mb-8 relative">
             {isPlaying && <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 animate-ping"></div>}
             <div className="text-6xl font-mono font-bold text-white tabular-nums">
                {formatTime(elapsedSeconds)}
             </div>
         </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-slate-950 border-t border-slate-800">
         <div className="flex items-center justify-between gap-4">
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 py-4 rounded-xl font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all ${isPlaying ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'}`}
            >
                {isPlaying ? <><Pause size={24} /> Pause</> : <><Play size={24} /> Start</>}
            </button>
            
            <button 
                onClick={handleNext}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase italic tracking-wider flex items-center justify-center gap-2"
            >
                {activeComponentIndex === expandedComponents.length - 1 ? 'Finish' : 'Next Set'} <ChevronRightIcon size={24} />
            </button>
         </div>
         
         <div className="mt-4 flex justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Progress: {activeComponentIndex + 1} / {expandedComponents.length}{totalRounds > 1 ? ` (Round ${currentRound}/${totalRounds})` : ''}</span>
            <span>Next: {expandedComponents[activeComponentIndex + 1] ? findExercise(expandedComponents[activeComponentIndex + 1].exercise_id)?.name : 'Finish'}</span>
         </div>
      </div>
    </div>
  );
};

// Helper Icon
const ChevronRightIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export default ActiveWorkout;
