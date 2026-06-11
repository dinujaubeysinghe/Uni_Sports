import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Mail, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface CoachData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  role: "coach";
}

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [search, setSearch] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc">("name-asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachData | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", specialization: "", password: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoaches();
  }, []);
   const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
  const getToken = () => localStorage.getItem("token") || "";

  const loadCoaches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users?role=coach`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Failed to load coaches");
      const data = await res.json();
      setCoaches(data.data || []);
    } catch (error) {
      toast.error("Failed to load coaches");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const specializations = Array.from(new Set(coaches.map((coach) => coach.specialization).filter(Boolean))).sort();

  const filtered = coaches
    .filter((coach) => {
      const matchesSearch = [coach.name, coach.email, coach.specialization]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesSpecialization = specializationFilter === "all" || coach.specialization === specializationFilter;
      return matchesSearch && matchesSpecialization;
    })
    .sort((a, b) => (sortBy === "name-asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

  const resetFilters = () => {
    setSearch("");
    setSpecializationFilter("all");
    setSortBy("name-asc");
  };

  const exportVisibleCoachesCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Specialization"],
      ...filtered.map((coach) => [coach.name, coach.email, coach.phone || "", coach.specialization || ""]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "coaches-management.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Coaches list exported");
  };

  const openAdd = () => {
    setEditingCoach(null);
    setForm({ name: "", email: "", phone: "", specialization: "", password: "" });
    setDialogOpen(true);
  };

  const openEdit = (coach: CoachData) => {
    setEditingCoach(coach);
    setForm({
      name: coach.name,
      email: coach.email,
      phone: coach.phone,
      specialization: coach.specialization,
      password: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const specialization = form.specialization.trim();
    const password = form.password.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizePhone = (value: string) => {
      const digits = value.replace(/\D/g, "");
      if (digits.length === 11 && digits.startsWith("94")) return `0${digits.slice(2)}`;
      return digits;
    };

    if (!name || name.length < 2) {
      return toast.error("Please fill valid fields: coach name must be at least 2 characters.");
    }
    if (!email || !emailRegex.test(email)) {
      return toast.error("Please fill valid fields: a valid coach email is required.");
    }
    if (!specialization) {
      return toast.error("Please fill valid fields: specialization is required.");
    }
    if (phone && !/^07\d{8}$/.test(normalizePhone(phone))) {
      return toast.error("Please fill valid fields: phone number must be exactly 10 digits (07XXXXXXXX).");
    }
    if (!editingCoach && password.length < 6) {
      return toast.error("Please fill valid fields: password must be at least 6 characters.");
    }
    if (editingCoach && password && password.length < 6) {
      return toast.error("Please fill valid fields: password must be at least 6 characters.");
    }

    try {
      const method = editingCoach ? "PUT" : "POST";
      const url = editingCoach
        ? `${API_BASE}/api/users/${editingCoach._id}`
        : `${API_BASE}/api/users`;

      const body = editingCoach 
        ? { name: form.name, email: form.email, phone: form.phone, specialization: form.specialization, password: form.password || undefined }
        : { ...form, role: "coach" };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(body)
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
      if (editingCoach) {
        setCoaches(prev => prev.map(c => c._id === editingCoach._id ? data.data : c));
        toast.success("Coach updated successfully");
      } else {
        setCoaches(prev => [data.data, ...prev]);
        toast.success("Coach added successfully");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${getToken()}` }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Delete failed");
      }

      setCoaches(prev => prev.filter(c => c._id !== id));
      toast.success("Coach deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      console.error(error);
    }
  };

  return (
    <div className="relative space-y-6 overflow-hidden page-shell">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative rounded-2xl border border-amber-400/25 bg-gradient-to-br from-[#2b2114] via-[#1f2d34] to-[#15222c] p-5 shadow-lg shadow-black/25">
        <PageHeader title="Coaches" description="Manage coaching staff and sport assignments">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-400 text-slate-900 hover:bg-amber-300" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Coach
            </Button>
          </DialogTrigger>
          <DialogContent className="border-amber-500/30 bg-slate-950/95">
            <DialogHeader>
              <DialogTitle className="font-display">{editingCoach ? "Edit Coach" : "Add Coach"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Name</Label>
                <Input 
                  value={form.name} 
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} 
                  placeholder="Coach name"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} 
                  placeholder="coach@uni.edu"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} 
                  placeholder="+94 77 123 4567"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Specialization</Label>
                <Input 
                  value={form.specialization} 
                  onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))} 
                  placeholder="Team Sports"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              {!editingCoach && (
                <div>
                  <Label>Password</Label>
                  <Input 
                    type="password" 
                    value={form.password} 
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} 
                    placeholder="Minimum 6 characters"
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-amber-400 text-slate-900 hover:bg-amber-300" onClick={handleSave}>{editingCoach ? "Save Changes" : "Add Coach"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </PageHeader>

        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coaches..."
            className="pl-9 bg-white text-black placeholder:text-gray-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className="border border-amber-300/30 bg-amber-400/15 text-amber-100">Total Coaches: {coaches.length}</Badge>
          <Badge className="border border-teal-300/30 bg-teal-400/15 text-teal-100">Visible: {filtered.length}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="h-10 rounded-md border border-amber-400/40 bg-slate-900/70 px-3 text-sm text-slate-100"
          >
            <option value="all">All specializations</option>
            {specializations.map((specialization) => (
              <option key={specialization} value={specialization}>
                {specialization}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name-asc" | "name-desc")}
            className="h-10 rounded-md border border-teal-400/40 bg-slate-900/70 px-3 text-sm text-slate-100"
          >
            <option value="name-asc">Sort: Name A-Z</option>
            <option value="name-desc">Sort: Name Z-A</option>
          </select>

          <Button type="button" variant="outline" className="border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20" onClick={resetFilters}>
            Reset Filters
          </Button>

          <Button type="button" variant="outline" className="gap-2 border-teal-400/40 bg-teal-500/10 text-teal-100 hover:bg-teal-500/20" onClick={exportVisibleCoachesCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200/80">Coaching Directory</h3>
        <span className="text-xs text-slate-400">Manage profiles and specialties</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Loading coaches...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-amber-500/25 bg-amber-500/5 py-10 text-center">
            <p className="text-sm font-medium text-amber-100">No coaches found</p>
            <p className="mt-1 text-xs text-slate-400">Try changing filters or add a new coach profile.</p>
          </div>
        ) : (
          filtered.map((coach, index) => (
            <div
              key={coach._id}
              className="group rounded-2xl border border-amber-400/25 bg-gradient-to-br from-slate-900/90 to-[#2b2316] p-5 shadow-md shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-amber-500/15 animate-fade-in"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/20 text-amber-100 font-display font-bold text-sm border border-amber-300/30">
                  {coach.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-100">{coach.name}</h3>
                  <p className="text-xs text-slate-300">{coach.specialization}</p>
                </div>
                <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-200 hover:bg-amber-500/20" onClick={() => openEdit(coach)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-300 hover:bg-rose-500/20" onClick={() => handleDelete(coach._id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{coach.email}</p>
                <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{coach.phone}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge className="border border-amber-300/30 bg-amber-400/15 text-amber-100">{coach.specialization || "General"}</Badge>
                <Badge className="border border-teal-300/30 bg-teal-400/15 text-teal-100">Active Coach</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
