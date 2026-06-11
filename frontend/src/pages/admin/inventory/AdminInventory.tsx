import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../../services/inventoryService';
import { locationService } from '../../../services/locationService';
import { sportService } from '../../../services/sportService';
import { DashboardLayout } from "@/components/DashboardLayout";
 const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");
export default function AdminInventory() {
  const [inventory, setInventory] = useState([]);
  
  // State for dropdowns
  const [sportsList, setSportsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State & Validation State
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    itemName: '',
    sport: '', 
    location: '', 
    totalQuantity: 0,
    originalQuantity: 0, // NEW: Track this to prevent decreasing quantity on edit
    image: null as File | null
  });

  // Fetch all required data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [inventoryRes, sportsRes, locationsRes] = await Promise.all([
        inventoryService.getAll(),
        sportService.getAll(),
        locationService.getAll()
      ]);
      
      setInventory(inventoryRes.data || inventoryRes);
      setSportsList(sportsRes.data || sportsRes);
      setLocationsList(locationsRes.data || locationsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory and related data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryOnly = async () => {
    try {
      const response = await inventoryService.getAll();
      setInventory(response.data || response);
    } catch (err: any) {
      console.error('Failed to refresh inventory:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear errors when user starts typing again
    if (formErrors.length > 0) setFormErrors([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, image: e.target.files[0] });
      if (formErrors.length > 0) setFormErrors([]);
    }
  };

  // Open Modal for Editing
  const openEditModal = (item: any) => {
    setFormErrors([]);
    setFormData({
      itemName: item.itemName,
      sport: item.sport?._id || '', 
      location: item.location?._id || '', 
      totalQuantity: item.totalQuantity,
      originalQuantity: item.totalQuantity, // Store original to validate later
      image: null 
    });
    setEditingId(item._id);
    setIsAddModalOpen(true);
  };

  // Reset form helper
  const resetForm = () => {
    setFormErrors([]);
    setFormData({ itemName: '', sport: '', location: '', totalQuantity: 0, originalQuantity: 0, image: null });
    setEditingId(null);
    setIsAddModalOpen(false);
  };

  // ==========================================
  // FRONTEND VALIDATION LOGIC
  // ==========================================
  const validateForm = () => {
    const errors: string[] = [];

    // 1. Item Name Validation
    if (!formData.itemName || formData.itemName.trim().length < 2) {
      errors.push("Item Name must be at least 2 characters long.");
    }

    // 2. Dropdown Validations
    if (!formData.sport) errors.push("Please select a Sport.");
    if (!formData.location) errors.push("Please select a Location.");

    // 3. Quantity Format Validation
    const qty = Number(formData.totalQuantity);
    if (!qty || qty < 1 || !Number.isInteger(qty)) {
      errors.push("Total Quantity must be a positive whole number.");
    }

    // 4. Update-Specific Validation (Cannot decrease total quantity here)
    if (editingId && qty < formData.originalQuantity) {
      errors.push(`Cannot decrease stock below original (${formData.originalQuantity}). Use damage/loss reporting instead.`);
    }

    // 5 & 6. Image File Validation (Type and Size)
    if (formData.image) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(formData.image.type)) {
        errors.push("Image must be a JPEG, PNG, or WEBP file.");
      }
      // 5MB Limit check (5 * 1024 * 1024 bytes)
      if (formData.image.size > 5242880) {
        errors.push("Image file size must be less than 5MB.");
      }
    }

    setFormErrors(errors);
    return errors.length === 0; // Returns true if form is valid
  };

  // Submit Equipment (Handles BOTH Add and Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Run Validation before touching the API
    if (!validateForm()) return;

    try {
      const submitData = new FormData();
      submitData.append('itemName', formData.itemName.trim());
      submitData.append('sport', formData.sport);
      submitData.append('location', formData.location);
      submitData.append('totalQuantity', String(formData.totalQuantity));

      if (formData.image) {
        submitData.append('image', formData.image);
      }

      if (editingId) {
        await inventoryService.update(editingId, submitData);
      } else {
        await inventoryService.create(submitData);
      }
      
      resetForm();
      fetchInventoryOnly(); 
      
    } catch (err: any) {
      // Catch any backend errors that slip through
      setFormErrors([err.message || 'Failed to save equipment.']);
    }
  };

  // Delete Equipment
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryService.delete(id);
        fetchInventoryOnly(); 
      } catch (err: any) {
        alert(err.message || 'Failed to delete item');
      }
    }
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-400 mt-20 font-medium">Loading inventory...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8 text-center text-red-500 mt-20">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Inventory Management</h1>
            <p className="text-slate-400 text-sm mt-1">Manage sports equipment, quantities, and availability.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg shadow-indigo-500/20 border border-indigo-500/50"
          >
            + Add Equipment
          </button>
        </div>

        {/* INVENTORY TABLE */}
        <div className="bg-[#1e1e2d] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-[#151521]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sport / Location</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Available</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Waitlisted</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-[#1e1e2d]">
              {inventory.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No equipment found.</td></tr>
              ) : (
                inventory.map((item: any) => (
                  <tr key={item._id} className="hover:bg-[#151521]/50 transition duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-12 w-12 bg-[#151521] border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.image && item.image !== 'no-photo.jpg' ? (
                            <img src={`${API_BASE}/${item.image}`} alt={item.itemName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">No Img</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{item.itemName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-indigo-400 font-medium mb-0.5">{item.sport?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-500 font-medium">{item.location?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-white">
                      {item.totalQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold">
                      <span className={`${item.availableQuantity === 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {item.availableQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-amber-300">
                      {item.waitlistCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold uppercase tracking-wide rounded-full border ${
                        item.status === 'Available' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => openEditModal(item)} 
                          className="text-indigo-400 hover:text-indigo-300 transition"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id)} 
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ADD/EDIT EQUIPMENT MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1e1e2d] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-700">
              <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-700/50 pb-4">
                {editingId ? 'Edit Equipment' : 'Add New Equipment'}
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
                
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Item Name</label>
                  <input 
                    type="text" name="itemName" 
                    value={formData.itemName} onChange={handleInputChange}
                    className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Cricket Bat"
                  />
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

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Location</label>
                  <select 
                    name="location" 
                    value={formData.location} onChange={handleInputChange}
                    className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a Location</option>
                    {locationsList.map((loc) => (
                      <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Total Quantity</label>
                  <input 
                    type="number" name="totalQuantity" 
                    value={formData.totalQuantity} onChange={handleInputChange}
                    className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    {editingId ? 'Update Image (Optional)' : 'Equipment Image'}
                  </label>
                  <input 
                    type="file" accept="image/jpeg, image/png, image/webp"
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 hover:file:text-indigo-300 outline-none transition file:cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-2">Max size: 5MB. Formats: JPG, PNG, WEBP.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="px-5 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"
                  >
                    {editingId ? 'Save Changes' : 'Save Equipment'}
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