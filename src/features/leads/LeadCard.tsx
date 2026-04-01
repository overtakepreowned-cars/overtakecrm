import { Phone, MapPin, MessageSquare, Tag, Briefcase, CreditCard, Calendar, CheckCircle2, X } from 'lucide-react';
import { Lead } from '../../types';
import { clsx } from 'clsx';
import { format, isSameDay, parseISO, startOfDay, isValid } from 'date-fns';
import { useLeads } from '../../context/LeadsContext';

interface LeadCardProps {
    lead: Lead;
    onClick: (lead: Lead) => void;
    onStatusChange: (id: string, status: Lead['status']) => void;
}

export function LeadCard({ lead, onClick, onStatusChange }: LeadCardProps) {
    const { completeFollowup } = useLeads();

    const typeConfig = {
        hot: "bg-red-500 shadow-red-500/30",
        warm: "bg-amber-500 shadow-amber-500/30",
        cold: "bg-blue-500 shadow-blue-500/30",
    };

    const isMissed = (dateStr?: string) => {
        if (!dateStr) return false;
        const date = parseISO(dateStr);
        const today = startOfDay(new Date());
        return isValid(date) && startOfDay(date) < today && !isSameDay(date, today);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        const date = parseISO(dateStr);
        return isValid(date) ? format(date, 'MMM d') : 'N/A';
    };

    return (
        <div
            onClick={() => onClick(lead)}
            className="group relative flex cursor-pointer flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200"
        >
            <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2 w-full">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-black transition-colors truncate flex-1" title={lead.name}>{lead.name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 uppercase tracking-wider">{lead.leadOrigin}</span>
                        <div className={clsx(
                            "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm",
                            typeConfig[lead.leadType]
                        )}>
                            {lead.leadType}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-3">
                    <Phone size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-700">{lead.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-700">{lead.place || "None"}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Briefcase size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-700">{lead.designation || "None"}</span>
                </div>
                {lead.paymentStatus && (
                    <div className="flex items-center gap-3">
                        <CreditCard size={16} className={(lead.paymentStatus === 'Full Payment' || lead.paymentStatus === 'Advance Payment' || lead.paymentStatus === 'completed' || lead.paymentStatus === 'partial') ? "text-emerald-500" : "text-gray-400"} />
                        <span className={`px-2 py-0.5 rounded-sm capitalize font-bold text-xs tracking-wider ${(lead.paymentStatus === 'Full Payment' || lead.paymentStatus === 'Advance Payment' || lead.paymentStatus === 'completed' || lead.paymentStatus === 'partial') ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                            {lead.paymentStatus}
                        </span>
                    </div>
                )}
                {lead.carDetails && lead.carDetails.length > 0 && (
                    <div className="flex items-start gap-3">
                        <MessageSquare size={16} className="text-gray-400 mt-0.5" />
                        <div className="flex flex-col gap-1">
                            {lead.carDetails.map((c, idx) => {
                                if (c.intent === 'exchange') {
                                    return <span key={idx} className="text-xs">
                                        <span className="font-semibold text-[#1B1B19]">Exchange:</span> {c.ownedCar?.brandName} {c.ownedCar?.modelName} <span className="text-gray-400 font-bold mx-1">→</span> {c.wantedCar?.brandName} {c.wantedCar?.modelName}
                                    </span>;
                                }
                                if (c.intent === 'buying') {
                                    return <span key={idx} className="text-xs"><span className="font-semibold text-blue-600">Buy:</span> {c.wantedCar?.brandName || c.brandName} {c.wantedCar?.modelName || c.modelName}</span>;
                                }
                                return <span key={idx} className="text-xs"><span className="font-semibold text-amber-600">Sell:</span> {c.ownedCar?.brandName || c.brandName} {c.ownedCar?.modelName || c.modelName}</span>;
                            })}
                        </div>
                    </div>
                )}
                {lead.followupDate && (
                    <div className={clsx(
                        "flex items-center justify-between gap-3 p-2 rounded-lg border transition-all",
                        isMissed(lead.followupDate) ? "bg-red-50 border-red-100 text-red-700" : "bg-gray-50 border-gray-200 text-gray-700"
                    )}>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className={isMissed(lead.followupDate) ? "text-red-500" : "text-gray-400"} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{isMissed(lead.followupDate) ? 'Missed: ' : 'Next: '}{formatDate(lead.followupDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={(e) => { e.stopPropagation(); completeFollowup(lead._id, undefined, 'not_responded'); }}
                                className="p-1.5 rounded-md bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all border border-gray-100 shadow-sm"
                                title="Not Responded"
                            >
                                <X size={12} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); completeFollowup(lead._id, undefined, 'responded'); }}
                                className={clsx(
                                    "p-1.5 rounded-md text-white transition-all shadow-sm",
                                    isMissed(lead.followupDate) ? "bg-red-600 hover:bg-red-700" : "bg-[#1B1B19] hover:bg-black"
                                )}
                                title="Complete Follow-up"
                            >
                                <CheckCircle2 size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {lead.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-500 border border-gray-100">
                            <Tag size={10} />
                            {tag}
                        </span>
                    ))}
                    {lead.tags.length > 3 && <span className="text-[10px] text-gray-400">+{lead.tags.length - 3}</span>}
                </div>
            )}

            <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-gray-400 uppercase">Status</span>
                <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead._id, e.target.value as Lead['status'])}
                    className="rounded-lg border-0 bg-gray-50 py-1.5 pl-3 pr-8 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#1B1B19] sm:text-sm sm:leading-6"
                >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="booking_confirmed">Booking Confirmed</option>
                    <option value="deal_closed">Deal Closed</option>
                </select>
            </div>
        </div>
    );
}
