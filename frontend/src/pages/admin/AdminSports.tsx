import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminSportCoachAssignment from "@/components/AdminSportCoachAssignment";

interface SportData {
  _id: string;
  name: string;
  description: string;
  category: "indoor" | "outdoor" | "water" | "combat" | "team" | "individual";
  maxParticipants?: number;
  coaches?: Array<{ id: string; name: string }>;
  createdAt?: string;
}
 const API_BASE = "";

export default function AdminSports() {
  const [sports, setSports] = useState<SportData[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | SportData["category"]>("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "capacity-desc">("name-asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<SportData | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "team", maxParticipants: 20 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sports" | "coaches">("sports");

  useEffect(() => {
    loadSports();
  }, []);

  const getToken = () => localStorage.getItem("token") || "";

  const loadSports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/sports`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Failed to load sports");
      const data = await res.json();
      setSports(data.data || []);
    } catch (error) {
      toast.error("Failed to load sports");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sports
    .filter((sport) => {
      const matchesSearch = [sport.name, sport.description].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" ? true : sport.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      return (b.maxParticipants || 0) - (a.maxParticipants || 0);
    });

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setSortBy("name-asc");
  };

  const exportVisibleSportsCsv = () => {
    const rows = [
      ["Name", "Category", "Max Participants", "Description"],
      ...filtered.map((sport) => [sport.name, sport.category, String(sport.maxParticipants || 0), sport.description || ""]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sports-management.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Sports list exported");
  };

  const openAdd = () => {
    setEditingSport(null);
    setForm({ name: "", description: "", category: "team", maxParticipants: 20 });
    setDialogOpen(true);
  };

  const openEdit = (sport: SportData) => {
    setEditingSport(sport);
    setForm({ name: sport.name, description: sport.description, category: sport.category, maxParticipants: sport.maxParticipants || 20 });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const maxParticipants = Number(form.maxParticipants);

    if (!name) {
      return toast.error("Please fill valid fields: sport name is required.");
    }
    if (name.length < 2) {
      return toast.error("Please fill valid fields: sport name must be at least 2 characters.");
    }
    if (!description) {
      return toast.error("Please fill valid fields: description is required.");
    }
    if (description.length < 10) {
      return toast.error("Please fill valid fields: description must be at least 10 characters.");
    }
    if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
      return toast.error("Please fill valid fields: max participants must be a positive number.");
    }
    
    try {
      const method = editingSport ? "PUT" : "POST";
      const url = editingSport 
        ? `${API_BASE}/api/sports/${editingSport._id}`
        : `${API_BASE}/api/sports`;
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const validationMessage = Array.isArray(errorData?.errors)
          ? errorData.errors
              .map((item: { msg?: string; message?: string }) => item.msg || item.message)
              .filter(Boolean)
              .join(" ")
          : "";
        throw new Error(validationMessage || errorData?.message || "Operation failed");
      }

      const data = await res.json();
      if (editingSport) {
        setSports(prev => prev.map(s => s._id === editingSport._id ? data.data : s));
        toast.success("Sport updated successfully");
      } else {
        setSports(prev => [...prev, data.data]);
        toast.success("Sport added successfully");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sports/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${getToken()}` }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Delete failed");
      }

      setSports(prev => prev.filter(s => s._id !== id));
      toast.success("Sport deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      console.error(error);
    }
  };

  return (
    <div className="relative space-y-6 overflow-hidden page-shell">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Tab Switcher */}
      <div className="relative rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#0f1e35] via-[#142844] to-[#1a2140] p-5 shadow-lg shadow-black/25">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("sports")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "sports"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-700/50 text-slate-200 hover:bg-slate-600/50"
            }`}
          >
            📊 Manage Sports
          </button>
          <button
            onClick={() => setActiveTab("coaches")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "coaches"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-700/50 text-slate-200 hover:bg-slate-600/50"
            }`}
          >
            👥 Assign Coaches
          </button>
        </div>
      </div>

      {/* Sports Management Tab */}
      {activeTab === "sports" && (
        <div className="relative rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#0f1e35] via-[#142844] to-[#1a2140] p-5 shadow-lg shadow-black/25">
        <PageHeader title="Sports Management" description="Add, edit, and manage university sports programs">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Plus className="h-4 w-4" /> Add Sport
            </Button>
          </DialogTrigger>
          <DialogContent className="border-cyan-500/30 bg-slate-950/95">
            <DialogHeader>
              <DialogTitle className="font-display">{editingSport ? "Edit Sport" : "Add New Sport"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Sport Name</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  placeholder="e.g. Football"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  placeholder="Brief description..." 
                  rows={3}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Category</Label>
                <select 
                  value={form.category} 
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-slate-600 bg-slate-800 text-white text-sm"
                >
                  <option value="team">Team</option>
                  <option value="individual">Individual</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="water">Water</option>
                  <option value="combat">Combat</option>
                </select>
              </div>
              <div>
                <Label>Max Participants</Label>
                <Input 
                  type="number" 
                  value={form.maxParticipants} 
                  onChange={e => setForm(f => ({ ...f, maxParticipants: Number(e.target.value) }))}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={handleSave}>{editingSport ? "Save Changes" : "Add Sport"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </PageHeader>

        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sports..."
            className="pl-9 bg-white text-black placeholder:text-gray-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className="border border-cyan-300/30 bg-cyan-400/15 text-cyan-100">Total Sports: {sports.length}</Badge>
          <Badge className="border border-indigo-300/30 bg-indigo-400/15 text-indigo-100">Visible: {filtered.length}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | SportData["category"])}
            className="h-10 rounded-md border border-cyan-400/40 bg-slate-900/70 px-3 text-sm text-slate-100"
          >
            <option value="all">All categories</option>
            <option value="team">Team</option>
            <option value="individual">Individual</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="water">Water</option>
            <option value="combat">Combat</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name-asc" | "name-desc" | "capacity-desc")}
            className="h-10 rounded-md border border-indigo-400/40 bg-slate-900/70 px-3 text-sm text-slate-100"
          >
            <option value="name-asc">Sort: Name A-Z</option>
            <option value="name-desc">Sort: Name Z-A</option>
            <option value="capacity-desc">Sort: Capacity High-Low</option>
          </select>

          <Button type="button" variant="outline" className="border-cyan-400/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20" onClick={resetFilters}>
            Reset Filters
          </Button>

          <Button type="button" variant="outline" className="gap-2 border-indigo-400/40 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20" onClick={exportVisibleSportsCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Sports Showcase</h3>
          <span className="text-xs text-slate-400">Hover cards for quick actions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Loading sports...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-cyan-500/25 bg-cyan-500/5 py-10 text-center">
            <p className="text-sm font-medium text-cyan-100">No sports found</p>
            <p className="mt-1 text-xs text-slate-400">Try changing filters or add a new sport.</p>
          </div>
        ) : (
          filtered.map((sport, index) => (
            <div
              key={sport._id}
              className="group rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-slate-900/90 to-[#121e34] p-5 shadow-md shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-cyan-500/15 animate-fade-in"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-100">{sport.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-300">{sport.description}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-200 hover:bg-cyan-500/20" onClick={() => openEdit(sport)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-300 hover:bg-rose-500/20" onClick={() => handleDelete(sport._id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Badge className="text-xs capitalize border border-cyan-300/30 bg-cyan-400/15 text-cyan-100">{sport.category}</Badge>
                <Badge className="text-xs border border-indigo-300/30 bg-indigo-400/15 text-indigo-100">{sport.maxParticipants || 0} max</Badge>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Capacity indicator</span>
                  <span>{Math.min(100, sport.maxParticipants || 0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700/80">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, sport.maxParticipants || 0)}%` }}
                  />
                </div>
              </div>
              {sport.coaches && sport.coaches.length > 0 && (
                <p className="mt-2 text-xs text-slate-300">Coaches: {sport.coaches.map(c => c.name).join(", ")}</p>
              )}
            </div>
          ))
        )}
      </div>
        </div>
      )}

      {/* Coach Assignment Tab */}
      {activeTab === "coaches" && (
        <div className="relative rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-[#0f1e35] via-[#142844] to-[#1a2140] p-5 shadow-lg shadow-black/25">
          <AdminSportCoachAssignment 
            token={localStorage.getItem("token") || ""} 
            adminId={localStorage.getItem("userId") || ""}
          />
        </div>
      )}
    </div>
  );
}
