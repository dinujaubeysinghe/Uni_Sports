import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Boxes, CalendarDays, CreditCard, Loader2, Trophy, Users } from "lucide-react";
import AdminLocationBookingManagement from "@/components/AdminLocationBookingManagement";

type Sport = {
  _id: string;
  name: string;
  description?: string;
};

type AppUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "coach" | "student";
};

type SessionEvent = {
  _id: string;
  title?: string;
  date?: string;
  startTime?: string;
  status?: string;
  sport?: {
    _id: string;
    name: string;
  };
};

type LocationItem = {
  _id: string;
  itemName: string;
  totalQuantity: number;
  availableQuantity: number;
  status: string;
  waitlistCount?: number;
  sport?: {
    _id: string;
    name: string;
  };
  location?: {
    _id: string;
    name: string;
  };
};

type Payment = {
  _id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid" | "delivered";
  user?: {
    _id: string;
    name: string;
  };
};

type ApiResponse<T> = {
  data?: T;
  summary?: {
    totalAmount?: number;
    count?: number;
  };
  collected?: {
    totalAmount?: number;
    count?: number;
  };
  pending?: {
    totalAmount?: number;
    count?: number;
  };
};

export default function AdminDashboard() {
  const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
  const token = localStorage.getItem("token") || "";

  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState<Sport[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [inventory, setInventory] = useState<LocationItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reportRevenue, setReportRevenue] = useState(0);
  const [reportPending, setReportPending] = useState(0);

  useEffect(() => {
    const fetchJson = async <T,>(url: string, secure = false): Promise<T[]> => {
      const response = await fetch(url, {
        headers: secure ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        return [];
      }

      const body = (await response.json()) as ApiResponse<T[]>;
      return Array.isArray(body.data) ? body.data : [];
    };

    const load = async () => {
      try {
        setLoading(true);

        const [sportsData, usersData, sessionsData, inventoryData, paymentsData] = await Promise.all([
          fetchJson<Sport>(`${API_BASE}/api/sports`),
          fetchJson<AppUser>(`${API_BASE}/api/users`, true),
          fetchJson<SessionEvent>(`${API_BASE}/api/sessions`),
          fetchJson<LocationItem>(`${API_BASE}/api/inventory`, true),
          fetchJson<Payment>(`${API_BASE}/api/payments?limit=1000`, true),
        ]);

        const fallbackRevenue = paymentsData
          .filter((payment) => payment.status === "approved" || payment.status === "paid" || payment.status === "delivered")
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const fallbackPending = paymentsData
          .filter((payment) => payment.status === "pending")
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const reportResponse = await fetch(`${API_BASE}/api/payments/report`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (reportResponse.ok) {
          const reportBody = (await reportResponse.json()) as ApiResponse<Payment[]>;
          const resolvedRevenue = Number(
            reportBody.collected?.totalAmount ?? reportBody.summary?.totalAmount ?? fallbackRevenue,
          );
          const resolvedPending = Number(reportBody.pending?.totalAmount ?? fallbackPending);

          setReportRevenue(Number.isFinite(resolvedRevenue) ? resolvedRevenue : fallbackRevenue);
          setReportPending(Number.isFinite(resolvedPending) ? resolvedPending : fallbackPending);
        } else {
          setReportRevenue(fallbackRevenue);
          setReportPending(fallbackPending);
        }

        setSports(sportsData);
        setUsers(usersData);
        setEvents(
          sessionsData.filter(
            (session) => session.status === "scheduled" || session.status === "upcoming",
          ),
        );
        setInventory(inventoryData);
        setPayments(paymentsData);
      } catch (error) {
        toast.error("Failed to load dashboard details.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [API_BASE, token]);

  const usersSummary = useMemo(() => {
    const coaches = users.filter((user) => user.role === "coach").length;
    const students = users.filter((user) => user.role === "student").length;
    return { total: users.length, coaches, students };
  }, [users]);

  const paymentSummary = useMemo(() => {
    const totalCollected = payments
      .filter((payment) => payment.status === "approved" || payment.status === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pending = payments
      .filter((payment) => payment.status === "pending")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const paidUsers = new Set(payments.map((payment) => payment.user?._id).filter(Boolean)).size;

    return { totalCollected, pending, paidUsers };
  }, [payments]);

  const panelTheme = {
    sport: "rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-[#1a2250] to-[#131a3a] p-6 shadow-lg shadow-black/20 transition hover:border-indigo-300/40",
    payment: "rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-[#132b2a] to-[#0f2221] p-6 shadow-lg shadow-black/20 transition hover:border-emerald-300/40",
    user: "rounded-2xl border border-sky-400/25 bg-gradient-to-br from-[#162941] to-[#122238] p-6 shadow-lg shadow-black/20 transition hover:border-sky-300/40",
    event: "rounded-2xl border border-amber-400/25 bg-gradient-to-br from-[#2d2619] to-[#231f15] p-6 shadow-lg shadow-black/20 transition hover:border-amber-300/40",
    inventory: "rounded-2xl border border-violet-400/25 bg-gradient-to-br from-[#261d3e] to-[#1f1832] p-6 shadow-lg shadow-black/20 transition hover:border-violet-300/40",
    summary: "rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#143040] to-[#102736] p-6 shadow-lg shadow-black/20 transition hover:border-cyan-300/40",
  };

  const rowTheme = {
    sport: "flex items-center gap-3 rounded-xl border border-indigo-300/20 bg-indigo-200/10 p-4 transition hover:bg-indigo-200/20",
    payment: "flex items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-200/10 p-4 transition hover:bg-emerald-200/20",
    user: "flex items-center gap-3 rounded-xl border border-sky-300/20 bg-sky-200/10 p-4 transition hover:bg-sky-200/20",
    event: "flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-200/10 p-4 transition hover:bg-amber-200/20",
    inventory: "flex items-center gap-3 rounded-xl border border-violet-300/20 bg-violet-200/10 p-4 transition hover:bg-violet-200/20",
  };

  const getInventoryBadgeClass = (item: LocationItem) => {
    if (item.availableQuantity === 0) {
      return "bg-red-300/20 text-red-100";
    }

    if (item.availableQuantity < item.totalQuantity) {
      return "bg-amber-300/20 text-amber-100";
    }

    return "bg-emerald-300/20 text-emerald-100";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 p-6 text-white shadow-xl">
                <p className="text-sm opacity-80">Total Sports</p>
                <p className="mt-2 text-3xl font-bold">{sports.length}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-green-500 via-green-400 to-emerald-400 p-6 text-white shadow-xl">
                <p className="text-sm opacity-80">Upcoming Events</p>
                <p className="mt-2 text-3xl font-bold">{events.length}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 p-6 text-white shadow-xl">
                <p className="text-sm opacity-80">Inventory Items</p>
                <p className="mt-2 text-3xl font-bold">{inventory.length}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-400 p-6 text-white shadow-xl">
                <p className="text-sm opacity-80">Revenue</p>
                <p className="mt-2 text-3xl font-bold">{reportRevenue}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={panelTheme.sport}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Sport Management</h2>
                    <p className="mt-1 text-sm text-slate-300">Latest added sports</p>
                  </div>
                  <Link to="/admin/sports">
                    <Button className="border-slate-400/40 bg-transparent text-slate-100 hover:bg-slate-100/10" variant="outline">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {sports.slice(0, 5).map((sport) => (
                    <div key={sport._id} className={rowTheme.sport}>
                      <Trophy className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="font-semibold text-slate-100">{sport.name}</p>
                        <p className="text-xs text-slate-300">{sport.description || "No description"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={panelTheme.payment}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Payment Management</h2>
                    <p className="mt-1 text-sm text-slate-300">Recent payment records</p>
                  </div>
                  <Link to="/admin/payments">
                    <Button className="border-slate-400/40 bg-transparent text-slate-100 hover:bg-slate-100/10" variant="outline">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment._id} className={rowTheme.payment}>
                      <CreditCard className="h-5 w-5 text-emerald-300" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-100">{payment.user?.name || "Unknown user"}</p>
                        <p className="text-xs text-slate-300">Status: {payment.status}</p>
                      </div>
                      <Badge className="bg-emerald-300/20 text-emerald-100">{payment.amount} LKR</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={panelTheme.user}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">User Management</h2>
                    <p className="mt-1 text-sm text-slate-300">Coaches and students</p>
                  </div>
                  <Link to="/admin/users">
                    <Button className="border-slate-400/40 bg-transparent text-slate-100 hover:bg-slate-100/10" variant="outline">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {users.slice(0, 5).map((user) => (
                    <div key={user._id} className={rowTheme.user}>
                      <Users className="h-5 w-5 text-sky-300" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-100">{user.name}</p>
                        <p className="text-xs text-slate-300">{user.email}</p>
                      </div>
                      <Badge className="capitalize bg-sky-300/20 text-sky-100">{user.role}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-sky-300/15 p-2">
                    <p className="text-xs text-slate-300">Total</p>
                    <p className="font-bold text-sky-100">{usersSummary.total}</p>
                  </div>
                  <div className="rounded-lg bg-sky-300/15 p-2">
                    <p className="text-xs text-slate-300">Coaches</p>
                    <p className="font-bold text-sky-100">{usersSummary.coaches}</p>
                  </div>
                  <div className="rounded-lg bg-sky-300/15 p-2">
                    <p className="text-xs text-slate-300">Students</p>
                    <p className="font-bold text-sky-100">{usersSummary.students}</p>
                  </div>
                </div>
              </div>

              <div className={panelTheme.event}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Event Management</h2>
                    <p className="mt-1 text-sm text-slate-300">Upcoming sessions as events</p>
                  </div>
                  <Link to="/admin/home">
                    <Button className="border-slate-400/40 bg-transparent text-slate-100 hover:bg-slate-100/10" variant="outline">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <div key={event._id} className={rowTheme.event}>
                      <CalendarDays className="h-5 w-5 text-amber-300" />
                      <div>
                        <p className="font-semibold text-slate-100">
                          {event.title || event.sport?.name || "Session Event"}
                        </p>
                        <p className="text-xs text-slate-300">
                          {event.date || "No date"} • {event.startTime || "TBD"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={panelTheme.inventory}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Inventory Management</h2>
                    <p className="mt-1 text-sm text-slate-300">Latest inventory stock and availability</p>
                  </div>
                  <Link to="/admin/inventory">
                    <Button className="border-slate-400/40 bg-transparent text-slate-100 hover:bg-slate-100/10" variant="outline">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {inventory.length > 0 ? (
                    inventory.slice(0, 5).map((item) => (
                      <div key={item._id} className={rowTheme.inventory}>
                        <Boxes className="h-5 w-5 text-violet-300" />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-100">{item.itemName}</p>
                          <p className="text-xs text-slate-300">
                            {item.sport?.name || "No sport"} • {item.location?.name || "No location"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Available {item.availableQuantity} of {item.totalQuantity}
                            {typeof item.waitlistCount === "number" ? ` • ${item.waitlistCount} waiting` : ""}
                          </p>
                        </div>
                        <Badge className={getInventoryBadgeClass(item)}>
                          {item.availableQuantity > 0 ? `${item.availableQuantity} left` : "Out of stock"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-violet-300/20 bg-violet-200/10 p-4 text-sm text-slate-300">
                      No inventory items found.
                    </div>
                  )}
                </div>
              </div>

              <div className={panelTheme.summary}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Location Booking Requests</h2>
                    <p className="mt-1 text-sm text-slate-300">Approve or decline coach location requests</p>
                  </div>
                  <Badge className="bg-blue-300/20 text-blue-100">Management</Badge>
                </div>
                <AdminLocationBookingManagement token={token} adminId="" />
              </div>
            </div>

            {/* Payment Summary Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={panelTheme.summary}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Payment Summary</h2>
                    <p className="mt-1 text-sm text-slate-300">Quick finance overview</p>
                  </div>
                  <Link to="/admin/payment/report">
                    <Button className="gap-2 border-slate-400/40 bg-transparent text-slate-100 hover:bg-slate-100/10" variant="outline">
                      Payments
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <p className="text-xs text-slate-300">Total Collected</p>
                    <p className="mt-2 text-xl font-bold text-emerald-100">{reportRevenue}</p>
                  </div>
                  <div className="rounded-xl border border-orange-300/20 bg-orange-300/10 p-4">
                    <p className="text-xs text-slate-300">Pending</p>
                    <p className="mt-2 text-xl font-bold text-orange-100">{reportPending}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                    <p className="text-xs text-slate-300">Paid Users</p>
                    <p className="mt-2 text-xl font-bold text-cyan-100">{paymentSummary.paidUsers}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
