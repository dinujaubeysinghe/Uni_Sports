import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, UserCheck } from "lucide-react";
import { UserRole } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
const MAIN_ADMIN_EMAIL = "admin@my.sliit.lk";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface AppUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
  isActive: boolean;
}

export default function AdminUserView() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "coach" | "student">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE}/api/users?limit=500`, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        });

        const json = await response.json();
        if (!response.ok) throw new Error(json.message);

        const data: AppUser[] = (json.data ?? []).map((u: any) => ({
          ...u,
          id: u.id ?? u._id,
          isActive: u.isActive ?? true,
        }));

        setUsers(
          data.filter(
            (u) => (u.email || "").toLowerCase() !== MAIN_ADMIN_EMAIL
          )
        );
      } catch (err: any) {
        setError(err?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json?.message || 'Failed to update user status');

      const updatedIsActive = json?.data?.isActive ?? !currentStatus;

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: updatedIsActive } : u))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update user status');
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();

    return users
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter(
        (u) =>
          !query ||
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
  }, [users, search, roleFilter]);

  const roleBadge = (role: UserRole | string) => {
    if (role === "coach")
      return <Badge className="bg-warning/20 text-warning border border-warning/40">Coach</Badge>;
    if (role === "student")
      return <Badge className="bg-info/20 text-info border border-info/40">Student</Badge>;
    return <Badge className="bg-muted text-muted-foreground border border-border">{role}</Badge>;
  };

  return (
    <div className="space-y-6 min-w-0 page-shell">

        <PageHeader
          title="User Management"
          description="Manage and monitor all users in the system"
        />
        
        {/* SEARCH + FILTER */}
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-4 bg-card p-4 rounded-xl border border-border min-w-0">

          <div className="relative w-full md:flex-1 md:min-w-[220px] md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-10 bg-background/60 border-border text-black placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-3 flex-wrap md:flex-nowrap justify-start md:justify-end">
            <Select
            
              value={roleFilter}
              onValueChange={(v) =>
                setRoleFilter(v as "all" | "coach" | "student")
              }
            >
              <SelectTrigger className="w-full sm:w-44 bg-background/60 border-border text-foreground">
                <SelectValue placeholder="Filter role" />
              </SelectTrigger>
              <SelectContent className="bg-white border-border text-black">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
              }}
              variant="outline"
              className="w-full sm:w-auto border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-destructive/15 border border-destructive/40 text-destructive p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="bg-card rounded-xl overflow-hidden border border-border min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="p-4  text-left min-w-0">User</th>
                  <th className="p-4 hidden lg:table-cell min-w-0 text-left">Email</th>
                  <th className="p-4 min-w-0">Role</th>
                  <th className="p-4 hidden lg:table-cell min-w-0">Joined</th>
                  <th className="p-4 hidden md:table-cell min-w-0">Status</th>
                  
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id ?? user._id}
                      className="border-t border-border hover:bg-accent/35 transition-colors"
                    >
                      <td className="p-4 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 hidden sm:table-cell text-muted-foreground min-w-0 truncate">
                        {user.email}
                      </td>

                      <td className="p-4 min-w-0">
                        {roleBadge(user.role)}
                      </td>

                      
                      <td className="p-4 hidden lg:table-cell text-muted-foreground min-w-0">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="p-4 hidden md:table-cell min-w-0">
                        <Button
                          onClick={() => handleToggleActive(user.id!, user.isActive)}
                          className={`px-3 py-1 text-xs ${
                            user.isActive
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
  );
}