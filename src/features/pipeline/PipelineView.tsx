import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../../context/LeadsContext';
import { authenticatedFetch } from '../../utils/api';
import { Lead } from '../../types';
import { Zap, PhoneCall, Users, Eye, Phone, User, Briefcase, Calendar, CreditCard } from 'lucide-react';
import { clsx } from 'clsx';

const PAGE_SIZE = 30;

type ColumnState = {
    leads: Lead[];
    total: number;
    page: number;
    hasMore: boolean;
    loading: boolean;
};

const defaultColumn = (): ColumnState => ({ leads: [], total: 0, page: 0, hasMore: true, loading: false });

const mapLeads = (raw: any[]): Lead[] =>
    raw.map(l => ({
        ...l,
        tags: l.tags || [],
        carDetails: l.carDetails || [],
        phone: l.phone || 'Unknown',
        assignmentHistory: l.assignmentHistory || [],
        followupHistory: l.followupHistory || [],
    }));

// Module-level cache — survives component unmount (e.g. navigating to a lead card and back)
type PipelineCache = {
    columns: Record<string, ColumnState>;
    statusTotals: Record<string, number>;
    activeStatus: Lead['status'];
    userFilter: string;
};
let pipelineCache: PipelineCache | null = null;

const TYPE_COLUMNS = [
    { id: 'hot', title: 'Hot Leads', icon: Zap, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
    { id: 'warm', title: 'Warm Leads', icon: PhoneCall, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { id: 'cold', title: 'Cold Leads', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
];

const STATUSES = [
    { id: 'new', title: 'New', icon: Users, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100', activeBg: 'bg-gray-100' },
    { id: 'contacted', title: 'Contacted', icon: PhoneCall, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', activeBg: 'bg-blue-100' },
    { id: 'booking_confirmed', title: 'Booking Confirmed', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', activeBg: 'bg-emerald-100' },
    { id: 'deal_closed', title: 'Deal Closed', icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', activeBg: 'bg-indigo-100' },
];

export function PipelineView() {
    const { users } = useLeads();
    const navigate = useNavigate();

    // Restore last active tab/filter from cache so the board re-opens where the user left off
    const [activeStatus, setActiveStatus] = useState<Lead['status']>(
        pipelineCache?.activeStatus ?? 'new'
    );
    const [userFilter, setUserFilter] = useState(pipelineCache?.userFilter ?? 'all');

    const [columns, setColumns] = useState<Record<string, ColumnState>>(
        pipelineCache?.columns ?? { hot: defaultColumn(), warm: defaultColumn(), cold: defaultColumn() }
    );
    const [statusTotals, setStatusTotals] = useState<Record<string, number>>(
        pipelineCache?.statusTotals ?? {}
    );
    const [boardLoading, setBoardLoading] = useState(false);

    // Epoch prevents stale fetch responses from overwriting fresh ones
    const epochRef = useRef(0);

    // Refs keep the latest state values accessible in the unmount cleanup without stale closures
    const columnsRef = useRef(columns);
    const statusTotalsRef = useRef(statusTotals);
    const activeStatusRef = useRef(activeStatus);
    const userFilterRef = useRef(userFilter);
    useEffect(() => { columnsRef.current = columns; }, [columns]);
    useEffect(() => { statusTotalsRef.current = statusTotals; }, [statusTotals]);
    useEffect(() => { activeStatusRef.current = activeStatus; }, [activeStatus]);
    useEffect(() => { userFilterRef.current = userFilter; }, [userFilter]);

    // Save state to module-level cache when navigating away so it survives remount
    useEffect(() => {
        return () => {
            pipelineCache = {
                columns: columnsRef.current,
                statusTotals: statusTotalsRef.current,
                activeStatus: activeStatusRef.current,
                userFilter: userFilterRef.current,
            };
        };
    }, []);

    const buildQs = useCallback((extra: Record<string, string | number> = {}) => {
        const p: Record<string, string> = { status: activeStatus };
        if (userFilter !== 'all') p.assignedTo = userFilter;
        for (const [k, v] of Object.entries(extra)) p[k] = String(v);
        return new URLSearchParams(p).toString();
    }, [activeStatus, userFilter]);

    const fetchStatusTotals = useCallback(async () => {
        const qs = userFilter !== 'all' ? `?assignedTo=${userFilter}` : '';
        const res = await authenticatedFetch(`/api/leads/stats${qs}`);
        if (res.ok) {
            const data = await res.json();
            setStatusTotals(data.statusBreakdown || {});
        }
    }, [userFilter]);

    const fetchColumnPage = useCallback(async (
        colId: string,
        page: number,
        epoch: number,
        reset: boolean
    ) => {
        setColumns(prev => ({
            ...prev,
            [colId]: { ...prev[colId], loading: true },
        }));

        try {
            const qs = buildQs({ leadType: colId, page, limit: PAGE_SIZE });
            const res = await authenticatedFetch(`/api/leads?${qs}`);
            if (epochRef.current !== epoch) return;
            if (!res.ok) throw new Error('fetch failed');
            const data = await res.json();
            if (epochRef.current !== epoch) return;

            const newLeads = mapLeads(data.leads || []);
            const total = data.total ?? 0;

            setColumns(prev => ({
                ...prev,
                [colId]: {
                    leads: reset ? newLeads : [...prev[colId].leads, ...newLeads],
                    total,
                    page,
                    hasMore: newLeads.length === PAGE_SIZE,
                    loading: false,
                },
            }));
        } catch {
            if (epochRef.current === epoch) {
                setColumns(prev => ({ ...prev, [colId]: { ...prev[colId], loading: false } }));
            }
        }
    }, [buildQs]);

    // Reload all columns when status or user filter changes.
    // If the cache already has data for the current params (coming back from a lead card),
    // skip the loading overlay and refresh silently in the background.
    useEffect(() => {
        const epoch = ++epochRef.current;

        const isCacheHit =
            pipelineCache &&
            pipelineCache.activeStatus === activeStatus &&
            pipelineCache.userFilter === userFilter &&
            TYPE_COLUMNS.some(c => (pipelineCache!.columns[c.id]?.leads.length ?? 0) > 0);

        if (!isCacheHit) {
            setBoardLoading(true);
            setColumns({ hot: defaultColumn(), warm: defaultColumn(), cold: defaultColumn() });
        }

        Promise.all(
            TYPE_COLUMNS.map(col => fetchColumnPage(col.id, 0, epoch, true))
        ).finally(() => {
            if (epochRef.current === epoch) setBoardLoading(false);
        });
    }, [activeStatus, userFilter]);

    // Refresh status totals whenever user filter changes (tabs stay accurate)
    useEffect(() => {
        fetchStatusTotals();
    }, [userFilter]);

    const handleScroll = (colId: string, e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
            const col = columns[colId];
            if (col.hasMore && !col.loading) {
                fetchColumnPage(colId, col.page + 1, epochRef.current, false);
            }
        }
    };

    const handleUpdate = async (leadId: string, updates: Partial<Lead>) => {
        const sourceColId = TYPE_COLUMNS.find(c => columns[c.id].leads.some(l => l._id === leadId))?.id;

        // Optimistic: remove or update in local state
        if (updates.leadType && sourceColId && updates.leadType !== sourceColId) {
            setColumns(prev => ({
                ...prev,
                [sourceColId]: {
                    ...prev[sourceColId],
                    leads: prev[sourceColId].leads.filter(l => l._id !== leadId),
                    total: Math.max(0, prev[sourceColId].total - 1),
                },
            }));
        } else if (updates.status && updates.status !== activeStatus) {
            setColumns(prev => {
                const next = { ...prev };
                for (const c of TYPE_COLUMNS) {
                    next[c.id] = {
                        ...next[c.id],
                        leads: next[c.id].leads.filter(l => l._id !== leadId),
                        total: Math.max(0, next[c.id].total - 1),
                    };
                }
                return next;
            });
            setStatusTotals(prev => ({
                ...prev,
                [activeStatus]: Math.max(0, (prev[activeStatus] || 0) - 1),
                [updates.status!]: (prev[updates.status!] || 0) + 1,
            }));
        } else if (sourceColId) {
            setColumns(prev => ({
                ...prev,
                [sourceColId]: {
                    ...prev[sourceColId],
                    leads: prev[sourceColId].leads.map(l => l._id === leadId ? { ...l, ...updates } : l),
                },
            }));
        }

        try {
            await authenticatedFetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
        } catch {
            // On API failure, refresh the affected column
            if (sourceColId) fetchColumnPage(sourceColId, 0, epochRef.current, true);
        }
    };

    const anyColumnLoading = TYPE_COLUMNS.some(c => columns[c.id].loading && columns[c.id].leads.length === 0);
    const showBoardSpinner = boardLoading || anyColumnLoading;

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

            {/* Status Tabs */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-2 sm:p-3 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex w-full lg:w-auto p-1 bg-gray-50 rounded-xl overflow-x-auto no-scrollbar">
                    <div className="flex gap-1 min-w-max w-full">
                        {STATUSES.map((status) => {
                            const isActive = activeStatus === status.id;
                            const total = isActive
                                ? TYPE_COLUMNS.reduce((s, c) => s + columns[c.id].total, 0)
                                : (statusTotals[status.id] ?? null);
                            return (
                                <button
                                    key={status.id}
                                    onClick={() => setActiveStatus(status.id as Lead['status'])}
                                    className={clsx(
                                        "flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap border-transparent border",
                                        isActive
                                            ? `${status.activeBg} ${status.border} text-black shadow-sm`
                                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                    )}
                                >
                                    <status.icon size={16} className={isActive ? status.color : 'text-gray-400'} />
                                    {status.title}
                                    {total !== null && (
                                        <span className={clsx(
                                            "ml-2 text-[10px] px-2 py-0.5 rounded-full",
                                            isActive ? `${status.bg} ${status.color}` : "bg-gray-200 text-gray-400"
                                        )}>
                                            {total}
                                        </span>
                                    )}
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

            {/* Board */}
            <div className="relative">
                {showBoardSpinner && (
                    <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 rounded-2xl">
                        <div className="flex flex-col items-center gap-3 p-6 bg-white/80 border border-gray-100 rounded-2xl shadow-xl backdrop-blur-md">
                            <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-700 animate-pulse">Loading Pipeline...</span>
                        </div>
                    </div>
                )}

                <div className="flex lg:grid lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    {TYPE_COLUMNS.map((column) => {
                        const col = columns[column.id];
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
                                            {col.total}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-200"
                                    onScroll={(e) => handleScroll(column.id, e)}
                                >
                                    {col.leads.map((lead) => (
                                        <PipelineCard
                                            key={lead._id}
                                            lead={lead}
                                            onUpdate={handleUpdate}
                                            onNavigate={(id: string) => navigate(`/contact/${id}`)}
                                            typeColumns={TYPE_COLUMNS}
                                            statuses={STATUSES}
                                        />
                                    ))}
                                    {col.loading && col.leads.length > 0 && (
                                        <div className="flex justify-center py-4">
                                            <div className="w-5 h-5 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {!col.loading && !col.hasMore && col.leads.length > 0 && (
                                        <div className="flex justify-center py-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">All {col.total} loaded</span>
                                        </div>
                                    )}
                                    {!col.loading && col.leads.length === 0 && (
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
