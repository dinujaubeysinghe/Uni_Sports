import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../../services/inventoryService';
import { equipmentRequestService } from '../../../services/equipmentRequestService';
import { DashboardLayout } from "@/components/DashboardLayout"; 

// Interface for items in the borrowing "cart"
interface CartItem {
  equipmentId: string;
  itemName: string;
  quantity: number;
  maxAvailable: number;
}

interface InventoryItem {
  _id: string;
  itemName: string;
  image?: string;
  sport?: { name?: string };
  availableQuantity: number;
  waitlistCount?: number;
  isWaitlistedByMe?: boolean;
}
 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
export default function StudentInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Borrowing Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  
  // Checkout Form State
  const [checkoutData, setCheckoutData] = useState({
    expectedReturnDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getAll();
      setInventory(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistToggle = async (item: InventoryItem) => {
    try {
      if (item.isWaitlistedByMe) {
        await inventoryService.leaveWaitlist(item._id);
      } else {
        await inventoryService.joinWaitlist(item._id);
      }

      await fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to update waitlist.');
    }
  };

  // --- Cart Handlers ---
  const addToCart = (item: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.equipmentId === item._id);
      
      if (existingItem) {
        // Prevent adding more than what's available
        if (existingItem.quantity >= item.availableQuantity) return prevCart;
        
        return prevCart.map(cartItem => 
          cartItem.equipmentId === item._id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { 
          equipmentId: item._id, 
          itemName: item.itemName, 
          quantity: 1, 
          maxAvailable: item.availableQuantity 
        }];
      }
    });
  };

  const updateCartQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prevCart => prevCart.map(item => 
      item.equipmentId === id 
        ? { ...item, quantity: Math.min(newQuantity, item.maxAvailable) } 
        : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.equipmentId !== id));
  };

  // --- Checkout Handlers ---
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Your cart is empty!");

    try {
      // Format data to match backend Zod schema
      const payload = {
        items: cart.map(item => ({
          equipment: item.equipmentId,
          quantity: item.quantity
        })),
        expectedReturnDate: checkoutData.expectedReturnDate,
        notes: checkoutData.notes
      };

      await equipmentRequestService.create(payload);
      
      alert("Borrow request submitted successfully! An admin or coach will review it.");
      
      // Cleanup
      setCart([]);
      setIsCheckoutModalOpen(false);
      setCheckoutData({ expectedReturnDate: '', notes: '' });
      fetchInventory(); // Refresh stock numbers
      
    } catch (err: any) {
      alert(err.message || 'Failed to submit borrow request.');
    }
  };

  // Get tomorrow's date for the min attribute on the date picker
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-400 mt-20 font-medium">Loading equipment...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8 text-center text-red-500 mt-20">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto relative text-slate-200 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Borrow Sports Equipment</h1>
            <p className="text-slate-400 text-sm mt-1">Browse available inventory and request items for practice or matches.</p>
          </div>
          
          {/* Cart Button */}
          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className={`relative px-5 py-2.5 rounded-lg font-medium transition shadow-sm ${
              cart.length > 0 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/50' 
                : 'bg-[#2a2d3d] text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            Review Request
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md shadow-red-500/50 border-2 border-[#1e1e2d]">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        {/* EQUIPMENT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {inventory.map((item) => (
            <div key={item._id} className="bg-[#1e1e2d] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden flex flex-col hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.15)] transition duration-300">
              
              {/* Image Section */}
              <div className="h-48 bg-[#151521] relative border-b border-slate-700/50 group overflow-hidden">
                {item.image && item.image !== 'no-photo.jpg' ? (
                  <img src={`${API_BASE}${item.image}`} alt={item.itemName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-medium">No Image</div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded border shadow-sm backdrop-blur-md ${
                    item.availableQuantity > 0 
                      ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {item.availableQuantity > 0 ? `${item.availableQuantity} Available` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Details Section */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-white mb-1 leading-tight">{item.itemName}</h3>
                <p className="text-sm font-semibold text-indigo-400 mb-4">{item.sport?.name || 'General Equipment'}</p>
                
                <div className="mt-auto">
                  {item.availableQuantity === 0 ? (
                    <>
                      <button
                        onClick={() => handleWaitlistToggle(item)}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm transition ${
                          item.isWaitlistedByMe
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-600 hover:text-white'
                        }`}
                      >
                        {item.isWaitlistedByMe ? 'On Waitlist (Click to Leave)' : 'Notify Me When Available'}
                      </button>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.waitlistCount || 0} student{(item.waitlistCount || 0) === 1 ? '' : 's'} waiting
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-full py-2.5 rounded-lg font-bold text-sm transition bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 shadow-sm"
                    >
                      Add to Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CHECKOUT MODAL */}
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e2d] rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-white border-b border-slate-700/50 pb-4">Review Borrow Request</h2>
              
              {/* Selected Items List */}
              <div className="overflow-y-auto mb-6 flex-grow pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Selected Items</h3>
                {cart.map(item => (
                  <div key={item.equipmentId} className="flex justify-between items-center bg-[#151521] p-3.5 rounded-lg mb-2 border border-slate-700/50">
                    <div className="font-bold text-white text-sm">{item.itemName}</div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateCartQuantity(item.equipmentId, item.quantity - 1)} 
                        className="w-8 h-8 flex items-center justify-center bg-[#1e1e2d] border border-slate-600 rounded text-slate-300 hover:bg-slate-700 hover:text-white transition"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-white text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.equipmentId, item.quantity + 1)} 
                        disabled={item.quantity >= item.maxAvailable}
                        className="w-8 h-8 flex items-center justify-center bg-[#1e1e2d] border border-slate-600 rounded text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                      <button 
                        onClick={() => removeFromCart(item.equipmentId)} 
                        className="ml-3 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded border border-red-500/20 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Request Details Form */}
              <form onSubmit={handleCheckoutSubmit} className="border-t border-slate-700/50 pt-5">
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Expected Return Date *</label>
                  <input 
                    type="date" 
                    required 
                    min={getTomorrowDate()} 
                    value={checkoutData.expectedReturnDate} 
                    onChange={e => setCheckoutData({...checkoutData, expectedReturnDate: e.target.value})}
                    className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                  <p className="text-xs text-slate-500 mt-2">When do you plan to return the equipment?</p>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Notes / Purpose (Optional)</label>
                  <textarea 
                    rows={2}
                    value={checkoutData.notes} 
                    onChange={e => setCheckoutData({...checkoutData, notes: e.target.value})}
                    className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., Needed for Saturday practice match."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
                  <button 
                    type="button" 
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition"
                  >
                    Keep Browsing
                  </button>
                  <button 
                    type="submit"
                    disabled={cart.length === 0 || !checkoutData.expectedReturnDate}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400 transition shadow-lg shadow-indigo-500/20"
                  >
                    Submit Request
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