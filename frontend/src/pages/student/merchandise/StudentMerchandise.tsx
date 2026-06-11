import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchandiseService } from '../../../services/merchandiseService';
import { DashboardLayout } from "@/components/DashboardLayout";

// TypeScript Interfaces
interface Variant {
  size: string;
  stockQuantity: number;
}

interface MerchandiseItem {
  _id: string;
  itemName: string;
  sport?: { _id: string; name: string };
  category: string;
  price: number;
  image: string;
  variants: Variant[];
}
 const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");
 
export default function StudentMerchandise() {
  const navigate = useNavigate();
  const [merchandise, setMerchandise] = useState<MerchandiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MerchandiseItem | null>(null);
  const [orderData, setOrderData] = useState({
    selectedSize: '',
    quantity: 1
  });

  useEffect(() => {
    fetchMerchandise();
  }, []);

  const fetchMerchandise = async () => {
    try {
      setLoading(true);
      const response = await merchandiseService.getAll();
      setMerchandise(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shop items');
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers ---
  const calculateTotalStock = (variants: Variant[]) => {
    if (!variants) return 0;
    return variants.reduce((total, v) => total + v.stockQuantity, 0);
  };

  const getStockForSize = (item: MerchandiseItem, size: string) => {
    const variant = item.variants.find(v => v.size === size);
    return variant ? variant.stockQuantity : 0;
  };

  // --- Handlers ---
  const openOrderModal = (item: MerchandiseItem) => {
    setSelectedItem(item);
    
    // Auto-select the first size that is actually in stock
    const firstAvailableVariant = item.variants.find(v => v.stockQuantity > 0);
    
    setOrderData({
      selectedSize: firstAvailableVariant ? firstAvailableVariant.size : '',
      quantity: 1
    });
    
    setIsOrderModalOpen(true);
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!orderData.selectedSize) return alert("Please select a size.");

    const checkoutState = {
      itemId: selectedItem._id,
      quantity: orderData.quantity,
      selectedSize: orderData.selectedSize,
    };

    sessionStorage.setItem('checkoutOrderContext', JSON.stringify(checkoutState));

    setIsOrderModalOpen(false);
    setSelectedItem(null);

    navigate(`/student/checkout/${selectedItem._id}`, {
      state: checkoutState,
    });
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-400 mt-20 font-medium">Loading shop...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8 text-center text-red-500 mt-20">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">UniSports Shop</h1>
            <p className="text-slate-400 text-sm mt-1">Get your official gear and team kits.</p>
          </div>
        </div>

        {/* SHOP GRID */}
        {merchandise.length === 0 ? (
          <div className="bg-[#1e1e2d] rounded-xl shadow-lg p-12 text-center border border-slate-700/50 flex flex-col items-center">
            <span className="text-5xl mb-4 opacity-40">👕</span>
            <h3 className="text-xl font-bold text-white mb-2">No Merchandise Available</h3>
            <p className="text-slate-400 max-w-md">There are currently no items available in the shop.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {merchandise.map((item) => {
              const totalStock = calculateTotalStock(item.variants);
              const isOutOfStock = totalStock === 0;

              return (
                <div key={item._id} className="bg-[#1e1e2d] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden flex flex-col hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.15)] transition duration-300">
                  
                  {/* Image Section */}
                  <div className="h-56 bg-[#151521] relative border-b border-slate-700/50 group overflow-hidden">
                    {item.image && item.image !== 'no-photo.jpg' ? (
                      <img src={`${API_BASE}/${item.image}`} alt={item.itemName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-medium">No Image</div>
                    )}
                    
                    {/* Price/Free Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border shadow-sm backdrop-blur-md ${
                        item.price === 0 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-slate-900/60 text-white border-slate-600/50'
                      }`}>
                        {item.price === 0 ? 'Free Issue' : `Rs. ${item.price}`}
                      </span>
                    </div>

                    {/* Stock Badge */}
                    {isOutOfStock && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border shadow-sm backdrop-blur-md bg-red-500/20 text-red-300 border-red-500/30">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details Section */}
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-white mb-1 leading-tight">{item.itemName}</h3>
                    <p className="text-xs text-indigo-400 font-medium mb-4">{item.category} • {item.sport?.name || 'All Sports'}</p>
                    
                    <div className="mt-auto">
                      <button 
                        onClick={() => openOrderModal(item)}
                        disabled={isOutOfStock}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm transition shadow-sm ${
                          isOutOfStock 
                            ? 'bg-[#2a2d3d] text-slate-500 cursor-not-allowed border border-slate-700' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500/50 shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/20'
                        }`}
                      >
                        {isOutOfStock ? 'Sold Out' : (item.price === 0 ? 'Claim Free Kit' : 'Purchase')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ORDER MODAL */}
        {isOrderModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e2d] rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-700 flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
              
              {/* Left Side: Image (Hidden on small mobile) */}
              <div className="w-full md:w-1/2 bg-[#151521] hidden md:block relative border-r border-slate-700/50">
                {selectedItem.image && selectedItem.image !== 'no-photo.jpg' ? (
                  <img src={`${API_BASE}/${selectedItem.image}`} alt={selectedItem.itemName} className="w-full h-full object-cover absolute inset-0 opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 absolute inset-0">No Image</div>
                )}
              </div>

              {/* Right Side: Order Details */}
              <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-white leading-tight pr-4">{selectedItem.itemName}</h2>
                  <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-500 hover:text-white transition">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <p className="text-sm text-indigo-400 font-medium mb-4">{selectedItem.category} • {selectedItem.sport?.name || 'All Sports'}</p>
                
                <div className="mb-6">
                  <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border shadow-sm ${
                    selectedItem.price === 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-[#151521] text-slate-300 border-slate-600'
                  }`}>
                    {selectedItem.price === 0 ? 'Free Issue' : `Rs. ${selectedItem.price}`}
                  </span>
                </div>

                <form onSubmit={handleOrderSubmit} className="flex-grow flex flex-col">
                  
                  {/* Size Selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-300 mb-3">Select Size</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.variants.map((variant) => {
                        const isAvailable = variant.stockQuantity > 0;
                        const isSelected = orderData.selectedSize === variant.size;
                        
                        return (
                          <button
                            key={variant.size}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setOrderData({ ...orderData, selectedSize: variant.size, quantity: 1 })}
                            className={`w-12 h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-all border
                              ${isSelected ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : ''}
                              ${!isSelected && isAvailable ? 'bg-[#151521] text-slate-300 border-slate-600 hover:border-indigo-400 hover:text-indigo-300' : ''}
                              ${!isAvailable ? 'bg-[#151521] text-slate-600 border-slate-700/50 cursor-not-allowed line-through opacity-50' : ''}
                            `}
                          >
                            {variant.size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-300 mb-3">Quantity</label>
                    <div className="flex items-center">
                      <div className="flex rounded-lg border border-slate-600 bg-[#151521] overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => setOrderData({ ...orderData, quantity: Math.max(1, orderData.quantity - 1) })}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition"
                        >
                          -
                        </button>
                        <div className="w-12 h-10 border-x border-slate-600 flex items-center justify-center font-bold text-white bg-[#1e1e2d]">
                          {orderData.quantity}
                        </div>
                        <button 
                          type="button"
                          disabled={!orderData.selectedSize || orderData.quantity >= getStockForSize(selectedItem, orderData.selectedSize)}
                          onClick={() => setOrderData({ ...orderData, quantity: orderData.quantity + 1 })}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          +
                        </button>
                      </div>
                      
                      {orderData.selectedSize && (
                        <span className="ml-4 text-xs font-medium text-slate-400 bg-[#151521] px-2 py-1 rounded border border-slate-700/50">
                          <span className="text-slate-200">{getStockForSize(selectedItem, orderData.selectedSize)}</span> available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Price & Submit */}
                  <div className="mt-auto border-t border-slate-700/50 pt-5">
                    <div className="flex justify-between items-center mb-5 bg-[#151521] p-3.5 rounded-lg border border-slate-700/50">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Total</span>
                      <span className="text-xl font-bold text-white">
                        {selectedItem.price === 0 ? <span className="text-green-400 text-lg">Free</span> : `Rs. ${selectedItem.price * orderData.quantity}`}
                      </span>
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={!orderData.selectedSize}
                      className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400 transition shadow-lg shadow-indigo-500/20"
                    >
                      {selectedItem.price === 0 ? 'Confirm Free Claim' : 'Checkout'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
