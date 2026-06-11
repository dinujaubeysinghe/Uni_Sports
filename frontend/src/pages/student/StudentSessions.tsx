import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MapPin, AlertTriangle, Search, Loader } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

interface AvailableSession {
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
  enrolledStudents: string[];
  status: string;
  createdAt: string;
}

interface BookedSession {
  _id: string;
  sport: {
    _id: string;
    name: string;
  };
  startTime: string;
  endTime: string;
  location: {
    name: string;
  };
  coach: {
    name: string;
  };
}

export default function StudentSessions() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const [search, setSearch] = useState("");
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [bookedSessions, setBookedSessions] = useState<BookedSession[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingBooked, setLoadingBooked] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "booked">("available");

  // Filter available sessions based on search
  const filtered = availableSessions.filter(s => {
    return s.sport?.name.toLowerCase().includes(search.toLowerCase()) || 
           new Date(s.startTime).toLocaleDateString().includes(search);
  });

  // Fetch available sessions from API
  useEffect(() => {
    const fetchAvailableSessions = async () => {
      if (!token) return;
      
      try {
        setLoadingAvailable(true);
        const response = await fetch(`${API_BASE}/api/sessions?status=scheduled&limit=300`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableSessions(data.data || []);
        } else {
          console.error("Failed to fetch available sessions");
          setAvailableSessions([]);
        }
      } catch (error) {
        console.error("Failed to fetch available sessions:", error);
        toast.error("Could not load available sessions");
        setAvailableSessions([]);
      } finally {
        setLoadingAvailable(false);
      }
    };

    fetchAvailableSessions();
  }, [token]);

  // Fetch booked sessions
  useEffect(() => {
    const fetchBookedSessions = async () => {
      if (!token || !user?.id) return;
      
      try {
        setLoadingBooked(true);
        const response = await fetch(`${API_BASE}/api/sessions/student/my-sessions`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBookedSessions(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch booked sessions:", error);
      } finally {
        setLoadingBooked(false);
      }
    };

    fetchBookedSessions();
  }, [token, user?.id]);

  // Smart clash detector - checks against real booked sessions
  const checkClashWithBookedSessions = (sessionToCheck: AvailableSession): { hasClash: boolean; clashingSession?: BookedSession } => {
    const newSessionStart = new Date(sessionToCheck.startTime).getTime();
    const newSessionEnd = new Date(sessionToCheck.endTime).getTime();

    for (const bookedSession of bookedSessions) {
      const bookedStart = new Date(bookedSession.startTime).getTime();
      const bookedEnd = new Date(bookedSession.endTime).getTime();

      // Check for time overlap
      if (newSessionStart < bookedEnd && newSessionEnd > bookedStart) {
        return {
          hasClash: true,
          clashingSession: bookedSession,
        };
      }
    }

    return { hasClash: false };
  };

  // Check if student is already enrolled in this session
  const isAlreadyEnrolled = (session: AvailableSession) => {
    return session.enrolledStudents.includes(user?.id || "");
  };

  // Join session request
  const handleJoinSession = async (sessionId: string, sessionName: string) => {
    if (!token) {
      toast.error("Please login to join a session");
      return;
    }

    const session = availableSessions.find(s => s._id === sessionId);
    if (!session) return;

    // Check capacity
    if (session.enrolledStudents.length >= session.maxCapacity) {
      toast.error("This session is at full capacity");
      return;
    }

    // Smart clash detection
    const clashCheck = checkClashWithBookedSessions(session);
    if (clashCheck.hasClash && clashCheck.clashingSession) {
      const clashStart = new Date(clashCheck.clashingSession.startTime);
      const clashEnd = new Date(clashCheck.clashingSession.endTime);
      const conflictSport = clashCheck.clashingSession.sport?.name || "a session";
      
      toast.error(
        `⏰ Schedule Conflict!\n\nYou already have ${conflictSport} booked:\n📅 ${clashStart.toLocaleDateString()}\n⏱️ ${clashStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${clashEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n\nPlease cancel that session first to join this one.`,
        { duration: 6000 }
      );
      return;
    }

    setDeletingSessionId(sessionId);
    try {
      const response = await fetch(`${API_BASE}/api/join-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: "I would like to join this session.",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send join request");
      }

      toast.success("✅ Join request sent! Waiting for coach approval.");
      
      // Refresh available sessions
      const res = await fetch(`${API_BASE}/api/sessions?status=scheduled&limit=300`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableSessions(data.data || []);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to send join request");
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Practice Sessions" 
        description="Browse available sessions and manage your bookings"
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "available"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📅 Available Sessions ({availableSessions.length})
        </button>
        <button
          onClick={() => setActiveTab("booked")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "booked"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ✅ My Booked Sessions ({bookedSessions.length})
        </button>
      </div>

      {/* Available Sessions Tab */}
      {activeTab === "available" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by sport or date..." 
              className="pl-9" 
            />
          </div>

          {loadingAvailable ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader className="h-8 w-8 mx-auto animate-spin mb-4" />
              <p>Loading available sessions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground">No available sessions found</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or check back later</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(session => {
                const enrolled = isAlreadyEnrolled(session);
                const clashInfo = checkClashWithBookedSessions(session);
                const isFull = session.enrolledStudents.length >= session.maxCapacity;
                const sessionDate = new Date(session.startTime);
                const sessionEndDate = new Date(session.endTime);

                return (
                  <div 
                    key={session._id} 
                    className={`bg-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                      clashInfo.hasClash 
                        ? "border-red-500/50 bg-red-500/10" 
                        : enrolled 
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{session.sport?.name}</h3>
                        {enrolled && (
                          <Badge className="bg-green-500 text-white text-xs">Enrolled</Badge>
                        )}
                        {isFull && (
                          <Badge variant="destructive" className="text-xs">Full</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {sessionDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {sessionEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {session.location?.name || "Location TBD"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <Badge variant="outline">
                          Coach: {session.coach?.name || "Unknown"}
                        </Badge>
                        <Badge variant="secondary">
                          {session.enrolledStudents.length}/{session.maxCapacity} Enrolled
                        </Badge>
                      </div>

                      {/* Clash Warning */}
                      {clashInfo.hasClash && clashInfo.clashingSession && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-900 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Time Conflict Detected!
                          </p>
                          <p className="text-xs text-red-800 mt-1">
                            You already have <span className="font-medium">{clashInfo.clashingSession.sport?.name}</span> booked on{" "}
                            {new Date(clashInfo.clashingSession.startTime).toLocaleDateString()} from{" "}
                            {new Date(clashInfo.clashingSession.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to{" "}
                            {new Date(clashInfo.clashingSession.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 sm:flex-col">
                      {enrolled ? (
                        <Badge className="bg-green-500 text-white">Already joined</Badge>
                      ) : clashInfo.hasClash ? (
                        <Button disabled size="sm" variant="secondary">
                          Schedule Conflict
                        </Button>
                      ) : isFull ? (
                        <Button disabled size="sm" variant="outline">
                          Full
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => handleJoinSession(session._id, session.sport?.name || "this session")}
                          disabled={deletingSessionId === session._id}
                        >
                          {deletingSessionId === session._id ? (
                            <>
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                              Joining...
                            </>
                          ) : (
                            "Join Session"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Booked Sessions Tab */}
      {activeTab === "booked" && (
        <>
          {loadingBooked ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader className="h-8 w-8 mx-auto animate-spin mb-4" />
              <p>Loading your booked sessions...</p>
            </div>
          ) : bookedSessions.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground text-lg">No booked sessions yet</p>
              <p className="text-sm text-muted-foreground mt-2">Browse available sessions to start joining sports</p>
              <Button 
                onClick={() => setActiveTab("available")} 
                className="mt-4"
              >
                Browse Available Sessions
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookedSessions.map(session => {
                const sessionDate = new Date(session.startTime);
                const sessionEndDate = new Date(session.endTime);

                function handleCancelSession(_id: string, arg1: string): void {
                  throw new Error("Function not implemented.");
                }

                return (
                  <div
                    key={session._id}
                    className="bg-green-50 rounded-xl border border-green-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:bg-green-100"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-green-900 mb-2">✅ {session.sport?.name}</h3>
                      
                      <div className="flex flex-wrap gap-3 text-sm text-green-700 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {sessionDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {sessionEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {session.location?.name || "Location TBD"}
                        </span>
                      </div>

                      <p className="text-sm text-green-700">
                        <span className="font-medium">Coach:</span> {session.coach?.name || "Unknown"}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelSession(session._id, session.sport?.name || "this session")}
                      disabled={deletingSessionId === session._id}
                      className="w-full sm:w-auto"
                    >
                      {deletingSessionId === session._id ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        "Cancel Booking"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
