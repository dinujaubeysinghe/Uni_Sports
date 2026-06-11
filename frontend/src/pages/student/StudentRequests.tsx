import { PageHeader } from "@/components/common/PageHeader";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

export default function StudentRequests() {
  const token = localStorage.getItem("token");
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/join-requests/student/my-requests?limit=100`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setMyRequests(data.data ?? []);
      }
    } catch (error) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [token]);

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/30",
    accepted: "bg-success/10 text-success border-success/30",
    rejected: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-6 page-shell">
      <PageHeader title="My Requests" description="Track the status of your join requests" />

      <div className="space-y-3">
        {!loading && myRequests.length === 0 && <p className="text-sm text-muted-foreground">You haven't sent any join requests yet.</p>}
        {loading && <p className="text-sm text-muted-foreground">Loading requests...</p>}
        {myRequests.map((req) => {
          const sport = req.session?.sport;
          const session = req.session;
          const location = req.session?.location;

          return (
            <div key={req._id} className="surface-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
              <span className="text-3xl">🏅</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold">{sport?.name}</h3>
                {session && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(session.startTime).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{new Date(session.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
                {location && <p className="text-xs text-muted-foreground mt-1">Location: {location.name}</p>}
                <p className="text-xs text-muted-foreground mt-1">Requested: {new Date(req.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge className={`capitalize border ${statusColors[req.status]}`}>{req.status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
