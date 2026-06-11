/**
 * Coach Location Booking Request Component
 * Allows coaches to request location bookings with clash detection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  _id: string;
  name: string;
  type: string;
  address: string;
  capacity: number;
}

interface Sport {
  _id: string;
  name: string;
}

interface BookingRequest {
  _id: string;
  location: Location;
  sport: Sport;
  date: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  purpose: string;
  equipmentNeeded?: string[];
  specialRequirements?: string;
  status: string;
  hasClash: boolean;
  adminNotes?: string;
}

interface CoachLocationBookingRequestProps {
  token: string;
  coachId: string;
  assignedSports: string[];
}

const CoachLocationBookingRequest: React.FC<CoachLocationBookingRequestProps> = ({
  token,
  coachId,
  assignedSports,
}) => {
  const [tab, setTab] = useState<'new' | 'my-requests'>('new');
  const [locations, setLocations] = useState<Location[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    sport: '',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    participantCount: '',
    purpose: '',
    equipmentNeeded: [] as string[],
    specialRequirements: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL ?? 'https://unisports-8upjo.ondigitalocean.app/';

  /**
   * Fetch locations and sports on mount
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, sportRes] = await Promise.all([
          fetch(`${API_BASE}api/locations`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}api/sports`, { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        if (locRes.ok && sportRes.ok) {
          const locData = await locRes.json();
          const sportData = await sportRes.json();
          setLocations(locData.data || []);
          
          // Filter to only assigned sports
          const filtered = (sportData.data || []).filter((s: Sport) => assignedSports.includes(s._id));
          setSports(filtered);
          
          // Log for debugging
          if (filtered.length === 0 && assignedSports.length > 0) {
            console.warn('No sports found matching assigned sports. Assigned IDs:', assignedSports);
          }
        } else {
          console.error('Failed to fetch locations or sports');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };

    fetchData();
  }, [API_BASE, token, assignedSports]);

  /**
   * Fetch user's booking requests
   */
  const fetchMyRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}api/location-bookings/coach/my-requests`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch booking requests');

      const data = await response.json();
      setBookingRequests(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE]);

  // Fetch requests when tab changes
  useEffect(() => {
    if (tab === 'my-requests') {
      fetchMyRequests();
    }
  }, [tab, fetchMyRequests]);

  /**
   * Handle form input change
   */
  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Submit booking request
   */
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setClashWarning(null);

    try {
      if (
        !formData.sport ||
        !formData.location ||
        !formData.date ||
        !formData.startTime ||
        !formData.endTime ||
        !formData.participantCount ||
        !formData.purpose
      ) {
        throw new Error('Please fill in all required fields');
      }

      const response = await fetch(`${API_BASE}api/location-bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sport: formData.sport,
          location: formData.location,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          participantCount: parseInt(formData.participantCount),
          purpose: formData.purpose,
          equipmentNeeded: formData.equipmentNeeded,
          specialRequirements: formData.specialRequirements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || data.error || `Error: ${response.status} ${response.statusText}`;
        if (response.status === 409) {
          setClashWarning(errorMsg);
          toast.warning(errorMsg);
          return;
        }

        throw new Error(errorMsg);
      }

      toast.success('Booking request submitted successfully!');

      // Reset form
      setFormData({
        sport: '',
        location: '',
        date: '',
        startTime: '',
        endTime: '',
        participantCount: '',
        purpose: '',
        equipmentNeeded: [],
        specialRequirements: '',
      });

      // Refresh requests
      setTimeout(() => {
        setTab('my-requests');
        fetchMyRequests();
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit request';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete/Cancel booking request
   */
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}api/location-bookings/${requestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to cancel request');

      toast.success('Booking request cancelled successfully');
      fetchMyRequests();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel request';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700/80">
        <button
          onClick={() => setTab('new')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'new'
              ? 'border-b-2 border-blue-500 text-white'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ➕ New Request
        </button>
        <button
          onClick={() => setTab('my-requests')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'my-requests'
              ? 'border-b-2 border-blue-500 text-white'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          📋 My Requests ({bookingRequests.length})
        </button>
      </div>

      {/* New Request Form */}
      {tab === 'new' && (
        <div className="space-y-4">
          {clashWarning && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-semibold">⚠️ Potential Conflict</p>
                <p className="text-sm text-yellow-300 mt-1">{typeof clashWarning === 'string' ? clashWarning : JSON.stringify(clashWarning)}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sport */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Sport *</label>
                <select
                  value={formData.sport}
                  onChange={(e) => handleFormChange('sport', e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Select Sport --</option>
                  {sports.map((sport) => (
                    <option key={sport._id} value={sport._id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Location *</label>
                <select
                  value={formData.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Select Location --</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Start Time *</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleFormChange('startTime', e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">End Time *</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleFormChange('endTime', e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Participant Count */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Participants *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.participantCount}
                  onChange={(e) => handleFormChange('participantCount', e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Purpose *</label>
              <textarea
                value={formData.purpose}
                onChange={(e) => handleFormChange('purpose', e.target.value)}
                placeholder="Describe the purpose of this booking..."
                rows={3}
                disabled={loading}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Special Requirements */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Special Requirements</label>
              <textarea
                value={formData.specialRequirements}
                onChange={(e) => handleFormChange('specialRequirements', e.target.value)}
                placeholder="Any special requirements for this booking..."
                rows={2}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <Button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </div>
      )}

      {/* My Requests */}
      {tab === 'my-requests' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              <p>Loading requests...</p>
            </div>
          ) : bookingRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/40 rounded-lg border border-slate-700/80">
              <p className="text-slate-400">No booking requests yet</p>
              <Button onClick={() => setTab('new')} className="mt-4">
                Create Your First Request
              </Button>
            </div>
          ) : (
            bookingRequests.map((request) => (
              <div
                key={request._id}
                className={`rounded-lg border p-4 transition-all ${
                  request.hasClash
                    ? 'bg-red-950/20 border-red-500/50'
                    : 'bg-slate-800/40 border-slate-700/80'
                }`}
              >
                {/* Clash Warning */}
                {request.hasClash && (
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-semibold">⚠️ CONFLICT DETECTED</p>
                      <p className="text-sm text-red-300 mt-1">This location has a booking conflict</p>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{request.location?.name}</h3>
                    <p className="text-sm text-slate-400">Sport: {request.sport?.name}</p>
                  </div>
                  <Badge
                    className={`text-xs ${
                      request.status === 'approved'
                        ? 'bg-green-500'
                        : request.status === 'declined'
                        ? 'bg-red-500'
                        : request.status === 'pending'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                  >
                    {request.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Date</p>
                    <p className="text-slate-200 mt-1">{new Date(request.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Time</p>
                    <p className="text-slate-200 mt-1">{request.startTime} - {request.endTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Participants</p>
                    <p className="text-slate-200 mt-1">{request.participantCount}</p>
                  </div>
                </div>

                {/* Purpose */}
                <div className="mb-3">
                  <p className="text-xs text-slate-400 uppercase mb-1">Purpose</p>
                  <p className="text-sm text-slate-200">{request.purpose}</p>
                </div>

                {/* Admin Notes if declined */}
                {request.status === 'declined' && request.adminNotes && (
                  <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/50 rounded">
                    <p className="text-xs text-orange-400 font-semibold mb-1">Admin Notes</p>
                    <p className="text-sm text-orange-300">{request.adminNotes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {['pending', 'declined'].includes(request.status) && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCancelRequest(request._id)}
                      disabled={loading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Request
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CoachLocationBookingRequest;
