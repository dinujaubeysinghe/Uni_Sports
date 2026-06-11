import React, { useState, useEffect } from 'react';
import { registrationService } from '../../../services/registrationService';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
}
 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
export default function StudentMyEvents() {
  const { user } = useAuth();
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotionNotice, setPromotionNotice] = useState<string | null>(null);

  // Manage Modal State
  const [managingReg, setManagingReg] = useState<any | null>(null);
  const [editTeamMembers, setEditTeamMembers] = useState<TeamMember[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const currentUserId = user?.id || (user as any)?._id || '';
  const statusSnapshotKey = currentUserId ? `event_status_snapshot_${currentUserId}` : null;

  useEffect(() => {
    setPromotionNotice(null);
    setMyRegistrations([]);
  }, [currentUserId]);

  useEffect(() => {
    fetchMyRegistrations();
  }, [currentUserId]);

  const fetchMyRegistrations = async () => {
    try {
      setLoading(true);
      const response = await registrationService.getMyRegistrations();
      const registrations = response.data || [];

      let previousStatusByRegistrationId: Record<string, string> = {};
      if (statusSnapshotKey) {
        try {
          const previousSnapshot = localStorage.getItem(statusSnapshotKey);
          previousStatusByRegistrationId = previousSnapshot ? JSON.parse(previousSnapshot) : {};
        } catch (snapshotError) {
          previousStatusByRegistrationId = {};
        }
      }

      const promotedEventTitles = registrations
        .filter((reg: any) => previousStatusByRegistrationId[reg._id] === 'waitlisted' && reg.status === 'confirmed')
        .map((reg: any) => reg.event?.title || 'an event');

      if (promotedEventTitles.length > 0) {
        const uniqueTitles = [...new Set(promotedEventTitles)];
        setPromotionNotice(
          uniqueTitles.length === 1
            ? `Great news! You have been promoted from waitlist to confirmed for ${uniqueTitles[0]}.`
            : `Great news! You have been promoted from waitlist to confirmed for ${uniqueTitles.length} events.`
        );
      }

      const nextSnapshot = registrations.reduce((acc: Record<string, string>, reg: any) => {
        acc[reg._id] = reg.status;
        return acc;
      }, {});
      if (statusSnapshotKey) {
        localStorage.setItem(statusSnapshotKey, JSON.stringify(nextSnapshot));
      }

      setMyRegistrations(registrations);
    } catch (err: any) {
      setError(err.message || 'Failed to load your registered events');
    } finally {
      setLoading(false);
    }
  };

  // --- Manage Modal Handlers ---
  const openManageModal = (reg: any) => {
    setManagingReg(reg);
    setEditTeamMembers(reg.teamMembers || []);
    setSearchQuery('');
  };

  const handleSearchStudent = async () => {
    if (!searchQuery.trim()) return;
    try {
      setIsSearching(true);
      const response = await registrationService.searchStudent(searchQuery);
      const foundStudent = response.data; 

      if (editTeamMembers.some(m => m._id === foundStudent._id)) {
        return alert("This student is already on the team.");
      }
      setEditTeamMembers([...editTeamMembers, foundStudent]);
      setSearchQuery(''); 
    } catch (err: any) {
      alert(err.message || "Student not found.");
    } finally {
      setIsSearching(false);
    }
  };

  const removeMember = (idToRemove: string) => {
    setEditTeamMembers(editTeamMembers.filter(m => m._id !== idToRemove));
  };

  const submitTeamUpdate = async () => {
    if (!managingReg) return;
    const event = managingReg.event;
    const totalSize = editTeamMembers.length + 1; // +1 for captain

    if (totalSize < event.minTeamSize || totalSize > event.maxTeamSize) {
      return alert(`Team must be between ${event.minTeamSize} and ${event.maxTeamSize} members.`);
    }

    try {
      setIsUpdating(true);
      const memberIds = editTeamMembers.map(m => m._id);
      await registrationService.updateTeamMembers(managingReg._id, memberIds);
      
      alert("Team updated successfully!");
      setManagingReg(null);
      fetchMyRegistrations();
    } catch (err: any) {
      alert(err.message || "Failed to update team.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!managingReg) return;
    if (window.confirm("Are you absolutely sure you want to cancel this registration? You will lose your spot entirely.")) {
      try {
        setIsUpdating(true);
        const response = await registrationService.cancelRegistration(managingReg._id);
        alert(response.message || "Registration cancelled.");
        setManagingReg(null);
        fetchMyRegistrations();
      } catch (err: any) {
        alert(err.message || "Failed to cancel.");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 mt-20 font-medium">Loading your events...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Registered Events</h1>
            <p className="text-slate-400 mt-1">Track your upcoming tournaments and manage your teams.</p>
          </div>
          <Link to="/student/events" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg shadow-indigo-500/20 border border-indigo-500/50">
            Browse More Events
          </Link>
        </div>

        {promotionNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{promotionNotice}</p>
            <button
              onClick={() => setPromotionNotice(null)}
              className="text-xs font-semibold text-emerald-200 hover:text-white transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* REGISTRATIONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myRegistrations.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-[#1e1e2d] rounded-2xl border border-slate-700/50 shadow-sm">
              <div className="text-5xl mb-4 opacity-50">🎫</div>
              <h3 className="text-xl font-bold text-white mb-2">No Events Yet</h3>
              <p className="text-slate-400 max-w-md mb-6">You haven't registered for any events.</p>
              <Link to="/student/events" className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 font-bold rounded-lg hover:bg-indigo-500/20 transition border border-indigo-500/20">Find an Event</Link>
            </div>
          ) : (
            myRegistrations.map((reg) => {
              const event = reg.event || {};
              const isTeam = reg.registrationType === 'team';
              
              const primaryId = typeof reg.primaryStudent === 'object' ? reg.primaryStudent._id : reg.primaryStudent;
              const isCaptain = primaryId === currentUserId;
              
              const isPastDeadline = event.registrationDeadline ? new Date() > new Date(event.registrationDeadline) : false;
              const isModifiable = event.status === 'upcoming' && !isPastDeadline;
              
              // Status Colors (Dark Mode variations)
              let statusConfig = { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', label: 'Pending' };
              if (reg.status === 'confirmed') statusConfig = { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: '✓ Confirmed' };
              if (reg.status === 'waitlisted') statusConfig = { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: '⏳ Waitlisted' };
              if (reg.status === 'cancelled') statusConfig = { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: '✕ Cancelled' };

              return (
                <div key={reg._id} className="bg-[#1e1e2d] rounded-2xl shadow-sm border border-slate-700/50 overflow-hidden flex flex-col hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.15)] transition duration-300">
                  <div className={`px-5 py-3 border-b flex justify-between items-center ${statusConfig.color}`}>
                    <span className="font-bold text-sm uppercase tracking-wide">{statusConfig.label}</span>
                    <span className="text-xs font-semibold opacity-80">{new Date(reg.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{event.title || 'Unknown Event'}</h3>

                    <div className="mt-3 mb-5 p-4 rounded-xl border border-slate-700 bg-[#151521]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-1 border rounded ${isTeam ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>
                          {isTeam ? '🏆 TEAM' : '👤 SOLO'}
                        </span>
                        {isTeam && (
                           <span className={`text-xs font-bold px-2 py-1 border rounded ${isCaptain ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                             {isCaptain ? 'Captain' : 'Member'}
                           </span>
                        )}
                      </div>
                      
                      {isTeam && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Team Name</p>
                          <p className="text-base font-bold text-white">{reg.teamName}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5 text-sm text-slate-400 mt-auto border-t border-slate-700/50 pt-4 mb-4">
                      <div className="flex items-center gap-3"><span className="text-lg opacity-80">📅</span><span>{event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA'}</span></div>
                      <div className="flex items-center gap-3"><span className="text-lg opacity-80">📍</span><span className="truncate">{event.venue || 'TBA'}</span></div>
                    </div>

                    {(isCaptain || !isTeam) && isModifiable && reg.status !== 'cancelled' && (
                      <button 
                        onClick={() => openManageModal(reg)}
                        className="w-full py-2.5 border border-indigo-500/30 text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-500/10 hover:border-indigo-500/50 transition"
                      >
                        Manage Registration
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* MANAGE REGISTRATION MODAL                                         */}
        {/* ----------------------------------------------------------------- */}
        {managingReg && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1e1e2d] border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-2 text-white">Manage Registration</h2>
              <p className="text-slate-400 text-sm mb-6">{managingReg.event?.title}</p>
              
              {/* If Team Event, show Member Editor */}
              {managingReg.registrationType === 'team' && (
                <div className="mb-6 space-y-4">
                  <div className="bg-[#151521] p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Team Name</p>
                    <p className="text-base font-bold text-white">{managingReg.teamName}</p>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold text-slate-300">Edit Team Members</label>
                      <span className={`text-xs font-semibold ${editTeamMembers.length + 1 >= managingReg.event.minTeamSize ? 'text-green-400' : 'text-red-400'}`}>
                        {editTeamMembers.length + 1} / {managingReg.event.maxTeamSize} Members
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {/* Captain */}
                      <div className="flex justify-between items-center p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <span className="text-sm font-medium text-indigo-300">👤 You (Captain)</span>
                      </div>

                      {/* Members */}
                      {editTeamMembers.map((member) => (
                        <div key={member._id} className="flex justify-between items-center p-2.5 bg-[#151521] border border-slate-700 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-white">{member.name}</p>
                            <p className="text-xs text-slate-400">{member.email}</p>
                          </div>
                          <button onClick={() => removeMember(member._id)} className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 rounded">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Search Input */}
                    {editTeamMembers.length + 1 < managingReg.event.maxTeamSize && (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()} 
                          placeholder="Search by Email/ID" 
                          className="flex-grow bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" 
                        />
                        <button 
                          type="button" 
                          onClick={handleSearchStudent} 
                          disabled={isSearching || !searchQuery.trim()} 
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition"
                        >
                          {isSearching ? '...' : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-slate-700/50 pt-6 space-y-3">
                {managingReg.registrationType === 'team' && (
                  <button onClick={submitTeamUpdate} disabled={isUpdating} className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition">
                    {isUpdating ? 'Saving...' : 'Save Team Changes'}
                  </button>
                )}
                
                <button onClick={handleCancelRegistration} disabled={isUpdating} className="w-full px-5 py-2.5 border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/10 hover:border-red-500/50 transition">
                  {isUpdating ? 'Processing...' : 'Cancel Entire Registration'}
                </button>

                <button onClick={() => setManagingReg(null)} disabled={isUpdating} className="w-full px-5 py-2.5 border border-slate-600 text-slate-300 rounded-lg font-medium hover:bg-slate-800 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
}