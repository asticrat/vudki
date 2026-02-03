import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

const ReceiptList = ({ receipts, onDelete, currentUser }) => {
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [filterDate, setFilterDate] = useState('');
    const [filterMember, setFilterMember] = useState('');
    const [filterAmount, setFilterAmount] = useState('');
    const [amountOp, setAmountOp] = useState('>='); // '>=' for Min, '<=' for Max

    // Unique members for filter
    const members = [...new Set(receipts.map(r => r.user_name))];

    const filteredReceipts = receipts.filter(r => {
        let matchesDate = true;
        if (filterDate) {
            const rDate = new Date(r.created_at);
            const rDateString = rDate.getFullYear() + '-' +
                String(rDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(rDate.getDate()).padStart(2, '0');
            matchesDate = rDateString === filterDate;
        }

        const matchesMember = filterMember ? r.user_name === filterMember : true;
        let matchesAmount = true;
        if (filterAmount) {
            const amt = parseFloat(r.amount);
            const limit = parseFloat(filterAmount);
            matchesAmount = amountOp === '>=' ? amt >= limit : amt <= limit;
        }
        return matchesDate && matchesMember && matchesAmount;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold ml-1">Recent Activity</h2>
            </div>

            {/* Filters */}
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="p-2 text-xs rounded-xl bg-white/40 border border-white/30 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <select
                    value={filterMember}
                    onChange={e => setFilterMember(e.target.value)}
                    className="p-2 text-xs rounded-xl bg-white/40 border border-white/30 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="">All Members</option>
                    {members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                {/* Amount Filter Group */}
                <div className="flex rounded-xl bg-white/40 border border-white/30 overflow-hidden">
                    <select
                        value={amountOp}
                        onChange={e => setAmountOp(e.target.value)}
                        className="p-2 text-xs bg-transparent text-slate-600 focus:outline-none border-r border-white/30"
                    >
                        <option value=">=">Min</option>
                        <option value="<=">Max</option>
                    </select>
                    <input
                        type="number"
                        placeholder="Amount"
                        value={filterAmount}
                        onChange={e => setFilterAmount(e.target.value)}
                        className="p-2 text-xs bg-transparent text-slate-600 w-20 focus:outline-none"
                    />
                </div>

                {/* Clear Filter Button */}
                {(filterDate || filterMember || filterAmount) && (
                    <button
                        onClick={() => {
                            setFilterDate('');
                            setFilterMember('');
                            setFilterAmount('');
                            setAmountOp('>=');
                        }}
                        className="p-2 text-xs bg-red-100 text-red-600 rounded-xl font-bold flex-shrink-0 hover:bg-red-200 transition-colors"
                    >
                        ✕ Clear
                    </button>
                )}
            </div>

            {filteredReceipts.length === 0 ? (
                <GlassCard className="text-center py-12 border-dashed border-white/40">
                    <div className="flex flex-col items-center justify-center w-full">
                        <p className="text-slate-500">No receipts found.</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters.</p>
                    </div>
                </GlassCard>
            ) : (
                filteredReceipts.map((receipt) => (
                    <GlassCard
                        key={receipt.id}
                        onClick={() => setSelectedReceipt(receipt)}
                        className="transition-colors hover:bg-white/10 cursor-pointer active:scale-95 transition-transform"
                    >
                        <div className="flex items-start space-x-3 w-full">
                            <div className="w-12 h-12 bg-white/20 rounded-lg overflow-hidden flex-shrink-0 relative border border-white/20">
                                {receipt.image_path ? (
                                    <img
                                        src={`/${receipt.image_path}`}
                                        alt="Receipt"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-slate-800 text-sm truncate pr-2">{receipt.description || 'Receipt'}</p>
                                    <p className="font-extrabold text-slate-800 text-sm whitespace-nowrap">
                                        ${Number(receipt.amount).toFixed(2)}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Paid by <span className="font-bold text-slate-700">{receipt.user_name}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                    {new Date(receipt.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                ))
            )}

            {/* DETAILS MODAL */}
            <AnimatePresence>
                {selectedReceipt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedReceipt(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl p-0 w-full max-w-sm relative z-10 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                        >
                            <div className="relative h-64 bg-slate-100 flex-shrink-0">
                                {selectedReceipt.image_path ? (
                                    <img
                                        src={`/${selectedReceipt.image_path}`}
                                        className="w-full h-full object-cover"
                                        alt="Receipt Full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        No Image
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedReceipt(null)}
                                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-4 overflow-y-auto">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Receipt Info</p>
                                        <h3 className="text-2xl font-black text-slate-800 leading-tight">{selectedReceipt.description}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                                        <p className="text-2xl font-black text-indigo-600">${Number(selectedReceipt.amount).toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Paid By</p>
                                        <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-700 text-sm">
                                            {selectedReceipt.user_name}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Date</p>
                                        <div className="p-3 bg-slate-50 rounded-xl font-bold text-slate-700 text-sm">
                                            {new Date(selectedReceipt.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {(currentUser?.role === 'admin' || currentUser?.id === selectedReceipt.uploaded_by) && (
                                    <button
                                        onClick={() => {
                                            onDelete(selectedReceipt.id);
                                            setSelectedReceipt(null);
                                        }}
                                        className="w-full mt-6 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        <span>Delete Receipt</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReceiptList;
