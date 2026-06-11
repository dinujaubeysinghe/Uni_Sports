import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";


import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Clock3, ExternalLink, Loader2, Search } from "lucide-react";

type PaymentStatus = "pending" | "approved" | "rejected" | "paid" | "delivered";

type BillingDetails = {
	name?: string;
	email?: string;
	phone?: string;
	address?: {
		street?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		country?: string;
	};
};

type Payment = {
	_id: string;
	user: { _id?: string; name?: string; email?: string };
	type: "event" | "item";
	amount: number;
	status: PaymentStatus;
	paymentMethod?: string;
	transactionRef?: string;
	receiptUrl?: string;
	createdAt: string;
	note?: string;
	billingDetails?: BillingDetails;
};

const STATUS_OPTIONS: Array<"all" | PaymentStatus> = [
	"all",
	"pending",
	"approved",
	"rejected",
	"paid",
	"delivered",
];
 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

export default function PaymentVerification() {
	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
	const [selected, setSelected] = useState<Payment | null>(null);



	const getToken = () => localStorage.getItem("token") || "";

	const parsePayments = (payload: unknown): Payment[] => {
		if (Array.isArray(payload)) return payload as Payment[];
		if (payload && typeof payload === "object" && "data" in payload) {
			const data = (payload as { data?: unknown }).data;
			return Array.isArray(data) ? (data as Payment[]) : [];
		}
		return [];
	};

	const loadTransactions = async () => {
		try {
			setLoading(true);
			const res = await fetch(`${API_BASE}/api/payments?limit=300`, {
				headers: { Authorization: `Bearer ${getToken()}` },
			});

			if (!res.ok) throw new Error("Failed to load transactions");
			const data = await res.json();
			setPayments(parsePayments(data));
		} catch (error) {
			toast.error("Failed to load transaction records");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadTransactions();
	}, []);

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return payments.filter((payment) => {
			const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
			const haystack = [
				payment._id,
				payment.transactionRef || "",
				payment.user?.name || "",
				payment.user?.email || "",
				payment.billingDetails?.name || "",
			]
				.join(" ")
				.toLowerCase();

			const matchesSearch = term ? haystack.includes(term) : true;
			return matchesStatus && matchesSearch;
		});
	}, [payments, search, statusFilter]);

	const statusCounts = useMemo(() => {
		return filtered.reduce(
			(acc, payment) => {
				acc[payment.status] += 1;
				return acc;
			},
			{
				pending: 0,
				approved: 0,
				rejected: 0,
				paid: 0,
				delivered: 0,
			} as Record<PaymentStatus, number>
		);
	}, [filtered]);

	const formatDate = (value: string) => new Date(value).toLocaleString();

	const getStatusTone = (status: PaymentStatus) => {
		if (status === "approved" || status === "paid" || status === "delivered") {
			return "border-emerald-500/50 text-emerald-200";
		}
		if (status === "rejected") return "border-red-500/50 text-red-200";
		return "border-amber-500/50 text-amber-200";
	};



	return (
		<div className="space-y-6">
			<PageHeader
				title="Payment Details"
				description="View all payment transactions and verify pending payments manually."
			/>

			<div className="grid gap-3 md:grid-cols-5">
				<Card className="border-slate-700 bg-slate-900/90">
					<CardContent className="pt-5">
						<p className="text-xs uppercase tracking-wide text-slate-400">Pending</p>
						<p className="mt-1 text-2xl font-semibold text-white">{statusCounts.pending}</p>
					</CardContent>
				</Card>
				<Card className="border-slate-700 bg-slate-900/90">
					<CardContent className="pt-5">
						<p className="text-xs uppercase tracking-wide text-slate-400">Approved</p>
						<p className="mt-1 text-2xl font-semibold text-white">{statusCounts.approved}</p>
					</CardContent>
				</Card>
				<Card className="border-slate-700 bg-slate-900/90">
					<CardContent className="pt-5">
						<p className="text-xs uppercase tracking-wide text-slate-400">Rejected</p>
						<p className="mt-1 text-2xl font-semibold text-white">{statusCounts.rejected}</p>
					</CardContent>
				</Card>
				<Card className="border-slate-700 bg-slate-900/90">
					<CardContent className="pt-5">
						<p className="text-xs uppercase tracking-wide text-slate-400">Paid</p>
						<p className="mt-1 text-2xl font-semibold text-white">{statusCounts.paid}</p>
					</CardContent>
				</Card>
				<Card className="border-slate-700 bg-slate-900/90">
					<CardContent className="pt-5">
						<p className="text-xs uppercase tracking-wide text-slate-400">Delivered</p>
						<p className="mt-1 text-2xl font-semibold text-white">{statusCounts.delivered}</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
				<Card className="border-slate-700 bg-slate-900/90">
					<CardHeader className="space-y-4">
						<CardTitle className="text-white">All Transactions</CardTitle>
						<div className="flex flex-wrap gap-3">
							<div className="relative w-full max-w-md">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search by user or transaction ID"
									className="border-slate-600 bg-slate-800 pl-9 text-white placeholder:text-slate-400"
								/>
							</div>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value as "all" | PaymentStatus)}
								className="h-10 rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none"
							>
								{STATUS_OPTIONS.map((status) => (
									<option key={status} value={status}>
										{status === "all" ? "All Statuses" : status.charAt(0).toUpperCase() + status.slice(1)}
									</option>
								))}
							</select>
						</div>

					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="flex items-center justify-center py-12 text-slate-300">
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Loading transactions...
							</div>
						) : filtered.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
								<Clock3 className="h-6 w-6 text-slate-400" />
								<p className="text-sm font-medium text-slate-200">No transactions found</p>
								<p className="text-xs text-slate-400">Try changing the filters or search term.</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader className="bg-slate-800">
										<TableRow className="border-slate-700">
											<TableHead className="text-slate-300">Transaction ID</TableHead>
											<TableHead className="text-slate-300">User</TableHead>
											<TableHead className="text-slate-300">Amount</TableHead>
											<TableHead className="text-slate-300">Status</TableHead>
											<TableHead className="text-slate-300">Submitted</TableHead>
											<TableHead className="text-right text-slate-300">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filtered.map((payment) => (
											<TableRow
												key={payment._id}
												className={`cursor-pointer border-slate-800 hover:bg-slate-800/40 ${selected?._id === payment._id ? "bg-slate-800/70" : ""}`}
												onClick={() => setSelected(payment)}
											>
												<TableCell className="font-mono text-xs text-slate-300">{payment._id}</TableCell>
												<TableCell>
													<p className="font-medium text-slate-100">{payment.user?.name || payment.billingDetails?.name || "Unknown"}</p>
													<p className="text-xs text-slate-400">{payment.user?.email || payment.billingDetails?.email || "No email"}</p>
												</TableCell>
												<TableCell className="text-slate-100">LKR {payment.amount.toLocaleString()}</TableCell>
												<TableCell>
													<Badge variant="outline" className={`capitalize ${getStatusTone(payment.status)}`}>
														{payment.status}
													</Badge>
												</TableCell>
												<TableCell className="text-xs text-slate-400">{formatDate(payment.createdAt)}</TableCell>
												<TableCell className="text-right">
													<div>
														<Button
															size="sm"
															variant="outline"
															className="border-slate-600 text-slate-100 hover:bg-slate-700"
															onClick={(e) => {
																e.stopPropagation();
																setSelected(payment);
															}}
														>
															View Details
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border-slate-700 bg-slate-900/90">
					<CardHeader>
						<CardTitle className="text-white">Transaction Details</CardTitle>
					</CardHeader>
					<CardContent>
						{!selected ? (
							<div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center">
								<Clock3 className="h-6 w-6 text-slate-400" />
								<p className="text-sm text-slate-300">Select a transaction from the table</p>
							</div>
						) : (
							<div className="space-y-4 text-sm">
								<div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
									<p className="text-xs text-slate-400">Transaction</p>
									<p className="font-mono text-xs text-slate-200">{selected._id}</p>
									<Badge variant="outline" className={`capitalize ${getStatusTone(selected.status)}`}>
										{selected.status}
									</Badge>
								</div>

								<div className="space-y-2 rounded-lg border border-slate-800 p-3">
									<p className="text-xs text-slate-400">User</p>
									<p className="text-slate-200">Name: {selected.user?.name || selected.billingDetails?.name || "-"}</p>
									<p className="text-slate-200">Email: {selected.user?.email || selected.billingDetails?.email || "-"}</p>
								</div>

								<div className="space-y-2 rounded-lg border border-slate-800 p-3">
									<p className="text-xs text-slate-400">Payment</p>
									<p className="text-slate-200">Amount: LKR {selected.amount.toLocaleString()}</p>
									<p className="text-slate-200">Type: <span className="capitalize">{selected.type}</span></p>
									<p className="text-slate-200">Method: {selected.paymentMethod || "-"}</p>
									<p className="text-slate-200">Transaction Ref: {selected.transactionRef || "-"}</p>
									<p className="text-slate-200">Submitted: {formatDate(selected.createdAt)}</p>
									{selected.receiptUrl && (
										<a
											href={selected.receiptUrl}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200"
										>
											Open Receipt
											<ExternalLink className="h-3.5 w-3.5" />
										</a>
									)}
									{selected.note && <p className="text-slate-200">Note: {selected.note}</p>}
								</div>

								<div className="space-y-2 rounded-lg border border-slate-800 p-3">
									<p className="text-xs text-slate-400">Billing</p>
									<p className="text-slate-200">Name: {selected.billingDetails?.name || "-"}</p>
									<p className="text-slate-200">Email: {selected.billingDetails?.email || "-"}</p>
									<p className="text-slate-200">Phone: {selected.billingDetails?.phone || "-"}</p>
									<p className="text-slate-200">
										Address: {selected.billingDetails?.address?.street || "-"}, {selected.billingDetails?.address?.city || "-"}, {selected.billingDetails?.address?.state || "-"}
									</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

		</div>
	);
}
