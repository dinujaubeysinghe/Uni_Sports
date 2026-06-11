import React, { useState, useEffect } from 'react';
import { merchandiseService } from '../../../services/merchandiseService';
import { DashboardLayout } from "@/components/DashboardLayout";

// TypeScript Interfaces
interface PopulatedStudent {
  _id: string;
  name?: string;
  email: string;
}

interface PopulatedMerch {
  _id: string;
  itemName: string;
  image: string;
  category: string;
  price: number;
}

interface Order {
  _id: string;
  student: PopulatedStudent;
  merchandise: PopulatedMerch | null;
  selectedSize: string;
  quantity: number;
  totalPrice: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}
 const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");
export default function AdminMerchandiseOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updateData, setUpdateData] = useState({
    paymentStatus: '',
    fulfillmentStatus: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await merchandiseService.getAllOrders();
      setOrders(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
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
    return `px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded ${styles[status] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30'}`;
  };

  const getFulfillmentBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Processing': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Ready for Pickup': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Delivered/Handed Over': 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return `px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full border ${styles[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`;
  };

  // --- Handlers ---
  const openUpdateModal = (order: Order) => {
    setSelectedOrder(order);
    setUpdateData({
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus
    });
    setIsModalOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await merchandiseService.updateOrderStatus(selectedOrder._id, {
        paymentStatus: updateData.paymentStatus,
        fulfillmentStatus: updateData.fulfillmentStatus
      });

      alert("Order status updated successfully!");
      setIsModalOpen(false);
      fetchOrders(); 
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-400 mt-20 font-medium">Loading orders...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8 text-center text-red-500 mt-20">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Student Merchandise Orders</h1>
            <p className="text-slate-400 text-sm mt-1">Track payments and manage order fulfillments.</p>
          </div>
          
          <div className="bg-[#1e1e2d] px-4 py-2.5 rounded-lg shadow-lg border border-slate-700/50 text-sm font-medium text-slate-300 flex items-center gap-2">
            <span className="text-indigo-400">Total Orders:</span> 
            <span className="text-white font-bold">{orders.length}</span>
          </div>
        </div>

        {/* Orders Table Area */}
        {orders.length === 0 ? (
          <div className="bg-[#1e1e2d] rounded-xl shadow-lg p-12 text-center border border-slate-700/50 flex flex-col items-center">
            <span className="text-5xl mb-4 opacity-40">🛍️</span>
            <h3 className="text-xl font-bold text-white mb-2">No Orders Found</h3>
            <p className="text-slate-400 max-w-md">Students have not placed any merchandise orders yet.</p>
          </div>
        ) : (
          <div className="bg-[#1e1e2d] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-[#151521]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date / Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Due</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Fulfillment</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-[#1e1e2d]">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-[#151521]/50 transition duration-200">
                    
                    {/* Date & Student */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-white mb-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-indigo-400 font-medium">
                        {order.student?.name || order.student?.email || 'Unknown Student'}
                      </div>
                    </td>
                    
                    {/* Item Details */}
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
                            {order.merchandise?.itemName || 'Item Deleted'}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="bg-[#151521] px-2 py-0.5 rounded border border-slate-700/50">Size: <strong className="text-slate-200">{order.selectedSize}</strong></span> 
                            <span className="bg-[#151521] px-2 py-0.5 rounded border border-slate-700/50">Qty: <strong className="text-slate-200">{order.quantity}</strong></span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Total Price */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">
                        {order.totalPrice === 0 ? <span className="text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 text-xs">Free Issue</span> : `Rs. ${order.totalPrice}`}
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

                    {/* Actions */}
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <button 
                        onClick={() => openUpdateModal(order)}
                        className="text-xs font-bold text-indigo-400 hover:text-white bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 hover:bg-indigo-600 hover:border-indigo-500 transition shadow-sm"
                      >
                        Process Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PROCESS ORDER MODAL */}
        {isModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e2d] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4 text-white border-b border-slate-700/50 pb-4">Process Student Order</h2>
              
              <div className="mb-6 bg-[#151521] p-4 rounded-lg border border-slate-700/50 text-sm flex justify-between items-center">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Due</p>
                  <p className="text-xl font-bold text-white">
                    {selectedOrder.totalPrice === 0 ? <span className="text-green-400 text-lg">Free Issue</span> : `Rs. ${selectedOrder.totalPrice}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Student</p>
                  <p className="font-semibold text-indigo-400">{selectedOrder.student?.name || selectedOrder.student?.email}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateSubmit}>
                
                {/* Payment Status (Disabled if Free Issue) */}
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Payment Status</label>
                  <select 
                    value={updateData.paymentStatus}
                    onChange={(e) => setUpdateData({...updateData, paymentStatus: e.target.value})}
                    disabled={selectedOrder.totalPrice === 0}
                    className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="Pending">Pending (Not Paid)</option>
                    <option value="Paid">Paid (Cash/Transfer Received)</option>
                    <option value="Free Issue">Free Issue</option>
                  </select>
                </div>

                {/* Fulfillment Status */}
                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Fulfillment Status</label>
                  <select 
                    value={updateData.fulfillmentStatus}
                    onChange={(e) => setUpdateData({...updateData, fulfillmentStatus: e.target.value})}
                    className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="Processing">Processing (Preparing Item)</option>
                    <option value="Ready for Pickup">Ready for Pickup</option>
                    <option value="Delivered/Handed Over">Delivered / Handed Over</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"
                  >
                    Save Status
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}