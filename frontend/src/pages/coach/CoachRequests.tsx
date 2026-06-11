import { PageHeader } from "@/components/common/PageHeader";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

export default function CoachRequests() {
  const token = localStorage.getItem("token");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/join-requests/coach/my-requests?limit=100`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setRequests(data.data ?? []);
      }
    } catch (error) {
      toast.error("Failed to load join requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [token]);

  const updateStatus = async (id: string, status: "accepted" | "rejected") => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/join-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        return toast.error(data.message || "Failed to update request");
      }

      toast.success(`Request ${status}`);
      setRequests((prev) => prev.map((request) => (request._id === id ? { ...request, status } : request)));
    } catch (error) {
      toast.error("Unable to update request");
    }
  };

  return (
    <div className="space-y-6 page-shell">
      <PageHeader title="Join Requests" description="Review and manage student requests to join your sessions" />

      <div className="space-y-3">
        {!loading && requests.length === 0 && <p className="text-muted-foreground text-sm">No requests at this time.</p>}
        {loading && <p className="text-muted-foreground text-sm">Loading requests...</p>}
        {requests.map((req) => {
          const student = req.student;
          const sport = req.session?.sport;
          return (
            <div key={req._id} className="surface-card p-4 flex items-center gap-4 animate-fade-in">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm shrink-0">
                {student?.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{student?.name}</p>
                <p className="text-xs text-muted-foreground">{sport?.name} • Requested {new Date(req.createdAt).toLocaleDateString()}</p>
              </div>
              {req.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(req._id, "accepted")}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(req._id, "rejected")}>Decline</Button>
                </div>
              ) : (
                <Badge variant={req.status === "accepted" ? "default" : "destructive"} className="capitalize">{req.status}</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
