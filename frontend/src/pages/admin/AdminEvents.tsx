
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, CalendarDays, MapPin, Users, Link } from "lucide-react";
import { Event } from "@/types";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

const STATUS_COLORS: Record<string, string> = {
  upcoming:  "bg-blue-100 text-blue-700",
  ongoing:   "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const emptyForm = {
  title: "",
  description: "",
  sportId: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  venue: "",
  maxParticipants: 32,
  registrationFormUrl: "",
  status: "upcoming" as Event["status"],
};

export default function AdminEvents() {
  const token = localStorage.getItem('token');
  const [events, setEvents] = useState<Event[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Fetch events and sports from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, sportsRes] = await Promise.all([
          fetch(`${API_BASE}/api/events`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
          fetch(`${API_BASE}/api/sports`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.data || []);
        }
        if (sportsRes.ok) {
          const sportsData = await sportsRes.json();
          setSports(sportsData.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load events and sports");
      } finally {
        setEventsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Dialog helpers ─────────────────────────────────────────────
  const openAdd = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      sportId: event.sportId,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      venue: event.venue,
      maxParticipants: event.maxParticipants,
      registrationFormUrl: event.registrationFormUrl ?? "",
      status: event.status,
    });
    setDialogOpen(true);
  };

  const openDelete = (event: Event) => {
    setDeletingEvent(event);
    setDeleteDialogOpen(true);
  };

  // ── CRUD handlers ──────────────────────────────────────────────
  const handleSave = () => {
    if (!form.title.trim())       return toast.error("Event title is required");
    if (!form.sportId)            return toast.error("Please select a sport");
    if (!form.startDate)          return toast.error("Start date is required");
    if (!form.endDate)            return toast.error("End date is required");
    if (!form.registrationDeadline) return toast.error("Registration deadline is required");
    if (!form.venue.trim())       return toast.error("Venue is required");

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      return toast.error("End date must be after start date");
    }
    if (new Date(form.registrationDeadline) >= new Date(form.startDate)) {
      return toast.error("Registration deadline must be before start date");
    }

    if (editingEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, ...form } : e))
      );
      toast.success("Event updated successfully");
    } else {
      const newEvent: Event = {
        id: `ev-${Date.now()}`,
        registrations: [],
        ...form,
      };
      setEvents((prev) => [...prev, newEvent]);
      toast.success("Event created successfully");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deletingEvent) return;
    if (deletingEvent.status === "ongoing") {
      return toast.error("Cannot delete an ongoing event");
    }
    setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
    toast.success("Event deleted");
    setDeleteDialogOpen(false);
  };

  // ── Helpers ────────────────────────────────────────────────────
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

  const getRegistrationCount = (event: Event) =>
    event.registrations?.filter((r) => r.status === "confirmed").length ?? 0;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title="Event Management" description="Create, edit, and manage university sports events">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingEvent ? "Edit Event" : "Add New Event"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Title */}
              <div>
                <Label>Event Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Inter-Faculty Cricket Tournament"
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the event..."
                  rows={3}
                />
              </div>

              {/* Sport */}
              <div>
                <Label>Sport</Label>
                <Select value={form.sportId} onValueChange={(val) => setForm((f) => ({ ...f, sportId: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((sport) => (
                      <SelectItem key={sport._id || sport.id} value={sport._id || sport.id}>
                        {sport.icon} {sport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Registration Deadline */}
              <div>
                <Label>Registration Deadline</Label>
                <Input
                  type="date"
                  value={form.registrationDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, registrationDeadline: e.target.value }))}
                />
              </div>

              {/* Venue */}
              <div>
                <Label>Venue</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                  placeholder="e.g. Main Cricket Ground"
                />
              </div>

              {/* Max Participants */}
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={form.maxParticipants}
                  onChange={(e) => setForm((f) => ({ ...f, maxParticipants: Number(e.target.value) }))}
                />
              </div>

              {/* Google Form URL */}
              <div>
                <Label>Registration Form URL (Google Form)</Label>
                <Input
                  value={form.registrationFormUrl}
                  onChange={(e) => setForm((f) => ({ ...f, registrationFormUrl: e.target.value }))}
                  placeholder="https://forms.google.com/..."
                />
              </div>

              {/* Status — only show when editing */}
              {editingEvent && (
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm((f) => ({ ...f, status: val as Event["status"] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingEvent ? "Save Changes" : "Add Event"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Event Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-12">No events found.</p>
        )}
        {filtered.map((event) => {
          const confirmedCount = getRegistrationCount(event);
          const fillPct = Math.round((confirmedCount / event.maxParticipants) * 100);

          return (
            <div
              key={event.id}
              className="bg-card rounded-xl shadow-card p-5 hover:shadow-elevated transition-shadow animate-fade-up group space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getSportIcon(event.sportId)}</span>
                  <div>
                    <h3 className="font-display font-bold leading-tight">{event.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{getSportName(event.sportId)}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(event)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDelete(event)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>

              {/* Meta */}
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
                {event.registrationFormUrl && (
                  <div className="flex items-center gap-1.5">
                    <Link className="h-3.5 w-3.5 shrink-0" />
                    <a
                      href={event.registrationFormUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-2 truncate"
                    >
                      Registration Form
                    </a>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${fillPct >= 100 ? "bg-red-500" : fillPct >= 75 ? "bg-yellow-500" : "bg-primary"}`}
                    style={{ width: `${Math.min(fillPct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">{fillPct}% full</p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs font-medium ${STATUS_COLORS[event.status]}`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Deadline: {formatDate(event.registrationDeadline)}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Delete Event</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deletingEvent?.title}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
