import React, { useState, useEffect } from 'react';
import { eventService } from '../../../services/eventService';
import { sportService } from '../../../services/sportService';
import { registrationService } from '../../../services/registrationService';
import { DashboardLayout } from "@/components/DashboardLayout";

// --- TypeScript Interfaces ---
interface Sport {
  _id: string;
  name: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  sport: Sport;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  venue: string;
  maxParticipants: number;
  eventType: 'solo' | 'team';
  minTeamSize?: number;
  maxTeamSize?: number;
  registrationFormUrl?: string;
  status: string;
  imageUrl?: string;
  confirmedCount?: number;
}

interface Registration {
  _id: string;
  primaryStudent: { _id: string; name: string; email: string };
  registrationType: 'individual' | 'team';
  teamName?: string;
  teamMembers: { _id: string; name: string; email: string }[];
  status: 'pending' | 'confirmed' | 'waitlisted' | 'cancelled';
  createdAt: string;
}
const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Main Events Grid
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State (Create/Edit Event)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '', description: '', sport: '', startDate: '', endDate: '',
    registrationDeadline: '', venue: '', maxParticipants: 10,
    eventType: 'solo' as 'solo' | 'team', minTeamSize: 2, maxTeamSize: 5,
    registrationFormUrl: '', status: 'upcoming', image: null as File | null
  });

  // --- Detailed Registrations View State ---
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsRes, sportsRes] = await Promise.all([
        eventService.getAll(),
        sportService.getAll()
      ]);
      setEvents((eventsRes as any).data || eventsRes || []);
      setSports((sportsRes as any).data || sportsRes || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Registration View Handlers ---
  const handleViewAttendees = async (event: Event) => {
    setViewingEvent(event);
    try {
      setLoadingRegistrations(true);
      const res = await registrationService.getEventRegistrations(event._id);
      setRegistrations(res.data || []);
    } catch (err: any) {
      alert(err.message || "Failed to load attendees.");
      setViewingEvent(null);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleUpdateRegistrationStatus = async (regId: string, newStatus: any) => {
    try {
      await registrationService.updateRegistrationStatus(regId, newStatus);
      
      setRegistrations(prev => prev.map(reg => 
        reg._id === regId ? { ...reg, status: newStatus } : reg
      ));
      
      fetchData(); 
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  // --- Event CRUD Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFormData({ ...formData, image: e.target.files[0] });
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const openEditModal = (event: Event) => {
    setFormData({
      title: event.title, description: event.description, sport: event.sport?._id || '',
      startDate: formatDateForInput(event.startDate), endDate: formatDateForInput(event.endDate),
      registrationDeadline: formatDateForInput(event.registrationDeadline), venue: event.venue,
      maxParticipants: event.maxParticipants, eventType: event.eventType || 'solo',
      minTeamSize: event.minTeamSize || 2, maxTeamSize: event.maxTeamSize || 5,
      registrationFormUrl: event.registrationFormUrl || '', status: event.status, image: null
    });
    setEditingId(event._id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', sport: '', startDate: '', endDate: '',
      registrationDeadline: '', venue: '', maxParticipants: 10,
      eventType: 'solo', minTeamSize: 2, maxTeamSize: 5,
      registrationFormUrl: '', status: 'upcoming', image: null
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(formData.endDate) <= new Date(formData.startDate)) return alert("End date must be after start date");
    if (formData.eventType === 'team') {
      if (Number(formData.minTeamSize) > Number(formData.maxTeamSize)) return alert("Min team size cannot be greater than max team size.");
    }

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'image' && value) submitData.append('image', value as File);
      else if (value !== null && value !== undefined && key !== 'image') {
        if (formData.eventType === 'solo' && (key === 'minTeamSize' || key === 'maxTeamSize')) return;
        submitData.append(key, String(value)); 
      }
    });

    try {
      if (editingId) await eventService.update(editingId, submitData);
      else await eventService.create(submitData);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error saving event");
    }
  };

  const handleDelete = async (id: string, status: string) => {
    if (status === 'ongoing') return alert("Cannot delete an ongoing event.");
    if (window.confirm('Are you sure you want to permanently delete this event?')) {
      try {
        await eventService.delete(id);
        fetchData();
      } catch (err: any) { alert(err.message || 'Failed to delete'); }
    }
  };

  const filteredEvents = events.filter(ev => {
    const matchesStatus = filterStatus === 'all' || ev.status === filterStatus;
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || ev.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) return <div className="p-10 text-center text-slate-400 font-medium mt-20">Loading Events...</div>;

  // =========================================================================
  // RENDER 1: DETAILED REGISTRATIONS VIEW (If an event is selected)
  // =========================================================================
  if (viewingEvent) {
    const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;

    return (
        <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-2">
            <button 
              onClick={() => setViewingEvent(null)}
              className="flex items-center text-sm font-semibold text-slate-400 hover:text-indigo-400 transition"
            >
              ← Back to Events
            </button>
          </div>

          <div className="bg-[#1e1e2d] rounded-xl shadow-sm border border-slate-700/50 p-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{viewingEvent.title}</h1>
              <p className="text-slate-400 text-sm mt-1">
                {viewingEvent.eventType === 'team' ? 'Team Event' : 'Solo Event'} | 📍 {viewingEvent.venue}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-white">
                {confirmedCount} <span className="text-lg text-slate-500 font-medium">/ {viewingEvent.maxParticipants}</span>
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Confirmed {viewingEvent.eventType === 'team' ? 'Teams' : 'Students'}</p>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="bg-[#1e1e2d] rounded-xl shadow-sm border border-slate-700/50 overflow-hidden">
            {loadingRegistrations ? (
              <div className="p-10 text-center text-slate-400">Loading attendees...</div>
            ) : registrations.length === 0 ? (
              <div className="p-10 text-center text-slate-400">No one has registered for this event yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#151521] border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <th className="p-4">Registrant / Team</th>
                      <th className="p-4">Members</th>
                      <th className="p-4">Date Registered</th>
                      <th className="p-4 text-right">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {registrations.map(reg => (
                      <tr key={reg._id} className="hover:bg-[#151521]/50 transition">
                        {/* Column 1: Primary Info */}
                        <td className="p-4">
                          {reg.registrationType === 'team' ? (
                            <div>
                              <p className="font-bold text-white text-base">{reg.teamName}</p>
                              <p className="text-xs text-indigo-400 font-semibold mt-0.5">Captain: {reg.primaryStudent?.name}</p>
                              <p className="text-xs text-slate-400">{reg.primaryStudent?.email}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-white text-base">{reg.primaryStudent?.name}</p>
                              <p className="text-xs text-slate-400">{reg.primaryStudent?.email}</p>
                            </div>
                          )}
                        </td>

                        {/* Column 2: Members List */}
                        <td className="p-4">
                          {reg.registrationType === 'team' ? (
                            <div className="space-y-1">
                              {reg.teamMembers?.length > 0 ? (
                                reg.teamMembers.map(member => (
                                  <p key={member._id} className="text-xs text-slate-300">• {member.name}</p>
                                ))
                              ) : (
                                <p className="text-xs text-slate-500 italic">No extra members</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">N/A (Solo)</span>
                          )}
                        </td>

                        {/* Column 3: Date */}
                        <td className="p-4 text-sm text-slate-400">
                          {new Date(reg.createdAt).toLocaleDateString()}
                        </td>

                        {/* Column 4: Status Dropdown */}
                        <td className="p-4 text-right">
                          <select 
                            value={reg.status}
                            onChange={(e) => handleUpdateRegistrationStatus(reg._id, e.target.value)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border outline-none cursor-pointer bg-[#151521] appearance-none text-center ${
                              reg.status === 'confirmed' ? 'border-green-500/30 text-green-400' :
                              reg.status === 'waitlisted' ? 'border-yellow-500/30 text-yellow-400' :
                              reg.status === 'cancelled' ? 'border-red-500/30 text-red-400' :
                              'border-slate-500/30 text-slate-300'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="waitlisted">Waitlisted</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
    );
  }

  // =========================================================================
  // RENDER 2: MAIN EVENTS GRID (Default View)
  // =========================================================================
  return (
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Event Management</h1>
            <p className="text-slate-400 text-sm mt-1">Create and track university sports tournaments.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg shadow-indigo-500/20 border border-indigo-500/50"
          >
            + Add New Event
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-[#1e1e2d] p-4 rounded-xl shadow-lg border border-slate-700/50">
          <input 
            type="text" 
            placeholder="Search by title or venue..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="flex-grow bg-[#151521] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
          />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="bg-[#151521] border border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-[180px] appearance-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* EVENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-[#1e1e2d] rounded-xl border border-slate-700/50 shadow-sm">
              No events match your search criteria.
            </div>
          ) : (
            filteredEvents.map(event => {
              const confirmedCount = event.confirmedCount || 0;
              const progressPct = event.maxParticipants > 0 ? Math.min(100, (confirmedCount / event.maxParticipants) * 100) : 0;
              
              let statusBadgeColor = 'bg-slate-500/20 text-slate-300 border-slate-500/30';
              if (event.status === 'upcoming') statusBadgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              if (event.status === 'ongoing') statusBadgeColor = 'bg-green-500/20 text-green-300 border-green-500/30';
              if (event.status === 'cancelled') statusBadgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';

              return (
                <div key={event._id} className="bg-[#1e1e2d] rounded-xl border border-slate-700/50 overflow-hidden flex flex-col hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.15)] transition duration-300">
                  <div className="h-40 bg-[#151521] relative border-b border-slate-700/50 overflow-hidden group">
                    {event.imageUrl ? (
                      <img src={`${API_BASE}${event.imageUrl}`} alt={event.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium text-sm">No Banner Image</div>
                    )}
                    <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded shadow-sm border backdrop-blur-md ${statusBadgeColor}`}>
                      {event.status}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-white mb-1 leading-tight line-clamp-1">{event.title}</h3>
                    <p className="text-sm font-semibold text-indigo-400 mb-4">{event.sport?.name || 'General Event'}</p>
                    
                    <div className="text-sm text-slate-400 space-y-2 mb-4">
                      <p>📅 {new Date(event.startDate).toLocaleDateString()}</p>
                      <p className="truncate">📍 {event.venue}</p>
                    </div>

                    <div className="mb-4">
                      <span className="inline-block bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold px-2 py-1 rounded">
                        {event.eventType === 'team' ? `🏆 Team Event (${event.minTeamSize}-${event.maxTeamSize} members)` : '👤 Solo Event'}
                      </span>
                    </div>

                    <div className="mt-auto mb-5 space-y-2">
                      <div className="flex justify-between text-xs font-medium text-slate-400">
                        <span>{event.eventType === 'team' ? 'Teams Registered' : 'Registrations'}</span>
                        <span className="text-white">{confirmedCount} / {event.maxParticipants}</span>
                      </div>
                      <div className="w-full bg-[#151521] border border-slate-700/50 rounded-full h-2">
                        <div className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${progressPct}%` }}></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                        <div 
                          onClick={() => handleViewAttendees(event)}
                          className="text-xs text-indigo-400 font-semibold hover:text-indigo-300 cursor-pointer transition"
                        >
                          View {confirmedCount} Attendees ➔ 
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={() => openEditModal(event)} className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition">Edit</button>
                            <button onClick={() => handleDelete(event._id, event.status)} disabled={event.status === 'ongoing'} className="text-sm font-medium text-slate-400 hover:text-red-400 disabled:opacity-50 transition">Delete</button>
                        </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* CREATE / EDIT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1e1e2d] border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Edit Event' : 'Create New Event'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Event Title *</label>
                    <input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Description *</label>
                    <textarea name="description" required rows={3} value={formData.description} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Sport *</label>
                    <select name="sport" required value={formData.sport} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer">
                      <option value="" disabled>Select a Sport</option>
                      {sports.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Venue *</label>
                    <input type="text" name="venue" required value={formData.venue} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>

                  <div className="md:col-span-2 p-4 bg-[#151521] rounded-lg border border-slate-700">
                    <label className="block text-sm font-semibold text-slate-200 mb-3">Registration Type *</label>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center cursor-pointer text-slate-300">
                        <input type="radio" name="eventType" value="solo" checked={formData.eventType === 'solo'} onChange={handleInputChange} className="mr-2 accent-indigo-500" /> Solo
                      </label>
                      <label className="flex items-center cursor-pointer text-slate-300">
                        <input type="radio" name="eventType" value="team" checked={formData.eventType === 'team'} onChange={handleInputChange} className="mr-2 accent-indigo-500" /> Team
                      </label>
                    </div>
                    {formData.eventType === 'team' && (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-700/50">
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Min Members</label>
                          <input type="number" name="minTeamSize" min="2" value={formData.minTeamSize} onChange={handleInputChange} className="w-full bg-[#1e1e2d] border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Max Members</label>
                          <input type="number" name="maxTeamSize" min={formData.minTeamSize} value={formData.maxTeamSize} onChange={handleInputChange} className="w-full bg-[#1e1e2d] border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Start Date *</label>
                    <input type="date" name="startDate" required value={formData.startDate} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">End Date *</label>
                    <input type="date" name="endDate" required value={formData.endDate} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Deadline *</label>
                    <input type="date" name="registrationDeadline" required value={formData.registrationDeadline} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none [color-scheme:dark]" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Max Capacity *</label>
                    <input type="number" name="maxParticipants" required min="1" value={formData.maxParticipants} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                  </div>
                  
                  {/* THE EVENT STATUS DROPDOWN (Only visible when editing an existing event) */}
                  {editingId && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Event Status</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer">
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Banner Image</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 hover:file:text-indigo-300 outline-none transition file:cursor-pointer" />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-8 border-t border-slate-700/50 pt-5">
                  <button type="button" onClick={resetForm} className="px-5 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20">{editingId ? 'Save Changes' : 'Create Event'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
  );
}