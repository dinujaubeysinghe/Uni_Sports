import React, { useState, useEffect } from 'react';
import { merchandiseService } from '../../../services/merchandiseService';
import { sportService } from '../../../services/sportService';
import { DashboardLayout } from "@/components/DashboardLayout";

interface Variant {
  size: string;
  stockQuantity: number;
}
 const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");
export default function AdminMerchandise() {
  const [merchandise, setMerchandise] = useState<any[]>([]);
  const [sportsList, setSportsList] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal & Validation State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [formErrors, setFormErrors] = useState<string[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    sport: '', 
    category: 'Apparel',
    price: 0,
    image: null as File | null
  });

  const [variants, setVariants] = useState<Variant[]>([{ size: 'M', stockQuantity: 0 }]);
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'N/A'];

  // Fetch all required data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [merchRes, sportsRes] = await Promise.all([
        merchandiseService.getAll(),
        sportService.getAll()
      ]);
      
      setMerchandise(merchRes.data || merchRes);
      setSportsList(sportsRes.data || sportsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch merchandise and sports data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchandiseOnly = async () => {
    try {
      const response = await merchandiseService.getAll();
      setMerchandise(response.data || response);
    } catch (err: any) {
      console.error('Failed to refresh merchandise:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors.length > 0) setFormErrors([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, image: e.target.files[0] });
      if (formErrors.length > 0) setFormErrors([]);
    }
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: string | number) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setVariants(updatedVariants);
    if (formErrors.length > 0) setFormErrors([]);
  };

  const addVariant = () => {
    setVariants([...variants, { size: 'L', stockQuantity: 0 }]);
    if (formErrors.length > 0) setFormErrors([]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
    if (formErrors.length > 0) setFormErrors([]);
  };

  // Open Modal for Editing an existing item
  const openEditModal = (item: any) => {
    setFormErrors([]);
    setFormData({
      itemName: item.itemName,
      sport: item.sport?._id || '', 
      category: item.category,
      price: item.price,
      image: null 
    });
    
    setVariants(item.variants.map((v: any) => ({ size: v.size, stockQuantity: v.stockQuantity })));
    setEditingId(item._id);
    setIsAddModalOpen(true);
  };

  // Reset form helper
  const resetForm = () => {
    setFormErrors([]);
    setFormData({ itemName: '', sport: '', category: 'Apparel', price: 0, image: null });
    setVariants([{ size: 'M', stockQuantity: 0 }]);
    setEditingId(null);
    setIsAddModalOpen(false);
  };

  // ==========================================
  // FRONTEND VALIDATION LOGIC
  // ==========================================
  const validateForm = () => {
    const errors: string[] = [];

    // 1. Text & Dropdown Validation
    if (!formData.itemName || formData.itemName.trim().length < 2) {
      errors.push("Item Name must be at least 2 characters long.");
    }
    if (!formData.sport) {
      errors.push("Please select a Sport.");
    }

    // 2. Pricing Validation
    const price = Number(formData.price);
    if (isNaN(price) || price < 0) {
      errors.push("Price cannot be a negative number.");
    }

    // 3. Variant Validations
    if (variants.length === 0) {
      errors.push("You must add at least one size/stock variant.");
    } else {
      const selectedSizes = new Set();
      
      variants.forEach((v) => {
        // Check for duplicates
        if (selectedSizes.has(v.size)) {
          errors.push(`Duplicate size selected: ${v.size}. Each size must be listed only once.`);
        }
        selectedSizes.add(v.size);

        // Check stock validity
        const stock = Number(v.stockQuantity);
        if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
          errors.push(`Stock quantity for size ${v.size} must be a whole number (0 or greater).`);
        }
      });
    }

    // 4. Image Validation
    if (formData.image) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(formData.image.type)) {
        errors.push("Image must be a JPEG, PNG, or WEBP file.");
      }
      if (formData.image.size > 5242880) { // 5MB
        errors.push("Image file size must be less than 5MB.");
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Run Validation
    if (!validateForm()) return;

    try {
      const submitData = new FormData();
      submitData.append('itemName', formData.itemName.trim());
      submitData.append('sport', formData.sport);
      submitData.append('category', formData.category);
      submitData.append('price', String(formData.price));
      submitData.append('variants', JSON.stringify(variants));
      
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      if (editingId) {
        await merchandiseService.update(editingId, submitData);
      } else {
        await merchandiseService.create(submitData);
      }
      
      resetForm();
      fetchMerchandiseOnly();
      
    } catch (err: any) {
      setFormErrors([err.message || 'Failed to save merchandise.']);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await merchandiseService.delete(id); 
        fetchMerchandiseOnly(); 
      } catch (err: any) {
        alert(err.message || 'Failed to delete item');
      }
    }
  };

  const calculateTotalStock = (itemVariants: Variant[]) => {
    return itemVariants.reduce((total, v) => total + v.stockQuantity, 0);
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-400 mt-20 font-medium">Loading shop data...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8 text-center text-red-500 mt-20">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Merchandise Shop Management</h1>
            <p className="text-slate-400 text-sm mt-1">Manage university apparel, accessories, and stock.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsAddModalOpen(true); }} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg shadow-indigo-500/20 border border-indigo-500/50"
          >
            + Add Merchandise
          </button>
        </div>

        {/* MERCHANDISE TABLE */}
        <div className="bg-[#1e1e2d] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-[#151521]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Price (LKR)</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Stock by Size</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sold</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-[#1e1e2d]">
              {merchandise.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No merchandise found.</td></tr>
              ) : (
                merchandise.map((item) => (
                  <tr key={item._id} className="hover:bg-[#151521]/50 transition duration-200">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-12 w-12 bg-[#151521] border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.image && item.image !== 'no-photo.jpg' ? (
                            <img src={`${API_BASE}/${item.image}`} alt={item.itemName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">No Img</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white mb-0.5">{item.itemName}</div>
                          <div className="text-xs text-indigo-400 font-medium">{item.sport?.name || 'Any Sport'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 font-medium">{item.category}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">
                        {item.price === 0 ? <span className="text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full text-xs border border-green-500/20">Free Issue</span> : `Rs. ${item.price}`}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        {item.variants.map((v: Variant, idx: number) => (
                          <span key={idx} className={`px-2 py-1 text-xs font-bold rounded border ${v.stockQuantity === 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#151521] border-slate-600 text-slate-300'}`}>
                            {v.size}: {v.stockQuantity}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-2">Total Stock: <span className="text-slate-300">{calculateTotalStock(item.variants)}</span></div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-bold text-white">
                      {item.soldOrIssuedQuantity || 0}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEditModal(item)} className="text-indigo-400 hover:text-indigo-300 transition">Edit</button>
                        <button onClick={() => handleDelete(item._id)} className="text-red-400 hover:text-red-300 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ADD/EDIT MERCHANDISE MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1e1e2d] rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
              
              <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-700/50 pb-4">
                {editingId ? 'Edit Merchandise' : 'Add New Merchandise'}
              </h2>

              {/* Validation Error Display */}
              {formErrors.length > 0 && (
                <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                  <h3 className="text-red-400 font-bold text-sm mb-2">Please fix the following errors:</h3>
                  <ul className="list-disc list-inside text-red-300 text-xs space-y-1">
                    {formErrors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Item Name</label>
                    <input type="text" name="itemName" value={formData.itemName} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Sport</label>
                    <select 
                      name="sport" 
                      value={formData.sport} onChange={handleInputChange} 
                      className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select a Sport</option>
                      {sportsList.map((sport) => (
                        <option key={sport._id} value={sport._id}>{sport.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer">
                      <option value="Apparel">Apparel</option>
                      <option value="Team Kit">Team Kit</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Price (LKR)</label>
                    <input type="number" name="price" min="0" value={formData.price} onChange={handleInputChange} className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>

                <div className="mb-6 border-t border-slate-700/50 pt-5">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-bold text-slate-300">Sizes & Stock</label>
                    <button type="button" onClick={addVariant} className="text-xs font-bold bg-[#151521] hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 border border-slate-600 transition">
                      + Add Size
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {variants.map((variant, index) => (
                      <div key={index} className="flex gap-4 items-center bg-[#151521] p-3 rounded-lg border border-slate-700/50">
                        <select 
                          value={variant.size} 
                          onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                          className="w-1/3 bg-[#1e1e2d] border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                        >
                          {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                        <input 
                          type="number" min="0" placeholder="Stock"
                          value={variant.stockQuantity} 
                          onChange={(e) => handleVariantChange(index, 'stockQuantity', Number(e.target.value))}
                          className="w-1/3 bg-[#1e1e2d] border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        {variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(index)} className="text-red-400 hover:text-red-300 text-sm font-bold ml-auto px-2">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    {editingId ? 'Update Image (Optional)' : 'Merchandise Image'}
                  </label>
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 hover:file:text-indigo-300 outline-none transition file:cursor-pointer" />
                  <p className="text-xs text-slate-500 mt-2">Max size: 5MB. Formats: JPG, PNG, WEBP.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
                  <button type="button" onClick={resetForm} className="px-5 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20">
                    {editingId ? 'Save Changes' : 'Save Merchandise'}
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
