import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Users, UserCheck, Trophy, Clock, AlertTriangle, Bell, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout"
import { toast } from "sonner";
import CoachLocationBookingRequest from "@/components/CoachLocationBookingRequest";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app" ;

interface Sport {
  _id: string;
  name: string;
  description: string;
  category: string;
  coaches: any[];
  icon?: string;
}

interface Session {
  _id: string;
  sport: {
    _id: string;
    name: string;
  };
  coach: {
    _id: string;
    name: string;
  };
  location: {
    _id: string;
    name: string;
  };
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledStudents: any[];
  status: string;
  createdAt: string;
}

export default function CoachDashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState<'sports' | 'sessions' | 'requests' | 'bookings' | 'notifications'>('sports');
  const [assignedSports, setAssignedSports] = useState<Sport[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Fetch assigned sports from API
  useEffect(() => {
    const fetchAssignedSports = async () => {
      if (!token || !user?.id) return;
      setLoading(true);
      try {
        // Fetch all sports
        const res = await fetch(`${API_BASE}/api/sports?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          // Filter sports where current coach is in the coaches array
          const mySports = data.data?.filter((sport: any) =>
            sport.coaches?.some((coach: any) => coach._id === user.id || coach === user.id)
          ) || [];
          setAssignedSports(mySports);
        }
      } catch (error) {
        console.error('Failed to fetch assigned sports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedSports();
  }, [token, user?.id]);

  // Fetch real sessions created by this coach
  useEffect(() => {
    const fetchCoachSessions = async () => {
      if (!token || !user?.id) return;
      setSessionsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/sessions/coach/my-sessions`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setMySessions(data.data || []);
        } else {
          console.error('Failed to fetch coach sessions');
          setMySessions([]);
        }
      } catch (error) {
        console.error('Failed to fetch coach sessions:', error);
        setMySessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchCoachSessions();
  }, [token, user?.id]);

  // Fetch real join requests from API
  useEffect(() => {
    const fetchJoinRequests = async () => {
      if (!token || !user?.id) return;
      setRequestsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/join-requests/coach/my-requests`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setJoinRequests(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch join requests:', error);
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchJoinRequests();
  }, [token, user?.id]);

  // Handle accept/decline join requests
  const handleJoinRequestDecision = async (requestId: string, decision: 'accept' | 'decline') => {
    try {
      const endpoint = decision === 'accept' ? 'accept' : 'decline';
      const res = await fetch(`${API_BASE}/api/join-requests/${requestId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responseMessage: `Request ${decision}ed` }),
      });

      if (!res.ok) {
        throw new Error(`Failed to ${decision} request`);
      }

      // Update local state
      setJoinRequests(prev =>
        prev.map(req =>
          req._id === requestId
            ? { ...req, status: decision === 'accept' ? 'accepted' : 'rejected' }
            : req
        )
      );

      toast.success(`Request ${decision}ed successfully`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed to ${decision} request`);
    }
  };

  // Fetch location booking requests from API
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Fetch location booking requests from API
  useEffect(() => {
    const fetchBookingRequests = async () => {
      if (!token) return;
      setBookingsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/location-bookings/coach/my-requests`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setBookingRequests(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch booking requests:', error);
      } finally {
        setBookingsLoading(false);
      }
    };

    fetchBookingRequests();
  }, [token]);

  // Fetch notifications from API
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token || !user?.id) return;
      setNotificationsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchNotifications();
  }, [token, user?.id]);

  const stats = [
    { label: "Assigned Sports", value: assignedSports.length, icon: <Trophy className="h-5 w-5" />, color: "bg-blue-500/10 text-blue-600" },
    { label: "Sessions Created", value: mySessions.length, icon: <Calendar className="h-5 w-5" />, color: "bg-purple-500/10 text-purple-600" },
    { label: "Pending Requests", value: joinRequests.filter(r => r.status === 'pending').length, icon: <UserCheck className="h-5 w-5" />, color: "bg-yellow-500/10 text-yellow-600" },
    { label: "Total Enrolled", value: mySessions.reduce((sum, s) => sum + (s.enrolledStudents?.length || 0), 0), icon: <Users className="h-5 w-5" />, color: "bg-green-500/10 text-green-600" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 sm:p-8 text-white">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Coach Dashboard</h1>
          <p className="text-blue-100">Welcome back, {user?.name || 'Coach'}!</p>
        </div>

        {/* Stats Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-sm transition hover:shadow-md`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 bg-slate-900/40 p-4 rounded-lg border border-slate-700/80">
          {[
            { id: 'sports', label: '🏆 Assigned Sports', count: assignedSports.length },
            { id: 'sessions', label: '📅 Sessions', count: mySessions.length },
            { id: 'requests', label: '👥 Join Requests', count: joinRequests.filter(r => r.status === 'pending').length },
            { id: 'bookings', label: '📍 Location Bookings', count: bookingRequests.length },
            { id: 'notifications', label: '🔔 Notifications', count: notifications.filter(n => !n.isRead).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {tab.label} {tab.count > 0 && <span className="ml-2 text-xs bg-red-500 rounded-full px-2 py-0.5">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Assigned Sports Tab */}
          {activeTab === 'sports' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">My Assigned Sports</h2>
              {loading ? (
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                  <p className="text-slate-300">Loading assigned sports...</p>
                </div>
              ) : assignedSports.length === 0 ? (
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-300">You haven't been assigned to any sports yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assignedSports.map((sport) => (
                    <div key={sport._id} className="rounded-xl border border-slate-700/80 bg-gradient-to-br from-slate-800 to-slate-900 p-5 hover:border-blue-500/50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white">{sport.name}</h3>
                          <p className="text-sm text-slate-400 capitalize">{sport.category}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-4">{sport.description}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Users className="h-4 w-4" />
                        <span>{(sport.coaches?.length || 0)} coach(es)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Session Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">My Sessions</h2>
              <div className="space-y-3">
                {sessionsLoading ? (
                  <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                    <Loader className="h-8 w-8 mx-auto text-slate-400 mb-4 animate-spin" />
                    <p className="text-slate-300">Loading your sessions...</p>
                  </div>
                ) : mySessions.length === 0 ? (
                  <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-300">No sessions scheduled yet.</p>
                  </div>
                ) : (
                  mySessions.map(session => {
                    const sessionStart = new Date(session.startTime);
                    const sessionEnd = new Date(session.endTime);
                    const capacityPercentage = Math.round((session.enrolledStudents.length / session.maxCapacity) * 100);
                    
                    return (
                      <div 
                        key={session._id} 
                        className={`p-4 rounded-lg border transition ${
                          capacityPercentage >= 90 
                            ? "border-yellow-500/50 bg-yellow-500/10" 
                            : "border-slate-700/70 bg-slate-800/40 hover:bg-slate-800/55"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏆</span>
                            <div>
                              <p className="font-bold text-white">{session.sport?.name || 'Sport'}</p>
                              <p className="text-sm text-slate-400">{session.location?.name || 'Location TBD'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">{sessionStart.toLocaleDateString()}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              {sessionStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – {sessionEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>

                        {/* Capacity Bar */}
                        <div className="mb-3 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Enrollment</span>
                            <span className={`font-medium ${capacityPercentage >= 90 ? "text-yellow-300" : "text-slate-300"}`}>
                              {session.enrolledStudents.length}/{session.maxCapacity} ({capacityPercentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                capacityPercentage >= 90 ? "bg-yellow-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-xs ${session.status === 'scheduled' ? 'bg-green-500/20 text-green-300' : ''}`}>
                            {session.status || 'Active'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Join Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Join Requests</h2>
              <div className="space-y-3">
                {requestsLoading ? (
                  <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                    <p className="text-slate-300">Loading join requests...</p>
                  </div>
                ) : joinRequests.length === 0 ? (
                  <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                    <UserCheck className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-300">No join requests.</p>
                  </div>
                ) : (
                  joinRequests.map(req => (
                    <div key={req._id} className="flex items-center justify-between rounded-lg bg-slate-800/40 p-4 hover:bg-slate-800/55 transition border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {req.student?.name?.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-white">{req.student?.name}</p>
                          <p className="text-sm text-slate-400">{req.sport?.name} • {new Date(req.createdAt).toLocaleDateString()}</p>
                          {req.message && <p className="text-xs text-slate-500 mt-1">"{req.message}"</p>}
                        </div>
                      </div>
                      {req.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="h-8 text-xs bg-green-600 hover:bg-green-700" 
                            onClick={() => handleJoinRequestDecision(req._id, 'accept')}
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10" 
                            onClick={() => handleJoinRequestDecision(req._id, 'decline')}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <Badge 
                          variant={req.status === "accepted" ? "default" : "destructive"} 
                          className="text-xs capitalize"
                        >
                          {req.status}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Location Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">📍 Location Booking Requests</h2>
                <p className="text-slate-400">Request and manage location bookings for your sports sessions</p>
              </div>
              <CoachLocationBookingRequest
                token={token || ''}
                coachId={user?.id || ''}
                assignedSports={assignedSports.map(s => s._id)}
              />
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Notifications</h2>
              {notificationsLoading ? (
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                  <Loader className="h-8 w-8 mx-auto text-slate-400 animate-spin" />
                  <p className="text-slate-300 mt-4">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-300">No notifications yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notif => (
                    <div key={notif._id || notif.id} className={`p-4 rounded-lg border transition ${
                      notif.isRead 
                        ? 'border-slate-700/50 bg-slate-800/30' 
                        : 'border-blue-500/30 bg-blue-500/10'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          notif.isRead ? 'bg-slate-700/50 text-slate-400' : 'bg-blue-600/20 text-blue-400'
                        }`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{notif.title}</h4>
                          <p className="text-sm text-slate-400 mt-1">{notif.message}</p>
                        </div>
                        {!notif.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
