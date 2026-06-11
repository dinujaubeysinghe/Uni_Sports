/**
 * Sport Coach Assignment Component - ADMIN ONLY
 * Allows admins to assign coaches to sports
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Coach {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  assignedSports: string[];
}

interface Sport {
  _id: string;
  name: string;
  coaches: Coach[];
  description: string;
  category: string;
}

interface AdminSportCoachAssignmentProps {
  token: string;
  adminId: string;
}

const AdminSportCoachAssignment: React.FC<AdminSportCoachAssignmentProps> = ({
  token,
  adminId,
}) => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [assignedCoaches, setAssignedCoaches] = useState<Coach[]>([]);
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");


  /**
   * Fetch all sports
   */
  const fetchSports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sports?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch sports');
      const data = await res.json();
      setSports(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sports');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE]);

  /**
   * Fetch coaches for selected sport
   */
  const loadCoaches = useCallback(async (sportId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [assignedRes, availableRes] = await Promise.all([
        fetch(`${API_BASE}/api/sports/${sportId}/coaches`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/sports/${sportId}/available-coaches`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!assignedRes.ok || !availableRes.ok) {
        throw new Error('Failed to fetch coaches');
      }

      const assignedData = await assignedRes.json();
      const availableData = await availableRes.json();

      setAssignedCoaches(assignedData.data);
      setAvailableCoaches(availableData.data);
      setSelectedCoachId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coaches');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE]);

  /**
   * Handle sport selection
   */
  const handleSelectSport = (sport: Sport) => {
    setSelectedSport(sport);
    loadCoaches(sport._id);
  };

  /**
   * Assign coach to sport
   */
  const handleAssignCoach = async (coachId: string) => {
    if (!selectedSport) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/sports/${selectedSport._id}/coaches/${coachId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign coach');
      }

      const data = await response.json();
      const coachName = data.data.coaches.find((c: Coach) => c._id === coachId)?.name;
      setSuccess(`${coachName} assigned to ${selectedSport.name} successfully!`);

      // Refresh coaches
      await loadCoaches(selectedSport._id);
      setSelectedCoachId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign coach');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove coach from sport
   */
  const handleRemoveCoach = async (coachId: string, coachName: string) => {
    if (!selectedSport) return;

    if (!window.confirm(`Remove ${coachName} from ${selectedSport.name}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/sports/${selectedSport._id}/coaches/${coachId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove coach');
      }

      setSuccess(`${coachName} removed from ${selectedSport.name} successfully!`);
      await loadCoaches(selectedSport._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove coach');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  const filteredSports = sports.filter(
    (sport) =>
      sport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sport.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-red-700 text-sm">{error}</span>
          <button className="ml-auto text-red-700 hover:text-red-900" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <span className="text-xl">✓</span>
          <span className="text-green-700 text-sm">{success}</span>
          <button className="ml-auto text-green-700 hover:text-green-900" onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sports List Panel */}
        <div className="lg:col-span-1 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col max-h-96">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 text-white flex items-center justify-between">
            <h2 className="font-bold text-lg">Sports</h2>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">{sports.length}</span>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-slate-700">
            <input
              type="text"
              placeholder="Search sports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Sports List */}
          <div className="flex-1 overflow-y-auto">
            {loading && !selectedSport ? (
              <div className="p-8 text-center text-slate-400">Loading sports...</div>
            ) : filteredSports.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No sports found</div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredSports.map((sport) => (
                  <button
                    key={sport._id}
                    onClick={() => handleSelectSport(sport)}
                    className={`w-full text-left p-4 transition-colors ${
                      selectedSport?._id === sport._id
                        ? 'bg-blue-600/30 border-l-4 border-blue-500'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <h4 className="font-semibold text-white text-sm">{sport.name}</h4>
                    <p className="text-xs text-slate-400 capitalize mt-1">{sport.category}</p>
                    <span className="inline-block mt-2 text-xs bg-blue-600/50 text-blue-200 px-2 py-1 rounded">
                      {sport.coaches.length} coach(es)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coach Management Panel */}
        {selectedSport ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedSport.name}</h2>
                <button
                  onClick={() => setSelectedSport(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-slate-300">{selectedSport.description}</p>
            </div>

            {/* Assigned Coaches */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Assigned Coaches ({assignedCoaches.length})</h3>
              {assignedCoaches.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-900/50 rounded">
                  <p>No coaches assigned yet</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {assignedCoaches.map((coach) => (
                    <div key={coach._id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{coach.name}</p>
                        <p className="text-sm text-slate-300">{coach.specialization}</p>
                        <p className="text-xs text-slate-400">{coach.email}</p>
                        {coach.phone && <p className="text-xs text-slate-400">{coach.phone}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveCoach(coach._id, coach.name)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign New Coach */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Assign New Coach</h3>
              {availableCoaches.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-900/50 rounded">
                  <p>All coaches are already assigned to this sport</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedCoachId}
                    onChange={(e) => setSelectedCoachId(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select a coach --</option>
                    {availableCoaches.map((coach) => (
                      <option key={coach._id} value={coach._id}>
                        {coach.name} ({coach.specialization})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssignCoach(selectedCoachId)}
                    disabled={loading || !selectedCoachId}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold rounded-lg transition"
                  >
                    {loading ? 'Assigning...' : '+ Assign Coach'}
                  </button>
                </div>
              )}
            </div>

            {/* Available Coaches */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Available Coaches ({availableCoaches.length})</h3>
              {availableCoaches.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-900/50 rounded">
                  <p>No available coaches</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-64 overflow-y-auto">
                  {availableCoaches.map((coach) => (
                    <div key={coach._id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                      <p className="font-semibold text-white">{coach.name}</p>
                      <p className="text-sm text-slate-300 mt-1">{coach.specialization}</p>
                      <p className="text-xs text-slate-400">{coach.email}</p>
                      {coach.phone && <p className="text-xs text-slate-400">{coach.phone}</p>}
                      <p className="text-xs text-slate-400 mt-2">
                        Assigned to {coach.assignedSports?.length || 0} other sport(s)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 bg-slate-800 rounded-lg border border-slate-700 text-center">
            <p className="text-slate-400 text-lg">Select a sport to manage coaches</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSportCoachAssignment;
