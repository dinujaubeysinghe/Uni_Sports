import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface BookingRequest {
  _id: string;
  coach: { _id: string; name: string; email: string; phone: string };
  sport: { _id: string; name: string };
  location: { _id: string; name: string };
  date: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  purpose: string;
  equipmentNeeded: string[];
  specialRequirements: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  hasClash: boolean;
  clashDetails?: any;
  adminNotes?: string;
}

interface AdminLocationBookingManagementProps {
  token: string;
  adminId: string;
}

const AdminLocationBookingManagement: React.FC<AdminLocationBookingManagementProps> = ({ token, adminId }) => {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingRequest[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'declined' | 'cancelled'>('pending');
  const [searchCoach, setSearchCoach] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [loading, setLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL ?? 'https://unisports-8upjo.ondigitalocean.app';

  // Fetch all bookings
  useEffect(() => {
    fetchBookings();
  }, [selectedStatus]);

  // Apply filters
  useEffect(() => {
    let filtered = bookings.filter(booking =>
      booking.coach?.name?.toLowerCase().includes(searchCoach.toLowerCase()) ?? false
    );
    setFilteredBookings(filtered);
  }, [bookings, searchCoach]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/location-bookings?status=${selectedStatus}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data.data || []);
    } catch (err: any) {
      toast.error('Failed to load bookings: ' + (err.message || 'Unknown error'));
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/location-bookings/${bookingId}/approve`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to approve booking');
      toast.success('Booking approved and coach notified');
      setSelectedStatus('approved');
      fetchBookings();
    } catch (err: any) {
      toast.error('Failed to approve: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/location-bookings/${bookingId}/decline`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ adminNotes: declineReason })
        }
      );

      if (!response.ok) throw new Error('Failed to decline booking');
      toast.success('Booking declined and coach notified');
      setDeclineReason('');
      setShowDeclineForm(false);
      setSelectedBooking(null);
      setSelectedStatus('declined');
      fetchBookings();
    } catch (err: any) {
      toast.error('Failed to decline: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">📋 Location Booking Management</h2>
        <p className="text-slate-400">Review, approve, or decline location booking requests from coaches</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved</option>
            <option value="declined">❌ Declined</option>
            <option value="cancelled">🚫 Cancelled</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-200 mb-2">Search Coach</label>
          <Input
            type="text"
            placeholder="Enter coach name..."
            value={searchCoach}
            onChange={(e) => setSearchCoach(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-slate-300">
        Found {filteredBookings.length} request(s)
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-slate-400">
          <p>Loading bookings...</p>
        </div>
      )}

      {/* Bookings List */}
      {!loading && filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/40 rounded-lg border border-slate-700/80">
          <p className="text-slate-400">No {selectedStatus} booking requests found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map(booking => (
            <div
              key={booking._id}
              className={`rounded-lg border p-4 transition-all ${
                booking.hasClash
                  ? 'bg-red-950/20 border-red-500/50'
                  : 'bg-slate-800/40 border-slate-700/80'
              }`}
            >
              {/* Clash Warning */}
              {booking.hasClash && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold">⚠️ CONFLICT DETECTED</p>
                    {booking.clashDetails && (
                      <div className="text-sm text-red-300 mt-1 space-y-1">
                        <p>Sport: <span className="font-mono">{booking.clashDetails.clashingSport}</span></p>
                        <p>Coach: <span className="font-mono">{booking.clashDetails.clashingCoach}</span></p>
                        <p>Time: <span className="font-mono">{booking.clashDetails.clashTime}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top Row - Coach & Status */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{booking.coach?.name || 'Unknown Coach'}</h3>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>📧 {booking.coach?.email || 'N/A'}</p>
                    <p>📱 {booking.coach?.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {booking.status === 'approved' && <Badge className="bg-green-500">✅ Approved</Badge>}
                  {booking.status === 'declined' && <Badge className="bg-red-500">❌ Declined</Badge>}
                  {booking.status === 'pending' && <Badge className="bg-yellow-500">⏳ Pending</Badge>}
                  {booking.status === 'cancelled' && <Badge className="bg-gray-500">🚫 Cancelled</Badge>}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-slate-700/80">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Sport</p>
                  <p className="text-sm font-semibold text-white mt-1">{booking.sport?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Location</p>
                  <p className="text-sm font-semibold text-white mt-1">{booking.location?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Date</p>
                  <p className="text-sm font-semibold text-white mt-1">{new Date(booking.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Time</p>
                  <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {booking.startTime} - {booking.endTime}
                  </p>
                </div>
              </div>

              {/* Purpose & Requirements */}
              <div className="space-y-3 mb-4 pb-4 border-b border-slate-700/80">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Purpose</p>
                  <p className="text-sm text-slate-200 mt-1">{booking.purpose}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Participants</p>
                  <p className="text-sm text-slate-200 mt-1">{booking.participantCount} people</p>
                </div>
                {booking.equipmentNeeded?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Equipment Needed</p>
                    <div className="flex flex-wrap gap-2">
                      {booking.equipmentNeeded.map((eq, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {booking.specialRequirements && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Special Requirements</p>
                    <p className="text-sm text-slate-200 mt-1">{booking.specialRequirements}</p>
                  </div>
                )}
              </div>

              {/* Admin Notes if declined */}
              {booking.status === 'declined' && booking.adminNotes && (
                <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/50 rounded">
                  <p className="text-xs text-orange-400 font-semibold mb-1">Decline Reason</p>
                  <p className="text-sm text-orange-300">{booking.adminNotes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {selectedStatus === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleApprove(booking._id)}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDeclineForm(true);
                      }}
                      disabled={loading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </>
                )}
              </div>

              {/* Decline Form */}
              {showDeclineForm && selectedBooking?._id === booking._id && (
                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-red-500/50">
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Reason for declining:
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-red-500 focus:outline-none mb-3"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDecline(booking._id)}
                      disabled={!declineReason.trim() || loading}
                      variant="destructive"
                      className="flex-1"
                    >
                      Send Decline
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDeclineForm(false);
                        setDeclineReason('');
                        setSelectedBooking(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLocationBookingManagement;
