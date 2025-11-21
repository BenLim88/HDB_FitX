import React from 'react';
import { Notification, VerificationStatus } from '../types';
import { DataService } from '../services/dataService';
import { Check, X, UserCheck } from 'lucide-react';

interface WitnessInboxProps {
  notifications: Notification[];
  currentUserId: string;
  refreshData: () => void;
}

const WitnessInbox: React.FC<WitnessInboxProps> = ({ notifications, currentUserId, refreshData }) => {

  const handleAction = async (logId: string | undefined, action: 'verify' | 'reject') => {
    if (!logId) return;
    
    const status = action === 'verify' ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED;
    await DataService.verifyLog(logId, currentUserId, status);
    refreshData();
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <UserCheck size={48} className="mb-4 opacity-50" />
        <p>No pending verifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold text-white">Witness Requests</h2>
      {notifications.map(notif => (
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
  );
};

export default WitnessInbox;
