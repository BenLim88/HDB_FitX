import React from 'react';
import { Notification, VerificationStatus } from '../types';
import { DataService } from '../services/dataService';
import { Check, X, UserCheck, Pin, ArrowRight, Dumbbell, UsersRound, MessageSquare, Sparkles, User } from 'lucide-react';

interface WitnessInboxProps {
  notifications: Notification[];
  currentUserId: string;
  refreshData: () => void;
  onNavigateToHome?: () => void;
  onStartAssignedWorkout?: (workoutId: string) => void; // Add handler for assigned workouts
  onNavigateToCollab?: (collabId: string) => void; // Add handler for collaboration notifications
  onNavigateToProfile?: () => void; // Add handler for profile update reminders
}

const WitnessInbox: React.FC<WitnessInboxProps> = ({ notifications, currentUserId, refreshData, onNavigateToHome, onStartAssignedWorkout, onNavigateToCollab, onNavigateToProfile }) => {

  const handleAction = async (logId: string | undefined, action: 'verify' | 'reject') => {
    if (!logId) {
      alert('Log ID is missing. Cannot verify/reject.');
      return;
    }
    
    try {
      const status = action === 'verify' ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED;
      await DataService.verifyLog(logId, currentUserId, status);
      console.log(`Log ${logId} ${action === 'verify' ? 'verified' : 'rejected'} successfully`);
      refreshData();
    } catch (error) {
      console.error(`Error ${action === 'verify' ? 'verifying' : 'rejecting'} log:`, error);
      alert(`Failed to ${action === 'verify' ? 'verify' : 'reject'} workout. Please try again.`);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await DataService.markNotificationAsRead(notifId);
      refreshData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      alert('Failed to dismiss notification. Please try again.');
    }
  };

  const handleDismiss = async (notifId: string) => {
    try {
      await DataService.deleteNotification(notifId);
      refreshData();
    } catch (error) {
      console.error('Error dismissing notification:', error);
      alert('Failed to dismiss notification. Please try again.');
    }
  };

  const witnessRequests = notifications.filter(n => n.type === 'witness_request' && !n.read);
  const pinnedInvitations = notifications.filter(n => n.type === 'pinned_wod_invitation' && !n.read);
  const workoutAssignments = notifications.filter(n => n.type === 'workout_assignment' && !n.read);
  const collabNotifications = notifications.filter(n => 
    (n.type === 'collab_invite' || n.type === 'collab_suggestion' || n.type === 'collab_update') && !n.read
  );
  const profileReminders = notifications.filter(n => n.type === 'profile_reminder' && !n.read);

  const hasUnreadNotifications = witnessRequests.length > 0 || pinnedInvitations.length > 0 || workoutAssignments.length > 0 || collabNotifications.length > 0 || profileReminders.length > 0;

  if (!hasUnreadNotifications) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <UserCheck size={48} className="mb-4 opacity-50" />
        <p>No pending notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Profile Update Reminders - Show first for new users */}
      {profileReminders.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <User size={20} className="text-green-500" /> Welcome to HDB FitX!
          </h2>
          <div className="space-y-3">
            {profileReminders.map(notif => (
              <div key={notif.id} className="bg-gradient-to-br from-green-900/30 to-slate-900 border border-green-500/40 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center text-green-500">
                    <User size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">Set your designation, group, and athlete type to get the most out of HDB FitX.</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  {onNavigateToProfile && (
                    <button 
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        onNavigateToProfile();
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                      Update Profile <ArrowRight size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDismiss(notif.id)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg"
                  >
                    Later
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pinned WOD Invitations */}
      {pinnedInvitations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Pin size={20} className="text-blue-500" /> Priority Mission Invitations
          </h2>
          <div className="space-y-3">
            {pinnedInvitations.map(notif => (
              <div key={notif.id} className={`bg-slate-900 border ${notif.read ? 'border-slate-800 opacity-60' : 'border-blue-500/40'} p-4 rounded-xl shadow-sm flex flex-col gap-3`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                    <Pin size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">Check the Home tab to join this Priority Mission.</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  {onNavigateToHome && (
                    <button 
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        onNavigateToHome();
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                      View Mission <ArrowRight size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDismiss(notif.id)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Workouts */}
      {workoutAssignments.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Dumbbell size={20} className="text-purple-500" /> Assigned Workouts
          </h2>
          <div className="space-y-3">
            {workoutAssignments.map(notif => (
              <div key={notif.id} className={`bg-slate-900 border ${notif.read ? 'border-slate-800 opacity-60' : 'border-purple-500/40'} p-4 rounded-xl shadow-sm flex flex-col gap-3`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-500">
                    <Dumbbell size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">You have been assigned a mission.</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  {onStartAssignedWorkout && notif.payload.workout_id && (
                    <button 
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        onStartAssignedWorkout(notif.payload.workout_id!);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                      Start Mission <ArrowRight size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDismiss(notif.id)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Witness Requests */}
      {witnessRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <UserCheck size={20} className="text-orange-500" /> Witness Requests
          </h2>
          <div className="space-y-3">
            {witnessRequests.map(notif => (
              <div key={notif.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-500">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">Verify their effort.</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => handleAction(notif.payload.log_id, 'verify')}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Check size={14} /> Verify
                  </button>
                  <button 
                    onClick={() => handleAction(notif.payload.log_id, 'reject')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collaboration Notifications */}
      {collabNotifications.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <UsersRound size={20} className="text-purple-500" /> Collaboration Updates
          </h2>
          <div className="space-y-3">
            {collabNotifications.map(notif => (
              <div key={notif.id} className={`bg-slate-900 border ${
                notif.type === 'collab_invite' ? 'border-purple-500/40' : 
                notif.type === 'collab_suggestion' ? 'border-yellow-500/40' : 
                'border-blue-500/40'
              } p-4 rounded-xl shadow-sm flex flex-col gap-3`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    notif.type === 'collab_invite' ? 'bg-purple-600/20 text-purple-500' :
                    notif.type === 'collab_suggestion' ? 'bg-yellow-600/20 text-yellow-500' :
                    'bg-blue-600/20 text-blue-500'
                  }`}>
                    {notif.type === 'collab_invite' ? <UsersRound size={20} /> :
                     notif.type === 'collab_suggestion' ? <Sparkles size={20} /> :
                     <MessageSquare size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {notif.type === 'collab_invite' ? 'You\'ve been invited to collaborate!' :
                       notif.type === 'collab_suggestion' ? 'New suggestion needs your attention' :
                       'Collaboration status update'}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  {onNavigateToCollab && notif.payload.collab_workout_id && (
                    <button 
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        onNavigateToCollab(notif.payload.collab_workout_id!);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                      View Collaboration <ArrowRight size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDismiss(notif.id)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WitnessInbox;
