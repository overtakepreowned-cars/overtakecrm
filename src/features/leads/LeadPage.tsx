import { Phone, MapPin, Tag, Briefcase, History, Trash2, Edit3, User, Car, ArrowLeft, Calendar, CreditCard, CheckCircle2, X } from 'lucide-react';
import { format, isValid, startOfDay } from 'date-fns';
import { useLeads } from '../../context/LeadsContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LeadFormModal } from './LeadFormModal';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

export function LeadPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { leads, users, deleteLead, completeFollowup, updateLead } = useLeads();
    const [generalNote, setGeneralNote] = useState('');
    const [followupNoteInputPage, setFollowupNoteInputPage] = useState('');
    const [newFollowupDate, setNewFollowupDate] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleAddGeneralNote = async () => {
        if (!generalNote.trim() || !id) return;
        const currentLead = leads.find(l => l._id === id);
        if (!currentLead) return;
        
        const noteWithDateLine = `${format(new Date(), 'EEEE, do MMMM yyyy')} - ${generalNote.trim()}`;
        
        await updateLead(id, {
            notes: [...(currentLead.notes || []), noteWithDateLine]
        });
        setGeneralNote('');
    };

    const handleAddFollowupNotePage = async () => {
        if (!followupNoteInputPage.trim() || !id) return;
        const currentLead = leads.find(l => l._id === id);
        if (!currentLead) return;

        const noteWithDateLine = `${format(new Date(), 'EEEE, do MMMM yyyy')} - ${followupNoteInputPage.trim()}`;
        
        await updateLead(id, {
            followupNote: [...(currentLead.followupNote || []), noteWithDateLine]
        });
        setFollowupNoteInputPage('');
    };

    const handleAddFollowupNote = async (result: 'responded' | 'not_responded') => {
        if (!id) return;
        await completeFollowup(id, "", result);
    };

    const handleScheduleMeeting = async () => {
        if (!newFollowupDate || !id) return;
        await updateLead(id, {
            followupDate: newFollowupDate
        });
        setNewFollowupDate('');
    };

    const lead = leads.find(l => l._id === id);

    const onBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/contacts');
        }
    };

    const handleDelete = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (lead) {
            deleteLead(lead._id);
            onBack();
        }
    };

    const typeStyles = {
        hot: "bg-red-50 text-red-700 border-red-200",
        warm: "bg-amber-50 text-amber-700 border-amber-200",
        cold: "bg-blue-50 text-blue-700 border-blue-200",
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return isValid(date) ? format(date, 'MMM d, yyyy') : 'N/A';
    };

    const isMissed = (dateStr?: string) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = startOfDay(new Date());
        return isValid(date) && startOfDay(date) < today;
    };

    if (!leads.length) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B1B19]"></div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-gray-500 font-medium">Lead not found</p>
                <button
                    onClick={() => navigate('/contacts')}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900"
                >
                    <ArrowLeft size={16} />
                    Back to Contacts
                </button>
            </div>
        );
    }

    if (isEditModalOpen) {
        return (
            <div className="flex flex-col gap-6 w-full animate-fadeIn">
                <LeadFormModal
                    initialData={lead}
                    inline={true}
                    onClose={() => setIsEditModalOpen(false)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-fadeIn pb-10">
            {/* Header / Back Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900"
                >
                    <ArrowLeft size={16} />
                    Back to Contacts
                </button>
            </div>

            {/* Top Contact Header (CRM Style) */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center rounded-2xl border border-gray-200 bg-white shadow-sm p-6 gap-6 relative overflow-hidden shrink-0 min-h-[160px]">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B1B19]"></div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-bold text-[#1B1B19] shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-2xl font-bold text-gray-900 leading-none">{lead.name}</h2>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeStyles[lead.leadType]}`}>
                                {lead.leadType}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 py-0.5 border border-gray-200 bg-gray-50 rounded-md">
                                {lead.status.replace('_', ' ')}
                            </span>
                        </div>
                        {/* Contact Info Moved to Top */}
                        <div className="flex flex-wrap items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <Phone size={14} className="text-gray-400" />
                                <span className="text-sm font-medium">{lead.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <MapPin size={14} className="text-gray-400" />
                                <span className="text-sm font-medium">{lead.place || "None"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <Briefcase size={14} className="text-gray-400" />
                                <span className="text-sm font-medium">{lead.designation || "None"}</span>
                            </div>
                            {lead.paymentStatus && (
                                <div className="flex items-center gap-1.5 text-gray-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    <CreditCard size={14} className="text-emerald-500" />
                                    <span className="text-sm font-bold text-emerald-700">{lead.paymentStatus}</span>
                                </div>
                            )}
                            {lead.bookMethod && (
                                <div className="flex items-center gap-1.5 text-gray-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                    <CreditCard size={14} className="text-blue-500" />
                                    <span className="text-sm font-bold text-blue-700 uppercase tracking-tight">{lead.bookMethod}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                    <a
                        href={`tel:${lead.phone}`}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700"
                    >
                        <Phone size={16} />
                        Call Lead
                    </a>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#1B1B19] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-black"
                    >
                        <Edit3 size={16} />
                        Edit Lead
                    </button>
                    <button
                        onClick={handleDelete}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-100"
                    >
                        <Trash2 size={16} />
                        Delete
                    </button>
                </div>
            </div>

            {/* Main CRM Grid (2/3 + 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Area (Meta & Vehicle Preferences) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                        {/* About Lead Card */}
                        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3.5 flex items-center gap-2">
                                <User size={16} className="text-gray-500" />
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">About this Lead</h3>
                            </div>
                            <div className="flex flex-col p-5 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">Assigned Owner</span>
                                    <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gray-100 text-[#1B1B19] flex items-center justify-center text-[10px] font-bold border border-gray-200">
                                            {(typeof lead.assignedTo === 'object' ? lead.assignedTo?.username : 'U')?.charAt(0).toUpperCase()}
                                        </div>
                                        {typeof lead.assignedTo === 'object' ? lead.assignedTo?.username : 'Unassigned'}
                                    </div>
                                </div>
                                <div className="w-full h-px bg-gray-100"></div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">Lead Source / Origin</span>
                                    <div className="flex flex-col gap-2">
                                        <span className="font-medium text-sm text-gray-900 bg-gray-50 self-start px-2.5 py-1 rounded-md border border-gray-200">{lead.leadOrigin}</span>
                                        {lead.referredBy && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Referred By</span>
                                                <span className="font-bold text-sm text-indigo-600">{lead.referredBy}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full h-px bg-gray-100"></div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">Created Date</span>
                                    <span className="font-bold text-sm text-gray-900">{formatDate(lead.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tags Card */}
                        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3.5 flex items-center gap-2">
                                <Tag size={16} className="text-gray-500" />
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Tags</h3>
                            </div>
                            <div className="p-5">
                                {lead.tags && lead.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {lead.tags.map((tag, idx) => (
                                            <span key={idx} className="flex items-center gap-1.5 rounded-lg bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-100 border-dashed">
                                                {typeof tag === 'string' ? tag : tag.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-700 italic">No tags added yet.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Preferences */}
                    <div className="flex flex-col gap-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden shrink-0">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
                            <Car size={18} className="text-gray-500" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Vehicle Preferences</h3>
                        </div>
                        <div className="p-6 bg-gray-50/30">
                            {lead.carDetails && lead.carDetails.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {lead.carDetails.map((car, idx) => (
                                        <div key={idx} className="flex flex-col gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                            {/* Top corner intent label */}
                                            <div className="absolute top-0 right-0">
                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-bl-lg ${car.intent === 'buying' ? 'bg-blue-50 text-blue-700 border-b border-l border-blue-100' :
                                                    car.intent === 'selling' ? 'bg-amber-50 text-amber-700 border-b border-l border-amber-100' :
                                                        'bg-indigo-50 text-indigo-700 border-b border-l border-indigo-100'
                                                    }`}>
                                                    {car.intent === 'buying' ? 'Wants to Buy' : car.intent === 'selling' ? 'Wants to Sell' : 'Exchange'}
                                                </span>
                                            </div>

                                            <div className="flex items-start gap-4 mt-2">
                                                {/* Left side: Icon */}
                                                <div className={`p-3 rounded-xl flex-shrink-0 mt-1 ${car.intent === 'buying' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                                                    car.intent === 'selling' ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                                                        'bg-indigo-50 text-indigo-500 border border-indigo-100'
                                                    }`}>
                                                    <Car size={24} />
                                                </div>

                                                <div className="flex flex-col gap-3 w-full pr-16 mt-1">

                                                    {/* EXCHANGE LAYOUT */}
                                                    {car.intent === 'exchange' && (
                                                        <div className="flex flex-col gap-3">
                                                            {/* Trading In */}
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1">Trading In:</span>
                                                                <div className="font-bold text-gray-900 text-base">{car.ownedCar?.brandName} {car.ownedCar?.modelName}</div>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600 font-medium">
                                                                    {car.ownedCar?.fuelType && <span className="bg-gray-100 px-2 py-0.5 rounded-md">{car.ownedCar.fuelType}</span>}
                                                                    {car.ownedCar?.kmDriven && <span className="bg-gray-100 px-2 py-0.5 rounded-md">{car.ownedCar.kmDriven} km</span>}
                                                                    {car.ownedCar?.year && <span className="bg-gray-100 px-2 py-0.5 rounded-md">{car.ownedCar.year}</span>}
                                                                    {car.ownedCar?.amount && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">₹{car.ownedCar.amount}</span>}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 text-indigo-400 my-1">
                                                                <div className="h-px bg-indigo-100 flex-1"></div>
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">For</span>
                                                                <div className="h-px bg-indigo-100 flex-1"></div>
                                                            </div>

                                                            {/* Buying */}
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1">Looking For:</span>
                                                                <div className="font-bold text-blue-900 text-base">{car.wantedCar?.brandName} {car.wantedCar?.modelName}</div>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-blue-700 font-medium">
                                                                    {car.wantedCar?.fuelType && <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{car.wantedCar.fuelType}</span>}
                                                                    {car.wantedCar?.kmDriven && <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{car.wantedCar.kmDriven} km</span>}
                                                                    {car.wantedCar?.year && <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{car.wantedCar.year}</span>}
                                                                    {car.wantedCar?.amount && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">₹{car.wantedCar.amount}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* BUYING LAYOUT */}
                                                    {car.intent === 'buying' && (
                                                        <div className="flex flex-col">
                                                            <div className="font-bold text-blue-900 text-lg">{car.wantedCar?.brandName || car.brandName} {car.wantedCar?.modelName || car.modelName}</div>
                                                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-blue-700 font-medium">
                                                                {(car.wantedCar?.fuelType || car.fuelType) && <span className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100">Fuel: <span className="font-bold text-blue-900">{car.wantedCar?.fuelType || car.fuelType}</span></span>}
                                                                {(car.wantedCar?.kmDriven) && <span className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100">KM: <span className="font-bold text-blue-900">{car.wantedCar.kmDriven}</span></span>}
                                                                {(car.wantedCar?.year) && <span className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100">Year: <span className="font-bold text-blue-900">{car.wantedCar.year}</span></span>}
                                                                {(car.wantedCar?.amount) && <span className="bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Budget: <span className="font-bold text-emerald-700">₹{car.wantedCar.amount}</span></span>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* SELLING LAYOUT */}
                                                    {car.intent === 'selling' && (
                                                        <div className="flex flex-col">
                                                            <div className="font-bold text-amber-900 text-lg">{car.ownedCar?.brandName || car.brandName} {car.ownedCar?.modelName || car.modelName}</div>
                                                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-amber-700 font-medium">
                                                                {(car.ownedCar?.fuelType || car.fuelType) && <span className="bg-amber-50 px-2 py-1 rounded-md border border-amber-100">Fuel: <span className="font-bold text-amber-900">{car.ownedCar?.fuelType || car.fuelType}</span></span>}
                                                                {(car.ownedCar?.kmDriven || car.kmDriven) && <span className="bg-amber-50 px-2 py-1 rounded-md border border-amber-100">KM: <span className="font-bold text-amber-900">{car.ownedCar?.kmDriven || car.kmDriven}</span></span>}
                                                                {(car.ownedCar?.year) && <span className="bg-amber-50 px-2 py-1 rounded-md border border-amber-100">Year: <span className="font-bold text-amber-900">{car.ownedCar.year}</span></span>}
                                                                {(car.ownedCar?.amount) && <span className="bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Price: <span className="font-bold text-emerald-700">₹{car.ownedCar.amount}</span></span>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Additional Requirements */}
                                                    {car.additionalReqs && (
                                                        <div className="mt-3 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3 bg-gray-50/50 py-2 pr-2 rounded-r-lg">
                                                            "{car.additionalReqs}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 italic py-8 bg-white rounded-xl border border-dashed border-gray-200 text-center">
                                    No vehicle preferences specified for this lead.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Area (Notes, Follow-ups, History) */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    {/* General Notes */}
                    <div className="flex flex-col gap-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden shrink-0">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">General Notes</h3>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <textarea
                                    value={generalNote}
                                    onChange={(e) => setGeneralNote(e.target.value)}
                                    placeholder="Type a general note about this lead..."
                                    className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#1B1B19]/10 focus:border-[#1B1B19] outline-none transition-all resize-none"
                                />
                                <button
                                    onClick={handleAddGeneralNote}
                                    disabled={!generalNote.trim()}
                                    className="self-end px-4 py-2 bg-[#1B1B19] text-white text-xs font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    Add General Note
                                </button>
                            </div>

                            {lead.notes && lead.notes.length > 0 && (
                                <div className="flex flex-col gap-4 mt-2">
                                    {lead.notes.map((note, idx) => (
                                        <div key={idx} className="rounded-xl bg-blue-50/30 p-5 text-sm text-gray-800 border border-blue-100 shadow-sm relative">
                                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-300 rounded-l-xl"></div>
                                            <p className="leading-relaxed pl-2 whitespace-pre-wrap">{note}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Follow-up Activity & Notes */}
                    <div className="flex flex-col gap-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden shrink-0">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
                            <History size={18} className="text-gray-500" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Activity & Follow-ups</h3>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                <div className={`flex flex-col gap-4 p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow relative ${isMissed(lead.followupDate) ? 'bg-red-50 border-red-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isMissed(lead.followupDate) ? 'text-red-500' : 'text-indigo-500'}`}>Next Scheduled Follow-up</span>
                                        {isMissed(lead.followupDate) && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">Missed</span>}
                                    </div>
                                    
                                    <div className="flex flex-col gap-3">
                                        <div className={`flex items-center gap-2 ${isMissed(lead.followupDate) ? 'text-red-900' : 'text-indigo-900'}`}>
                                            <Calendar size={20} className={isMissed(lead.followupDate) ? 'text-red-600' : 'text-indigo-600'} />
                                            <span className="font-bold text-xl">{formatDate(lead.followupDate)}</span>
                                        </div>

                                        {/* Schedule Meeting / Reschedule */}
                                        {!lead.followupDate && (
                                            <div className="flex flex-col gap-2 pt-2 border-t border-indigo-100/50 mt-1">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Schedule New Meeting</span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        value={newFollowupDate}
                                                        onChange={(e) => setNewFollowupDate(e.target.value)}
                                                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#1B1B19]/10 focus:border-[#1B1B19] outline-none transition-all shadow-sm"
                                                    />
                                                    <button
                                                        onClick={handleScheduleMeeting}
                                                        disabled={!newFollowupDate}
                                                        className="px-3 py-1.5 bg-[#1B1B19] text-white text-[10px] font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm uppercase tracking-tighter"
                                                    >
                                                        Schedule
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Total Interactions</span>
                                    <div className="flex items-center gap-2 text-emerald-900">
                                        <History size={20} className="text-emerald-600" />
                                        <span className="font-bold text-xl">{lead.followupCount} interactions</span>
                                    </div>
                                </div>
                            </div>

                            {/* Follow-up Note & Action */}
                            {lead.followupDate && (
                                <div className="flex flex-col gap-3 p-5 bg-amber-50/30 rounded-xl border border-amber-100 shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Complete Follow-up Action</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAddFollowupNote('responded')}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-[#1B1B19] text-white hover:bg-black transition-all shadow-sm uppercase"
                                        >
                                            <CheckCircle2 size={14} /> Responded
                                        </button>
                                        <button
                                            onClick={() => handleAddFollowupNote('not_responded')}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all shadow-sm uppercase"
                                        >
                                            <X size={14} /> Not Responded
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Standalone Follow-up Note Input */}
                            <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
                                <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <textarea
                                        value={followupNoteInputPage}
                                        onChange={(e) => setFollowupNoteInputPage(e.target.value)}
                                        placeholder="Type a follow-up note without changing status..."
                                        className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#1B1B19]/10 focus:border-[#1B1B19] outline-none transition-all resize-none"
                                    />
                                    <button
                                        onClick={handleAddFollowupNotePage}
                                        disabled={!followupNoteInputPage.trim()}
                                        className="self-end px-4 py-2 bg-[#1B1B19] text-white text-xs font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        Add Follow-up Note
                                    </button>
                                </div>
                            </div>

                            {/* Follow-up History */}
                            {lead.followupHistory && lead.followupHistory.length > 0 && (
                                <div className="flex flex-col gap-3 mt-2">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Follow-up History</h4>
                                    <div className="flex flex-col gap-3">
                                        {[...lead.followupHistory].reverse().map((record, idx) => (
                                            <div key={idx} className={`rounded-xl p-4 text-sm border shadow-sm relative ${record.wasMissed ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
                                                <div className={`absolute top-0 left-0 bottom-0 w-1 ${record.wasMissed ? 'bg-red-400' : 'bg-gray-300'} rounded-l-xl`}></div>
                                                <div className="flex flex-col gap-1 pl-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase text-gray-700">
                                                            {record.result === 'rescheduled' ? 'Rescheduled' : `Scheduled: ${formatDate(record.scheduledDate)}`}
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase ${record.result === 'not_responded' ? 'text-orange-500' : record.result === 'rescheduled' ? 'text-blue-500' : record.wasMissed ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {record.result === 'not_responded' ? 'Not Responded' : record.result === 'rescheduled' ? 'Rescheduled' : record.wasMissed ? 'Completed Late' : 'Completed On Time'}
                                                        </span>
                                                    </div>
                                                    {record.result === 'rescheduled' ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 text-gray-900 font-bold">
                                                                <span className="text-gray-700 line-through text-xs">{formatDate(record.scheduledDate)}</span>
                                                                <span className="text-gray-700 text-[10px]">→</span>
                                                                <span>{formatDate(record.newScheduledDate)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-gray-700 italic">Changed on: {formatDate(record.completedDate)}</span>
                                                                {record.userId && (
                                                                    <span className="text-[10px] text-indigo-400 font-medium italic">by {users.find(u => u._id === record.userId)?.username || 'Unknown'}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-gray-900">Completed on: {formatDate(record.completedDate)}</span>
                                                            {record.userId && (
                                                                <span className="text-[10px] text-indigo-400 font-medium italic">by {users.find(u => u._id === record.userId)?.username || 'Unknown'}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {record.note && <p className="text-xs text-gray-600 mt-1 italic">"{record.note}"</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {lead.followupNote && lead.followupNote.length > 0 && (
                                <div className="flex flex-col gap-3 mt-2">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Follow-up Notes</h4>
                                    <div className="flex flex-col gap-3">
                                        {lead.followupNote.map((note, idx) => (
                                            <div key={idx} className="rounded-xl bg-amber-50/50 p-5 text-sm text-gray-800 border border-amber-200/50 shadow-sm relative">
                                                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-400 rounded-l-xl"></div>
                                                <p className="leading-relaxed pl-2 whitespace-pre-wrap">{note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assignment History */}
                    {lead.assignmentHistory && lead.assignmentHistory.length > 0 && (
                        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden shrink-0">
                            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3.5 flex items-center gap-2">
                                <History size={16} className="text-gray-500" />
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Assignment History</h3>
                            </div>
                            <div className="p-5">
                                <div className="flex flex-col gap-0 border-l-2 border-indigo-100 ml-2">
                                    {lead.assignmentHistory.map((record, idx) => (
                                        <div key={idx} className="relative pl-5 pb-6 last:pb-0">
                                            <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-[#1B1B19] ring-4 ring-white"></div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 text-sm leading-none">{record.userId?.username || 'Unknown User'}</span>
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mt-1.5">{formatDate(record.assignedAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Contact"
                message={`Are you sure you want to permanently delete "${lead.name}"? This action cannot be undone.`}
            />
        </div>
    );
}
