
import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Trash2, Wand2, X, Clock, AlertTriangle, Dumbbell, Flag, ChevronDown, ChevronUp, SkipForward, Layers } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { MOCK_EXERCISES } from '../constants';

interface DIYComponent {
    id: string;
    name: string;
    target: string;
    weight?: string;
    sets: number;
}

interface DIYWorkoutProps {
    onExit: () => void;
}

const DIYWorkout: React.FC<DIYWorkoutProps> = ({ onExit }) => {
    const [mode, setMode] = useState<'setup' | 'active'>('setup');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Setup State
    const [components, setComponents] = useState<DIYComponent[]>([]);
    const [selectedExId, setSelectedExId] = useState<string>(MOCK_EXERCISES[0]?.id || '');
    const [manualTarget, setManualTarget] = useState('');
    const [manualSets, setManualSets] = useState(3);
    const [isManualExpanded, setIsManualExpanded] = useState(false); // Collapsed by default
    
    // Active State
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    
    // Progression State
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    
    // Rest State
    const [isResting, setIsResting] = useState(false);
    const [restTimer, setRestTimer] = useState(0);

    const [laps, setLaps] = useState<{time: string, note: string}[]>([]);
    
    // Active Lap Inputs
    const [lapReps, setLapReps] = useState('');
    const [lapWeight, setLapWeight] = useState('');

    const mainTimerRef = useRef<number | null>(null);
    const restTimerRef = useRef<number | null>(null);

    // --- SETUP HANDLERS ---

    const handleAiGenerate = async () => {
        if (!aiPrompt) return;
        setIsGenerating(true);
        try {
            const generated = await GeminiService.generateWorkoutPlan(aiPrompt);
            
            // Validation: Ensure we actually got an array with items
            if (Array.isArray(generated) && generated.length > 0) {
                const timestamp = Date.now();
                const mapped = generated.map((g: any, i) => ({
                    id: `gen_${timestamp}_${i}`, // Ensure unique IDs
                    name: g.name,
                    target: g.target,
                    weight: g.weight,
                    sets: typeof g.sets === 'number' ? g.sets : 1
                }));
                setComponents(mapped);
                setAiPrompt(''); // Clear prompt on success
            } else {
                alert("AI returned an empty plan. Please try a more specific prompt (e.g., '5 rounds of 10 pushups').");
            }
        } catch (e) {
            console.error(e);
            alert("Could not generate workout. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddManual = () => {
        const ex = MOCK_EXERCISES.find(e => e.id === selectedExId);
        if (ex) {
            setComponents([...components, {
                id: `man_${Date.now()}`,
                name: ex.name,
                target: manualTarget || 'N/A',
                weight: '',
                sets: manualSets > 0 ? manualSets : 1
            }]);
            setManualTarget('');
            setManualSets(3);
            setIsManualExpanded(false); // Auto collapse after adding
        }
    };

    const removeComponent = (id: string) => {
        setComponents(components.filter(c => c.id !== id));
    };

    const startWorkout = () => {
        if (components.length === 0) {
            alert("Add at least one exercise.");
            return;
        }
        // Removed blocking confirm for smoother UX and reliability
        setMode('active');
        setIsRunning(true);
    };

    // --- ACTIVE HANDLERS ---

    // Main Timer
    useEffect(() => {
        if (isRunning) {
            mainTimerRef.current = window.setInterval(() => {
                setElapsedTime(t => t + 1);
            }, 1000);
        } else {
            if (mainTimerRef.current) clearInterval(mainTimerRef.current);
        }
        return () => { if (mainTimerRef.current) clearInterval(mainTimerRef.current); };
    }, [isRunning]);

    // Rest Timer
    useEffect(() => {
        if (isResting) {
            restTimerRef.current = window.setInterval(() => {
                setRestTimer(t => t + 1);
            }, 1000);
        } else {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
        }
        return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
    }, [isResting]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}:${s.toString().padStart(2, '0')}`;
    };

    const handleLogSet = () => {
        // Record Log
        const currentComp = components[currentExerciseIndex];
        const note = `${currentComp.name} (Set ${currentSet}/${currentComp.sets}) - ${lapReps || currentComp.target} ${lapWeight ? `@ ${lapWeight}` : ''}`;
        
        setLaps([{ time: formatTime(elapsedTime), note }, ...laps]);
        
        // Reset Inputs
        setLapReps('');
        // Don't reset weight, usually stays same
        
        // Enter Rest Mode
        setIsResting(true);
        setRestTimer(0);
    };

    const handleFinishRest = () => {
        setIsResting(false);
        const currentComp = components[currentExerciseIndex];

        if (currentSet < currentComp.sets) {
            // Next Set, Same Exercise
            setCurrentSet(prev => prev + 1);
        } else {
            // Next Exercise
            if (currentExerciseIndex < components.length - 1) {
                setCurrentExerciseIndex(prev => prev + 1);
                setCurrentSet(1);
            } else {
                // Finished all exercises
                setIsRunning(false);
                if (window.confirm("All exercises completed. Finish workout?")) {
                    handleFinish();
                }
            }
        }
    };

    const handleFinish = () => {
        setIsRunning(false);
        alert(`Workout Complete!\nDuration: ${formatTime(elapsedTime)}\nLaps: ${laps.length}\n\n(Note: This data is not saved to database as per DIY rules)`);
        onExit();
    };

    // --- RENDER ---

    if (mode === 'setup') {
        return (
            <div className="h-full flex flex-col bg-slate-950 pb-24 relative">
                 <button onClick={onExit} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
                    <X size={24} />
                </button>

                <div className="p-6 pb-0">
                    <div className="flex items-center gap-2 text-orange-500 mb-2">
                        <Dumbbell size={24} />
                        <h2 className="font-black italic uppercase text-2xl">DIY / Free Mode</h2>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                        Build a custom session or let AI create one. <br/>
                        <span className="text-orange-500 font-bold flex items-center gap-1 mt-1">
                            <AlertTriangle size={12} /> Not ranked on Leaderboard.
                        </span>
                    </p>

                    {/* AI Section */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 shadow-sm">
                        <label className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2">
                            <Wand2 size={14} /> AI Generator
                        </label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                placeholder="e.g. 3 rounds of 10 pushups"
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                            />
                            <button 
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !aiPrompt}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg font-bold text-xs disabled:opacity-50 shadow-lg shadow-indigo-900/20"
                            >
                                {isGenerating ? <Clock size={16} className="animate-spin"/> : 'Create'}
                            </button>
                        </div>
                    </div>

                    {/* Collapsible Manual Add */}
                    <div className="mb-4 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                         <button 
                            onClick={() => setIsManualExpanded(!isManualExpanded)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-900 transition-colors text-left"
                         >
                            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                <Plus size={14} /> Add Manual Movement
                            </span>
                            {isManualExpanded ? <ChevronUp size={14} className="text-slate-500"/> : <ChevronDown size={14} className="text-slate-500"/>}
                         </button>
                         
                         {isManualExpanded && (
                            <div className="p-4 pt-0 bg-slate-900 border-t border-slate-800/50">
                                <div className="flex flex-col gap-3 pt-3">
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                        value={selectedExId}
                                        onChange={e => setSelectedExId(e.target.value)}
                                    >
                                        {MOCK_EXERCISES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                    
                                    <div className="flex gap-2">
                                        <div className="flex-none w-20">
                                            <input 
                                                type="number"
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                                placeholder="Sets"
                                                value={manualSets}
                                                onChange={e => setManualSets(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm outline-none"
                                                placeholder="Target (e.g. 10 reps)"
                                                value={manualTarget}
                                                onChange={e => setManualTarget(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleAddManual}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded font-bold text-sm"
                                    >
                                        Add Exercise
                                    </button>
                                </div>
                            </div>
                         )}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-bold text-slate-500 uppercase">Session Plan ({components.length})</span>
                         {components.length > 0 && (
                            <button onClick={() => setComponents([])} className="text-[10px] text-red-500 font-bold uppercase hover:underline">Clear All</button>
                         )}
                    </div>

                    {components.length === 0 ? (
                        <div className="text-center text-slate-600 text-xs py-8 italic border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                            Your session is empty. Add exercises above.
                        </div>
                    ) : (
                        components.map((c, idx) => (
                            <div key={c.id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center group hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-500 font-mono text-[10px] font-bold">{idx + 1}</span>
                                    <div>
                                        <div className="text-white font-bold text-sm">{c.name}</div>
                                        <div className="flex gap-2">
                                            <span className="text-indigo-400 text-xs font-bold bg-indigo-900/20 px-1.5 py-0.5 rounded border border-indigo-900/50">{c.sets} Sets</span>
                                            <span className="text-orange-500 text-xs font-bold border border-orange-900/20 px-1.5 py-0.5 rounded">{c.target}</span>
                                            {c.weight && <span className="text-slate-500 text-xs font-bold border border-slate-800 px-1.5 py-0.5 rounded">@ {c.weight}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeComponent(c.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 pt-4 mt-auto">
                    <button 
                        onClick={startWorkout}
                        disabled={components.length === 0}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic tracking-wider rounded-xl shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Play size={20} fill="currentColor" /> Start Session
                    </button>
                </div>
            </div>
        );
    }

    // ACTIVE MODE
    const currentComp = components[currentExerciseIndex];

    return (
        <div className="h-full flex flex-col bg-black pb-24 relative">
            
            {/* REST OVERLAY */}
            {isResting && (
                <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6">Rest & Recover</p>
                    <div className="text-8xl font-mono font-black text-white mb-8 tabular-nums">
                        {formatTime(restTimer)}
                    </div>
                    
                    <div className="text-center mb-12">
                         <p className="text-xs text-slate-500 font-bold uppercase mb-2">Up Next</p>
                         {currentSet < currentComp.sets ? (
                             <p className="text-xl text-white font-bold uppercase italic">{currentComp.name} (Set {currentSet + 1})</p>
                         ) : currentExerciseIndex < components.length - 1 ? (
                             <p className="text-xl text-white font-bold uppercase italic">{components[currentExerciseIndex + 1].name} (Set 1)</p>
                         ) : (
                             <p className="text-xl text-green-500 font-bold uppercase italic">Finish Workout</p>
                         )}
                    </div>

                    <button 
                        onClick={handleFinishRest}
                        className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic tracking-wider rounded-xl shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2"
                    >
                        <SkipForward size={24} fill="currentColor" /> Start Next Set
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-950">
                <div className="flex items-center gap-2 text-orange-500 font-black italic uppercase">
                    <Dumbbell size={18} />
                    DIY SESSION
                </div>
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-red-500 border border-red-900/50 px-2 py-0.5 rounded bg-red-900/10 animate-pulse">NOT SAVED</span>
                     <button onClick={handleFinish} className="text-red-500 text-xs font-bold border border-red-900/50 px-3 py-1 rounded hover:bg-red-900/20 transition-colors">
                        END
                    </button>
                 </div>
            </div>

            {/* Timer */}
            <div className="py-6 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black border-b border-slate-900">
                <div className="text-6xl font-mono font-black text-white tabular-nums tracking-tight shadow-orange-500/10 drop-shadow-2xl">
                    {formatTime(elapsedTime)}
                </div>
                <div className="flex gap-4 mt-4">
                    <button 
                        onClick={() => setIsRunning(!isRunning)} 
                        className={`px-6 py-2 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 font-bold text-xs uppercase tracking-wider gap-2 ${isRunning ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-900/20' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'}`}
                    >
                        {isRunning ? <><Clock size={16} /> Pause Timer</> : <><Play size={16} fill="currentColor" /> Resume Timer</>}
                    </button>
                </div>
            </div>

            {/* Current Exercise */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex-shrink-0">
                <div className="flex justify-between items-end mb-2">
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Current Interval</p>
                    <div className="text-right">
                        <span className="block text-white font-bold text-xs">Set {currentSet} of {currentComp.sets}</span>
                        <span className="block text-slate-500 font-mono text-[10px]">Ex {currentExerciseIndex + 1} / {components.length}</span>
                    </div>
                </div>
                
                <h2 className="text-2xl font-black text-white uppercase italic leading-none mb-2 line-clamp-1">{currentComp?.name}</h2>
                <p className="text-orange-500 font-bold text-lg">{currentComp?.target}</p>
                
                <div className="flex gap-3 mt-4">
                     <input 
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                        placeholder="Reps/Dist"
                        value={lapReps}
                        onChange={e => setLapReps(e.target.value)}
                     />
                     <input 
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                        placeholder="Weight (kg)"
                        value={lapWeight}
                        onChange={e => setLapWeight(e.target.value)}
                     />
                </div>
                <button 
                    onClick={handleLogSet}
                    className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase italic tracking-wider rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                    <Flag size={20} /> Log Set & Rest
                </button>
            </div>

            {/* History Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-black">
                <p className="text-[10px] text-slate-600 font-bold uppercase mb-2 px-2">Session Log (Not Saved)</p>
                {laps.length === 0 ? (
                     <div className="text-slate-800 text-xs italic text-center py-4">No sets logged yet.</div>
                ) : (
                    laps.map((lap, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-900/50 py-3 px-2 hover:bg-slate-900/30 transition-colors rounded">
                             <span className="text-slate-500 font-mono text-xs">#{laps.length - i} • {lap.time}</span>
                             <span className="text-white font-bold text-xs">{lap.note}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DIYWorkout;
