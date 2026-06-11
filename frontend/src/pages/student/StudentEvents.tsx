import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, Link } from "lucide-react";
import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

export default function StudentEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, sportsRes] = await Promise.all([
          fetch(`${API_BASE}/api/events`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${API_BASE}/api/sports`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
        ]);

        if (eventsRes.ok && sportsRes.ok) {
          const eventsData = await eventsRes.json();
          const sportsData = await sportsRes.json();
          setEvents(eventsData.data || []);
          setSports(sportsData.data || []);
        }
      } catch (error) {
        console.error("Error fetching events or sports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const getSportName = (sportId: string) => {
    const sport = sports.find((s) => s._id === sportId || s.id === sportId);
    return sport?.name ?? "Unknown";
  };

  const getSportIcon = (sportId: string) => {
    const sport = sports.find((s) => s._id === sportId || s.id === sportId);
    return sport?.icon ?? "🏅";
  };

  const formatDate = (dateStr: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const STATUS_COLORS: Record<string, string> = {
    upcoming:  "bg-blue-100 text-blue-700",
    ongoing:   "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sports Events"
        description="Browse and register for upcoming university sports events"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted-foreground col-span-full text-center py-12">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">No events available.</p>
        ) : (
          events.map((event) => {
            const confirmedCount = event.registrations?.filter((r: any) => r.status === "confirmed").length ?? 0;
            const fillPct = Math.round((confirmedCount / event.maxParticipants) * 100);

            return (
              <div
                key={event._id || event.id}
                className="bg-card rounded-xl shadow-card p-5 hover:shadow-elevated transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getSportIcon(event.sportId || event.sport?._id)}</span>
                    <div>
                      <h3 className="font-display font-bold leading-tight">{event.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{getSportName(event.sportId || event.sport?._id)}</p>
                    </div>
                  </div>
                  <Badge className={`text-xs font-medium ${STATUS_COLORS[event.status]}`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(event.startDate)} → {formatDate(event.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{event.venue}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>{confirmedCount}/{event.maxParticipants} registered</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="h-1.5 w-1/2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${fillPct >= 100 ? "bg-red-500" : fillPct >= 75 ? "bg-yellow-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  </div>
                  {event.registrationFormUrl ? (
                    <Button asChild size="sm" className="gap-1">
                      <a href={event.registrationFormUrl} target="_blank" rel="noreferrer">
                        <Link className="h-4 w-4" /> Register
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" disabled>Registration Closed</Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
