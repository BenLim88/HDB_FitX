import React from 'react';
import { Notification, VerificationStatus } from '../types';
import { DataService } from '../services/dataService';
import { Check, X, UserCheck, Pin, ArrowRight } from 'lucide-react';

interface WitnessInboxProps {
  notifications: Notification[];
  currentUserId: string;
  refreshData: () => void;
  onNavigateToHome?: () => void;
}

const WitnessInbox: React.FC<WitnessInboxProps> = ({ notifications, currentUserId, refreshData, onNavigateToHome }) => {

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

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <UserCheck size={48} className="mb-4 opacity-50" />
        <p>No pending notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
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
    </div>
  );
};

export default WitnessInbox;
