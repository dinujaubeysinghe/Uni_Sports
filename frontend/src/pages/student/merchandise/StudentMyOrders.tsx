import React, { useState, useEffect } from 'react';
import { merchandiseService } from '../../../services/merchandiseService';
import { DashboardLayout } from "@/components/DashboardLayout";

// TypeScript Interfaces
interface PopulatedMerch {
  _id: string;
  itemName: string;
  image: string;
  category: string;
}

interface Order {
  _id: string;
  merchandise: PopulatedMerch | null; // Nullable in case the admin deletes the item later
  selectedSize: string;
  quantity: number;
  totalPrice: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}
 const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");

export default function StudentMyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const response = await merchandiseService.getMyOrders();
      setOrders(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch your orders');
    } finally {
      setLoading(false);
    }
  };

  // --- Badge Styling Helpers (Dark Theme Adapted) ---
  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      'Paid': 'bg-green-500/20 text-green-300 border border-green-500/30',
      'Free Issue': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    };
    return `px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded shadow-sm ${styles[status] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30'}`;
  };

  const getFulfillmentBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Processing': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Ready for Pickup': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Delivered/Handed Over': 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return `px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full border ${styles[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`;
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-400 mt-20 font-medium">Loading your orders...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8 text-center text-red-500 mt-20">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Merchandise Orders</h1>
            <p className="text-slate-400 text-sm mt-1">Track the status of your purchased gear and team kits.</p>
          </div>
          
          <div className="bg-[#1e1e2d] px-4 py-2.5 rounded-lg shadow-lg border border-slate-700/50 text-sm font-medium text-slate-300 flex items-center gap-2">
            <span className="text-indigo-400">Total Orders:</span> 
            <span className="text-white font-bold">{orders.length}</span>
          </div>
        </div>

        {/* Orders Area */}
        {orders.length === 0 ? (
          <div className="bg-[#1e1e2d] rounded-xl shadow-lg p-12 text-center border border-slate-700/50 flex flex-col items-center">
            <span className="text-5xl mb-4 opacity-40">🛍️</span>
            <h3 className="text-xl font-bold text-white mb-2">No Orders Yet</h3>
            <p className="text-slate-400 max-w-md">You haven't purchased or claimed any team kits yet.</p>
          </div>
        ) : (
          <div className="bg-[#1e1e2d] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-[#151521]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Price</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-[#1e1e2d]">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-[#151521]/50 transition duration-200">
                    
                    {/* Date */}
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-white">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    
                    {/* Item Details (Image + Name + Size) */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-12 w-12 bg-[#151521] rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden">
                          {order.merchandise?.image && order.merchandise.image !== 'no-photo.jpg' ? (
                            <img src={`${API_BASE}/${order.merchandise.image}`} alt={order.merchandise.itemName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">No Img</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white mb-1">
                            {order.merchandise?.itemName || 'Item Unavailable'}
                          </div>
                          <div className="text-xs text-slate-400 flex gap-2 items-center">
                            <span className="bg-[#151521] px-2 py-0.5 rounded border border-slate-700/50">Size: <strong className="text-slate-200">{order.selectedSize}</strong></span>
                            <span className="bg-[#151521] px-2 py-0.5 rounded border border-slate-700/50">Qty: <strong className="text-slate-200">{order.quantity}</strong></span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Total Price */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">
                        {order.totalPrice === 0 ? <span className="text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 text-xs">Free</span> : `Rs. ${order.totalPrice}`}
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className={getPaymentBadge(order.paymentStatus)}>
                        {order.paymentStatus}
                      </span>
                    </td>

                    {/* Fulfillment Status */}
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className={getFulfillmentBadge(order.fulfillmentStatus)}>
                        {order.fulfillmentStatus}
                      </span>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}