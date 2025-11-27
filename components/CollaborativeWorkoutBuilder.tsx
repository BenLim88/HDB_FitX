import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  CollaborativeWorkout, 
  WorkoutSuggestion, 
  CollaborationMessage, 
  SuggestionType, 
  SuggestionStatus, 
  CollaborationStatus,
  Exercise,
  WorkoutScheme,
  ScalingTier
} from '../types';
import { DataService } from '../services/dataService';
import { MOCK_EXERCISES } from '../constants';
import { 
  Users, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Send, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  UserPlus,
  Search,
  Dumbbell,
  Target,
  Loader2,
  RotateCcw,
  GripVertical
} from 'lucide-react';

interface CollaborativeWorkoutBuilderProps {
  collabWorkout: CollaborativeWorkout;
  currentUser: User;
  allUsers: User[];
  exercises: Exercise[];
  onBack: () => void;
  onRefresh: () => void;
}

const CollaborativeWorkoutBuilder: React.FC<CollaborativeWorkoutBuilderProps> = ({
  collabWorkout,
  currentUser,
  allUsers,
  exercises,
  onBack,
  onRefresh
}) => {
  // State
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'components' | 'suggestions' | 'chat'>('components');
  
  // Suggestion Form State
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionType, setSuggestionType] = useState<SuggestionType>(SuggestionType.ADD_EXERCISE);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [exerciseTarget, setExerciseTarget] = useState('');
  const [exerciseWeight, setExerciseWeight] = useState('');
  const [exerciseSets, setExerciseSets] = useState('1');
  const [suggestionReason, setSuggestionReason] = useState('');
  const [targetComponentOrder, setTargetComponentOrder] = useState<number | null>(null);
  
  // New Exercise Proposal
  const [isNewExercise, setIsNewExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseType, setNewExerciseType] = useState<'time' | 'reps' | 'load' | 'distance'>('reps');
  const [newExerciseCategory, setNewExerciseCategory] = useState('Custom');
  
  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  
  // Drag Reorder State (for initiator only)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const isInitiator = currentUser.id === collabWorkout.initiator_id;
  const isActive = collabWorkout.status === CollaborationStatus.ACTIVE;

  // Load data
  useEffect(() => {
    loadData();
    // Poll for updates every 5 seconds
    pollIntervalRef.current = window.setInterval(loadData, 5000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [collabWorkout.id]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadData = async () => {
    try {
      const [sugs, msgs] = await Promise.all([
        DataService.getSuggestions(collabWorkout.id),
        DataService.getCollabMessages(collabWorkout.id)
      ]);
      setSuggestions(sugs);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading collaboration data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await DataService.sendCollabMessage({
        collab_workout_id: collabWorkout.id,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar_url,
        message: newMessage.trim(),
        timestamp: Date.now()
      });
      setNewMessage('');
      loadData();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!isActive) return;
    
    try {
      const suggestion: Omit<WorkoutSuggestion, 'id'> = {
        collab_workout_id: collabWorkout.id,
        suggester_id: currentUser.id,
        suggester_name: currentUser.name,
        suggester_avatar: currentUser.avatar_url,
        type: isNewExercise ? SuggestionType.ADD_NEW_EXERCISE : suggestionType,
        status: SuggestionStatus.PENDING,
        reason: suggestionReason,
        created_at: Date.now()
      };

      if (suggestionType === SuggestionType.ADD_EXERCISE || isNewExercise) {
        suggestion.proposed_component = {
          exercise_id: isNewExercise ? '' : selectedExerciseId,
          exercise_name: isNewExercise ? newExerciseName : (exercises.find(e => e.id === selectedExerciseId)?.name || ''),
          target: exerciseTarget,
          weight: exerciseWeight || undefined,
          sets: exerciseSets ? parseInt(exerciseSets) : undefined
        };
        
        if (isNewExercise) {
          suggestion.proposed_exercise = {
            name: newExerciseName,
            type: newExerciseType,
            category: newExerciseCategory
          };
        }
      } else if (suggestionType === SuggestionType.REMOVE_EXERCISE) {
        suggestion.target_component_order = targetComponentOrder || undefined;
      } else if (suggestionType === SuggestionType.MODIFY_EXERCISE) {
        suggestion.target_component_order = targetComponentOrder || undefined;
        suggestion.proposed_component = {
          exercise_id: selectedExerciseId,
          exercise_name: exercises.find(e => e.id === selectedExerciseId)?.name || '',
          target: exerciseTarget,
          weight: exerciseWeight || undefined,
          sets: exerciseSets ? parseInt(exerciseSets) : undefined
        };
      }

      await DataService.submitSuggestion(suggestion);
      resetSuggestionForm();
      loadData();
      
      // Auto-send a chat message about the suggestion
      await DataService.sendCollabMessage({
        collab_workout_id: collabWorkout.id,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar_url,
        message: `📝 Submitted a suggestion: ${getSuggestionTypeLabel(isNewExercise ? SuggestionType.ADD_NEW_EXERCISE : suggestionType)}`,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      alert('Failed to submit suggestion');
    }
  };

  const handleResolveSuggestion = async (suggestionId: string, status: SuggestionStatus) => {
    if (!isInitiator || !isActive) return;
    
    try {
      await DataService.resolveSuggestion(suggestionId, status, currentUser.id, collabWorkout.id);
      loadData();
      onRefresh();
      
      // Send chat message
      await DataService.sendCollabMessage({
        collab_workout_id: collabWorkout.id,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar_url,
        message: status === SuggestionStatus.ACCEPTED ? '✅ Accepted a suggestion' : '❌ Rejected a suggestion',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error resolving suggestion:', error);
      alert('Failed to resolve suggestion');
    }
  };

  const handleInviteUser = async (userId: string) => {
    try {
      await DataService.addCollaborator(collabWorkout.id, userId, currentUser.name);
      setShowInviteModal(false);
      setInviteSearch('');
      onRefresh();
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Failed to invite user');
    }
  };

  const handleFinalize = async () => {
    if (!isInitiator) return;
    if (!confirm('Finalize this workout? It will be added to the workout library and the collaboration will be closed.')) return;
    
    try {
      await DataService.finalizeCollaborativeWorkout(collabWorkout.id, currentUser.id);
      alert('Workout finalized successfully!');
      onBack();
    } catch (error) {
      console.error('Error finalizing workout:', error);
      alert('Failed to finalize workout');
    }
  };

  const handleCancel = async () => {
    if (!isInitiator) return;
    if (!confirm('Cancel this collaboration? All progress will be lost.')) return;
    
    try {
      await DataService.cancelCollaborativeWorkout(collabWorkout.id, currentUser.id);
      onBack();
    } catch (error) {
      console.error('Error cancelling collaboration:', error);
      alert('Failed to cancel collaboration');
    }
  };

  const resetSuggestionForm = () => {
    setShowSuggestionForm(false);
    setSuggestionType(SuggestionType.ADD_EXERCISE);
    setSelectedExerciseId('');
    setExerciseTarget('');
    setExerciseWeight('');
    setExerciseSets('1');
    setSuggestionReason('');
    setTargetComponentOrder(null);
    setIsNewExercise(false);
    setNewExerciseName('');
    setNewExerciseType('reps');
    setNewExerciseCategory('Custom');
  };

  const getSuggestionTypeLabel = (type: SuggestionType) => {
    switch (type) {
      case SuggestionType.ADD_EXERCISE: return 'Add Exercise';
      case SuggestionType.REMOVE_EXERCISE: return 'Remove Exercise';
      case SuggestionType.MODIFY_EXERCISE: return 'Modify Exercise';
      case SuggestionType.ADD_NEW_EXERCISE: return 'Propose New Exercise';
      default: return 'Unknown';
    }
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(e => e.id === exerciseId)?.name || MOCK_EXERCISES.find(e => e.id === exerciseId)?.name || 'Unknown Exercise';
  };

  // Drag handlers for reordering (initiator only)
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = async (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const components = [...collabWorkout.components];
    const [movedItem] = components.splice(draggedIdx, 1);
    components.splice(idx, 0, movedItem);

    // Reorder
    const reordered = components.map((c, i) => ({ ...c, order: i + 1 }));

    try {
      await DataService.updateCollaborativeWorkout(collabWorkout.id, {
        components: reordered
      });
      onRefresh();
    } catch (error) {
      console.error('Error reordering components:', error);
      alert('Failed to reorder exercises');
    }

    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const pendingSuggestions = suggestions.filter(s => s.status === SuggestionStatus.PENDING);
  const resolvedSuggestions = suggestions.filter(s => s.status !== SuggestionStatus.PENDING);

  const collaborators = allUsers.filter(u => 
    collabWorkout.collaborator_ids.includes(u.id) || u.id === collabWorkout.initiator_id
  );

  const availableToInvite = allUsers.filter(u => 
    !collabWorkout.collaborator_ids.includes(u.id) && 
    u.id !== collabWorkout.initiator_id &&
    u.name.toLowerCase().includes(inviteSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white uppercase italic">{collabWorkout.name}</h1>
              {collabWorkout.status !== CollaborationStatus.ACTIVE && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  collabWorkout.status === CollaborationStatus.FINALIZED 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {collabWorkout.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              by {collabWorkout.initiator_name} • {collaborators.length} collaborators
            </p>
          </div>
          {isInitiator && isActive && (
            <button 
              onClick={() => setShowInviteModal(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400"
              title="Invite Collaborators"
            >
              <UserPlus size={18} />
            </button>
          )}
        </div>

        {/* Collaborators Avatars */}
        <div className="flex items-center gap-1 mb-3">
          {collaborators.slice(0, 8).map(u => (
            <div key={u.id} className="relative group">
              <div className={`w-8 h-8 rounded-full overflow-hidden border-2 ${
                u.id === collabWorkout.initiator_id ? 'border-orange-500' : 'border-slate-700'
              }`}>
                <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                {u.name} {u.id === collabWorkout.initiator_id && '(Admin)'}
              </div>
            </div>
          ))}
          {collaborators.length > 8 && (
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
              +{collaborators.length - 8}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('components')}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'components' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            <Dumbbell size={14} /> Workout
          </button>
          <button 
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'suggestions' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            <Sparkles size={14} /> Suggestions
            {pendingSuggestions.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] px-1.5 rounded-full">{pendingSuggestions.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            <MessageSquare size={14} /> Chat
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Components Tab */}
        {activeTab === 'components' && (
          <div className="h-full flex flex-col p-4 overflow-y-auto">
            {/* Workout Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              <p className="text-slate-400 text-sm mb-2">{collabWorkout.description || 'No description'}</p>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded">{collabWorkout.scheme}</span>
                <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded">{collabWorkout.rounds || 1} Round(s)</span>
                <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded">{collabWorkout.category}</span>
              </div>
            </div>

            {/* Current Components */}
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <Target size={14} /> Current Exercises ({collabWorkout.components.length})
            </h3>
            
            {collabWorkout.components.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <Dumbbell size={48} className="opacity-30 mb-4" />
                <p className="text-sm">No exercises yet</p>
                <p className="text-xs">Submit suggestions to build this workout!</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {isInitiator && isActive && collabWorkout.components.length > 1 && (
                  <p className="text-[10px] text-slate-500 italic mb-1">💡 Drag to reorder exercises</p>
                )}
                {collabWorkout.components.map((comp, idx) => (
                  <div 
                    key={idx} 
                    draggable={isInitiator && isActive}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`bg-slate-900 border p-3 rounded-lg flex items-center gap-3 transition-all ${
                      dragOverIdx === idx ? 'border-orange-500 bg-orange-500/10' : 
                      draggedIdx === idx ? 'opacity-50 border-slate-700' : 
                      'border-slate-800'
                    } ${isInitiator && isActive ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    {/* Drag Handle (initiator only) */}
                    {isInitiator && isActive && (
                      <div className="text-slate-600 hover:text-slate-400 cursor-grab">
                        <GripVertical size={16} />
                      </div>
                    )}
                    <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center text-orange-500 font-bold text-sm">
                      {comp.order}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm">{getExerciseName(comp.exercise_id)}</h4>
                      <div className="flex gap-2 text-xs">
                        <span className="text-orange-400">{comp.target}</span>
                        {comp.weight && <span className="text-slate-500">@ {comp.weight}</span>}
                        {comp.sets && comp.sets > 1 && <span className="text-slate-500">{comp.sets} sets</span>}
                      </div>
                    </div>
                    {isActive && (
                      <button
                        onClick={() => {
                          setSuggestionType(SuggestionType.REMOVE_EXERCISE);
                          setTargetComponentOrder(comp.order);
                          setShowSuggestionForm(true);
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Propose Removal"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Suggestion Button */}
            {isActive && (
              <button
                onClick={() => {
                  setSuggestionType(SuggestionType.ADD_EXERCISE);
                  setShowSuggestionForm(true);
                }}
                className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-xl text-slate-400 hover:text-orange-500 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={20} /> Suggest Exercise
              </button>
            )}

            {/* Initiator Actions */}
            {isInitiator && isActive && (
              <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                <button
                  onClick={handleFinalize}
                  disabled={collabWorkout.components.length === 0}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Finalize Workout
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-2 text-red-400 hover:text-red-300 text-sm font-bold uppercase flex items-center justify-center gap-2"
                >
                  <XCircle size={16} /> Cancel Collaboration
                </button>
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="h-full flex flex-col p-4 overflow-y-auto">
            {/* Pending Suggestions */}
            {pendingSuggestions.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-orange-500 uppercase mb-2 flex items-center gap-2">
                  <Clock size={14} /> Pending ({pendingSuggestions.length})
                </h3>
                <div className="space-y-3 mb-6">
                  {pendingSuggestions.map(sug => (
                    <div key={sug.id} className="bg-slate-900 border border-orange-500/30 p-4 rounded-xl">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                          <img src={sug.suggester_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sug.suggester_id}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{sug.suggester_name}</span>
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase">
                              {getSuggestionTypeLabel(sug.type)}
                            </span>
                          </div>
                          
                          {/* Suggestion Details */}
                          {sug.proposed_component && (
                            <div className="mt-2 bg-slate-950 p-2 rounded text-sm">
                              <span className="text-white font-bold">{sug.proposed_component.exercise_name}</span>
                              <span className="text-slate-400"> — </span>
                              <span className="text-orange-400">{sug.proposed_component.target}</span>
                              {sug.proposed_component.weight && (
                                <span className="text-slate-500"> @ {sug.proposed_component.weight}</span>
                              )}
                            </div>
                          )}
                          
                          {sug.type === SuggestionType.REMOVE_EXERCISE && sug.target_component_order && (
                            <div className="mt-2 bg-slate-950 p-2 rounded text-sm">
                              <span className="text-red-400">Remove: </span>
                              <span className="text-white">
                                #{sug.target_component_order} - {getExerciseName(collabWorkout.components.find(c => c.order === sug.target_component_order)?.exercise_id || '')}
                              </span>
                            </div>
                          )}

                          {sug.type === SuggestionType.ADD_NEW_EXERCISE && sug.proposed_exercise && (
                            <div className="mt-2 bg-purple-500/10 border border-purple-500/30 p-2 rounded text-xs">
                              <span className="text-purple-400 font-bold">NEW EXERCISE: </span>
                              <span className="text-white">{sug.proposed_exercise.name}</span>
                              <span className="text-slate-400"> ({sug.proposed_exercise.type} • {sug.proposed_exercise.category})</span>
                            </div>
                          )}
                          
                          {sug.reason && (
                            <p className="text-xs text-slate-400 mt-2 italic">"{sug.reason}"</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Admin Actions */}
                      {isInitiator && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveSuggestion(sug.id, SuggestionStatus.ACCEPTED)}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button
                            onClick={() => handleResolveSuggestion(sug.id, SuggestionStatus.REJECTED)}
                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Resolved Suggestions */}
            {resolvedSuggestions.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14} /> History ({resolvedSuggestions.length})
                </h3>
                <div className="space-y-2">
                  {resolvedSuggestions.map(sug => (
                    <div key={sug.id} className={`bg-slate-900/50 border p-3 rounded-lg flex items-center gap-3 ${
                      sug.status === SuggestionStatus.ACCEPTED ? 'border-green-500/20' : 'border-red-500/20'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        sug.status === SuggestionStatus.ACCEPTED ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {sug.status === SuggestionStatus.ACCEPTED ? <Check size={14} /> : <X size={14} />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-slate-300">{sug.suggester_name}</span>
                        <span className="text-slate-500 text-sm"> — {getSuggestionTypeLabel(sug.type)}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${
                        sug.status === SuggestionStatus.ACCEPTED ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {sug.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {suggestions.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <Sparkles size={48} className="opacity-30 mb-4" />
                <p className="text-sm">No suggestions yet</p>
                <p className="text-xs">Be the first to contribute!</p>
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                  <MessageSquare size={48} className="opacity-30 mb-4" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        <img src={msg.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`} className="w-full h-full object-cover" />
                      </div>
                      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-2xl ${
                          isMe ? 'bg-orange-600 text-white rounded-br-sm' : 'bg-slate-800 text-white rounded-bl-sm'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] text-slate-500">{msg.sender_name}</span>
                          <span className="text-[10px] text-slate-600">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-4 py-2 text-white text-sm outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-full flex items-center justify-center text-white"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Form Modal */}
      {showSuggestionForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Make a Suggestion</h3>
              <button onClick={resetSuggestionForm} className="p-2 text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Suggestion Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setSuggestionType(SuggestionType.ADD_EXERCISE); setIsNewExercise(false); }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border ${
                      suggestionType === SuggestionType.ADD_EXERCISE && !isNewExercise
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Plus size={14} className="inline mr-1" /> Add Exercise
                  </button>
                  <button
                    onClick={() => { setSuggestionType(SuggestionType.REMOVE_EXERCISE); setIsNewExercise(false); }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border ${
                      suggestionType === SuggestionType.REMOVE_EXERCISE
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Trash2 size={14} className="inline mr-1" /> Remove
                  </button>
                </div>
                <button
                  onClick={() => { setIsNewExercise(true); setSuggestionType(SuggestionType.ADD_NEW_EXERCISE); }}
                  className={`w-full mt-2 py-2 px-3 rounded-lg text-xs font-bold border ${
                    isNewExercise
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Sparkles size={14} className="inline mr-1" /> Propose NEW Exercise (not in database)
                </button>
              </div>

              {/* For Remove: Select Component */}
              {suggestionType === SuggestionType.REMOVE_EXERCISE && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Exercise to Remove</label>
                  <div className="space-y-2">
                    {collabWorkout.components.map(comp => (
                      <button
                        key={comp.order}
                        onClick={() => setTargetComponentOrder(comp.order)}
                        className={`w-full p-3 rounded-lg border text-left ${
                          targetComponentOrder === comp.order
                            ? 'bg-red-600/20 border-red-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="font-bold">#{comp.order}</span> — {getExerciseName(comp.exercise_id)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* For Add: Exercise Selection */}
              {(suggestionType === SuggestionType.ADD_EXERCISE || suggestionType === SuggestionType.MODIFY_EXERCISE) && !isNewExercise && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exercise</label>
                    <select
                      value={selectedExerciseId}
                      onChange={(e) => setSelectedExerciseId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                    >
                      <option value="">Select an exercise...</option>
                      {[...exercises, ...MOCK_EXERCISES].filter((e, i, arr) => 
                        arr.findIndex(x => x.id === e.id) === i
                      ).map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name} ({ex.category})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target</label>
                    <input
                      type="text"
                      value={exerciseTarget}
                      onChange={(e) => setExerciseTarget(e.target.value)}
                      placeholder="e.g., 20 reps, 400m, 1 min"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Weight (optional)</label>
                      <input
                        type="text"
                        value={exerciseWeight}
                        onChange={(e) => setExerciseWeight(e.target.value)}
                        placeholder="e.g., 20kg, BW"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sets</label>
                      <input
                        type="number"
                        value={exerciseSets}
                        onChange={(e) => setExerciseSets(e.target.value)}
                        min="1"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* For New Exercise Proposal */}
              {isNewExercise && (
                <>
                  <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-lg">
                    <p className="text-purple-400 text-xs font-bold mb-1">Proposing a New Exercise</p>
                    <p className="text-slate-400 text-xs">This exercise will be added to the database if the admin accepts.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exercise Name</label>
                    <input
                      type="text"
                      value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)}
                      placeholder="e.g., Dragon Flags"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                      <select
                        value={newExerciseType}
                        onChange={(e) => setNewExerciseType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                      >
                        <option value="reps">Reps</option>
                        <option value="time">Time</option>
                        <option value="distance">Distance</option>
                        <option value="load">Load</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                      <input
                        type="text"
                        value={newExerciseCategory}
                        onChange={(e) => setNewExerciseCategory(e.target.value)}
                        placeholder="e.g., Core, Arms"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target</label>
                    <input
                      type="text"
                      value={exerciseTarget}
                      onChange={(e) => setExerciseTarget(e.target.value)}
                      placeholder="e.g., 10 reps"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none"
                    />
                  </div>
                </>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reason (optional)</label>
                <textarea
                  value={suggestionReason}
                  onChange={(e) => setSuggestionReason(e.target.value)}
                  placeholder="Why are you suggesting this?"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmitSuggestion}
                disabled={
                  (suggestionType === SuggestionType.ADD_EXERCISE && (!selectedExerciseId || !exerciseTarget)) ||
                  (suggestionType === SuggestionType.REMOVE_EXERCISE && !targetComponentOrder) ||
                  (isNewExercise && (!newExerciseName || !exerciseTarget))
                }
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase rounded-xl"
              >
                Submit Suggestion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <UserPlus size={20} className="text-blue-500" /> Invite Collaborators
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="p-2 text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {availableToInvite.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No users to invite</p>
              ) : (
                availableToInvite.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleInviteUser(user.id)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-white text-sm">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.athlete_type}</p>
                    </div>
                    <Plus size={18} className="text-blue-500" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeWorkoutBuilder;

