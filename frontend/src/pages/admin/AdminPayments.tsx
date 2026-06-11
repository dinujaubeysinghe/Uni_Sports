import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Loader } from "lucide-react";
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

interface Payment {
  _id: string;
  user: { _id: string; name: string; email: string };
  type: "event" | "item";
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid" | "delivered";
  paymentMethod: string;
  transactionRef?: string;
  createdAt: string;
  note?: string;
}

export default function AdminPayments() {
  const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"approved" | "rejected">("approved");
  const [verifyNote, setVerifyNote] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    loadPayments();
  }, []);

  const getToken = () => localStorage.getItem("token") || "";

  const loadPayments = async () => {
    try {
      setLoading(true);
      const [paymentsRes, reportRes] = await Promise.all([
        fetch(`${API_BASE}/api/payments?limit=1000`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        }),
        fetch(`${API_BASE}/api/payments/report`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        })
      ]);

      if (!paymentsRes.ok) throw new Error("Failed to load payments");
      const paymentsData = await paymentsRes.json();
      const list: Payment[] = paymentsData.data || [];
      setPayments(list);

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setTotalRevenue(Number(reportData?.collected?.totalAmount || 0));
      } else {
        const fallbackRevenue = list
          .filter((p) => p.status === "approved" || p.status === "paid" || p.status === "delivered")
          .reduce((sum, p) => sum + p.amount, 0);
        setTotalRevenue(fallbackRevenue);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedPayment) {
      return toast.error("Please fill valid fields: select a payment to verify.");
    }
    if (verifyStatus === "rejected" && !verifyNote.trim()) {
      return toast.error("Please fill valid fields: rejection note is required.");
    }

    try {
      const res = await fetch(`${API_BASE}/api/payments/${selectedPayment._id}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          status: verifyStatus,
          note: verifyNote
        })
      });

      if (!res.ok) throw new Error("Failed to verify payment");
      toast.success(`Payment ${verifyStatus} successfully`);
      setVerifyDialogOpen(false);
      setVerifyNote("");
      loadPayments();
    } catch (error) {
      console.error(error);
      toast.error("Failed to verify payment");
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
    const matchesSearch = (p.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
                         (p.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
                         p._id.includes(search);
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === "pending").length,
    approved: payments.filter(p => p.status === "approved").length,
    rejected: payments.filter(p => p.status === "rejected").length,
    totalAmount: totalRevenue
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Management"
        description="View and verify all student payments"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Total Payments</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Approved</p>
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">Total Revenue </p>
          <p className="text-2xl font-bold text-white">{stats.totalAmount} LKR</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by name, email or ID..."
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
          <option value="delivered">Delivered</option>
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
            No payments found
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-700">
              <TableRow>
                <TableHead className="text-slate-300">Student Name</TableHead>
                <TableHead className="text-slate-300">Email</TableHead>
                <TableHead className="text-slate-300">Type</TableHead>
                <TableHead className="text-slate-300">Amount</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Date</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => (
                <TableRow key={payment._id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-slate-200">{payment.user?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-slate-200">{payment.user?.email || 'N/A'}</TableCell>
                  <TableCell className="text-slate-200">
                    <Badge variant="outline" className="capitalize">{payment.type}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-200">{payment.amount} LKR</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)} capitalize`}>
                      {payment.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-200">{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>
                    {payment.status === "pending" && (
                      <Dialog open={verifyDialogOpen && selectedPayment?._id === payment._id} onOpenChange={(open) => {
                        if (open) {
                          setSelectedPayment(payment);
                          setVerifyStatus("approved");
                          setVerifyNote("");
                        }
                        setVerifyDialogOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            Verify
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 bg-opacity-95 border-slate-700">
                          <DialogHeader>
                            <DialogTitle>Verify Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium text-slate-300">Student: {selectedPayment?.user?.name || 'Unknown'}</p>
                              <p className="text-sm text-slate-400">Amount: {selectedPayment?.amount} LKR</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setVerifyStatus("approved")}
                                variant={verifyStatus === "approved" ? "default" : "outline"}
                                className="gap-1"
                              >
                                <Check className="h-4 w-4" /> Approve
                              </Button>
                              <Button
                                onClick={() => setVerifyStatus("rejected")}
                                variant={verifyStatus === "rejected" ? "destructive" : "outline"}
                                className="gap-1"
                              >
                                <X className="h-4 w-4" /> Reject
                              </Button>
                            </div>
                            <div>
                              <Label>Note (optional)</Label>
                              <Textarea
                                placeholder="Add a note..."
                                value={verifyNote}
                                onChange={(e) => setVerifyNote(e.target.value)}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 mt-2"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleVerifyPayment} className="bg-indigo-600 hover:bg-indigo-700">
                              Verify
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    {payment.status !== "pending" && (
                      <span className="text-sm text-slate-400">Verified</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
