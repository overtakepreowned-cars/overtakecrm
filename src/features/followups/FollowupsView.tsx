import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../../context/LeadsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { Phone, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, User, Eye, Plus, Filter, Zap, PhoneCall, Users, CreditCard } from 'lucide-react';
import { Lead } from '../../types';

export function FollowupsView() {
    const { leads, users, updateLead, fetchLeads } = useLeads();
    const navigate = useNavigate();

    // Filters & Tabs
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'missed'>('today');
    const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
    const [specificDateFilter, setSpecificDateFilter] = useState<string>('');
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

    const tabs = [
        { id: 'today', title: 'Today', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', activeBg: 'bg-emerald-100' },
        { id: 'upcoming', title: 'Upcoming', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', activeBg: 'bg-blue-100' },
        { id: 'missed', title: 'Missed', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', activeBg: 'bg-red-100' },
    ];

    const leadTypeColumns = [
        { id: 'hot', title: 'Hot', icon: Zap, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
        { id: 'warm', title: 'Warm', icon: PhoneCall, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
        { id: 'cold', title: 'Cold', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    ];

    useEffect(() => {
        fetchLeads({
            hasFollowup: 'true',
            assignedTo: assigneeFilter !== 'all' ? assigneeFilter : undefined,
            date: specificDateFilter || undefined,
            limit: 1000
        });
    }, [assigneeFilter, specificDateFilter]);

    // Filter by specificDateFilter on the frontend to support full date filtering
    const filteredLeads = useMemo(() => {
        if (!specificDateFilter) return leads;

        return leads.filter(lead => {
            if (!lead.followupDate) return false;
            try {
                const parsed = parseISO(lead.followupDate as string);
                if (isNaN(parsed.getTime())) return false;

                const leadDateStr = format(parsed, 'yyyy-MM-dd');
                return leadDateStr === specificDateFilter;
            } catch {
                return false;
            }
        });
    }, [leads, specificDateFilter]);

    // First categorize by Time (Tab)
    const categorizedByTime = useMemo(() => {
        const result: Record<string, Lead[]> = { missed: [], today: [], upcoming: [] };
        const today = startOfDay(new Date());

        filteredLeads.forEach(lead => {
            if (!lead.followupDate) return; // Skip if no followup date

            try {
                const parsed = parseISO(lead.followupDate as string);
                if (isNaN(parsed.getTime())) return; // Skip invalid dates

                const fDate = startOfDay(parsed);
                if (isNaN(fDate.getTime())) return;

                if (fDate < today) {
                    result.missed.push(lead);
                } else if (isSameDay(fDate, today)) {
                    result.today.push(lead);
                } else {
                    result.upcoming.push(lead);
                }
            } catch (err) {
                console.error('Failed to parse followup date for lead:', lead, err);
            }
        });

        // Sort upcoming by closest date first
        result.upcoming.sort((a, b) => new Date(a.followupDate!).getTime() - new Date(b.followupDate!).getTime());
        // Sort missed by oldest first (largest days past)
        result.missed.sort((a, b) => new Date(a.followupDate!).getTime() - new Date(b.followupDate!).getTime());

        return result;
    }, [filteredLeads]);

    // Leads for current active tab
    const currentTabLeads = categorizedByTime[activeTab] || [];

    // Inside the active tab, group leads by LEAD TYPE to form columns
    const columnsData = useMemo(() => {
        const grouped: Record<string, Lead[]> = { hot: [], warm: [], cold: [] };
        
        currentTabLeads.forEach(lead => {
            const type = (lead.leadType || 'cold').toLowerCase(); // Fallback to 'cold' if missing
            if (grouped[type]) {
                grouped[type].push(lead);
            } else {
                grouped.cold.push(lead); // Default fallback column
            }
        });
        return grouped;
    }, [currentTabLeads]);

    const handleDragStart = (e: React.DragEvent, lead: Lead) => {
        setDraggedLead(lead);
        e.dataTransfer.setData('text/plain', lead._id);
        e.dataTransfer.effectAllowed = 'move';

        const target = e.target as HTMLElement;
        target.style.opacity = '0.4';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedLead(null);
        const target = e.target as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetType: string) => {
        e.preventDefault();
        if (!draggedLead || draggedLead.leadType === targetType) return;

        try {
            await updateLead(draggedLead._id, { leadType: targetType as 'hot' | 'warm' | 'cold' });
        } catch (error) {
            console.error('Failed to change lead type:', error);
        }
        setDraggedLead(null);
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Top Bar: Tabs & Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-2 sm:p-3 rounded-2xl border border-gray-100 shadow-sm">

                {/* Tabs */}
                <div className="flex w-full lg:w-auto p-1 bg-gray-50 rounded-xl overflow-x-auto no-scrollbar">
                    <div className="flex gap-1 min-w-max w-full">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? `${tab.activeBg} ${tab.border} text-gray-900 shadow-sm`
                                        : `text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent`
                                    }`}
                            >
                                <tab.icon size={16} className={activeTab === tab.id ? tab.color : 'text-gray-400'} />
                                {tab.title}
                                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? tab.bg + ' ' + tab.color : 'bg-gray-200 text-gray-500'}`}>
                                    {categorizedByTime[tab.id].length}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Global Filters */}
                <div className="grid grid-cols-2 lg:flex lg:items-center gap-3 sm:gap-4 w-full lg:w-auto px-1 sm:px-2">
                    <div className="col-span-2 lg:flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-wider hidden lg:flex">
                        <Filter size={16} /> Filters:
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={specificDateFilter}
                            onChange={(e) => setSpecificDateFilter(e.target.value)}
                            className="w-full lg:w-auto rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium focus:border-[#1B1B19] focus:outline-none transition-colors"
                        />
                        {specificDateFilter && (
                            <button
                                onClick={() => setSpecificDateFilter('')}
                                className="flex items-center justify-center p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors border border-red-100 shrink-0"
                                title="Clear Date Filter"
                            >
                                <Plus size={18} className="rotate-45" />
                            </button>
                        )}
                    </div>

                    <select
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                        className="w-full lg:w-auto rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium focus:border-[#1B1B19] focus:outline-none transition-colors min-w-[120px] sm:min-w-[150px]"
                    >
                        <option value="all">Assignee: All</option>
                        <option value="unassigned">Unassigned</option>
                        {users.map(u => (
                            <option key={u._id} value={u._id}>{u.username}</option>
                        ))}
                    </select>
                </div>

            </div>

            {/* Kanban Board Columns (Lead Types) */}
            <div className="flex lg:grid lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {leadTypeColumns.map((column) => {
                    const columnLeads = columnsData[column.id];

                    return (
                        <div
                            key={column.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                            className={`w-[85vw] lg:w-auto flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 overflow-hidden shrink-0 snap-center transition-colors ${draggedLead && draggedLead.leadType !== column.id ? 'bg-gray-100 border-dashed border-gray-300' : ''}`}
                            >
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${column.bg} ${column.color}`}>
                                        <column.icon size={18} />
                                    </div>
                                    <h3
                                        className={
                                            column.id === 'hot'
                                                ? 'font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-full shadow-sm bg-red-500 text-white'
                                                : column.id === 'warm'
                                                ? 'font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-full shadow-sm bg-amber-400 text-white'
                                                : 'font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-full shadow-sm bg-blue-500 text-white'
                                        }
                                    >
                                        {column.title} Leads
                                    </h3>
                                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                        {columnLeads.length}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
                                {columnLeads.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-300 h-full">
                                        <div className="h-10 w-10 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
                                            <Plus size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-center">Drag leads<br />here</span>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {columnLeads.map((lead) => {
                                            const fDate = parseISO(lead.followupDate as string);
                                            const daysPast = differenceInDays(startOfDay(new Date()), startOfDay(fDate));

                                            return (
                                                <motion.div
                                                    key={lead._id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    whileHover={{ y: -3 }}
                                                    draggable
                                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                                    onDragStart={(e) => handleDragStart(e as any, lead)}
                                                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                                    onDragEnd={(e) => handleDragEnd(e as any)}
                                                    className="group relative rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow-md flex flex-col gap-3 cursor-grab active:cursor-grabbing"
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

                                                    <div className="flex flex-col gap-1.5 mt-1 border-b border-gray-50 pb-2">
                                                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                                                            <Phone size={11} className="text-gray-400" />
                                                            <span className="truncate">{lead.phone}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                            <CalendarIcon size={11} className="text-gray-400" />
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
                                                                <CreditCard size={11} className={(lead.paymentStatus === 'Full Payment' || lead.paymentStatus === 'Advance Payment') ? "text-emerald-500" : "text-gray-400"} />
                                                                <span className={`px-1.5 py-0.5 rounded-sm capitalize font-bold tracking-wider ${(lead.paymentStatus === 'Full Payment' || lead.paymentStatus === 'Advance Payment') ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                                                                    {lead.paymentStatus}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {lead.carDetails && lead.carDetails.length > 0 && (
                                                        <div className="flex flex-col gap-1">
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

                                                    <div className="mt-1 flex items-center justify-between border-t border-gray-50 pt-2">
                                                        {activeTab === 'missed' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 text-[10px] font-bold border border-red-100">
                                                                <AlertCircle size={10} /> +{daysPast} {daysPast === 1 ? 'Day' : 'Days'} Overdue
                                                            </span>
                                                        ) : activeTab === 'upcoming' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                                                                <CalendarIcon size={10} /> {format(fDate, 'MMM d, yyyy')}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                                                <CheckCircle2 size={10} /> Scheduled for Today
                                                            </span>
                                                        )}
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
                                                            onClick={() => navigate(`/contact/${lead._id}`)}
                                                            className="w-full flex items-center justify-center gap-2 bg-[#1B1B19] hover:bg-black text-white text-[10px] uppercase tracking-wider font-bold py-2.5 rounded-xl border border-[#1B1B19] transition-colors shadow-sm shadow-gray-200"
                                                        >
                                                            <Eye size={12} /> View Lead
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div >
    );
}
