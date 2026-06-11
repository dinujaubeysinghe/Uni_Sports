import React, { useState, useEffect } from 'react';
import { equipmentRequestService } from '../../../services/equipmentRequestService';
import { DashboardLayout } from "@/components/DashboardLayout";

// Define TypeScript interfaces for better auto-complete
interface RequestedItem {
  _id: string; // The specific ID of this item sub-document in the request
  equipment: {
    _id: string;
    itemName: string;
  };
  quantity: number;
}

interface BorrowRequest {
  _id: string;
  items: RequestedItem[];
  expectedReturnDate: string;
  status: string;
  notes?: string;
  createdAt: string;
  qrPass?: {
    qrImage?: string;
    generatedAt?: string;
    scannedAt?: string;
  };
}
 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
 
export default function StudentMyRequests() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Issue Reporting Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [issueData, setIssueData] = useState({
    itemId: '', // This will hold the specific equipment ID
    damagedQuantity: 0,
    lostQuantity: 0,
    issueNote: ''
  });
  const [selectedQrRequest, setSelectedQrRequest] = useState<BorrowRequest | null>(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await equipmentRequestService.getMyRequests();
      setRequests(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch your requests');
    } finally {
      setLoading(false);
    }
  };

  // --- Helper to style status badges (Dark Theme adapted) ---
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Approved': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Borrowed': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Returned': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Overdue': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Rejected': 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    };
    
    const defaultStyle = 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    return `px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${styles[status] || defaultStyle}`;
  };

  // --- Issue Reporting Handlers ---
  const openIssueModal = (request: BorrowRequest) => {
    setSelectedRequest(request);
    // Auto-select the first item in the dropdown
    setIssueData({
      itemId: request.items[0]?._id || '',
      damagedQuantity: 0,
      lostQuantity: 0,
      issueNote: ''
    });
    setIsIssueModalOpen(true);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (issueData.damagedQuantity === 0 && issueData.lostQuantity === 0) {
      return alert("You must report at least 1 damaged or 1 lost item.");
    }

    try {
      await equipmentRequestService.reportIssue(selectedRequest._id, {
        itemId: issueData.itemId,
        damagedQuantity: issueData.damagedQuantity,
        lostQuantity: issueData.lostQuantity,
        issueNote: issueData.issueNote
      });

      alert("Issue reported successfully to the admin team.");
      setIsIssueModalOpen(false);
      fetchMyRequests(); // Refresh the list
    } catch (err: any) {
      alert(err.message || 'Failed to report issue.');
    }
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-slate-400 mt-20 font-medium">Loading your requests...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-8 text-center text-red-500 mt-20">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6 text-slate-200">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Borrowing History</h1>
            <p className="text-slate-400 text-sm mt-1">Track your equipment requests, due dates, and report issues.</p>
          </div>
          
          <div className="bg-[#1e1e2d] px-4 py-2.5 rounded-lg shadow-lg border border-slate-700/50 text-sm font-medium text-slate-300 flex items-center gap-2">
            <span className="text-indigo-400">Total Requests:</span> 
            <span className="text-white font-bold">{requests.length}</span>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-[#1e1e2d] rounded-xl shadow-lg p-12 text-center border border-slate-700/50 flex flex-col items-center">
            <span className="text-5xl mb-4 opacity-40">🎒</span>
            <h3 className="text-xl font-bold text-white mb-2">No Requests Yet</h3>
            <p className="text-slate-400 max-w-md">You haven't requested to borrow any sports equipment.</p>
          </div>
        ) : (
          <div className="bg-[#1e1e2d] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-[#151521]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date Requested</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Items Requested</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Return Date</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-[#1e1e2d]">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-[#151521]/50 transition duration-200">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-white">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5">
                      <ul className="space-y-2">
                        {req.items.map((item, idx) => (
                          <li key={idx} className="text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span className="font-semibold text-slate-200">{item.equipment?.itemName || 'Unknown Item'}</span> 
                            <span className="text-slate-500 font-medium bg-[#151521] px-2 py-0.5 rounded border border-slate-700/50">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      {req.notes && (
                        <div className="mt-3 bg-[#151521] p-3 rounded-lg border border-slate-700/50">
                          <p className="text-xs text-slate-300 leading-relaxed">
                            <span className="font-bold text-indigo-400 uppercase tracking-wider mr-2">Note:</span> 
                            {req.notes}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-300">
                      {new Date(req.expectedReturnDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className={getStatusBadge(req.status)}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      {/* Only allow issue reporting if the items are currently in their possession */}
                      <div className="flex justify-end gap-2">
                        {req.status === 'Approved' && req.qrPass?.qrImage && (
                          <button
                            onClick={() => setSelectedQrRequest(req)}
                            className="text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 hover:bg-emerald-600 hover:border-emerald-500 transition shadow-sm"
                          >
                            Show Pickup QR
                          </button>
                        )}

                        {(req.status === 'Borrowed' || req.status === 'Overdue') ? (
                          <button
                            onClick={() => openIssueModal(req)}
                            className="text-xs font-bold text-red-400 hover:text-white bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 hover:bg-red-600 hover:border-red-500 transition shadow-sm"
                          >
                            Report Issue
                          </button>
                        ) : req.status !== 'Approved' ? (
                          <span className="text-slate-600 italic text-xs font-medium px-4">N/A</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PICKUP QR MODAL */}
        {selectedQrRequest?.qrPass?.qrImage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e2d] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4 text-emerald-300 border-b border-slate-700/50 pb-4">Pickup QR Pass</h2>
              <p className="text-sm text-slate-300 mb-4">
                Show this QR code at the sports room checkout desk to collect your approved request.
              </p>

              <div className="bg-white rounded-xl p-4 flex justify-center">
                <img
                  src={selectedQrRequest.qrPass.qrImage}
                  alt="Pickup QR Pass"
                  className="w-64 h-64 object-contain"
                />
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Request ID: <span className="text-slate-200">{selectedQrRequest._id}</span>
              </p>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedQrRequest(null)}
                  className="px-5 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REPORT ISSUE MODAL */}
        {isIssueModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e2d] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-6 text-red-400 border-b border-slate-700/50 pb-4">Report Damaged or Lost Item</h2>
              
              <form onSubmit={handleIssueSubmit}>
                
                <div className="mb-5">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Which item has an issue?</label>
                  <select 
                    required
                    value={issueData.itemId}
                    onChange={(e) => setIssueData({...issueData, itemId: e.target.value})}
                    className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    {selectedRequest.items.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.equipment.itemName} (Borrowed: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Damaged Qty</label>
                    <input 
                      type="number" min="0" 
                      value={issueData.damagedQuantity}
                      onChange={(e) => setIssueData({...issueData, damagedQuantity: Number(e.target.value)})}
                      className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Lost Qty</label>
                    <input 
                      type="number" min="0" 
                      value={issueData.lostQuantity}
                      onChange={(e) => setIssueData({...issueData, lostQuantity: Number(e.target.value)})}
                      className="w-full bg-[#151521] border border-slate-600 text-white rounded-lg px-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Details of what happened *</label>
                  <textarea 
                    required minLength={3} rows={3}
                    value={issueData.issueNote}
                    onChange={(e) => setIssueData({...issueData, issueNote: e.target.value})}
                    className="w-full bg-[#151521] border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-3 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="E.g., The bat handle snapped during practice."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50">
                  <button 
                    type="button" 
                    onClick={() => setIsIssueModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-600 rounded-lg text-slate-300 font-medium hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition shadow-lg shadow-red-500/20 border border-red-500/50"
                  >
                    Submit Report
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