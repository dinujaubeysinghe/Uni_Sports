import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader } from "lucide-react";
import { toast } from "sonner";

type Payment = {
  _id: string;
  type: "event" | "item";
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid" | "delivered";
  createdAt: string;
  referenceId?: string;
  note?: string;
};

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

type StoredUser = {
  name?: string;
  email?: string;
};

const getStoredUser = (): StoredUser => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredUser;
    return {
      name: parsed?.name || "",
      email: parsed?.email || "",
    };
  } catch {
    return {};
  }
};

const mergeBillingWithUser = (details?: Partial<BillingDetails>): BillingDetails => {
  const user = getStoredUser();
  return {
    name: user.name || details?.name || "",
    email: user.email || details?.email || "",
    phone: details?.phone || "",
    phone2: details?.phone2 || "",
    address: {
      street: details?.address?.street || "",
      city: details?.address?.city || "",
      state: details?.address?.state || "",
      zipCode: details?.address?.zipCode || "",
      country: details?.address?.country || "Sri Lanka",
    },
  };
};

export default function StudentPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const getToken = () => localStorage.getItem("token") || "";

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://unisports-8upjo.ondigitalocean.app//api/payments/my", {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Failed to load payments");
      const data = await res.json();
      setPayments(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const eventPayments = payments.filter(p => p.type === "event");
  const itemOrders = payments.filter(p => p.type === "item");

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
      case "delivered":
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const pendingCount = payments.filter(p => p.status === "pending").length;
  const approvedCount = payments.filter(p => p.status === "approved" || p.status === "paid").length;

  const [isEditing, setIsEditing] = useState(false);

  const [billingDetails, setBillingDetails] = useState<BillingDetails>({
    name: getStoredUser().name || '',
    email: getStoredUser().email || '',
    phone: '',
    phone2: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Sri Lanka'
    }
  });

  const [savedBillingDetails, setSavedBillingDetails] = useState<BillingDetails>(() =>
    mergeBillingWithUser()
  );

  const [errors, setErrors] = useState<BillingErrors>({});

  useEffect(() => {
    loadBillingDetails();
  }, []);

  const loadBillingDetails = async () => {
    try {
      const res = await fetch('https://unisports-8upjo.ondigitalocean.app/api/users/me/billing-details', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          const merged = mergeBillingWithUser(data.data);
          setBillingDetails(merged);
          setSavedBillingDetails(merged);
          localStorage.setItem('billingDetails', JSON.stringify(merged));
          return;
        }
      }

      // Fallback to local cache when backend has no billing profile yet
      const saved = localStorage.getItem('billingDetails');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = mergeBillingWithUser(parsed);
        setBillingDetails(merged);
        setSavedBillingDetails(merged);
      } else {
        const merged = mergeBillingWithUser();
        setBillingDetails(merged);
        setSavedBillingDetails(merged);
      }
    } catch (error) {
      const saved = localStorage.getItem('billingDetails');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = mergeBillingWithUser(parsed);
        setBillingDetails(merged);
        setSavedBillingDetails(merged);
      } else {
        const merged = mergeBillingWithUser();
        setBillingDetails(merged);
        setSavedBillingDetails(merged);
      }
    }
  };

  const handleCancelEdit = () => {
    setBillingDetails(savedBillingDetails);
    setErrors({});
    setIsEditing(false);
  };

  const handleBillingChange = (field: string, value: string) => {
    let nextValue = value;
    if (field === 'phone' || field === 'phone2') {
      nextValue = value.replace(/\D/g, '').slice(0, 10);
    }

    if (field.startsWith('address.')) {
      const addrField = field.split('.')[1];
      setBillingDetails((prev) => ({
        ...prev,
        address: { ...prev.address, [addrField]: nextValue }
      }));
    } else {
      setBillingDetails((prev) => ({ ...prev, [field]: nextValue }));
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateEmail = (value: string) => value.endsWith("@my.sliit.lk");
  const validateForm = () => {
    const newErrors: BillingErrors = {};
    if (!billingDetails.name.trim()) newErrors.name = 'Full name is required';
    if (!billingDetails.email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(billingDetails.email)) newErrors.email = 'Please use your valid student email';
    if (!billingDetails.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(billingDetails.phone)) newErrors.phone = 'Phone must be exactly 10 digits';
    if (!billingDetails.address.street.trim()) newErrors['address.street'] = 'Street address is required';
    if (!billingDetails.address.city.trim()) newErrors['address.city'] = 'City is required';
    if (!billingDetails.address.state.trim()) newErrors['address.state'] = 'District/Province is required';
    if (!billingDetails.address.zipCode.trim()) newErrors['address.zipCode'] = 'Postal code is required';
    if (!billingDetails.address.country.trim()) newErrors['address.country'] = 'Country is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveBilling = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!getToken()) {
      toast.error('Please login again to save billing details.');
      return;
    }

    if (validateForm()) {
      try {
        const res = await fetch('https://unisports-8upjo.ondigitalocean.app/api/users/me/billing-details', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ billingDetails }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (Array.isArray(data?.errors)) {
            const mappedErrors: BillingErrors = {};
            data.errors.forEach((err: { field?: string; message?: string }) => {
              const rawField = err.field || '';
              const normalizedField = rawField.startsWith('billingDetails.')
                ? rawField.replace('billingDetails.', '')
                : rawField;
              if (normalizedField && err.message) {
                mappedErrors[normalizedField] = err.message;
              }
            });
            if (Object.keys(mappedErrors).length > 0) {
              setErrors(mappedErrors);
            }
          }
          const message = data?.message || 'Failed to save billing details';
          throw new Error(message);
        }

        localStorage.setItem('billingDetails', JSON.stringify(billingDetails));
        setSavedBillingDetails(billingDetails);
        setIsEditing(false);
        toast.success('Billing details saved successfully!');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save billing details';
        toast.error(message);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-2 sm:px-4">
        <PageHeader
          title="My Payments"
          description="Track your sports event payments and item orders"
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800" >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800" >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800" >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="flex flex-wrap justify-start gap-1 rounded-lg p-1">

             <TabsTrigger
              value="items"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ease-in-out bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-indigo-950 data-[state=active]:text-white data-[state=active]:shadow-md">
              Sports Items
            </TabsTrigger>

            <TabsTrigger
              value="events"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ease-in-out bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-indigo-950 data-[state=active]:text-white data-[state=active]:shadow-md">
              Event Payments
            </TabsTrigger> 

            <TabsTrigger
              value="billing"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ease-in-out bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-indigo-950 data-[state=active]:text-white data-[state=active]:shadow-md">
             Billing Details
            </TabsTrigger>

          </TabsList>

          {/* Item Orders Table */}
          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Sports Items Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                ) : itemOrders.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No item orders found</p>
                ) : (
                  <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-800">
                      <TableRow className="text-slate-300">
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemOrders.map((p) => (
                        <TableRow key={p._id}>
                          <TableCell>{p._id.substring(0, 8)}</TableCell>
                          <TableCell>{p.amount} LKR</TableCell>
                          <TableCell>{formatDate(p.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelected(p)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-900 bg-opacity-95 border-slate-700">
                                <DialogHeader>
                                  <DialogTitle>Order Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                  <p><strong>ID:</strong> {p._id}</p>
                                  <p><strong>Amount:</strong> {p.amount} LKR</p>
                                  <p><strong>Date:</strong> {formatDate(p.createdAt)}</p>
                                  <p><strong>Status:</strong> <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge></p>
                                  {p.note && <p><strong>Note:</strong> {p.note}</p>}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Event Payments Table */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Event Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                ) : eventPayments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No event payments found</p>
                ) : (
                  <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-800">
                      <TableRow className="text-slate-300">
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventPayments.map((p) => (
                        <TableRow key={p._id}>
                          <TableCell>{p._id.substring(0, 8)}</TableCell>
                          <TableCell>{p.amount} LKR</TableCell>
                          <TableCell>{formatDate(p.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelected(p)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-900 bg-opacity-95 border-slate-700">
                                <DialogHeader>
                                  <DialogTitle>Payment Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                  <p><strong>ID:</strong> {p._id}</p>
                                  <p><strong>Amount:</strong> {p.amount} LKR</p>
                                  <p><strong>Date:</strong> {formatDate(p.createdAt)}</p>
                                  <p><strong>Status:</strong> <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge></p>
                                  {p.note && <p><strong>Note:</strong> {p.note}</p>}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
           <Card>
            <CardHeader>
               <CardTitle>Billing Details</CardTitle>
                       <p className="mt-1 text-xs text-gray-200">
                   Fill out or edit your billing information below.</p>
            </CardHeader>
            <CardContent>
             <form
              onSubmit={handleSaveBilling}
              className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
             <div className="space-y-4">
              <div className="flex flex-col">
               <label className="text-sm font-medium text-white">Full Name</label>
               <input
               type="text"
               disabled={!isEditing}
               value={billingDetails.name}
               onChange={(e) => handleBillingChange('name', e.target.value)}
               placeholder="John Doe"
               className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
                 {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">Email</label>
              <input
              type="email"
               disabled={!isEditing}
              value={billingDetails.email}
              onChange={(e) => handleBillingChange('email', e.target.value)}
              placeholder="john@example.com"
              className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
             </div>

             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">Phone Number</label>
              <input
              type="tel"
               disabled={!isEditing}
              value={billingDetails.phone}
              onChange={(e) => handleBillingChange('phone', e.target.value)}
              placeholder="07x-xxxxxxx"
              className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
              {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
             </div>

             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">Phone Number 2 (Optional)</label>
              <input
              type="tel"
               disabled={!isEditing}
              value={billingDetails.phone2}
              onChange={(e) => handleBillingChange('phone2', e.target.value)}
              placeholder="07x-xxxxxxx"
              className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
             </div>
            </div>

            <div className="space-y-4">
             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">Address</label>
              <input
               type="text"
                disabled={!isEditing}
               value={billingDetails.address.street}
               onChange={(e) => handleBillingChange('address.street', e.target.value)}
               placeholder="123 Main St"
               className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
              {errors['address.street'] && <p className="mt-1 text-sm text-red-400">{errors['address.street']}</p>}
             </div>

             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">City</label>
              <input
               type="text"
                disabled={!isEditing}
               value={billingDetails.address.city}
               onChange={(e) => handleBillingChange('address.city', e.target.value)}
               placeholder="Colombo"
              className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
              {errors['address.city'] && <p className="mt-1 text-sm text-red-400">{errors['address.city']}</p>}
             </div>
             
             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">District / Province</label>
              <input
               type="text"
                disabled={!isEditing}
               value={billingDetails.address.state}
               onChange={(e) => handleBillingChange('address.state', e.target.value)}
               placeholder="Western Province"
               className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
              {errors['address.state'] && <p className="mt-1 text-sm text-red-400">{errors['address.state']}</p>}
             </div>

             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">Postal Code</label>
              <input
               type="text"
                disabled={!isEditing}
               value={billingDetails.address.zipCode}
               onChange={(e) => handleBillingChange('address.zipCode', e.target.value)}
               placeholder="00100"
               className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
              {errors['address.zipCode'] && <p className="mt-1 text-sm text-red-400">{errors['address.zipCode']}</p>}
             </div>

             <div className="flex flex-col">
              <label className="text-sm font-medium text-white">Country</label>
              <input
               type="text"
                disabled={!isEditing}
               value={billingDetails.address.country}
               onChange={(e) => handleBillingChange('address.country', e.target.value)}
               placeholder="Sri Lanka"
               className="text-black w-full border bg-gray-100 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"/>
              {errors['address.country'] && <p className="mt-1 text-sm text-red-400">{errors['address.country']}</p>}
             </div>

             </div>
             
            <div className="mt-2 flex w-full flex-col gap-3 md:col-span-2 md:mt-6 md:flex-row md:items-center">
              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)} className="w-full bg-orange-400 text-white hover:bg-orange-500 md:w-auto">
                  Edit Billing Details
                </Button>
              ) : (
                <>
                  <Button type="button" onClick={handleCancelEdit} variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 md:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full bg-indigo-950 text-white hover:bg-indigo-900 md:w-auto">
                    Save Billing Details
                  </Button>
                </>
              )}
            </div>
             
         </form>
        </CardContent>
       </Card>
      </TabsContent>
     </Tabs>
  </div>
    </DashboardLayout>
  );
}