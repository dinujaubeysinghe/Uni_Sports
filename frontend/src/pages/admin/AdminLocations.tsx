import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface LocationData {
  _id: string;
  name: string;
  type: "field" | "court" | "gym" | "pool" | "track" | "hall" | "other";
  capacity: number;
  address?: string;
}

const typeColors: Record<string, string> = {
  field: "bg-success/10 text-success",
  court: "bg-info/10 text-info",
  gym: "bg-accent/10 text-accent",
  pool: "bg-primary/10 text-primary",
  track: "bg-success/10 text-success",
  hall: "bg-accent/10 text-accent",
  other: "bg-secondary/10 text-secondary",
};

export default function AdminLocations() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | LocationData["type"]>("all");
  const [capacityFilter, setCapacityFilter] = useState<"all" | "lt100" | "100to300" | "gt300">("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "capacity-desc">("name-asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [form, setForm] = useState<{ name: string; type: LocationData["type"]; capacity: number; address: string }>({
    name: "",
    type: "field",
    capacity: 50,
    address: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, []);

  const getToken = () => localStorage.getItem("token") || "";

 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

  const loadLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/locations`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      setLocations(data.data || []);
    } catch (error) {
      toast.error("Failed to load locations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = locations
    .filter((location) => {
      const matchesSearch = [location.name, location.type, location.address || ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType = typeFilter === "all" ? true : location.type === typeFilter;
      const matchesCapacity =
        capacityFilter === "all"
          ? true
          : capacityFilter === "lt100"
            ? location.capacity < 100
            : capacityFilter === "100to300"
              ? location.capacity >= 100 && location.capacity <= 300
              : location.capacity > 300;
      return matchesSearch && matchesType && matchesCapacity;
    })
    .sort((a, b) => (sortBy === "name-asc" ? a.name.localeCompare(b.name) : b.capacity - a.capacity));

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCapacityFilter("all");
    setSortBy("name-asc");
  };

  const exportVisibleLocationsCsv = () => {
    const rows = [
      ["Name", "Type", "Capacity", "Address"],
      ...filtered.map((location) => [location.name, location.type, String(location.capacity), location.address || ""]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "locations-management.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Locations list exported");
  };

  const openAdd = () => {
    setEditingLocation(null);
    setForm({ name: "", type: "field", capacity: 50, address: "" });
    setDialogOpen(true);
  };

  const openEdit = (location: LocationData) => {
    setEditingLocation(location);
    setForm({ name: location.name, type: location.type, capacity: location.capacity, address: location.address || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const address = form.address.trim();
    const capacity = Number(form.capacity);

    if (!name || name.length < 2) {
      return toast.error("Please fill valid fields: location name must be at least 2 characters.");
    }
    if (!address || address.length < 5) {
      return toast.error("Please fill valid fields: address must be at least 5 characters.");
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      return toast.error("Please fill valid fields: capacity must be a positive number.");
    }

    try {
      const method = editingLocation ? "PUT" : "POST";
      const url = editingLocation
        ? `${API_BASE}/api/locations/${editingLocation._id}`
        : `${API_BASE}/api/locations`;

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
      if (editingLocation) {
        setLocations(prev => prev.map(l => l._id === editingLocation._id ? data.data : l));
        toast.success("Location updated successfully");
      } else {
        setLocations(prev => [data.data, ...prev]);
        toast.success("Location added successfully");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/locations/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${getToken()}` }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Delete failed");
      }

      setLocations(prev => prev.filter(l => l._id !== id));
      toast.success("Location deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      console.error(error);
    }
  };

  return (
    <div className="relative space-y-6 overflow-hidden page-shell">
      <div className="pointer-events-none absolute -left-20 top-6 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative rounded-2xl border border-violet-400/25 bg-gradient-to-br from-[#22153c] via-[#1c2d2a] to-[#1a2238] p-5 shadow-lg shadow-black/25">
        <PageHeader title="Practice Locations" description="Manage grounds, courts, gyms and other venues">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-violet-400 text-slate-900 hover:bg-violet-300" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="border-violet-500/30 bg-slate-950/95">
            <DialogHeader>
              <DialogTitle className="font-display">{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Name</Label>
                <Input 
                  value={form.name} 
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} 
                  placeholder="Location name"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input 
                  value={form.address} 
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} 
                  placeholder="Full address"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-10 rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as LocationData["type"] }))}
                >
                  <option value="field">Field</option>
                  <option value="court">Court</option>
                  <option value="gym">Gym</option>
                  <option value="pool">Pool</option>
                  <option value="track">Track</option>
                  <option value="hall">Hall</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Capacity</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={form.capacity} 
                  onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-violet-400 text-slate-900 hover:bg-violet-300" onClick={handleSave}>{editingLocation ? "Save Changes" : "Add Location"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </PageHeader>

        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations..."
            className="pl-9 bg-white text-black placeholder:text-gray-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className="border border-violet-300/30 bg-violet-400/15 text-violet-100">Total Locations: {locations.length}</Badge>
          <Badge className="border border-emerald-300/30 bg-emerald-400/15 text-emerald-100">Visible: {filtered.length}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | LocationData["type"])}
            className="h-10 rounded-md border border-violet-400/40 bg-slate-900/70 px-3 text-sm text-slate-100"
          >
            <option value="all">All types</option>
            <option value="field">Field</option>
            <option value="court">Court</option>
            <option value="gym">Gym</option>
            <option value="pool">Pool</option>
            <option value="track">Track</option>
            <option value="hall">Hall</option>
            <option value="other">Other</option>
          </select>

          <select
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value as "all" | "lt100" | "100to300" | "gt300")}
            className="h-10 rounded-md border border-emerald-400/40 bg-slate-900/70 px-3 text-sm text-slate-100"
          >
            <option value="all">All capacities</option>
            <option value="lt100">Under 100</option>
            <option value="100to300">100 - 300</option>
            <option value="gt300">Over 300</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name-asc" | "capacity-desc")}
            className="h-10 rounded-md border border-violet-400/40 bg-slate-900/70 px-3 text-sm text-slate-100"
          >
            <option value="name-asc">Sort: Name A-Z</option>
            <option value="capacity-desc">Sort: Capacity High-Low</option>
          </select>

          <Button type="button" variant="outline" className="border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20" onClick={resetFilters}>
            Reset Filters
          </Button>

          <Button type="button" variant="outline" className="gap-2 border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20" onClick={exportVisibleLocationsCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-200/80">Venue Atlas</h3>
        <span className="text-xs text-slate-400">Capacity and type highlights</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Loading locations...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-violet-500/25 bg-violet-500/5 py-10 text-center">
            <p className="text-sm font-medium text-violet-100">No locations found</p>
            <p className="mt-1 text-xs text-slate-400">Try changing filters or add a new location.</p>
          </div>
        ) : (
          filtered.map((loc, index) => (
            <div
              key={loc._id}
              className="group rounded-2xl border border-violet-400/25 bg-gradient-to-br from-slate-900/90 to-[#22193a] p-5 shadow-md shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-violet-300/40 hover:shadow-violet-500/15 animate-fade-in"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColors[loc.type]}`}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-100">{loc.name}</h3>
                  <Badge className="mt-0.5 text-xs capitalize border border-violet-300/30 bg-violet-400/15 text-violet-100">{loc.type}</Badge>
                </div>
                <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-200 hover:bg-violet-500/20" onClick={() => openEdit(loc)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-300 hover:bg-rose-500/20" onClick={() => handleDelete(loc._id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-slate-300">Capacity: <span className="font-semibold text-slate-100">{loc.capacity}</span> persons</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-400">{loc.address || "Address not provided"}</p>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Capacity index</span>
                  <span>{Math.min(100, Math.round((loc.capacity / 400) * 100))}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700/80">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((loc.capacity / 400) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
