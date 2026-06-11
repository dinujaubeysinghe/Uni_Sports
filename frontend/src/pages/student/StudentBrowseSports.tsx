import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, ChevronRight, Clock, AlertTriangle, X, Loader } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

interface PendingRequest {
  _id: string;
  session: {
    _id: string;
    sport: {
      _id: string; name: string 
};
    startTime: string;
    endTime: string;
  };
  status: string;
  createdAt: string;
}

export default function StudentBrowseSports() {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || "{}").id : null;
  const [sports, setSports] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [acceptedSessions, setAcceptedSessions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loadingJoinId, setLoadingJoinId] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

  const filtered = useMemo(
    () => sports.filter((sport) => sport.name.toLowerCase().includes(search.toLowerCase())),
    [sports, search],
  );

  const loadData = async () => {
    try {
      const [sportsRes, sessionsRes, acceptedRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE}/api/sports?isActive=true&limit=200`, {
          headers: token
            ? {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              }
            : { "Content-Type": "application/json" },
        }),
        fetch(`${API_BASE}/api/sessions?status=scheduled&limit=300`, {
          headers: token
            ? {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              }
            : { "Content-Type": "application/json" },
        }),
        // Fetch student's accepted join requests
        token && userId ? fetch(`${API_BASE}/api/join-requests/student/my-requests?status=accepted`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }) : Promise.resolve(new Response('{"data": []}')),
        // Fetch student's pending join requests
        token && userId ? fetch(`${API_BASE}/api/join-requests/student/my-requests?status=pending`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }) : Promise.resolve(new Response('{"data": []}')),
      ]);

      const sportsJson = await sportsRes.json();
      const sessionsJson = await sessionsRes.json();
      const acceptedJson = await acceptedRes.json();
      const pendingJson = await pendingRes.json();

      if (sportsRes.ok) setSports(sportsJson.data ?? []);
      if (sessionsRes.ok) setSessions(sessionsJson.data ?? []);
      if (acceptedRes.ok) setAcceptedSessions(acceptedJson.data ?? []);
      if (pendingRes.ok) setPendingRequests(pendingJson.data ?? []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Unable to load sports");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Advanced Smart Clash Detector - checks against already accepted/booked sessions
   * Prevents students from booking overlapping sessions for different sports
   */
  const checkTimeClash = (sessionToJoin: any): { hasClash: boolean; clashingSession?: any } => {
    const startTime = new Date(sessionToJoin.startTime).getTime();
    const endTime = new Date(sessionToJoin.endTime).getTime();

    // Check against all accepted sessions (already booked)
    for (const request of acceptedSessions) {
      const acceptedStartTime = new Date(request.session.startTime).getTime();
      const acceptedEndTime = new Date(request.session.endTime).getTime();

      // Time overlap check - if new session overlaps with any accepted session
      if (startTime < acceptedEndTime && endTime > acceptedStartTime) {
        return {
          hasClash: true,
          clashingSession: request.session,
        };
      }
    }

    return { hasClash: false };
  };

  /**
   * Handle join request with clash detection
   */
  const handleJoinRequest = async (sportId: string) => {
    if (!token) return toast.error("Please login as a student");

    const sportSessions = sessions
      .filter((session) => session?.sport?._id === sportId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const upcomingSession = sportSessions.find((session) => session?.coach?._id) || sportSessions[0];

    if (!upcomingSession) {
      return toast.error("No upcoming session for this sport right now");
    }

    if (!upcomingSession.coach?._id) {
      return toast.error("No coach assigned to this session yet. Please choose another sport/session.");
    }

    // Check for time clash
    const clashCheck = checkTimeClash(upcomingSession);
    if (clashCheck.hasClash && clashCheck.clashingSession) {
      const clashStart = new Date(clashCheck.clashingSession.startTime);
      const clashEnd = new Date(clashCheck.clashingSession.endTime);
      const conflictSport = clashCheck.clashingSession.sport?.name;
      const requestedSportName = upcomingSession.sport?.name || "this sport";
      
      toast.error(
        `⏰ Schedule Conflict Detected!\n\n❌ Cannot join ${requestedSportName}\n\n✓ You already have:\n📌 ${conflictSport}\n📅 ${clashStart.toLocaleDateString()}\n⏱️ ${clashStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${clashEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n\n💡 Please cancel that session first if you want to join ${requestedSportName}.`,
        { duration: 7000 }
      );
      return;
    }

    // Check if already has pending request for this sport
    const existingRequest = pendingRequests.find(r => r.session.sport._id === sportId);
    if (existingRequest) {
      return toast.error("You already have a pending request for this sport");
    }

    setLoadingJoinId(sportId);
    try {
      const response = await fetch(`${API_BASE}/api/join-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: upcomingSession._id,
          message: "I would like to join this team.",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return toast.error(data.message || "Failed to send join request");
      }

      toast.success("✅ Join request sent! Waiting for coach approval.");
      
      // Reload pending requests
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Unable to send join request");
    } finally {
      setLoadingJoinId(null);
    }
  };

  /**
   * Delete a pending join request
   */
  const handleDeleteRequest = async (requestId: string, sportName: string) => {
    if (!window.confirm(`Delete your join request for ${sportName}?`)) {
      return;
    }

    setDeletingRequestId(requestId);
    try {
      const response = await fetch(`${API_BASE}/api/join-requests/${requestId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete request");
      }

      toast.success(`✅ Join request for ${sportName} deleted`);
      
      // Reload pending requests
      await loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Unable to delete join request");
    } finally {
      setDeletingRequestId(null);
    }
  };

  return (
    <div className="space-y-6 page-shell">
      <PageHeader title="Browse Sports" description="Explore available sports programs and request to join" />

      {/* Pending Join Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Join Requests
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">
                    {req.session.sport.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    Session: {new Date(req.session.startTime).toLocaleDateString()} at{" "}
                    {new Date(req.session.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Requested: {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleDeleteRequest(req._id, req.session.sport.name)
                  }
                  disabled={deletingRequestId === req._id}
                  className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                  title="Delete this request"
                >
                  {deletingRequestId === req._id ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sports..."
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sport) => {
          const sportSessions = sessions.filter((session) => session?.sport?._id === sport._id);
          const enrolledCount = sportSessions.reduce(
            (total, session) => total + (session.enrolledStudents?.length ?? 0),
            0,
          );
          const coachNames = (sport.coaches ?? []).map((coach) => coach.name).join(", ");
          const upcomingSession = sportSessions.sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          )[0];
          const nextJoinableSession = sportSessions
            .slice()
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .find((session) => session?.coach?._id);
          const hasCoachAssignedSession = Boolean(nextJoinableSession);
          const hasClash = nextJoinableSession ? checkTimeClash(nextJoinableSession).hasClash : false;
          const hasPendingRequest = pendingRequests.some(r => r.session.sport._id === sport._id);

          return (
            <div key={sport._id} className="surface-card p-5 animate-fade-in flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">🏅</span>
                <div>
                  <h3 className="font-display font-bold text-lg">{sport.name}</h3>
                  <p className="text-xs text-muted-foreground">{sport.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {enrolledCount}/{sport.maxParticipants}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {sportSessions.length} sessions
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Coach{(sport.coaches?.length ?? 0) > 1 ? "es" : ""}: {coachNames || "Not assigned"}
              </p>

              {/* Clash Warning */}
              {hasClash && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    You have a schedule conflict with this session time.
                  </p>
                </div>
              )}

              <div className="mt-auto">
                <Button
                  className="w-full gap-2"
                  variant={hasPendingRequest ? "secondary" : hasClash ? "ghost" : "default"}
                  onClick={() => handleJoinRequest(sport._id)}
                  disabled={!hasCoachAssignedSession || hasClash || hasPendingRequest || loadingJoinId === sport._id}
                >
                  {loadingJoinId === sport._id ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : !hasCoachAssignedSession ? (
                    <>
                      🚫 Coach Not Assigned
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : hasPendingRequest ? (
                    <>
                      ⏳ Request Pending
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : hasClash ? (
                    <>
                      ❌ Schedule Conflict
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Request to Join
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
