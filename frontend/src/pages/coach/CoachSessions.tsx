import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, MapPin, AlertTriangle, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

export default function CoachSessions() {
  const token = localStorage.getItem("token");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ sportId: "", locationId: "", date: "", startTime: "", endTime: "" });

  const filtered = useMemo(
    () =>
      sessions.filter((session) => {
        const sportName = session.sport?.name ?? "";
        const dateText = new Date(session.startTime).toLocaleDateString();
        return (
          sportName.toLowerCase().includes(search.toLowerCase()) ||
          dateText.toLowerCase().includes(search.toLowerCase())
        );
      }),
    [sessions, search],
  );

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sessionsRes, sportsRes, locationsRes] = await Promise.all([
        fetch(`${API_BASE}/api/sessions/coach/my-sessions?limit=100`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/sports?limit=100`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/locations?limit=100`, { headers: authHeaders }),
      ]);

      const sessionsJson = await sessionsRes.json();
      const sportsJson = await sportsRes.json();
      const locationsJson = await locationsRes.json();

      if (sessionsRes.ok) setSessions(sessionsJson.data ?? []);
      if (sportsRes.ok) setSports(sportsJson.data ?? []);
      if (locationsRes.ok) setLocations(locationsJson.data ?? []);
    } catch (error) {
      toast.error("Failed to load coach sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const buildDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

  const resetForm = () => setForm({ sportId: "", locationId: "", date: "", startTime: "", endTime: "" });

  const handleCreate = async () => {
    if (!token) return toast.error("Please login first");
    if (!form.sportId || !form.locationId || !form.date || !form.startTime || !form.endTime) {
      return toast.error("Please fill all fields");
    }

    const sport = sports.find((item) => item._id === form.sportId);

    try {
      const response = await fetch(`${API_BASE}/api/sessions`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          sport: form.sportId,
          location: form.locationId,
          startTime: buildDateTime(form.date, form.startTime),
          endTime: buildDateTime(form.date, form.endTime),
          title: `${sport?.name ?? "Practice"} Session`,
          description: `Practice session for ${sport?.name ?? "sport"}`,
          maxParticipants: 25,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return toast.error(data.message || "Failed to create session");
      }

      toast.success("Session created successfully");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error("Unable to create session");
    }
  };

  const openEdit = (session: any) => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    setEditingSessionId(session._id);
    setForm({
      sportId: session.sport?._id ?? "",
      locationId: session.location?._id ?? "",
      date: start.toISOString().slice(0, 10),
      startTime: start.toTimeString().slice(0, 5),
      endTime: end.toTimeString().slice(0, 5),
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!token || !editingSessionId) return;

    try {
      const response = await fetch(`${API_BASE}/api/sessions/${editingSessionId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          location: form.locationId,
          startTime: buildDateTime(form.date, form.startTime),
          endTime: buildDateTime(form.date, form.endTime),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return toast.error(data.message || "Failed to update session");
      }

      toast.success("Session updated successfully");
      setEditDialogOpen(false);
      setEditingSessionId(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error("Unable to update session");
    }
  };

  return (
    <div className="space-y-6 page-shell">
      <PageHeader title="Practice Sessions" description="Create and manage your practice sessions">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Session</Button>
          </DialogTrigger>
          <DialogContent className="border-slate-700 bg-slate-950/95 text-slate-100">
            <DialogHeader><DialogTitle className="font-display">Create Practice Session</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Sport</Label>
                <Select value={form.sportId} onValueChange={v => setForm(f => ({ ...f, sportId: v }))}>
                  <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100"><SelectValue placeholder="Select sport" /></SelectTrigger>
                  <SelectContent className="z-[100] border-slate-700 bg-slate-900 text-slate-100">
                    {sports.map((sport) => <SelectItem key={sport._id} value={sport._id}>{sport.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select value={form.locationId} onValueChange={v => setForm(f => ({ ...f, locationId: v }))}>
                  <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent className="z-[100] border-slate-700 bg-slate-900 text-slate-100">
                    {locations.map((location) => <SelectItem key={location._id} value={location._id}>{location.name} ({location.type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border-slate-700 bg-slate-900 text-slate-100" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="border-slate-700 bg-slate-900 text-slate-100" /></div>
                <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="border-slate-700 bg-slate-900 text-slate-100" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>
          <DialogContent className="border-slate-700 bg-slate-950/95 text-slate-100">
            <DialogHeader><DialogTitle className="font-display">Edit Session Time</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Location</Label>
                <Select value={form.locationId} onValueChange={(value) => setForm((prev) => ({ ...prev, locationId: value }))}>
                  <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent className="z-[100] border-slate-700 bg-slate-900 text-slate-100">
                    {locations.map((location) => (
                      <SelectItem key={location._id} value={location._id}>{location.name} ({location.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} className="border-slate-700 bg-slate-900 text-slate-100" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))} className="border-slate-700 bg-slate-900 text-slate-100" /></div>
                <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))} className="border-slate-700 bg-slate-900 text-slate-100" /></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Smart clash detector checks ground, coach, and enrolled students before saving.</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by sport or date..."
          className="pl-9 bg-white text-slate-900 placeholder:text-slate-500 border-slate-300 focus-visible:ring-slate-300"
        />
      </div>

      <div className="space-y-3">
        {!loading && filtered.map((session) => {
          const sportName = session.sport?.name ?? "Sport";
          const locationName = session.location?.name ?? "Location";
          const start = new Date(session.startTime);
          const end = new Date(session.endTime);
          const dateText = start.toLocaleDateString();
          const startText = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const endText = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={session._id} className="surface-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
              <span className="text-3xl">🏅</span>
              <div className="flex-1">
                <h3 className="font-display font-bold">{sportName}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{dateText}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{startText}–{endText}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locationName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{session.enrolledStudents?.length ?? 0}/{session.maxParticipants}</Badge>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(session)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No sessions found.</p>
        )}
        {loading && <p className="text-sm text-muted-foreground">Loading sessions...</p>}
      </div>
    </div>
  );
}
