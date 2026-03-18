import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../../context/LeadsContext';
import { Search, Filter, X, Briefcase, Bookmark, MoreHorizontal, Trash2, UserPlus, CheckCircle2, Phone, Car, Edit3, Save, User as UserIcon, AlertTriangle } from 'lucide-react';
import { isSameDay, parseISO, format } from 'date-fns';
import { Lead, CarDetail, ApiLeadEditData, LeadFilter } from '../../types';
import { TagInput } from '../../components/TagInput';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

interface LeadListProps {
    initialFilter?: 'all' | 'followup';
}

export function LeadList({ initialFilter = 'all' }: LeadListProps) {
    const { leads, apiLeads, addSmartList, users, deleteApiLead, approveApiLead, updateApiLead, bulkDeleteLeads, bulkAssignLeads, bulkUpdateLeads, smartLists, deleteSmartList } = useLeads();

    const [currentMode, setCurrentMode] = useState<'all' | 'followup' | 'smartlist' | 'apileads'>(initialFilter);
    const [activeSmartListId, setActiveSmartListId] = useState<string | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [nameFilter, setNameFilter] = useState('');
    const [phoneFilter, setPhoneFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [leadTypeFilter, setLeadTypeFilter] = useState('all');
    const [leadOriginFilter, setLeadOriginFilter] = useState('all');
    const [placeFilter, setPlaceFilter] = useState('');
    const [designationFilter, setDesignationFilter] = useState('');
    const [tagFilterTags, setTagFilterTags] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState('');
    const [assignedToFilter, setAssignedToFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
    const [intentFilter, setIntentFilter] = useState('all');
    const [brandFilter, setBrandFilter] = useState('');
    const [modelFilter, setModelFilter] = useState('');
    const [fuelTypeFilter, setFuelTypeFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState('');
    const [kmDrivenFilter, setKmDrivenFilter] = useState('');
    const [kmDrivenOp, setKmDrivenOp] = useState<'eq' | 'gt' | 'lt'>('eq');
    const [amountFilter, setAmountFilter] = useState('');
    const [amountOp, setAmountOp] = useState<'eq' | 'gt' | 'lt'>('eq');

    const [placeFocused, setPlaceFocused] = useState(false);
    const [designationFocused, setDesignationFocused] = useState(false);
    const [brandFilterFocused, setBrandFilterFocused] = useState(false);
    const [modelFilterFocused, setModelFilterFocused] = useState(false);

    const [isSmartListModalOpen, setIsSmartListModalOpen] = useState(false);
    const [smartListName, setSmartListName] = useState('');

    const navigate = useNavigate();
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showBulkAssignPanel, setShowBulkAssignPanel] = useState(false);
    const [showBulkUpdatePanel, setShowBulkUpdatePanel] = useState(false);
    const [bulkUpdateType, setBulkUpdateType] = useState<'status' | 'type' | 'tags' | 'date' | null>(null);
    const [bulkTagUpdateType, setBulkTagUpdateType] = useState<'add' | 'remove'>('add');
    const [bulkTags, setBulkTags] = useState<string[]>([]);

    // Inline edit state for API lead cards
    const [editingApiLeadId, setEditingApiLeadId] = useState<string | null>(null);
    const [editData, setEditData] = useState<ApiLeadEditData>({});
    const [editFocus, setEditFocus] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const closeDeleteModal = () => setDeleteModal(prev => ({ ...prev, isOpen: false }));

    const startEditApiLead = (lead: Lead) => {
        setEditingApiLeadId(lead._id);
        setEditData({
            name: lead.name || '',
            phone: lead.phone || '',
            place: lead.place || '',
            designation: lead.designation || '',
            leadOrigin: lead.leadOrigin || '',
            assignedTo: typeof lead.assignedTo === 'object' ? lead.assignedTo?._id || '' : lead.assignedTo || '',
            carDetails: lead.carDetails?.map((c: CarDetail) => ({
                intent: c.intent || 'buying',
                wantedCar: { brandName: c.wantedCar?.brandName || '', modelName: c.wantedCar?.modelName || '', fuelType: c.wantedCar?.fuelType || 'petrol', kmDriven: c.wantedCar?.kmDriven || '' },
                ownedCar: { brandName: c.ownedCar?.brandName || '', modelName: c.ownedCar?.modelName || '', fuelType: c.ownedCar?.fuelType || 'petrol', kmDriven: c.ownedCar?.kmDriven || '', year: c.ownedCar?.year || '' },
                additionalReqs: c.additionalReqs || ''
            })) || [],
        });
    };

    const cancelEditApiLead = () => {
        setEditingApiLeadId(null);
        setEditData({});
        setEditFocus(null);
    };

    const saveEditApiLead = async () => {
        if (!editingApiLeadId) return;
        await updateApiLead(editingApiLeadId, editData);
        setEditingApiLeadId(null);
        setEditData({});
        setEditFocus(null);
    };

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Get unique tags from all leads for suggestions
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        leads.forEach(l => l.tags?.forEach(t => tags.add(t)));
        return Array.from(tags);
    }, [leads]);

    const availablePlaces = useMemo(() => {
        const places = new Set<string>();
        leads.forEach(l => {
            if (l.place) places.add(l.place);
        });
        return Array.from(places);
    }, [leads]);

    const availableDesignations = useMemo(() => {
        const designations = new Set<string>();
        leads.forEach(l => {
            if (l.designation) designations.add(l.designation);
        });
        return Array.from(designations);
    }, [leads]);

    const availableBrandNames = useMemo(() => {
        const brands = new Set<string>();
        leads.forEach(l => {
            l.carDetails?.forEach(c => {
                if (c.brandName) brands.add(c.brandName);
                if (c.wantedCar?.brandName) brands.add(c.wantedCar.brandName);
                if (c.ownedCar?.brandName) brands.add(c.ownedCar.brandName);
            });
        });
        return Array.from(brands);
    }, [leads]);

    const availableModelNames = useMemo(() => {
        const models = new Set<string>();
        leads.forEach(l => {
            l.carDetails?.forEach(c => {
                if (c.modelName) models.add(c.modelName);
                if (c.wantedCar?.modelName) models.add(c.wantedCar.modelName);
                if (c.ownedCar?.modelName) models.add(c.ownedCar.modelName);
            });
        });
        return Array.from(models);
    }, [leads]);

    // Apply filters
    const filteredLeads = useMemo(() => {
        const activeSmartList = smartLists.find(l => l._id === activeSmartListId);
        const smartListFilter = activeSmartList?.filters;

        if (currentMode === 'apileads') {
            return apiLeads.filter(lead => {
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                        lead.name.toLowerCase().includes(searchLower) ||
                        lead.phone.includes(searchLower) ||
                        (lead.place && lead.place.toLowerCase().includes(searchLower))
                    );
                }
                return true;
            });
        }

        return leads.filter(lead => {
            // Priority: Quick Search
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return (
                    lead.name.toLowerCase().includes(searchLower) ||
                    lead.phone.includes(searchLower) ||
                    (lead.place && lead.place.toLowerCase().includes(searchLower)) ||
                    lead.tags.some(t => t.toLowerCase().includes(searchLower)) ||
                    lead.carDetails?.some(c => `${c.brandName} ${c.modelName}`.toLowerCase().includes(searchLower))
                );
            }

            // Mode: Follow-up
            if (currentMode === 'followup') {
                if (!lead.followupDate) return false;
                const today = new Date();
                const leadDate = parseISO(lead.followupDate as string);
                if (!isSameDay(today, leadDate)) return false;
            }

            // Mode: Smart List (Saved Filters)
            if (currentMode === 'smartlist' && smartListFilter) {
                if (smartListFilter.selectedIds && smartListFilter.selectedIds.length > 0) {
                    if (!smartListFilter.selectedIds.includes(lead._id)) return false;
                }
                if (smartListFilter.name && !lead.name.toLowerCase().includes(smartListFilter.name.toLowerCase())) return false;
                if (smartListFilter.phone && !lead.phone.includes(smartListFilter.phone)) return false;
                if (smartListFilter.place && (!lead.place || !lead.place.toLowerCase().includes(smartListFilter.place.toLowerCase()))) return false;
                if (smartListFilter.designation && (!lead.designation || !lead.designation.toLowerCase().includes(smartListFilter.designation.toLowerCase()))) return false;
                if (smartListFilter.tag && !lead.tags.some(t => t.toLowerCase().includes(smartListFilter.tag!.toLowerCase()))) return false;
                if (smartListFilter.status && smartListFilter.status !== 'all' && lead.status !== smartListFilter.status) return false;
                if (smartListFilter.leadType && smartListFilter.leadType !== 'all' && lead.leadType !== smartListFilter.leadType) return false;
                if (smartListFilter.leadOrigin && smartListFilter.leadOrigin !== 'all' && lead.leadOrigin !== smartListFilter.leadOrigin) return false;

                if (smartListFilter.paymentStatus && lead.paymentStatus !== smartListFilter.paymentStatus) return false;

                // Car / intent based filters for smart lists
                if (
                    smartListFilter.intent ||
                    smartListFilter.brandName ||
                    smartListFilter.modelName ||
                    smartListFilter.fuelType ||
                    smartListFilter.year ||
                    smartListFilter.kmDrivenValue ||
                    smartListFilter.amountValue
                ) {
                    if (!lead.carDetails || lead.carDetails.length === 0) return false;

                    const matchesCarFilters = lead.carDetails.some(car => {
                        // Intent
                        if (smartListFilter.intent && smartListFilter.intent !== 'all' && car.intent !== smartListFilter.intent) {
                            return false;
                        }

                        const brandTerm = smartListFilter.brandName?.toLowerCase().trim();
                        if (brandTerm) {
                            const brandCandidates = [
                                car.brandName,
                                car.wantedCar?.brandName,
                                car.ownedCar?.brandName
                            ].filter(Boolean).map(v => (v as string).toLowerCase());

                            if (!brandCandidates.some(b => b.includes(brandTerm))) {
                                return false;
                            }
                        }

                        const modelTerm = smartListFilter.modelName?.toLowerCase().trim();
                        if (modelTerm) {
                            const modelCandidates = [
                                car.modelName,
                                car.wantedCar?.modelName,
                                car.ownedCar?.modelName
                            ].filter(Boolean).map(v => (v as string).toLowerCase());

                            if (!modelCandidates.some(m => m.includes(modelTerm))) {
                                return false;
                            }
                        }

                        const fuelFilter = smartListFilter.fuelType?.trim();
                        if (fuelFilter) {
                            const fuelCandidates = [
                                car.fuelType,
                                car.wantedCar?.fuelType,
                                car.ownedCar?.fuelType
                            ].filter(Boolean);

                            if (!fuelCandidates.some(f => f === fuelFilter)) {
                                return false;
                            }
                        }

                        const yearFilterValue = smartListFilter.year?.trim();
                        if (yearFilterValue) {
                            const yearCandidates = [
                                car.wantedCar?.year,
                                car.ownedCar?.year
                            ].filter(Boolean);

                            if (!yearCandidates.some(y => y === yearFilterValue)) {
                                return false;
                            }
                        }

                        const kmValue = smartListFilter.kmDrivenValue?.trim();
                        if (kmValue) {
                            const target = Number(kmValue);
                            if (!Number.isFinite(target)) return false;

                            const kmCandidates = [
                                car.kmDriven,
                                car.wantedCar?.kmDriven,
                                car.ownedCar?.kmDriven
                            ]
                                .map(v => (v ? Number(v) : NaN))
                                .filter(v => Number.isFinite(v));

                            if (kmCandidates.length === 0) return false;

                            const op = smartListFilter.kmDrivenOp || 'eq';
                            const kmMatches = kmCandidates.some(v => {
                                if (op === 'gt') return v > target;
                                if (op === 'lt') return v < target;
                                return v === target;
                            });

                            if (!kmMatches) return false;
                        }

                        const amountValue = smartListFilter.amountValue?.trim();
                        if (amountValue) {
                            const target = Number(amountValue);
                            if (!Number.isFinite(target)) return false;

                            const amountCandidates = [
                                car.wantedCar?.amount,
                                car.ownedCar?.amount
                            ]
                                .map(v => (v ? Number(v) : NaN))
                                .filter(v => Number.isFinite(v));

                            if (amountCandidates.length === 0) return false;

                            const op = smartListFilter.amountOp || 'eq';
                            const amountMatches = amountCandidates.some(v => {
                                if (op === 'gt') return v > target;
                                if (op === 'lt') return v < target;
                                return v === target;
                            });

                            if (!amountMatches) return false;
                        }

                        return true;
                    });

                    if (!matchesCarFilters) return false;
                }

                if (smartListFilter.assignedTo && smartListFilter.assignedTo !== 'all') {
                    const leadAssignedId = typeof lead.assignedTo === 'object' ? lead.assignedTo?._id : lead.assignedTo;
                    if (smartListFilter.assignedTo === 'unassigned') {
                        if (leadAssignedId) return false;
                    } else if (leadAssignedId !== smartListFilter.assignedTo) {
                        return false;
                    }
                }
            }

            // Ad-hoc Filters (Local state)
            if (nameFilter && !lead.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
            if (phoneFilter && !lead.phone.includes(phoneFilter)) return false;
            if (placeFilter && (!lead.place || !lead.place.toLowerCase().includes(placeFilter.toLowerCase()))) return false;
            if (designationFilter && (!lead.designation || !lead.designation.toLowerCase().includes(designationFilter.toLowerCase()))) return false;
            if (tagFilterTags.length > 0) {
                const leadTagsLower = lead.tags.map(t => t.toLowerCase());
                const selectedLower = tagFilterTags.map(t => t.toLowerCase());
                const hasMatch = selectedLower.some(sel => leadTagsLower.includes(sel));
                if (!hasMatch) return false;
            }
            if (leadOriginFilter !== 'all' && lead.leadOrigin !== leadOriginFilter) return false;

            if (paymentStatusFilter !== 'all' && lead.paymentStatus !== paymentStatusFilter) return false;

            // Ad-hoc car / intent filters
            if (
                intentFilter !== 'all' ||
                brandFilter ||
                modelFilter ||
                (fuelTypeFilter !== 'all' && fuelTypeFilter) ||
                yearFilter ||
                kmDrivenFilter ||
                amountFilter
            ) {
                if (!lead.carDetails || lead.carDetails.length === 0) return false;

                const matchesCarFilters = lead.carDetails.some(car => {
                    if (intentFilter !== 'all' && car.intent !== intentFilter) {
                        return false;
                    }

                    const brandTerm = brandFilter.toLowerCase().trim();
                    if (brandTerm) {
                        const brandCandidates = [
                            car.brandName,
                            car.wantedCar?.brandName,
                            car.ownedCar?.brandName
                        ].filter(Boolean).map(v => (v as string).toLowerCase());

                        if (!brandCandidates.some(b => b.includes(brandTerm))) {
                            return false;
                        }
                    }

                    const modelTerm = modelFilter.toLowerCase().trim();
                    if (modelTerm) {
                        const modelCandidates = [
                            car.modelName,
                            car.wantedCar?.modelName,
                            car.ownedCar?.modelName
                        ].filter(Boolean).map(v => (v as string).toLowerCase());

                        if (!modelCandidates.some(m => m.includes(modelTerm))) {
                            return false;
                        }
                    }

                    if (fuelTypeFilter !== 'all' && fuelTypeFilter) {
                        const fuelCandidates = [
                            car.fuelType,
                            car.wantedCar?.fuelType,
                            car.ownedCar?.fuelType
                        ].filter(Boolean);

                        if (!fuelCandidates.some(f => f === fuelTypeFilter)) {
                            return false;
                        }
                    }

                    const yearTerm = yearFilter.trim();
                    if (yearTerm) {
                        const yearCandidates = [
                            car.wantedCar?.year,
                            car.ownedCar?.year
                        ].filter(Boolean);

                        if (!yearCandidates.some(y => y === yearTerm)) {
                            return false;
                        }
                    }

                    const kmTerm = kmDrivenFilter.trim();
                    if (kmTerm) {
                        const target = Number(kmTerm);
                        if (!Number.isFinite(target)) return false;

                        const kmCandidates = [
                            car.kmDriven,
                            car.wantedCar?.kmDriven,
                            car.ownedCar?.kmDriven
                        ]
                            .map(v => (v ? Number(v) : NaN))
                            .filter(v => Number.isFinite(v));

                        if (kmCandidates.length === 0) return false;

                        const kmMatches = kmCandidates.some(v => {
                            if (kmDrivenOp === 'gt') return v > target;
                            if (kmDrivenOp === 'lt') return v < target;
                            return v === target;
                        });

                        if (!kmMatches) return false;
                    }

                    const amountTerm = amountFilter.trim();
                    if (amountTerm) {
                        const target = Number(amountTerm);
                        if (!Number.isFinite(target)) return false;

                        const amountCandidates = [
                            car.wantedCar?.amount,
                            car.ownedCar?.amount
                        ]
                            .map(v => (v ? Number(v) : NaN))
                            .filter(v => Number.isFinite(v));

                        if (amountCandidates.length === 0) return false;

                        const amountMatches = amountCandidates.some(v => {
                            if (amountOp === 'gt') return v > target;
                            if (amountOp === 'lt') return v < target;
                            return v === target;
                        });

                        if (!amountMatches) return false;
                    }

                    return true;
                });

                if (!matchesCarFilters) return false;
            }

            if (assignedToFilter !== 'all') {
                const leadAssignedId = typeof lead.assignedTo === 'object' ? lead.assignedTo?._id : lead.assignedTo;
                if (assignedToFilter === 'unassigned') {
                    if (leadAssignedId) return false;
                } else if (leadAssignedId !== assignedToFilter) {
                    return false;
                }
            }

            if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
            if (leadTypeFilter !== 'all' && lead.leadType !== leadTypeFilter) return false;
            if (dateFilter && currentMode === 'all' && lead.followupDate?.split('T')[0] !== dateFilter) return false;

            return true;
        });
    }, [leads, apiLeads, currentMode, activeSmartListId, smartLists, searchTerm, nameFilter, phoneFilter, placeFilter, designationFilter, tagFilterTags, dateFilter, statusFilter, leadTypeFilter, leadOriginFilter, assignedToFilter, paymentStatusFilter, intentFilter, brandFilter, modelFilter, fuelTypeFilter, yearFilter, kmDrivenFilter, kmDrivenOp, amountFilter, amountOp]);

    // Reset pagination when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, nameFilter, phoneFilter, placeFilter, designationFilter, tagFilterTags, dateFilter, statusFilter, leadTypeFilter, leadOriginFilter, assignedToFilter, paymentStatusFilter, intentFilter, brandFilter, modelFilter, fuelTypeFilter, yearFilter, kmDrivenFilter, kmDrivenOp, amountFilter, amountOp, currentMode, activeSmartListId, pageSize]);

    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredLeads.slice(startIndex, startIndex + pageSize);
    }, [filteredLeads, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredLeads.length / pageSize);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredLeads.map(l => l._id!));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectLead = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        setDeleteModal({
            isOpen: true,
            title: 'Bulk Delete Contacts',
            message: `You are about to permanently delete ${selectedIds.length} contacts. This action cannot be undone.`,
            onConfirm: async () => {
                await bulkDeleteLeads(selectedIds);
                setSelectedIds([]);
            }
        });
    };

    const handleBulkAssign = async (userId: string) => {
        await bulkAssignLeads(selectedIds, userId);
        setSelectedIds([]);
        setShowBulkAssignPanel(false);
    };

    const handleSaveSmartList = () => {
        if (!smartListName) return;
        addSmartList({
            name: smartListName,
            filters: {
                name: nameFilter,
                phone: phoneFilter,
                place: placeFilter,
                designation: designationFilter,
                tag: tagFilterTags[0],
                status: statusFilter,
                leadType: leadTypeFilter as LeadFilter['leadType'],
                leadOrigin: leadOriginFilter as LeadFilter['leadOrigin'],
                assignedTo: assignedToFilter,
                selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
                paymentStatus: (paymentStatusFilter === 'all' ? '' : paymentStatusFilter) as 'Advance Payment' | 'Full Payment' | '',
                intent: intentFilter as LeadFilter['intent'],
                brandName: brandFilter,
                modelName: modelFilter,
                fuelType: fuelTypeFilter === 'all' ? '' : fuelTypeFilter,
                year: yearFilter,
                kmDrivenValue: kmDrivenFilter,
                kmDrivenOp,
                amountValue: amountFilter,
                amountOp
            }
        });
        setIsSmartListModalOpen(false);
        setSmartListName('');
    };

    const hasActiveFilters =
        searchTerm ||
        nameFilter ||
        phoneFilter ||
        placeFilter ||
        designationFilter ||
        tagFilterTags.length > 0 ||
        dateFilter ||
        statusFilter !== 'all' ||
        leadTypeFilter !== 'all' ||
        leadOriginFilter !== 'all' ||
        assignedToFilter !== 'all' ||
        paymentStatusFilter !== 'all' ||
        intentFilter !== 'all' ||
        !!brandFilter ||
        !!modelFilter ||
        (fuelTypeFilter !== 'all' && !!fuelTypeFilter) ||
        !!yearFilter ||
        !!kmDrivenFilter ||
        !!amountFilter;


    return (
        <div className="flex w-full flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Button Navigation */}
            <div className="flex items-center gap-3 border-b border-gray-100 p-4 bg-white overflow-x-auto no-scrollbar">
                <button
                    onClick={() => { setCurrentMode('all'); setActiveSmartListId(null); }}
                    className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all border ${currentMode === 'all'
                        ? 'bg-[#1B1B19] border-[#1B1B19] text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    All Contacts
                </button>
                {smartLists.map(list => (
                    <div key={list._id} className="relative group">
                        <button
                            onClick={() => { setCurrentMode('smartlist'); setActiveSmartListId(list._id!); }}
                            className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all flex items-center gap-2 border ${currentMode === 'smartlist' && activeSmartListId === list._id
                                ? 'bg-[#1B1B19] border-[#1B1B19] text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            {list.name}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (list._id) {
                                    setDeleteModal({
                                        isOpen: true,
                                        title: 'Delete Smart List',
                                        message: `Are you sure you want to delete the smart list "${list.name}"?`,
                                        onConfirm: () => deleteSmartList(list._id!)
                                    });
                                }
                            }}
                            className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 bg-red-500 text-white rounded-full items-center justify-center text-[10px] shadow-sm z-10"
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
                {/* Automation New Lead Toggle (aligned to the right) */}
                <button
                    onClick={() => { setCurrentMode('apileads'); setActiveSmartListId(null); }}
                    className={`ml-auto px-4 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition-all border shadow-sm ${currentMode === 'apileads'
                        ? 'bg-[#1B1B19] border-[#1B1B19] text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Automation New Lead
                    {apiLeads.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${currentMode === 'apileads' ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>
                            {apiLeads.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-4 p-4 border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-500">
                        Total Contacts: <span className="text-indigo-600">{filteredLeads.length}</span>
                        {selectedIds.length > 0 && <span className="ml-2 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs">{selectedIds.length} Selected</span>}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 max-w-lg">
                        {currentMode !== 'apileads' && (
                            <>
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Quick search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`p-2 rounded-lg border transition-all ${showAdvancedFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <Filter size={20} />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && currentMode !== 'apileads' && (
                            <button
                                onClick={() => setIsSmartListModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-all border border-indigo-100 mr-2"
                            >
                                <Bookmark size={16} /> Save Selection
                            </button>
                        )}
                        {selectedIds.length > 0 ? (
                            <div className="flex items-center gap-2 animate-fadeIn">
                                {/* ... existing buttons ... */}
                                {currentMode !== 'apileads' && (
                                    <button
                                        onClick={() => { setShowBulkAssignPanel(!showBulkAssignPanel); setShowBulkUpdatePanel(false); }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${showBulkAssignPanel ? 'bg-[#1B1B19] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <UserPlus size={16} /> Assign
                                    </button>
                                )}
                                {currentMode !== 'apileads' && (
                                    <button
                                        onClick={() => { setShowBulkUpdatePanel(!showBulkUpdatePanel); setShowBulkAssignPanel(false); setBulkUpdateType(null); }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${showBulkUpdatePanel ? 'bg-[#1B1B19] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <MoreHorizontal size={16} /> Update
                                    </button>
                                )}
                                <button
                                    onClick={async () => {
                                        if (currentMode === 'apileads') {
                                            setDeleteModal({
                                                isOpen: true,
                                                title: 'Delete API Leads',
                                                message: `You are about to permanently delete ${selectedIds.length} pending API leads.`,
                                                onConfirm: async () => {
                                                    await Promise.all(selectedIds.map(id => deleteApiLead(id)));
                                                    setSelectedIds([]);
                                                }
                                            });
                                        } else {
                                            handleBulkDelete();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-all"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                                 {currentMode === 'apileads' && (
                                     <button
                                         onClick={async () => {
                                             const hasExisting = selectedIds.some(id => apiLeads.find(l => l._id === id)?.existingInCrm);
                                             const msg = hasExisting
                                                 ? `Process ${selectedIds.length} lead(s)? Returning customers will have their data merged into existing contacts.`
                                                 : `Approve and move ${selectedIds.length} leads to CRM?`;
                                             if (window.confirm(msg)) {
                                                 await Promise.all(selectedIds.map(id => approveApiLead(id)));
                                                 setSelectedIds([]);
                                             }
                                         }}
                                         className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-all border border-emerald-200"
                                     >
                                         <CheckCircle2 size={16} /> Add to CRM
                                     </button>
                                 )}
                            </div>
                        ) : (
                            hasActiveFilters && currentMode !== 'apileads' && (
                                <button
                                    onClick={() => setIsSmartListModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1B1B19] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-black transition-all"
                                >
                                    <Bookmark size={16} /> Save Smart List
                                </button>
                            )
                        )}
                    </div>
                </div>

                {showBulkAssignPanel && currentMode !== 'apileads' && (
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-slideDown">
                        <span className="text-sm font-bold text-indigo-700">Assign selection to:</span>
                        <div className="flex flex-wrap gap-2">
                            {users.map(user => (
                                <button
                                    key={user._id}
                                    onClick={() => handleBulkAssign(user._id!)}
                                    className="px-3 py-1 bg-white border border-indigo-200 rounded-full text-xs font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                >
                                    {user.username}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowBulkAssignPanel(false)} className="ml-auto text-indigo-400 hover:text-indigo-600"><X size={18} /></button>
                    </div>
                )}

                {showBulkUpdatePanel && currentMode !== 'apileads' && (
                    <div className="flex flex-col gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-slideDown">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-indigo-700 whitespace-nowrap">Bulk Update:</span>
                            <div className="flex gap-2">
                                <button onClick={() => setBulkUpdateType('status')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'status' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Status</button>
                                <button onClick={() => setBulkUpdateType('type')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'type' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Lead Type</button>
                                <button onClick={() => setBulkUpdateType('tags')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'tags' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Tags</button>
                                <button onClick={() => setBulkUpdateType('date')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'date' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Follow-up</button>
                            </div>
                            <button onClick={() => setShowBulkUpdatePanel(false)} className="ml-auto text-indigo-400 hover:text-indigo-600"><X size={18} /></button>
                        </div>

                        {bulkUpdateType === 'status' && (
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-100 animate-fadeIn">
                                {['new', 'contacted', 'sold', 'deal_closed'].map(s => (
                                    <button
                                        key={s}
                                        onClick={async () => { await bulkUpdateLeads(selectedIds, { status: s as 'new' | 'contacted' | 'sold' | 'deal_closed' }); setSelectedIds([]); setShowBulkUpdatePanel(false); }}
                                        className="px-3 py-1 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded text-xs font-bold capitalize transition-all"
                                    >
                                        {s.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        )}

                        {bulkUpdateType === 'type' && (
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-100 animate-fadeIn">
                                {['hot', 'warm', 'cold'].map(t => (
                                    <button
                                        key={t}
                                        onClick={async () => { await bulkUpdateLeads(selectedIds, { leadType: t as 'hot' | 'warm' | 'cold' }); setSelectedIds([]); setShowBulkUpdatePanel(false); }}
                                        className="px-3 py-1 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded text-xs font-bold capitalize transition-all"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}

                        {bulkUpdateType === 'tags' && (
                            <div className="flex flex-col gap-3 p-3 bg-white rounded-lg border border-indigo-100 animate-fadeIn">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setBulkTagUpdateType('add')}
                                        className={`flex-1 py-1 rounded-md text-xs font-bold border transition-all ${bulkTagUpdateType === 'add' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                                    > Add Tags </button>
                                    <button
                                        onClick={() => setBulkTagUpdateType('remove')}
                                        className={`flex-1 py-1 rounded-md text-xs font-bold border transition-all ${bulkTagUpdateType === 'remove' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                                    > Remove Tags </button>
                                </div>

                                <TagInput
                                    selectedTags={bulkTags}
                                    onTagsChange={setBulkTags}
                                    availableTags={availableTags}
                                    placeholder={bulkTagUpdateType === 'add' ? "Select tags to add..." : "Select tags to remove..."}
                                />

                                <div className="flex justify-end gap-2 mt-1">
                                    <button
                                        onClick={() => { setBulkTags([]); setBulkUpdateType(null); setShowBulkUpdatePanel(false); }}
                                        className="text-xs font-bold text-gray-400 hover:text-gray-600 px-3 py-1"
                                    > Cancel </button>
                                    <button
                                        disabled={bulkTags.length === 0}
                                        onClick={async () => {
                                            if (bulkTagUpdateType === 'add') {
                                                await bulkUpdateLeads(selectedIds, undefined, bulkTags);
                                            } else {
                                                await bulkUpdateLeads(selectedIds, undefined, undefined, bulkTags);
                                            }
                                            setBulkTags([]);
                                            setSelectedIds([]);
                                            setShowBulkUpdatePanel(false);
                                        }}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold text-white transition-all ${bulkTags.length > 0 ? (bulkTagUpdateType === 'add' ? 'bg-[#1B1B19] hover:bg-black' : 'bg-red-600 hover:bg-red-700') : 'bg-gray-300 cursor-not-allowed'}`}
                                    >
                                        {bulkTagUpdateType === 'add' ? 'Add Tags' : 'Remove Tags'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {bulkUpdateType === 'date' && (
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-100 animate-fadeIn">
                                <input
                                    type="date"
                                    className="flex-1 text-sm border-0 focus:ring-0 p-2 outline-none"
                                    onChange={async (e) => {
                                        const date = e.target.value;
                                        if (date) {
                                            await bulkUpdateLeads(selectedIds, { followupDate: new Date(date).toISOString() });
                                            setSelectedIds([]);
                                            setShowBulkUpdatePanel(false);
                                        }
                                    }}
                                />
                                <span className="text-[10px] text-gray-400 px-2 italic">Select date to apply</span>
                            </div>
                        )}
                    </div>
                )}

                {showAdvancedFilters && currentMode !== 'apileads' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <input value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="By Name" className="text-sm px-3 py-2 rounded-lg border border-gray-200" />
                        <input value={phoneFilter} onChange={e => setPhoneFilter(e.target.value)} placeholder="By Phone" className="text-sm px-3 py-2 rounded-lg border border-gray-200" />
                        <div className="relative">
                            <input
                                value={placeFilter}
                                onChange={e => setPlaceFilter(e.target.value)}
                                onFocus={() => setPlaceFocused(true)}
                                onBlur={() => setTimeout(() => setPlaceFocused(false), 100)}
                                placeholder="By Place"
                                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                            />
                            {placeFocused && availablePlaces.length > 0 && (
                                <div className="absolute z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {availablePlaces
                                        .filter(p => !placeFilter || p.toLowerCase().includes(placeFilter.toLowerCase()))
                                        .map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onMouseDown={() => setPlaceFilter(p)}
                                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                value={designationFilter}
                                onChange={e => setDesignationFilter(e.target.value)}
                                onFocus={() => setDesignationFocused(true)}
                                onBlur={() => setTimeout(() => setDesignationFocused(false), 100)}
                                placeholder="By Designation"
                                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                            />
                            {designationFocused && availableDesignations.length > 0 && (
                                <div className="absolute z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {availableDesignations
                                        .filter(d => !designationFilter || d.toLowerCase().includes(designationFilter.toLowerCase()))
                                        .map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                onMouseDown={() => setDesignationFilter(d)}
                                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                            >
                                                {d}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200">
                            <option value="all">Any Status</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="sold">Sold</option>
                            <option value="deal_closed">Deal Closed</option>
                        </select>
                        <select value={leadTypeFilter} onChange={e => setLeadTypeFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200">
                            <option value="all">Any Type</option>
                            <option value="hot">Hot</option>
                            <option value="warm">Warm</option>
                            <option value="cold">Cold</option>
                        </select>
                        <select value={leadOriginFilter} onChange={e => setLeadOriginFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200">
                            <option value="all">Any Origin</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="insta">Instagram</option>
                            <option value="fb">Facebook</option>
                            <option value="walk-in">Walk-in</option>
                            <option value="tele">Tele Caller</option>
                            <option value="referral">Referral</option>
                            <option value="web">Website</option>
                            <option value="olx">OLX</option>
                            <option value="other">Other</option>
                        </select>
                        <select value={assignedToFilter} onChange={e => setAssignedToFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200">
                            <option value="unassigned">Unassigned</option>
                            {users.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                        </select>
                        <TagInput
                            selectedTags={tagFilterTags}
                            onTagsChange={setTagFilterTags}
                            availableTags={availableTags}
                            placeholder="Filter by Tag"
                        />
                        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200" />
                        <select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200">
                            <option value="all">Any Payment</option>
                            <option value="">None</option>
                            <option value="advance payment">Advance Payment</option>
                            <option value="full payment">Full Payment</option>
                        </select>
                        <select value={intentFilter} onChange={e => setIntentFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200">
                            <option value="all">Any Intent</option>
                            <option value="buying">Buying</option>
                            <option value="selling">Selling</option>
                            <option value="exchange">Exchange</option>
                        </select>
                        <div className="relative">
                            <input
                                value={brandFilter}
                                onChange={e => setBrandFilter(e.target.value)}
                                onFocus={() => setBrandFilterFocused(true)}
                                onBlur={() => setTimeout(() => setBrandFilterFocused(false), 100)}
                                placeholder="By Brand Name"
                                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                            />
                            {brandFilterFocused && availableBrandNames.length > 0 && (
                                <div className="absolute z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {availableBrandNames
                                        .filter(b => !brandFilter || b.toLowerCase().includes(brandFilter.toLowerCase()))
                                        .map(b => (
                                            <button
                                                key={b}
                                                type="button"
                                                onMouseDown={() => setBrandFilter(b)}
                                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                            >
                                                {b}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                value={modelFilter}
                                onChange={e => setModelFilter(e.target.value)}
                                onFocus={() => setModelFilterFocused(true)}
                                onBlur={() => setTimeout(() => setModelFilterFocused(false), 100)}
                                placeholder="By Model Name"
                                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                            />
                            {modelFilterFocused && availableModelNames.length > 0 && (
                                <div className="absolute z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {availableModelNames
                                        .filter(m => !modelFilter || m.toLowerCase().includes(modelFilter.toLowerCase()))
                                        .map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onMouseDown={() => setModelFilter(m)}
                                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                            >
                                                {m}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                        <select value={fuelTypeFilter} onChange={e => setFuelTypeFilter(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-gray-200">
                            <option value="all">Any Fuel</option>
                            <option value="petrol">Petrol</option>
                            <option value="diesel">Diesel</option>
                            <option value="electric">Electric</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="cng">CNG</option>
                        </select>
                        <input
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value.replace(/\D/g, ''))}
                            placeholder="By Year (YYYY)"
                            className="text-sm px-3 py-2 rounded-lg border border-gray-200"
                        />
                        <div className="flex items-center gap-2">
                            <select value={kmDrivenOp} onChange={e => setKmDrivenOp(e.target.value as 'eq' | 'gt' | 'lt')} className="text-sm px-2 py-2 rounded-lg border border-gray-200">
                                <option value="eq">Equal to</option>
                                <option value="gt">Greater than</option>
                                <option value="lt">Less than</option>
                            </select>
                            <input
                                value={kmDrivenFilter}
                                onChange={e => setKmDrivenFilter(e.target.value.replace(/\D/g, ''))}
                                placeholder="KM Driven"
                                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <select value={amountOp} onChange={e => setAmountOp(e.target.value as 'eq' | 'gt' | 'lt')} className="text-sm px-2 py-2 rounded-lg border border-gray-200">
                                <option value="eq">Equal to</option>
                                <option value="gt">Greater than</option>
                                <option value="lt">Less than</option>
                            </select>
                            <input
                                value={amountFilter}
                                onChange={e => setAmountFilter(e.target.value.replace(/\D/g, ''))}
                                placeholder="Amount"
                                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setNameFilter(''); setPhoneFilter(''); setPlaceFilter(''); setDesignationFilter('');
                                setTagFilterTags([]); setDateFilter('');
                                setStatusFilter('all'); setLeadTypeFilter('all'); setLeadOriginFilter('all');
                                setAssignedToFilter('all');
                                setPaymentStatusFilter('all');
                                setIntentFilter('all');
                                setBrandFilter('');
                                setModelFilter('');
                                setFuelTypeFilter('all');
                                setYearFilter('');
                                setKmDrivenFilter('');
                                setAmountFilter('');
                            }}
                            className="text-xs font-bold text-red-500 uppercase"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Table Layout */}
            {currentMode === 'apileads' ? (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start bg-gray-50/30 overflow-y-auto max-h-[calc(100vh-350px)]">
                    {paginatedLeads.map(lead => {
                         const isEditing = editingApiLeadId === lead._id;
                         const isExisting = lead.existingInCrm === true;
                         return (
                         <div key={lead._id} className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-4 h-fit relative ${isEditing ? 'border-indigo-300 ring-2 ring-indigo-100' : isExisting ? 'border-amber-200 ring-1 ring-amber-50' : 'border-gray-200'}`}>
                             <div className="absolute top-4 right-4 flex items-center gap-3">
                                 <span className="text-[10px] font-bold text-gray-300">#{(currentPage - 1) * pageSize + paginatedLeads.indexOf(lead) + 1}</span>
                                 {!isEditing && (
                                     <button onClick={() => startEditApiLead(lead)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all" title="Edit">
                                         <Edit3 size={14} />
                                     </button>
                                 )}
                                 <input
                                     type="checkbox"
                                     checked={selectedIds.includes(lead._id!)}
                                     onChange={e => handleSelectLead(lead._id!, e.target.checked)}
                                     className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                 />
                             </div>

                             {/* Existing in CRM badge */}
                             {isExisting && !isEditing && (
                                 <div className="absolute top-4 left-4 flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
                                     <AlertTriangle size={10} className="text-amber-500" />
                                     <span className="text-[10px] font-bold text-amber-600">Existing in CRM</span>
                                 </div>
                             )}

                            {isEditing ? (
                                /* ─── EDIT MODE ─── */
                                <div className="flex flex-col gap-3 pr-8">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Name</label>
                                        <input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                                        <input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                                    </div>

                                    {/* Place with suggestions */}
                                    <div className="flex flex-col gap-1.5 relative">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Place</label>
                                        <input value={editData.place} onChange={e => setEditData(d => ({ ...d, place: e.target.value }))} onFocus={() => setEditFocus('place')} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                                        {editFocus === 'place' && availablePlaces.filter(p => !editData.place || p.toLowerCase().includes(editData.place.toLowerCase())).length > 0 && (
                                            <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                {availablePlaces.filter(p => !editData.place || p.toLowerCase().includes(editData.place.toLowerCase())).map(p => (
                                                    <button key={p} type="button" onMouseDown={() => setEditData(d => ({ ...d, place: p }))} className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50 transition-colors">{p}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Designation with suggestions */}
                                    <div className="flex flex-col gap-1.5 relative">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Designation</label>
                                        <input value={editData.designation} onChange={e => setEditData(d => ({ ...d, designation: e.target.value }))} onFocus={() => setEditFocus('designation')} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                                        {editFocus === 'designation' && availableDesignations.filter(d => !editData.designation || d.toLowerCase().includes(editData.designation.toLowerCase())).length > 0 && (
                                            <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                {availableDesignations.filter(d => !editData.designation || d.toLowerCase().includes(editData.designation.toLowerCase())).map(d => (
                                                    <button key={d} type="button" onMouseDown={() => setEditData(dd => ({ ...dd, designation: d }))} className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50 transition-colors">{d}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Lead Origin */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source</label>
                                        <select value={editData.leadOrigin} onChange={e => setEditData(d => ({ ...d, leadOrigin: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all">
                                            <option value="">Select Origin</option>
                                            <option value="whatsapp">WhatsApp</option><option value="insta">Instagram</option><option value="fb">Facebook</option>
                                            <option value="walk-in">Walk-in</option><option value="tele">Tele Caller</option><option value="referral">Referral</option>
                                            <option value="web">Website</option><option value="olx">OLX</option><option value="other">Other</option>
                                        </select>
                                    </div>

                                    {/* Assign User */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><UserIcon size={10} /> Assign To</label>
                                        <select value={editData.assignedTo} onChange={e => setEditData(d => ({ ...d, assignedTo: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all">
                                            <option value="">Unassigned</option>
                                            {users.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                                        </select>
                                    </div>

                                    {/* Vehicle Details */}
                                    {(editData.carDetails?.length ?? 0) > 0 && (
                                        <div className="flex flex-col gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Car size={10}/> Vehicles</span>
                                            {(editData.carDetails ?? []).map((car: CarDetail, idx: number) => (
                                                <div key={idx} className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/20 flex flex-col gap-2">
                                                    <select value={car.intent} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], intent: e.target.value as 'buying' | 'selling' | 'exchange' }; setEditData(d => ({ ...d, carDetails: cd })); }} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs">
                                                        <option value="buying">Buying</option><option value="selling">Selling</option><option value="exchange">Exchange</option>
                                                    </select>
                                                    {car.intent !== 'selling' && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Wanted Car</span>
                                                            <div className="flex gap-1.5 relative">
                                                                <div className="flex-1 relative">
                                                                    <input placeholder="Brand" value={car.wantedCar?.brandName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), brandName: e.target.value } }; setEditData(d => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`wb${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                                    {editFocus === `wb${idx}` && availableBrandNames.filter(b => !car.wantedCar?.brandName || b.toLowerCase().includes((car.wantedCar?.brandName || '').toLowerCase())).length > 0 && (
                                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                                            {availableBrandNames.filter(b => !car.wantedCar?.brandName || b.toLowerCase().includes((car.wantedCar?.brandName || '').toLowerCase())).map(b => (
                                                                                <button key={b} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), brandName: b } }; setEditData(d => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{b}</button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 relative">
                                                                    <input placeholder="Model" value={car.wantedCar?.modelName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), modelName: e.target.value } }; setEditData(d => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`wm${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                                    {editFocus === `wm${idx}` && availableModelNames.filter(m => !car.wantedCar?.modelName || m.toLowerCase().includes((car.wantedCar?.modelName || '').toLowerCase())).length > 0 && (
                                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                                            {availableModelNames.filter(m => !car.wantedCar?.modelName || m.toLowerCase().includes((car.wantedCar?.modelName || '').toLowerCase())).map(m => (
                                                                                <button key={m} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), modelName: m } }; setEditData(d => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{m}</button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {car.intent !== 'buying' && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Owned Car</span>
                                                            <div className="flex gap-1.5 relative">
                                                                <div className="flex-1 relative">
                                                                    <input placeholder="Brand" value={car.ownedCar?.brandName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), brandName: e.target.value } }; setEditData(d => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`ob${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                                    {editFocus === `ob${idx}` && availableBrandNames.filter(b => !car.ownedCar?.brandName || b.toLowerCase().includes((car.ownedCar?.brandName || '').toLowerCase())).length > 0 && (
                                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                                            {availableBrandNames.filter(b => !car.ownedCar?.brandName || b.toLowerCase().includes((car.ownedCar?.brandName || '').toLowerCase())).map(b => (
                                                                                <button key={b} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), brandName: b } }; setEditData(d => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{b}</button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 relative">
                                                                    <input placeholder="Model" value={car.ownedCar?.modelName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), modelName: e.target.value } }; setEditData(d => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`om${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                                    {editFocus === `om${idx}` && availableModelNames.filter(m => !car.ownedCar?.modelName || m.toLowerCase().includes((car.ownedCar?.modelName || '').toLowerCase())).length > 0 && (
                                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                                            {availableModelNames.filter(m => !car.ownedCar?.modelName || m.toLowerCase().includes((car.ownedCar?.modelName || '').toLowerCase())).map(m => (
                                                                                <button key={m} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), modelName: m } }; setEditData(d => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{m}</button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                <input placeholder="Year" value={car.ownedCar?.year || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), year: e.target.value } }; setEditData(d => ({ ...d, carDetails: cd })); }} className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                                <input placeholder="KM" value={car.ownedCar?.kmDriven || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || {brandName:'', modelName:'', fuelType:'', kmDriven:''}), kmDriven: e.target.value } }; setEditData(d => ({ ...d, carDetails: cd })); }} className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Save / Cancel */}
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={cancelEditApiLead} className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all">Cancel</button>
                                        <button onClick={saveEditApiLead} className="flex-1 px-3 py-2 bg-[#1B1B19] text-white rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-sm"><Save size={14}/> Save</button>
                                    </div>
                                </div>
                            ) : (
                                /* ─── VIEW MODE ─── */
                                <>
                                     <div className={`flex flex-col gap-1 pr-8 ${isExisting ? 'mt-6' : ''}`}>
                                        <button
                                            onClick={() => navigate(`/contact/${lead._id}`)}
                                            className="font-bold text-lg text-gray-900 hover:text-indigo-600 text-left leading-tight"
                                        >
                                            {lead.name}
                                        </button>
                                        <a href={`tel:${lead.phone}`} className="text-sm text-indigo-600 font-medium flex items-center gap-1.5 hover:underline w-fit">
                                            <Phone size={14}/> {lead.phone}
                                        </a>
                                    </div>

                                    {(lead.place || lead.designation || lead.leadOrigin) && (
                                        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg text-xs">
                                            {lead.place && <div className="flex items-center justify-between"><span className="text-gray-500">Place</span><span className="font-bold text-gray-700">{lead.place}</span></div>}
                                            {lead.designation && <div className="flex items-center justify-between"><span className="text-gray-500">Designation</span><span className="font-bold text-gray-700">{lead.designation}</span></div>}
                                            {lead.leadOrigin && <div className="flex items-center justify-between"><span className="text-gray-500">Source</span><span className="font-bold text-gray-700">{lead.leadOrigin}</span></div>}
                                        </div>
                                    )}

                                    {/* Assigned User Display */}
                                    {lead.assignedTo && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600">
                                                {typeof lead.assignedTo === 'object' ? lead.assignedTo?.username?.charAt(0) : '?'}
                                            </div>
                                            <span className="font-medium text-gray-600">
                                                {typeof lead.assignedTo === 'object' ? lead.assignedTo?.username : 'Assigned'}
                                            </span>
                                        </div>
                                    )}

                                    {lead.carDetails && lead.carDetails.length > 0 && (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1"><Car size={12}/> Vehicles ({lead.carDetails.length})</span>
                                            {lead.carDetails.map((car, idx) => (
                                                <div key={idx} className="text-xs p-2.5 rounded-lg border border-indigo-50 bg-indigo-50/30 flex flex-col gap-1">
                                                    <span className="font-bold text-indigo-900 capitalize">{car.intent}</span>
                                                    {car.wantedCar && car.intent !== 'selling' && (
                                                        <div className="text-gray-600">Want: <span className="font-medium text-gray-900 truncate block">{car.wantedCar.brandName} {car.wantedCar.modelName}</span></div>
                                                    )}
                                                    {car.ownedCar && car.intent !== 'buying' && (
                                                        <div className="text-gray-600">
                                                            Own: <span className="font-medium text-gray-900 truncate block">{car.ownedCar.brandName} {car.ownedCar.modelName}</span>
                                                            {(car.ownedCar.year || car.ownedCar.kmDriven) && (
                                                                <div className="flex gap-2 text-[10px] mt-1 text-gray-500 font-medium">
                                                                    {car.ownedCar.year && <span className="bg-white px-1.5 py-0.5 rounded border border-gray-100">{car.ownedCar.year}</span>}
                                                                    {car.ownedCar.kmDriven && <span className="bg-white px-1.5 py-0.5 rounded border border-gray-100">{car.ownedCar.kmDriven} km</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {lead.notes && lead.notes.length > 0 && (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Latest Note</span>
                                            <div className="text-xs text-gray-700 bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100 italic line-clamp-3">
                                                {lead.notes[lead.notes.length - 1]}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2">
                                        {isExisting && (
                                             <div className="w-full mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 font-medium leading-snug">
                                                 New car details &amp; notes will be merged into the existing contact.
                                             </div>
                                         )}
                                         <div className="flex items-center gap-2 w-full">
                                         <button
                                             onClick={() => startEditApiLead(lead)}
                                             className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all font-bold text-xs flex items-center gap-1.5 border border-gray-200"
                                         >
                                             <Edit3 size={14}/> Edit
                                         </button>
                                         <button 
                                             onClick={() => {
                                                 if (window.confirm('Delete this pending lead?')) {
                                                     deleteApiLead(lead._id!);
                                                 }
                                             }}
                                             className="px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all font-bold text-xs"
                                         >
                                             Delete
                                         </button>
                                         <button 
                                             onClick={() => {
                                                 const msg = isExisting
                                                     ? 'This contact already exists in CRM. New car details and notes will be merged into them. Continue?'
                                                     : 'Approve this lead and add to CRM?';
                                                 if (window.confirm(msg)) {
                                                     approveApiLead(lead._id!);
                                                 }
                                             }}
                                             className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                                                 isExisting
                                                     ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                     : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                                             }`}
                                         >
                                             {isExisting ? (
                                                 <><AlertTriangle size={14}/> Update in CRM</>
                                             ) : (
                                                 <><CheckCircle2 size={16}/> Add to CRM</>
                                             )}
                                         </button>
                                         </div>
                                     </div>
                                </>
                            )}
                        </div>
                        );
                    })}
                </div>
            ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-4 w-10 border-r border-gray-100 text-center bg-gray-50/50">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                                    onChange={e => handleSelectAll(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </th>
                            <th className="p-4 text-[10px] font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50 w-8">#</th>
                            <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50">Contact Name</th>
                            <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50">Phone</th>
                            <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50">Type</th>
                            <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50">Status</th>
                            <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50">Assigned To</th>
                            <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50">Tags</th>
                            <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50/50">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedLeads.map(lead => (
                            <tr key={lead._id} className="hover:bg-indigo-50/30 transition-all group">
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(lead._id!)}
                                        onChange={e => handleSelectLead(lead._id!, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="p-4 text-[10px] font-bold text-gray-300">
                                    {(currentPage - 1) * pageSize + paginatedLeads.indexOf(lead) + 1}
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <button
                                            onClick={() => navigate(`/contact/${lead._id}`)}
                                            className="font-bold text-sm text-gray-900 hover:text-indigo-600 text-left"
                                        >
                                            {lead.name}
                                        </button>
                                        <span className="text-[10px] text-gray-700">
                                            {lead.place || 'None'}
                                        </span>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-700 mt-0.5">
                                            <Briefcase size={10} />
                                            <span>{lead.designation || 'None'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{lead.phone}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${lead.leadType === 'hot' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                        lead.leadType === 'warm' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                            'bg-blue-50 text-blue-600 border border-blue-100'
                                        }`}>
                                        {lead.leadType}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${lead.status === 'sold' || lead.status === 'deal_closed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                        {lead.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                            {typeof lead.assignedTo === 'object' ? lead.assignedTo?.username?.charAt(0) : '?'}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">
                                            {typeof lead.assignedTo === 'object' ? lead.assignedTo?.username : 'Unassigned'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                        {lead.tags.length > 0 ? lead.tags.map((tag, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded text-[9px] font-medium">
                                                {tag}
                                            </span>
                                        )) : <span className="text-[9px] text-gray-300 italic">No tags</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-[10px] text-gray-500 whitespace-nowrap">
                                    {lead.createdAt ? format(parseISO(lead.createdAt), 'MMM d, yyyy') : 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
            {/* Pagination Sidebar/Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Per Page:</span>
                        <div className="flex gap-1">
                            {[20, 100].map(size => (
                                <button
                                    key={size}
                                    onClick={() => setPageSize(size)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md border transition-all ${pageSize === size
                                        ? 'bg-[#1B1B19] border-[#1B1B19] text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700">
                        Showing {filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length}
                    </span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all font-bold text-xs"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    if (totalPages <= 7) return true;
                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, idx, array) => (
                                    <div key={page} className="flex items-center gap-1">
                                        {idx > 0 && array[idx - 1] !== page - 1 && (
                                            <span className="text-gray-700">...</span>
                                        )}
                                        <button
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${currentPage === page
                                                ? 'bg-[#1B1B19] border-[#1B1B19] text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    </div>
                                ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all font-bold text-xs"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {filteredLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/30">
                    <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 mb-4">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No Contacts Found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your filters or add a new lead.</p>
                </div>
            )}

            {/* Modals */}
            {isSmartListModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 text-left">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Save Smart List</h3>
                            <button onClick={() => setIsSmartListModalOpen(false)}><X size={20} className="text-gray-700" /></button>
                        </div>
                        <input
                            autoFocus
                            placeholder="e.g. Hot Leads"
                            value={smartListName}
                            onChange={(e) => setSmartListName(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsSmartListModalOpen(false)} className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-900">Cancel</button>
                            <button onClick={handleSaveSmartList} disabled={!smartListName} className="rounded-xl bg-[#1B1B19] px-6 py-2.5 font-bold text-white shadow-md hover:bg-black disabled:opacity-50 transition-all active:scale-95">Save List</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={deleteModal.onConfirm}
                title={deleteModal.title}
                message={deleteModal.message}
            />
        </div>
    );
}
