import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../../context/LeadsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '../../types';
import { Zap, PhoneCall, Users, Eye, Phone, User, Briefcase, Calendar, CreditCard } from 'lucide-react';

import { clsx } from 'clsx';

export function PipelineView() {
    const { leads, updateLead } = useLeads();
    const navigate = useNavigate();
    const [activeStatus, setActiveStatus] = useState<Lead['status']>('new');

    const statuses = [
        { id: 'new', title: 'New', icon: Users, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', activeBg: 'bg-gray-100' },
        { id: 'contacted', title: 'Contacted', icon: PhoneCall, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', activeBg: 'bg-blue-100' },
        { id: 'sold', title: 'Sold', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', activeBg: 'bg-emerald-100' },
        { id: 'deal_closed', title: 'Deal Closed', icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', activeBg: 'bg-indigo-100' },
    ];

    const typeColumns = [
        { id: 'hot', title: 'Hot Leads', icon: Zap, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
        { id: 'warm', title: 'Warm Leads', icon: PhoneCall, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
        { id: 'cold', title: 'Cold Leads', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    ];

    const handleUpdate = (leadId: string, data: Partial<Lead>) => {
        updateLead(leadId, data);
    };


    return (
        <div className="flex flex-col gap-6">
            {/* Status Tabs (Matching Followups style) */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-2 sm:p-3 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex w-full lg:w-auto p-1 bg-gray-50 rounded-xl overflow-x-auto no-scrollbar">
                    <div className="flex gap-1 min-w-max w-full">
                        {statuses.map((status) => (
                            <button
                                key={status.id}
                                onClick={() => setActiveStatus(status.id as Lead['status'])}
                                className={clsx(
                                    "flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap border-transparent border",
                                    activeStatus === status.id
                                        ? `${status.activeBg} ${status.border} text-black shadow-sm`
                                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <status.icon size={16} className={activeStatus === status.id ? status.color : 'text-gray-400'} />
                                {status.title}
                                <span className={clsx(
                                    "ml-2 text-[10px] px-2 py-0.5 rounded-full",
                                    activeStatus === status.id ? `${status.bg} ${status.color}` : "bg-gray-200 text-gray-400"
                                )}>
                                    {leads.filter(l => l.status === status.id).length}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Type Kanban (Matching Followups style) */}
            <div className="flex lg:grid lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {typeColumns.map((column) => (
                    <div
                        key={column.id}
                        className="w-[85vw] lg:w-auto flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 overflow-hidden shrink-0 snap-center transition-colors shadow-sm shadow-gray-100/30"
                    >
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${column.bg} ${column.color}`}>
                                    <column.icon size={18} />
                                </div>
                                <h3
                                    className={clsx(
                                        "font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-full shadow-sm",
                                        column.id === 'hot' && "bg-red-500 text-white",
                                        column.id === 'warm' && "bg-amber-400 text-white",
                                        column.id === 'cold' && "bg-blue-500 text-white"
                                    )}
                                >
                                    {column.title}
                                </h3>
                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                    {leads.filter((l: Lead) => l.status === activeStatus && l.leadType === column.id).length}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
                            <AnimatePresence mode="popLayout" initial={false}>
                                {leads
                                    .filter((l: Lead) => l.status === activeStatus && l.leadType === column.id)
                                    .map((lead) => (
                                        <motion.div
                                            key={lead._id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            whileHover={{ y: -3 }}
                                            className="group relative rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md cursor-pointer flex flex-col gap-3"
                                        >
                                            {/* Header: Name + Origin */}
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex flex-col min-w-0">
                                                    <h4 className="font-bold text-gray-900 truncate leading-tight" title={lead.name}>
                                                        {lead.name}
                                                    </h4>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-200 uppercase tracking-wider shrink-0">
                                                    {lead.leadOrigin}
                                                </span>
                                            </div>

                                            {/* Details Section */}
                                            <div className="flex flex-col gap-1.5 border-b border-gray-50 pb-2">
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                                                    <Phone size={11} className="text-gray-400" />
                                                    <span className="truncate">{lead.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                    <Calendar size={11} className="text-gray-400" />
                                                    <span>{new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600">
                                                    <User size={11} className="text-gray-400" />
                                                    <span className="truncate">
                                                        {typeof lead.assignedTo === 'object' ? lead.assignedTo?.username : 'Unassigned'}
                                                    </span>
                                                </div>
                                                {lead.paymentStatus && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600 mt-0.5">
                                                        <CreditCard size={11} className={(lead.paymentStatus === 'Full Payment' || lead.paymentStatus === 'Advance Payment' || lead.paymentStatus === 'completed' || lead.paymentStatus === 'partial') ? "text-emerald-500" : "text-gray-400"} />
                                                        <span className={`px-1.5 py-0.5 rounded-sm capitalize font-bold tracking-wider ${(lead.paymentStatus === 'Full Payment' || lead.paymentStatus === 'Advance Payment' || lead.paymentStatus === 'completed' || lead.paymentStatus === 'partial') ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                                                            {lead.paymentStatus}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Intentions row */}
                                            {lead.carDetails && lead.carDetails.length > 0 && (
                                                <div className="mt-1 flex flex-col gap-1">
                                                    {lead.carDetails.map((c, idx) => {
                                                        if (c.intent === 'exchange') {
                                                            return (
                                                                <span key={idx} className="text-[11px]">
                                                                    <span className="font-semibold text-[#1B1B19] uppercase text-[10px] mr-1">Exchange:</span>
                                                                    {(c.ownedCar?.brandName || c.brandName) && (
                                                                        <span className="text-gray-700">
                                                                            {c.ownedCar?.brandName || c.brandName} {c.ownedCar?.modelName || c.modelName}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-gray-400 font-bold mx-1">→</span>
                                                                    {(c.wantedCar?.brandName || c.brandName) && (
                                                                        <span className="text-gray-700">
                                                                            {c.wantedCar?.brandName || c.brandName} {c.wantedCar?.modelName || c.modelName}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            );
                                                        }
                                                        if (c.intent === 'buying') {
                                                            return (
                                                                <span key={idx} className="text-[11px]">
                                                                    <span className="font-semibold text-blue-600 uppercase text-[10px] mr-1">Buy:</span>
                                                                    <span className="text-gray-700">
                                                                        {(c.wantedCar?.brandName || c.brandName) || 'Any'} {(c.wantedCar?.modelName || c.modelName) || ''}
                                                                    </span>
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span key={idx} className="text-[11px]">
                                                                <span className="font-semibold text-amber-600 uppercase text-[10px] mr-1">Sell:</span>
                                                                <span className="text-gray-700">
                                                                    {(c.ownedCar?.brandName || c.brandName) || 'Any'} {(c.ownedCar?.modelName || c.modelName) || ''}
                                                                </span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Transition Actions */}
                                            <div className="flex flex-col gap-2 mt-2 border-t border-gray-50 pt-3">
                                                <div className="grid grid-cols-6 gap-1.5">
                                                    {typeColumns.filter(c => c.id !== lead.leadType).map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdate(lead._id, { leadType: c.id as Lead['leadType'] });
                                                            }}
                                                            className={`col-span-3 text-[9px] font-bold uppercase tracking-tight py-2 rounded-lg border transition-all ${c.bg} ${c.color} border-transparent hover:border-current active:scale-95`}
                                                        >
                                                            {c.id}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-6 gap-1.5">
                                                    {statuses.filter(s => s.id !== lead.status).map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdate(lead._id, { status: s.id as Lead['status'] });
                                                            }}
                                                            className={`col-span-2 text-[9px] font-bold uppercase tracking-tight py-2 rounded-lg border transition-all ${s.bg} ${s.color} border-transparent hover:border-current active:scale-95`}
                                                        >
                                                            {s.id.replace('_', ' ')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/contact/${lead._id}`); }}
                                                className="w-full mt-1 flex items-center justify-center gap-1.5 bg-[#1B1B19] hover:bg-black text-white text-[10px] font-bold py-2.5 rounded-xl border border-[#1B1B19] transition-colors shadow-sm shadow-gray-200 uppercase tracking-wider"
                                            >
                                                <Eye size={12} /> View Lead
                                            </button>
                                        </motion.div>
                                    ))}
                            </AnimatePresence>
                            {leads.filter((l: Lead) => l.status === activeStatus && l.leadType === column.id).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">No {column.title}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
