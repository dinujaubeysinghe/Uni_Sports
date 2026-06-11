import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface StudentData {
  _id: string;
  name: string;
  email: string;
  role: "student";
  studentId?: string;
  enrolledSports?: Array<{ _id: string; name: string }>;
}
 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", studentId: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const getToken = () => localStorage.getItem("token") || "";

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users?role=student`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Failed to load students");
      const data = await res.json();
      setStudents(data.data || []);
    } catch (error) {
      toast.error("Failed to load students");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((student) =>
    [student.name, student.email].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditingStudent(null);
    setForm({ name: "", email: "", password: "", studentId: "" });
    setDialogOpen(true);
  };

  const openEdit = (student: StudentData) => {
    setEditingStudent(student);
    setForm({ name: student.name, email: student.email, password: "", studentId: student.studentId || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password.trim();
    const studentId = form.studentId.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || name.length < 2) {
      return toast.error("Please fill valid fields: student name must be at least 2 characters.");
    }
    if (!email || !emailRegex.test(email)) {
      return toast.error("Please fill valid fields: a valid student email is required.");
    }
    if (studentId && studentId.length < 4) {
      return toast.error("Please fill valid fields: student ID must be at least 4 characters.");
    }
    if (!editingStudent && password.length < 6) {
      return toast.error("Please fill valid fields: password must be at least 6 characters.");
    }
    if (editingStudent && password && password.length < 6) {
      return toast.error("Please fill valid fields: password must be at least 6 characters.");
    }

    try {
      const method = editingStudent ? "PUT" : "POST";
      const url = editingStudent
        ? `${API_BASE}/api/users/${editingStudent._id}`
        : `${API_BASE}/api/users`;

      const body = editingStudent
        ? { name: form.name, email: form.email, studentId: form.studentId, password: form.password || undefined }
        : { ...form, role: "student" };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Operation failed");
      }

      const data = await res.json();
      if (editingStudent) {
        setStudents(prev => prev.map(s => s._id === editingStudent._id ? data.data : s));
        toast.success("Student updated successfully");
      } else {
        setStudents(prev => [data.data, ...prev]);
        toast.success("Student added successfully");
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

      setStudents(prev => prev.filter(s => s._id !== id));
      toast.success("Student deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 page-shell">
      <PageHeader title="Students" description="View and manage enrolled students">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 bg-opacity-95 border-slate-700">
            <DialogHeader>
              <DialogTitle className="font-display">{editingStudent ? "Edit Student" : "Add Student"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Name</Label>
                <Input 
                  value={form.name} 
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} 
                  placeholder="Student name"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} 
                  placeholder="student@uni.edu"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label>Student ID</Label>
                <Input 
                  value={form.studentId} 
                  onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))} 
                  placeholder="e.g., 2024001"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              {!editingStudent && (
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
              <Button onClick={handleSave}>{editingStudent ? "Save Changes" : "Add Student"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="pl-9" />
      </div>

      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No students found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-display font-semibold">Student</th>
                  <th className="text-left p-3 font-display font-semibold hidden sm:table-cell">Email</th>
                  <th className="text-left p-3 font-display font-semibold hidden md:table-cell">Student ID</th>
                  <th className="text-left p-3 font-display font-semibold">Enrolled Sports</th>
                  <th className="text-right p-3 font-display font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors animate-fade-in">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-xs shrink-0">
                          {student.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">{student.email}</td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="outline" className="text-xs gap-1">{student.studentId || "N/A"}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {student.enrolledSports?.map(s => <Badge key={s._id} variant="secondary" className="text-xs">{s.name}</Badge>)}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(student)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(student._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
