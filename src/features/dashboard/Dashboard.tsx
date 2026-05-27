import { Users, PhoneCall, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { useLeads } from '../../context/LeadsContext';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
    const { apiLeads, users, loading, error, stats } = useLeads();
    const navigate = useNavigate();

    const row1 = [
        { title: 'Hot Leads', value: stats?.hot || 0, icon: Zap, color: 'text-red-500', bg: 'bg-red-50' },
        { title: 'Warm Leads', value: stats?.warm || 0, icon: PhoneCall, color: 'text-amber-500', bg: 'bg-amber-50' },
        { title: 'Cold Leads', value: stats?.cold || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
        { title: 'Total Leads', value: stats?.total || 0, icon: CalendarIcon, color: 'text-gray-600', bg: 'bg-gray-50' },
    ];

    const row2 = [
        { title: 'Unassigned', value: stats?.unassigned || 0, icon: CalendarIcon, color: 'text-orange-500', bg: 'bg-orange-50' },
        { title: 'Advance Payment', value: stats?.advancePayment || 0, icon: Zap, color: 'text-[#1B1B19]', bg: 'bg-gray-50' },
        { title: 'Today\'s Follow-ups', value: stats?.todayFollowups || 0, icon: CalendarIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Missed Follow-ups', value: stats?.missedFollowups || 0, icon: Zap, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const originBreakdown = (stats?.originBreakdown || {}) as Record<string, number>;
    const statusBreakdown = (stats?.statusBreakdown || {}) as Record<string, number>;

    const userPerformance = (stats?.userPerformance || []) as any[];

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse">Loading dashboard data...</p>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <Zap size={32} />
                </div>
                <h3 className="text-xl font-bold text-red-900">Dashboard Unavailable</h3>
                <p className="text-red-600 text-center max-w-md">{error}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#1B1B19] text-white rounded-xl font-bold hover:bg-black transition-all">Retry</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-12">
            {apiLeads.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-6 py-4 animate-pulse">
                    <div className="flex items-center gap-3 text-indigo-700">
                        <Zap size={20} className="fill-current" />
                        <span className="font-bold text-sm">Automation Alert: You have {apiLeads.length} new automated lead(s) waiting for review!</span>
                    </div>
                    <button
                        onClick={() => navigate('/contacts?mode=apileads')}
                        className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:underline"
                    >
                        Review Now
                    </button>
                </div>
            )}
            
            {stats?.missedFollowups > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-6 py-4 animate-pulse">
                    <div className="flex items-center gap-3 text-red-700">
                        <Zap size={20} className="fill-current" />
                        <span className="font-bold text-sm">Action Required: You have {stats.missedFollowups} missed follow-ups!</span>
                    </div>
                    <button
                        onClick={() => navigate('/followups')}
                        className="text-xs font-bold uppercase tracking-wider text-red-600 hover:underline"
                    >
                        View Now
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-4">
                {/* Row 1: Key Stages */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {row1.map((card, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                                <card.icon size={20} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-bold uppercase tracking-tight text-gray-400 truncate mb-0.5">{card.title}</span>
                                <span className="text-xl font-bold text-gray-900 leading-none">{card.value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Row 2: Secondary Metrics */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {row2.map((card, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                                <card.icon size={20} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-bold uppercase tracking-tight text-gray-400 truncate mb-0.5">{card.title}</span>
                                <span className="text-xl font-bold text-gray-900 leading-none">{card.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lead Origin Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                    <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-4">Lead Origin Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(originBreakdown).sort((a, b) => b[1] - a[1]).map(([origin, count]) => (
                            <div key={origin} className="flex flex-col p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{origin}</span>
                                <span className="text-xl font-bold text-[#1B1B19]">{count}</span>
                            </div>
                        ))}
                        {Object.keys(originBreakdown).length === 0 && <span className="text-xs text-gray-400 italic">No origin data available</span>}
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                    <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-4">Status Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {['new', 'contacted', 'booking_confirmed', 'deal_closed'].map((status) => {
                            const count = statusBreakdown[status] || 0;
                            return (
                                <div key={status} className="flex flex-col p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{status.replace('_', ' ')}</span>
                                    <span className="text-xl font-bold text-gray-900">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Users Section */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-bold text-gray-900">Users</h2>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Total Users</span>
                            <span className="text-sm font-bold text-[#1B1B19]">{users.length}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
                            <span className="text-[10px] font-bold uppercase text-orange-400">Unassigned Leads</span>
                            <span className="text-sm font-bold text-orange-700">{stats?.unassigned || 0}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {userPerformance.map(user => (
                        <div key={user._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-gray-300 hover:shadow-md">
                            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gray-100 text-[#1B1B19] flex items-center justify-center font-bold">
                                    {user.username.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900">{user.username}</span>
                                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-gray-100">
                                <div className="p-4 flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">Assigned</span>
                                    <span className="text-lg font-bold text-[#1B1B19]">{user.totalAssigned}</span>
                                </div>
                                <div className="p-4 flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">Today</span>
                                    <span className="text-lg font-bold text-emerald-600">{user.todayFollowups}</span>
                                </div>
                                <div className="p-4 flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">Missed</span>
                                    <span className="text-lg font-bold text-red-600">{user.missedFollowups}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {userPerformance.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <span className="text-gray-400 font-medium">No team members found</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
