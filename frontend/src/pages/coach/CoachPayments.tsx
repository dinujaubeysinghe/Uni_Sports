import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Payment {
  _id: string;
  user: { _id: string; name: string; email: string };
  type: "event" | "item";
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid" | "delivered";
  createdAt: string;
}

export default function CoachPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    loadPayments();
  }, []);

   const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
  const getToken = () => localStorage.getItem("token") || "";

  const loadPayments = async () => {
    try {
      setLoading(true);
      // Coaches can view payments for their sessions
      const res = await fetch(`${API_BASE}/api/payments`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Failed to load payments");
      const data = await res.json();
      // Filter payments that are related to coach's sessions (events)
      const eventPayments = (data.data || []).filter((p: Payment) => p.type === "event");
      setPayments(eventPayments);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "delivered":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const filtered = payments.filter(p => {
    const matchesSearch = p.user.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === "pending").length,
    approved: payments.filter(p => p.status === "approved").length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Payments"
        description="Track payments from students for your events"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{stats.totalAmount} LKR</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by student name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 max-w-xs"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded-md"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No event payments found
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-700">
              <TableRow>
                <TableHead className="text-slate-300">Student Name</TableHead>
                <TableHead className="text-slate-300">Email</TableHead>
                <TableHead className="text-slate-300">Amount</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => (
                <TableRow key={payment._id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-slate-200">{payment.user.name}</TableCell>
                  <TableCell className="text-slate-200">{payment.user.email}</TableCell>
                  <TableCell className="text-slate-200 font-semibold">{payment.amount} LKR</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)} capitalize`}>
                      {payment.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-200">{formatDate(payment.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
