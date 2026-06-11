import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { merchandiseService } from "@/services/merchandiseService";
import { DashboardLayout } from "@/components/DashboardLayout";

 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

type BillingDetails = {
	name: string;
	email: string;
	phone: string;
	phone2: string;
	address: {
		street: string;
		city: string;
		state: string;
		zipCode: string;
		country: string;
	};
};

type BillingErrors = Record<string, string>;

type CheckoutItem = {
	_id: string;
	itemName: string;
	price: number;
	image: string;
	category: string;
	sport?: { _id: string; name: string };
	variants: Array<{ size: string; stockQuantity: number }>;
};

type CheckoutNavigationState = {
	itemId?: string;
	selectedSize?: string;
	quantity?: number;
};

const emptyBillingDetails: BillingDetails = {
	name: "",
	email: "",
	phone: "",
	phone2: "",
	address: {
		street: "",
		city: "",
		state: "",
		zipCode: "",
		country: "Sri Lanka",
	},
};

export default function Checkout() {
	const navigate = useNavigate();
	const location = useLocation();
	const { itemSlug } = useParams<{ itemSlug: string }>();
	const navigationState = (location.state as CheckoutNavigationState | null) || null;
	const storedCheckoutState = (() => {
		try {
			const raw = sessionStorage.getItem("checkoutOrderContext");
			return raw ? (JSON.parse(raw) as CheckoutNavigationState) : null;
		} catch {
			return null;
		}
	})();
	const checkoutContext = navigationState || storedCheckoutState;
	const [item, setItem] = useState<CheckoutItem | null>(null);
	const [itemLoading, setItemLoading] = useState(true);
	const [itemError, setItemError] = useState<string | null>(null);
	const [selectedSize, setSelectedSize] = useState(checkoutContext?.selectedSize || "");
	const [quantity, setQuantity] = useState(checkoutContext?.quantity && checkoutContext.quantity > 0 ? checkoutContext.quantity : 1);

	const [billingDetails, setBillingDetails] = useState<BillingDetails>(emptyBillingDetails);
	const [errors, setErrors] = useState<BillingErrors>({});
	const [transactionRef, setTransactionRef] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [receiptUrl, setReceiptUrl] = useState("");
	const [uploading, setUploading] = useState(false);
	const [placingOrder, setPlacingOrder] = useState(false);

	const getToken = () => localStorage.getItem("token") || "";

	const isMongoObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

	const toSlug = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-");

	const stockForSelectedSize = useMemo(() => {
		if (!item || !selectedSize) return 0;
		const variant = item.variants.find((entry) => entry.size === selectedSize);
		return variant ? variant.stockQuantity : 0;
	}, [item, selectedSize]);

	const totalAmount = useMemo(() => {
		if (!item) return 0;
		return item.price * quantity;
	}, [item, quantity]);

	useEffect(() => {
		const loadItem = async () => {
			if (!itemSlug) {
				setItem(null);
				setItemError("No merchandise reference provided.");
				setItemLoading(false);
				return;
			}

			setItemLoading(true);
			setItemError(null);

			try {
				if (isMongoObjectId(itemSlug)) {
					const byId = await merchandiseService.getById(itemSlug);
					setItem(byId.data);
					return;
				}

				const all = await merchandiseService.getAll();
				const matched = all.data.find((entry: CheckoutItem) => {
					const itemNameSlug = toSlug(entry.itemName);
					const sportSlug = entry.sport?.name ? toSlug(entry.sport.name) : "";
					return (
						itemNameSlug === itemSlug ||
						sportSlug === itemSlug ||
						itemNameSlug.includes(itemSlug)
					);
				});

				if (!matched) {
					setItem(null);
					setItemError("The selected item is not available for checkout.");
					return;
				}

				setItem(matched);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Failed to load item details";
				setItem(null);
				setItemError(message);
			} finally {
				setItemLoading(false);
			}
		};

		loadItem();
	}, [itemSlug]);

	useEffect(() => {
		if (!item) return;

		if (checkoutContext?.itemId && checkoutContext.itemId !== item._id) {
			sessionStorage.removeItem("checkoutOrderContext");
		}

		if (checkoutContext?.selectedSize) {
			const selectedVariant = item.variants.find((variant) => variant.size === checkoutContext.selectedSize);
			if (selectedVariant && selectedVariant.stockQuantity > 0) {
				setSelectedSize(checkoutContext.selectedSize);
				setQuantity(Math.max(1, Math.min(checkoutContext.quantity || 1, selectedVariant.stockQuantity)));
				return;
			}
		}

		if (selectedSize && stockForSelectedSize > 0) {
			if (quantity > stockForSelectedSize) {
				setQuantity(stockForSelectedSize);
			}
			return;
		}

		const firstAvailable = item.variants.find((variant) => variant.stockQuantity > 0);
		if (firstAvailable) {
			setSelectedSize(firstAvailable.size);
			setQuantity(1);
		}
	}, [item, selectedSize, quantity, stockForSelectedSize]);

	useEffect(() => {
		const loadBilling = async () => {
			try {
				const res = await fetch(`${API_BASE}api/users/me/billing-details`, {
					headers: { Authorization: `Bearer ${getToken()}` },
				});

				if (res.ok) {
					const data = await res.json();
					if (data?.data) {
						setBillingDetails({ ...emptyBillingDetails, ...data.data, address: { ...emptyBillingDetails.address, ...(data.data.address || {}) } });
						return;
					}
				}
			} catch (error) {
				// Fallback below
			}

			const cached = localStorage.getItem("billingDetails");
			if (cached) {
				const parsed = JSON.parse(cached);
				setBillingDetails({ ...emptyBillingDetails, ...parsed, address: { ...emptyBillingDetails.address, ...(parsed.address || {}) } });
			}
		};

		loadBilling();
	}, []);

	const handleBillingChange = (field: string, value: string) => {
		if (field.startsWith("address.")) {
			const key = field.split(".")[1] as keyof BillingDetails["address"];
			setBillingDetails((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
		} else {
			const key = field as keyof BillingDetails;
			setBillingDetails((prev) => ({ ...prev, [key]: value }));
		}

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: "" }));
		}
	};

	const validate = () => {
		const next: BillingErrors = {};

		if (!item) next.item = "Item is not available";
		if (!selectedSize.trim()) next.selectedSize = "Please select a size";
		if (!Number.isInteger(quantity) || quantity < 1) next.quantity = "Quantity must be at least 1";
		if (stockForSelectedSize > 0 && quantity > stockForSelectedSize) {
			next.quantity = `Only ${stockForSelectedSize} item(s) available for selected size`;
		}

		if (!billingDetails.name.trim()) next.name = "Full name is required";
		const normalizedEmail = billingDetails.email.trim().toLowerCase();
		if (!normalizedEmail) next.email = "Email is required";
		else if (!normalizedEmail.endsWith("@my.sliit.lk")) next.email = "Use your student email";
		if (!/^\d{10}$/.test(billingDetails.phone)) next.phone = "Phone must be exactly 10 digits";
		if (!billingDetails.address.street.trim()) next["address.street"] = "Street address is required";
		if (!billingDetails.address.city.trim()) next["address.city"] = "City is required";
		if (!billingDetails.address.state.trim()) next["address.state"] = "District/Province is required";
		if (!billingDetails.address.zipCode.trim()) next["address.zipCode"] = "Postal code is required";
		if (!billingDetails.address.country.trim()) next["address.country"] = "Country is required";
		if (!transactionRef.trim()) next.transactionRef = "Transaction reference is required";
		else if (transactionRef.trim().length > 10) next.transactionRef = "Transaction reference must be 10 characters or less";
		if (!selectedFile && !receiptUrl) next.receipt = "Payment receipt is required";

		if (next.selectedSize || next.quantity) {
			toast.error("Order details are missing. Please return to Merchandise and checkout again.");
		}

		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const uploadReceipt = async () => {
		if (!selectedFile) return receiptUrl;

		setUploading(true);
		try {
			const form = new FormData();
			form.append("receipt", selectedFile);

			const res = await fetch(`${API_BASE}api/upload/receipt`, {
				method: "POST",
				headers: { Authorization: `Bearer ${getToken()}` },
				body: form,
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data?.message || "Receipt upload failed");
			}

			const url = data?.data?.url;
			if (!url) throw new Error("Upload response did not return receipt URL");
			setReceiptUrl(url);
			toast.success("Receipt uploaded successfully");
			return url;
		} finally {
			setUploading(false);
		}
	};

	const handlePlaceOrder = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!item) return;
		if (!validate()) return;

		setPlacingOrder(true);
		try {
			// Create merchandise order so it appears in Student My Orders.
			await merchandiseService.createOrder(item._id, {
				quantity,
				selectedSize,
			});

			const uploadedUrl = await uploadReceipt();
			const finalReceiptUrl = uploadedUrl || receiptUrl;
			if (!finalReceiptUrl) {
				throw new Error("Receipt upload is required");
			}

			const res = await fetch(`${API_BASE}api/payments/manual`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${getToken()}`,
				},
				body: JSON.stringify({
					type: "item",
					referenceId: item._id,
					amount: totalAmount,
					transactionRef,
					receiptUrl: finalReceiptUrl,
					billingDetails,
				}),
			});

			const data = await res.json();
			if (!res.ok) {
				if (Array.isArray(data?.errors)) {
					const mapped: BillingErrors = {};
					data.errors.forEach((err: { field?: string; message?: string }) => {
						const rawField = err.field || "";
						const normalizedField = rawField.startsWith("billingDetails.")
							? rawField.replace("billingDetails.", "")
							: rawField;
						if (normalizedField && err.message) {
							mapped[normalizedField] = err.message;
						}
					});

					if (Object.keys(mapped).length > 0) {
						setErrors((prev) => ({ ...prev, ...mapped }));
					}
				}
				throw new Error(data?.message || "Failed to place order");
			}

			localStorage.setItem("billingDetails", JSON.stringify(billingDetails));
			sessionStorage.removeItem("checkoutOrderContext");
			toast.success("Order placed successfully. Payment is pending verification.");
			navigate("/student/merchandise/my-orders");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Order failed";
			toast.error(message);
		} finally {
			setPlacingOrder(false);
		}
	};

	if (itemLoading) {
		return (
			<DashboardLayout>
				<div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
					<Card>
						<CardHeader>
							<CardTitle>Loading Checkout</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-gray-600">Please wait while we load your item details.</p>
						</CardContent>
					</Card>
				</div>
			</DashboardLayout>
		);
	}

	if (!item) {
		return (
			<DashboardLayout>
				<div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
					<Card className="border-red-200">
						<CardHeader>
							<CardTitle>Item Not Found</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-sm text-gray-600">{itemError || "The selected item is not available for checkout."}</p>
							<Button asChild>
								<Link to="/student/payments">Back to Payments</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
		<div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
					<p className="text-sm text-gray-500">Complete your billing details and upload your bank transfer receipt.</p>
				</div>
				<Button variant="outline" asChild>
					<Link to="/student/payments" className="inline-flex items-center gap-2">
						<ArrowLeft className="h-4 w-4" />
						Back
					</Link>
				</Button>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Billing and Payment</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handlePlaceOrder} className="space-y-6">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Full Name</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.name} onChange={(e) => handleBillingChange("name", e.target.value)} />
									{errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Email</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.email} onChange={(e) => handleBillingChange("email", e.target.value)} />
									{errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Phone</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.phone} onChange={(e) => handleBillingChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
									{errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Phone 2 (Optional)</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.phone2} onChange={(e) => handleBillingChange("phone2", e.target.value.replace(/\D/g, "").slice(0, 10))} />
								</div>
								<div className="space-y-1 md:col-span-2">
									<label className="text-sm font-medium text-white">Address</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.address.street} onChange={(e) => handleBillingChange("address.street", e.target.value)} />
									{errors["address.street"] && <p className="text-sm text-red-500">{errors["address.street"]}</p>}
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">City</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.address.city} onChange={(e) => handleBillingChange("address.city", e.target.value)} />
									{errors["address.city"] && <p className="text-sm text-red-500">{errors["address.city"]}</p>}
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">District/Province</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.address.state} onChange={(e) => handleBillingChange("address.state", e.target.value)} />
									{errors["address.state"] && <p className="text-sm text-red-500">{errors["address.state"]}</p>}
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Postal Code</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.address.zipCode} onChange={(e) => handleBillingChange("address.zipCode", e.target.value)} />
									{errors["address.zipCode"] && <p className="text-sm text-red-500">{errors["address.zipCode"]}</p>}
								</div>
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Country</label>
									<input className="text-black w-full rounded-md border px-3 py-2" value={billingDetails.address.country} onChange={(e) => handleBillingChange("address.country", e.target.value)} />
									{errors["address.country"] && <p className="text-sm text-red-500">{errors["address.country"]}</p>}
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Bank Transaction Reference</label>
									<input
										className="text-black w-full rounded-md border px-3 py-2"
										value={transactionRef}
										maxLength={10}
										onChange={(e) => {
											setTransactionRef(e.target.value.slice(0, 10));
											if (errors.transactionRef) setErrors((prev) => ({ ...prev, transactionRef: "" }));
										}}
										placeholder="e.g. TXN-482920"
									/>
									{errors.transactionRef && <p className="text-sm text-red-500">{errors.transactionRef}</p>}
								</div>

								<div className="space-y-1">
									<label className="text-sm font-medium text-white">Upload Receipt (JPG/PNG/PDF)</label>
									<input
										type="file"
										accept="image/png,image/jpeg,application/pdf"
										className="w-full rounded-md border px-3 py-2"
										onChange={(e) => {
											const file = e.target.files?.[0] || null;
											setSelectedFile(file);
											if (errors.receipt) setErrors((prev) => ({ ...prev, receipt: "" }));
										}}
									/>
									{selectedFile && <p className="text-xs text-gray-600">Selected: {selectedFile.name}</p>}
									{errors.receipt && <p className="text-sm text-red-500">{errors.receipt}</p>}
								</div>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
								<Button type="submit" disabled={placingOrder || uploading} className="sm:w-auto border-orange-500 bg-orange-500 hover:bg-orange-600">
									{(placingOrder || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{placingOrder ? "Placing Order..." : uploading ? "Uploading Receipt..." : "Place Order"}
								</Button>
								<div className="inline-flex items-center gap-2 text-xs text-gray-500">
									<ShieldCheck className="h-4 w-4 text-green-600" />
									Your payment will be marked pending until admin verifies the receipt.
								</div>
							</div>
						</form>
					</CardContent>
				</Card>

				<Card className="h-fit lg:sticky lg:top-6">
					<CardHeader>
						<CardTitle>Order Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<img src={item.image ? `${API_BASE}${item.image}` : ""} alt={item.itemName} className="h-44 w-full rounded-lg object-cover" />
						<div>
							<p className="text-lg font-semibold">{item.itemName}</p>
							<p className="text-xs uppercase tracking-wide text-gray-500">{item.category} • {item.sport?.name || "All Sports"}</p>
						</div>

						<div className="rounded-lg border bg-gray-50 p-3">
							<div className="flex items-center justify-between text-sm">
								<span className="font-semibold text-indigo-900">Selected Size</span>
								<span className="font-semibold text-indigo-900">{selectedSize || "-"}</span>
							</div>
							<div className="mt-2 flex items-center justify-between text-sm border-t pt-2">
								<span className="font-semibold text-indigo-900">Quantity</span>
								<span className="font-semibold text-indigo-900">{quantity}</span>
							</div>
						</div>

						<div className="h-20 rounded-lg border bg-gray-50 px-4 flex items-center justify-between">
							<span className="text-2xl font-bold text-indigo-900">Total Price :</span>
							<span className="text-2xl font-bold text-indigo-900">LKR {totalAmount.toLocaleString()}</span>
						</div>

						<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
							<div className="mb-1 inline-flex items-center gap-2 font-semibold">
								<FileUp className="h-4 w-4" />
								Manual Payment Notice
							</div>
							<p>Transfer the exact amount, upload your receipt, and place order. Inventory allocation is handled by admin.</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
		</DashboardLayout>
	);
}
