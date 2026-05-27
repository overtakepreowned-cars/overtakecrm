import { useState, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../../context/LeadsContext';
import { Lead } from '../../types';
import { Zap, PhoneCall, Users, Eye, Phone, User, Briefcase, Calendar, CreditCard } from 'lucide-react';

import { clsx } from 'clsx';

export function PipelineView() {
    const { leads, updateLead, users, stats, fetchLeads, loading, clearLeads } = useLeads();
    const navigate = useNavigate();
    const [activeStatus, setActiveStatus] = useState<Lead['status']>('new');
    const [userFilter, setUserFilter] = useState('all');
    const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
        hot: 30,
        warm: 30,
        cold: 30
    });

    const statuses = [
        { id: 'new', title: 'New', icon: Users, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', activeBg: 'bg-gray-100' },
        { id: 'contacted', title: 'Contacted', icon: PhoneCall, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', activeBg: 'bg-blue-100' },
        { id: 'booking_confirmed', title: 'Booking Confirmed', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', activeBg: 'bg-emerald-100' },
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

    useEffect(() => {
        fetchLeads({
            status: activeStatus,
            assignedTo: userFilter !== 'all' ? userFilter : undefined,
            limit: 1000
        });
    }, [activeStatus, userFilter]);

    useEffect(() => {
        setVisibleCounts({ hot: 30, warm: 30, cold: 30 });
    }, [activeStatus, userFilter]);

    useEffect(() => {
        return () => {
            clearLeads();
        };
    }, []);

    const filteredLeads = leads;


    return (
        <div className="flex flex-col gap-6">
            <style>{`
                @keyframes pipelineCardFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .pipeline-card-animated {
                    animation: pipelineCardFadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
            `}</style>

            {/* Status Tabs (Matching Followups style) */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-2 sm:p-3 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex w-full lg:w-auto p-1 bg-gray-50 rounded-xl overflow-x-auto no-scrollbar">
                    <div className="flex gap-1 min-w-max w-full">
                        {statuses.map((status) => {
                            const count = userFilter === 'all' 
                                ? (stats?.statusBreakdown?.[status.id] || 0) 
                                : (activeStatus === status.id ? filteredLeads.length : 0);
                            return (
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
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* User Filter Dropdown */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm min-w-[160px]">
                    <User size={14} className="text-gray-400 shrink-0" />
                    <select
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer w-full"
                    >
                        <option value="all">All Users</option>
                        <option value="unassigned">Unassigned</option>
                        {users.map(u => (
                            <option key={u._id} value={u._id}>{u.username}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Board Container */}
            <div className="relative">
                {/* Loading Board Overlay */}
                {loading && (
                    <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 rounded-2xl">
                        <div className="flex flex-col items-center gap-3 p-6 bg-white/80 border border-gray-100 rounded-2xl shadow-xl backdrop-blur-md">
                            <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-700 animate-pulse">Loading Pipeline...</span>
                        </div>
                    </div>
                )}

                {/* Type Kanban (Matching Followups style) */}
                <div className="flex lg:grid lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    {typeColumns.map((column) => {
                        const columnLeads = filteredLeads.filter((l: Lead) => l.status === activeStatus && l.leadType === column.id);
                        const visibleLeads = columnLeads.slice(0, visibleCounts[column.id] || 30);
                        return (
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
                                            {columnLeads.length}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-200"
                                    onScroll={(e) => {
                                        const target = e.currentTarget;
                                        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 200) {
                                            setVisibleCounts(prev => {
                                                const currentCount = prev[column.id] || 30;
                                                if (currentCount < columnLeads.length) {
                                                    return {
                                                        ...prev,
                                                        [column.id]: currentCount + 30
                                                    };
                                                }
                                                return prev;
                                            });
                                        }
                                    }}
                                >
                                    {visibleLeads.map((lead) => (
                                        <PipelineCard
                                            key={lead._id}
                                            lead={lead}
                                            onUpdate={handleUpdate}
                                            onNavigate={(id: string) => navigate(`/contact/${id}`)}
                                            typeColumns={typeColumns}
                                            statuses={statuses}
                                        />
                                    ))}
                                    {visibleLeads.length < columnLeads.length && (
                                        <div className="flex justify-center items-center py-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 animate-pulse">Loading more leads...</span>
                                        </div>
                                    )}
                                    {columnLeads.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-center">No {column.title}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const PipelineCard = memo(({ lead, onUpdate, onNavigate, typeColumns, statuses }: any) => {
    return (
        <div
            className="pipeline-card-animated group relative rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md cursor-pointer flex flex-col gap-3 hover:-translate-y-1 active:scale-[0.99] will-change-transform"
            onClick={() => onNavigate(lead._id)}
        >
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

            {lead.carDetails && lead.carDetails.length > 0 && (
                <div className="mt-1 flex flex-col gap-1">
                    {lead.carDetails.map((c: any, idx: number) => {
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

            <div className="flex flex-col gap-2 mt-2 border-t border-gray-50 pt-3">
                <div className="grid grid-cols-6 gap-1.5">
                    {typeColumns.filter((c: any) => c.id !== lead.leadType).map((c: any) => (
                        <button
                            key={c.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(lead._id, { leadType: c.id as Lead['leadType'] });
                            }}
                            className={`col-span-3 text-[9px] font-bold uppercase tracking-tight py-2 rounded-lg border transition-all ${c.bg} ${c.color} border-transparent hover:border-current active:scale-95`}
                        >
                            {c.id}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                    {statuses.filter((s: any) => s.id !== lead.status).map((s: any) => (
                        <button
                            key={s.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(lead._id, { status: s.id as Lead['status'] });
                            }}
                            className={`col-span-2 text-[9px] font-bold uppercase tracking-tight py-2 rounded-lg border transition-all ${s.bg} ${s.color} border-transparent hover:border-current active:scale-95`}
                        >
                            {s.id.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
                <a
                    href={`tel:${lead.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase tracking-wider font-bold py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-200/50"
                >
                    <Phone size={12} /> Call Lead
                </a>
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(lead._id); }}
                    className="w-full flex items-center justify-center gap-2 bg-[#1B1B19] hover:bg-black text-white text-[10px] font-bold py-2.5 rounded-xl border border-[#1B1B19] transition-colors shadow-sm shadow-gray-200 uppercase tracking-wider"
                >
                    <Eye size={12} /> View Lead
                </button>
            </div>
        </div>
    );
});
