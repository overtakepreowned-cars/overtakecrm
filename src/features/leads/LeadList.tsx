import { useState, useMemo, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../../context/LeadsContext';
import { Search, Filter, X, Briefcase, Bookmark, MoreHorizontal, Trash2, UserPlus, CheckCircle2, Phone, Car, Edit3, Save, User as UserIcon, AlertTriangle, Calendar, Upload } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { Lead, CarDetail, ApiLeadEditData, LeadFilter } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { LeadImportModal } from './LeadImportModal';
import { TagInput } from '../../components/TagInput';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { COUNTRIES, parsePhoneNumber } from '../../constants/countries';

interface LeadListProps {
    initialFilter?: 'all' | 'followup';
}

export function LeadList({ initialFilter = 'all' }: LeadListProps) {
    const { leads, apiLeads, addSmartList, users, deleteApiLead, approveApiLead, updateApiLead, bulkDeleteLeads, bulkAssignLeads, bulkUpdateLeads, bulkUpdatePhonePrefix, smartLists, deleteSmartList, tags, addTag, loading, error, fetchLeads, totalLeads, clearLeads } = useLeads();
    const { isAdmin } = useAuth();

    const [currentMode, setCurrentMode] = useState<'all' | 'followup' | 'smartlist' | 'apileads'>(initialFilter);
    const [activeSmartListId, setActiveSmartListId] = useState<string | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        return () => {
            clearLeads();
        };
    }, []);

    // Filter states (these are the ACTIVE filters used for calculation)
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters] = useState({
        name: '', phone: '', countryCode: '', status: 'all', leadType: 'all', leadOrigin: 'all',
        place: '', designation: '', tags: [] as string[], date: '',
        assignedTo: 'all', paymentStatus: 'all', intent: 'all',
        brand: '', model: '', fuelType: 'all', year: '',
        kmDriven: '', kmDrivenOp: 'eq' as 'eq' | 'gt' | 'lt',
        amount: '', amountOp: 'eq' as 'eq' | 'gt' | 'lt',
        bookMethod: 'all'
    });

    // Draft states (these are what the user sees in the UI)
    const [draftFilters, setDraftFilters] = useState({ ...activeFilters });

    // Individual states for backward compatibility if needed, but we'll try to refactor to use activeFilters
    // Actually, to minimize changes to filteredLeads, I'll keep the individual states but only update them on Apply.
    const [nameFilter, setNameFilter] = useState('');
    const [phoneFilter, setPhoneFilter] = useState('');
    const [countryCodeFilter, setCountryCodeFilter] = useState('');
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
    const [bookMethodFilter, setBookMethodFilter] = useState('all');

    // Focus states for suggestions
    const [nameFocused, setNameFocused] = useState(false);
    const [phoneFocused, setPhoneFocused] = useState(false);
    const [placeFocused, setPlaceFocused] = useState(false);
    const [designationFocused, setDesignationFocused] = useState(false);
    const [brandFocused, setBrandFocused] = useState(false);
    const [modelFocused, setModelFocused] = useState(false);

    // Suggestion Data
    const availableNames = useMemo(() => Array.from(new Set(leads.map(l => l.name).filter(Boolean))), [leads]);
    const availablePhones = useMemo(() => Array.from(new Set(leads.map(l => l.phone).filter(Boolean))), [leads]);
    const availableBrandNames = useMemo(() => {
        const brands = new Set<string>();
        leads.forEach(l => {
            l.carDetails?.forEach(c => {
                if (c.brandName) brands.add(c.brandName);
                if (c.wantedCar?.brandName) brands.add(c.wantedCar.brandName);
                if (c.ownedCar?.brandName) brands.add(c.ownedCar.brandName);
            });
        });
        return Array.from(brands).sort();
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
        return Array.from(models).sort();
    }, [leads]);
    const availablePlaces = useMemo(() => Array.from(new Set(leads.map(l => l.place).filter(Boolean))), [leads]);
    const availableDesignations = useMemo(() => Array.from(new Set(leads.map(l => l.designation).filter(Boolean))), [leads]);
    const availableTags = useMemo(() => tags.map(t => ({ _id: t._id, name: t.name })), [tags]);

    const handleApplyFilters = () => {
        // Sync draft to active (individual states)
        setNameFilter(draftFilters.name);
        setPhoneFilter(draftFilters.phone);
        setCountryCodeFilter(draftFilters.countryCode || '');
        setStatusFilter(draftFilters.status);
        setLeadTypeFilter(draftFilters.leadType);
        setLeadOriginFilter(draftFilters.leadOrigin);
        setPlaceFilter(draftFilters.place);
        setDesignationFilter(draftFilters.designation);
        setTagFilterTags(draftFilters.tags);
        setDateFilter(draftFilters.date);
        setAssignedToFilter(draftFilters.assignedTo);
        setPaymentStatusFilter(draftFilters.paymentStatus);
        setIntentFilter(draftFilters.intent);
        setBrandFilter(draftFilters.brand);
        setModelFilter(draftFilters.model);
        setFuelTypeFilter(draftFilters.fuelType);
        setYearFilter(draftFilters.year);
        setKmDrivenFilter(draftFilters.kmDriven);
        setKmDrivenOp(draftFilters.kmDrivenOp);
        setAmountFilter(draftFilters.amount);
        setAmountOp(draftFilters.amountOp);
        setBookMethodFilter(draftFilters.bookMethod);
    };

    const handleResetFilters = () => {
        const empty = {
            name: '', phone: '', countryCode: '', status: 'all', leadType: 'all', leadOrigin: 'all',
            place: '', designation: '', tags: [] as string[], date: '',
            assignedTo: 'all', paymentStatus: 'all', intent: 'all',
            brand: '', model: '', fuelType: 'all', year: '',
            kmDriven: '', kmDrivenOp: 'eq' as 'eq' | 'gt' | 'lt',
            amount: '', amountOp: 'eq' as 'eq' | 'gt' | 'lt',
            bookMethod: 'all'
        };
        setDraftFilters(empty);
        // Also clear active filters immediately
        setNameFilter('');
        setPhoneFilter('');
        setCountryCodeFilter('');
        setStatusFilter('all');
        setLeadTypeFilter('all');
        setLeadOriginFilter('all');
        setPlaceFilter('');
        setDesignationFilter('');
        setTagFilterTags([]);
        setDateFilter('');
        setAssignedToFilter('all');
        setPaymentStatusFilter('all');
        setIntentFilter('all');
        setBrandFilter('');
        setModelFilter('');
        setFuelTypeFilter('all');
        setYearFilter('');
        setKmDrivenFilter('');
        setKmDrivenOp('eq');
        setAmountFilter('');
        setAmountOp('eq');
        setBookMethodFilter('all');
    };

    const hasActiveAdvancedFilters = useMemo(() => {
        return (
            nameFilter !== '' ||
            phoneFilter !== '' ||
            countryCodeFilter !== '' ||
            statusFilter !== 'all' ||
            leadTypeFilter !== 'all' ||
            leadOriginFilter !== 'all' ||
            placeFilter !== '' ||
            designationFilter !== '' ||
            tagFilterTags.length > 0 ||
            dateFilter !== '' ||
            assignedToFilter !== 'all' ||
            paymentStatusFilter !== 'all' ||
            intentFilter !== 'all' ||
            brandFilter !== '' ||
            modelFilter !== '' ||
            fuelTypeFilter !== 'all' ||
            yearFilter !== '' ||
            kmDrivenFilter !== '' ||
            amountFilter !== '' ||
            bookMethodFilter !== 'all'
        );
    }, [
        nameFilter, phoneFilter, countryCodeFilter, statusFilter, leadTypeFilter, leadOriginFilter,
        placeFilter, designationFilter, tagFilterTags, dateFilter, assignedToFilter,
        paymentStatusFilter, intentFilter, brandFilter, modelFilter, fuelTypeFilter,
        yearFilter, kmDrivenFilter, amountFilter, bookMethodFilter
    ]);

    const [isSmartListModalOpen, setIsSmartListModalOpen] = useState(false);
    const [smartListName, setSmartListName] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const navigate = useNavigate();
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showBulkUpdatePanel, setShowBulkUpdatePanel] = useState(false);
    const [bulkUpdateType, setBulkUpdateType] = useState<'status' | 'type' | 'tags' | 'date' | 'countryCode' | 'assign' | null>(null);
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
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const hasActiveFilters = !!(
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
        bookMethodFilter !== 'all' ||
        intentFilter !== 'all' ||
        !!brandFilter ||
        !!modelFilter ||
        (fuelTypeFilter !== 'all' && !!fuelTypeFilter) ||
        !!yearFilter ||
        !!kmDrivenFilter ||
        !!amountFilter ||
        !!countryCodeFilter
    );

    // Apply filters
    const filteredLeads = useMemo(() => {
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
        return leads;
    }, [leads, apiLeads, currentMode, searchTerm]);

    // Triggers reactive query fetching on the server side using single/compound indexes
    useEffect(() => {
        if (currentMode === 'apileads') return;

        const params: Record<string, any> = {
            page: currentPage - 1,
            limit: pageSize,
            search: debouncedSearch
        };

        if (currentMode === 'followup') {
            params.hasFollowup = 'true';
        } else if (currentMode === 'smartlist') {
            const activeSmartList = smartLists.find(l => l._id === activeSmartListId);
            if (activeSmartList?.filters) {
                Object.assign(params, activeSmartList.filters);
            }
        }

        // Add user-applied filters
        if (nameFilter) params.name = nameFilter;
        if (phoneFilter) params.phone = phoneFilter;
        if (placeFilter) params.place = placeFilter;
        if (designationFilter) params.designation = designationFilter;
        if (tagFilterTags.length > 0) params.tags = tagFilterTags.join(',');
        if (dateFilter) params.date = dateFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (leadTypeFilter !== 'all') params.leadType = leadTypeFilter;
        if (leadOriginFilter !== 'all') params.leadOrigin = leadOriginFilter;
        if (assignedToFilter !== 'all') params.assignedTo = assignedToFilter;
        if (paymentStatusFilter !== 'all') params.paymentStatus = paymentStatusFilter;
        if (bookMethodFilter !== 'all') params.bookMethod = bookMethodFilter;
        if (intentFilter !== 'all') params.intent = intentFilter;
        if (brandFilter) params.brand = brandFilter;
        if (modelFilter) params.model = modelFilter;
        if (fuelTypeFilter !== 'all') params.fuelType = fuelTypeFilter;
        if (yearFilter) params.year = yearFilter;
        if (countryCodeFilter) params.countryCode = countryCodeFilter;
        if (kmDrivenFilter) {
            params.kmDriven = kmDrivenFilter;
            params.kmDrivenOp = kmDrivenOp;
        }
        if (amountFilter) {
            params.amount = amountFilter;
            params.amountOp = amountOp;
        }

        fetchLeads(params);
    }, [
        currentPage,
        pageSize,
        debouncedSearch,
        currentMode,
        activeSmartListId,
        nameFilter,
        phoneFilter,
        placeFilter,
        designationFilter,
        tagFilterTags,
        dateFilter,
        statusFilter,
        leadTypeFilter,
        leadOriginFilter,
        assignedToFilter,
        paymentStatusFilter,
        bookMethodFilter,
        intentFilter,
        brandFilter,
        modelFilter,
        fuelTypeFilter,
        yearFilter,
        countryCodeFilter,
        kmDrivenFilter,
        kmDrivenOp,
        amountFilter,
        amountOp
    ]);

    // Reset pagination when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, nameFilter, phoneFilter, placeFilter, designationFilter, tagFilterTags, dateFilter, statusFilter, leadTypeFilter, leadOriginFilter, assignedToFilter, paymentStatusFilter, bookMethodFilter, intentFilter, brandFilter, modelFilter, fuelTypeFilter, yearFilter, kmDrivenFilter, kmDrivenOp, amountFilter, amountOp, currentMode, activeSmartListId, pageSize]);

    const paginatedLeads = useMemo(() => {
        if (currentMode === 'apileads') {
            const startIndex = (currentPage - 1) * pageSize;
            return filteredLeads.slice(startIndex, startIndex + pageSize);
        }
        // Protect table rendering from DOM bloat if global state leads has excess/stale items (e.g. 1000 items from pipeline view)
        return filteredLeads.slice(0, pageSize);
    }, [filteredLeads, currentMode, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        if (currentMode === 'apileads') {
            return Math.ceil(filteredLeads.length / pageSize);
        }
        return Math.ceil(totalLeads / pageSize);
    }, [filteredLeads, currentMode, totalLeads, pageSize]);

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
    };

    const handleSaveSmartList = () => {
        if (!smartListName) return;
        addSmartList({
            name: smartListName,
            filters: {
                name: nameFilter,
                phone: phoneFilter,
                countryCode: countryCodeFilter,
                place: placeFilter,
                designation: designationFilter,
                tag: tagFilterTags[0],
                status: statusFilter,
                leadType: leadTypeFilter as LeadFilter['leadType'],
                leadOrigin: leadOriginFilter as LeadFilter['leadOrigin'],
                assignedTo: assignedToFilter,
                selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
                paymentStatus: (paymentStatusFilter === 'all' ? '' : paymentStatusFilter) as 'Advance Payment' | 'Full Payment' | '',
                bookMethod: (bookMethodFilter === 'all' ? '' : bookMethodFilter) as 'loan' | 'cash' | '',
                intent: intentFilter as LeadFilter['intent'],
                brandName: brandFilter,
                modelName: modelFilter,
                fuelType: fuelTypeFilter === 'all' ? '' : fuelTypeFilter,
                year: yearFilter,
                kmDrivenValue: kmDrivenFilter,
                kmDrivenOp,
                amountValue: amountFilter,
                amountOp,
                date: dateFilter
            }
        });
        setIsSmartListModalOpen(false);
        setSmartListName('');
    };

    if (loading && leads.length === 0 && apiLeads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse">Fetching your contacts...</p>
            </div>
        );
    }

    if (error && leads.length === 0 && apiLeads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 bg-red-50 rounded-2xl border border-red-100 mx-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-red-900">Connection Issue</h3>
                <p className="text-red-600 text-center max-w-md">{error}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200">Try Again</button>
            </div>
        );
    }

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
                        Total Contacts: <span className="text-indigo-600">{currentMode === 'apileads' ? filteredLeads.length : totalLeads}</span>
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
                                {hasActiveAdvancedFilters && (
                                    <button
                                        onClick={handleResetFilters}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all border border-red-100 text-xs font-bold shadow-sm whitespace-nowrap"
                                        title="Clear Advanced Filters"
                                    >
                                        <X size={14} className="stroke-[3]" />
                                        Clear Filters
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 ? (
                            <div className="flex items-center gap-2 animate-fadeIn">
                                {/* ... existing buttons ... */}
                                {currentMode !== 'apileads' && (
                                    <button
                                        onClick={() => { setShowBulkUpdatePanel(!showBulkUpdatePanel); setBulkUpdateType(null); }}
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
                        {isAdmin && currentMode !== 'apileads' && (
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-all ml-2"
                            >
                                <Upload size={16} /> Import
                            </button>
                        )}
                    </div>
                </div>

                {showBulkUpdatePanel && currentMode !== 'apileads' && (
                    <div className="flex flex-col gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-slideDown">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-indigo-700 whitespace-nowrap">Bulk Update:</span>
                            <div className="flex gap-2">
                                <button onClick={() => setBulkUpdateType('assign')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'assign' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Assign Owner</button>
                                <button onClick={() => setBulkUpdateType('status')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'status' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Status</button>
                                <button onClick={() => setBulkUpdateType('type')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'type' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Lead Type</button>
                                <button onClick={() => setBulkUpdateType('tags')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'tags' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Tags</button>
                                <button onClick={() => setBulkUpdateType('date')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'date' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Follow-up</button>
                                <button onClick={() => setBulkUpdateType('countryCode')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${bulkUpdateType === 'countryCode' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Country Code</button>
                            </div>
                            <button onClick={() => setShowBulkUpdatePanel(false)} className="ml-auto text-indigo-400 hover:text-indigo-600"><X size={18} /></button>
                        </div>

                        {bulkUpdateType === 'assign' && (
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-100 animate-fadeIn flex-wrap">
                                {users.map(user => (
                                    <button
                                        key={user._id}
                                        onClick={async () => {
                                            if (!window.confirm(`Are you sure you want to assign ${selectedIds.length} contact(s) to ${user.username}?`)) return;
                                            await handleBulkAssign(user._id!);
                                            setShowBulkUpdatePanel(false);
                                        }}
                                        className="px-3 py-1 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded text-xs font-bold capitalize transition-all border border-gray-200/50 hover:border-indigo-600"
                                    >
                                        {user.username}
                                    </button>
                                ))}
                            </div>
                        )}

                        {bulkUpdateType === 'status' && (
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-100 animate-fadeIn">
                                {['new', 'contacted', 'booking_confirmed', 'deal_closed'].map(s => (
                                    <button
                                        key={s}
                                        onClick={async () => {
                                            if (!window.confirm(`Are you sure you want to update the status of ${selectedIds.length} contact(s)?`)) return;
                                            await bulkUpdateLeads(selectedIds, { status: s as 'new' | 'contacted' | 'booking_confirmed' | 'deal_closed' });
                                            setSelectedIds([]);
                                            setShowBulkUpdatePanel(false);
                                        }}
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
                                        onClick={async () => {
                                            if (!window.confirm(`Are you sure you want to update the lead type of ${selectedIds.length} contact(s)?`)) return;
                                            await bulkUpdateLeads(selectedIds, { leadType: t as 'hot' | 'warm' | 'cold' });
                                            setSelectedIds([]);
                                            setShowBulkUpdatePanel(false);
                                        }}
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
                                    onCreateTag={async (name) => {
                                        await addTag({ name });
                                    }}
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
                                            if (!window.confirm(`Are you sure you want to ${bulkTagUpdateType} tags for ${selectedIds.length} contact(s)?`)) return;
                                            if (bulkTagUpdateType === 'add') {
                                                await bulkUpdateLeads(selectedIds, undefined, bulkTags);
                                            } else {
                                                await bulkUpdateLeads(selectedIds, undefined, undefined, bulkTags);
                                            }
                                            setBulkTags([]);
                                            setBulkUpdateType(null);
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
                                            if (!window.confirm(`Are you sure you want to update the follow-up date for ${selectedIds.length} contact(s)?`)) {
                                                e.target.value = '';
                                                return;
                                            }
                                            await bulkUpdateLeads(selectedIds, { followupDate: new Date(date).toISOString() });
                                            setBulkUpdateType(null);
                                            setSelectedIds([]);
                                            setShowBulkUpdatePanel(false);
                                        }
                                    }}
                                />
                                <span className="text-[10px] text-gray-400 px-2 italic">Select date to apply</span>
                            </div>
                        )}
                        {bulkUpdateType === 'countryCode' && (
                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-indigo-100 animate-fadeIn overflow-x-auto no-scrollbar">
                                <span className="text-xs font-bold text-gray-500 ml-2 whitespace-nowrap">Select Prefix to Apply:</span>
                                <div className="flex gap-2 pb-1">
                                    {COUNTRIES.map(c => (
                                        <button
                                            key={`${c.iso}-${c.code}`}
                                            onClick={async () => {
                                                if (!window.confirm(`Apply ${c.flag} ${c.code || 'None'} prefix to ${selectedIds.length} contact(s)?`)) return;
                                                await bulkUpdatePhonePrefix(selectedIds, c.code);
                                                setSelectedIds([]);
                                                setShowBulkUpdatePanel(false);
                                                setBulkUpdateType(null);
                                            }}
                                            className="px-3 py-1 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded text-xs font-bold whitespace-nowrap transition-all border border-gray-200"
                                        >
                                            {c.flag} {c.code || 'None'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {showAdvancedFilters && currentMode !== 'apileads' && (
                    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                        {/* Backdrop overlay */}
                        <div 
                            onClick={() => setShowAdvancedFilters(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-backdropFadeIn cursor-pointer"
                        />
                        
                        {/* Side Drawer Container */}
                        <div className="relative w-full max-w-md sm:max-w-lg h-full bg-[#1B1B19]/95 backdrop-blur-md shadow-2xl border-l border-white/10 flex flex-col animate-slideInRight z-10 text-white">
                            
                            {/* Sticky Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">Advanced Filters</h3>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Refine your lead pipeline search</p>
                                </div>
                                <button 
                                    onClick={() => setShowAdvancedFilters(false)}
                                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable Form Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                                
                                {/* Section 1: Lead Details */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1.5">Lead Info</h4>
                                    
                                    {/* Contact Name */}
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Name</label>
                                        <input
                                            value={draftFilters.name}
                                            onChange={e => setDraftFilters(prev => ({ ...prev, name: e.target.value }))}
                                            onFocus={() => setNameFocused(true)}
                                            onBlur={() => setTimeout(() => setNameFocused(false), 200)}
                                            placeholder="Name..."
                                            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full animate-none"
                                        />
                                        {nameFocused && availableNames.length > 0 && (
                                            <div className="absolute z-50 mt-12 w-full max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#1B1B19] shadow-2xl py-1">
                                                {availableNames
                                                    .filter(n => !draftFilters.name || n.toLowerCase().includes(draftFilters.name.toLowerCase()))
                                                    .map(n => (
                                                        <button key={n} type="button" onMouseDown={() => setDraftFilters(prev => ({ ...prev, name: n }))} className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-600 transition-colors font-medium text-slate-200">{n}</button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone Number */}
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                        <div className="flex gap-1.5 w-full">
                                            <select
                                                value={draftFilters.countryCode || ''}
                                                onChange={e => setDraftFilters(prev => ({ ...prev, countryCode: e.target.value }))}
                                                className="text-[10px] w-20 px-2 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white focus:border-indigo-500 outline-none transition-all appearance-none scrollbar-hide font-bold cursor-pointer hover:bg-white/20"
                                                title="Search by Prefix"
                                            >
                                                <option value="" className="bg-[#1B1B19]">Any</option>
                                                {COUNTRIES.map(c => (
                                                    <option key={`${c.iso}-${c.code}`} value={c.code || 'none'} className="bg-[#1B1B19]">
                                                        {c.flag} {c.code || 'None'}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                value={draftFilters.phone}
                                                onChange={e => setDraftFilters(prev => ({ ...prev, phone: e.target.value }))}
                                                onFocus={() => setPhoneFocused(true)}
                                                onBlur={() => setTimeout(() => setPhoneFocused(false), 200)}
                                                placeholder="Phone..."
                                                className="text-xs flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            />
                                        </div>
                                        {phoneFocused && availablePhones.length > 0 && (
                                            <div className="absolute z-50 mt-12 w-full max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#1B1B19] shadow-2xl py-1">
                                                {availablePhones
                                                    .filter(p => !draftFilters.phone || p.includes(draftFilters.phone))
                                                    .map(p => (
                                                        <button key={p} type="button" onMouseDown={() => setDraftFilters(prev => ({ ...prev, phone: p }))} className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-600 transition-colors font-medium text-slate-200">{p}</button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Place */}
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Place</label>
                                        <input
                                            value={draftFilters.place}
                                            onChange={e => setDraftFilters(prev => ({ ...prev, place: e.target.value }))}
                                            onFocus={() => setPlaceFocused(true)}
                                            onBlur={() => setTimeout(() => setPlaceFocused(false), 200)}
                                            placeholder="Place..."
                                            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full"
                                        />
                                        {placeFocused && availablePlaces.length > 0 && (
                                            <div className="absolute z-50 mt-12 w-full max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#1B1B19] shadow-2xl py-1">
                                                {availablePlaces
                                                    .filter(p => !draftFilters.place || p.toLowerCase().includes(draftFilters.place.toLowerCase()))
                                                    .map(p => (
                                                        <button key={p} type="button" onMouseDown={() => setDraftFilters(prev => ({ ...prev, place: p }))} className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-600 transition-colors font-medium text-slate-200">{p}</button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Designation */}
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                                        <input
                                            value={draftFilters.designation}
                                            onChange={e => setDraftFilters(prev => ({ ...prev, designation: e.target.value }))}
                                            onFocus={() => setDesignationFocused(true)}
                                            onBlur={() => setTimeout(() => setDesignationFocused(false), 200)}
                                            placeholder="Designation..."
                                            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full"
                                        />
                                        {designationFocused && availableDesignations.length > 0 && (
                                            <div className="absolute z-50 mt-12 w-full max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#1B1B19] shadow-2xl py-1">
                                                {availableDesignations
                                                    .filter(d => !draftFilters.designation || d.toLowerCase().includes(draftFilters.designation.toLowerCase()))
                                                    .map(d => (
                                                        <button key={d} type="button" onMouseDown={() => setDraftFilters(prev => ({ ...prev, designation: d }))} className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-600 transition-colors font-medium text-slate-200">{d}</button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section 2: Pipeline & Status */}
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1.5">Pipeline & Assignment</h4>
                                    
                                    {/* Status */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                        <select value={draftFilters.status} onChange={e => setDraftFilters(prev => ({ ...prev, status: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Status</option>
                                            <option value="new" className="bg-[#1B1B19]">New</option>
                                            <option value="contacted" className="bg-[#1B1B19]">Contacted</option>
                                            <option value="booking_confirmed" className="bg-[#1B1B19]">Booking Confirmed</option>
                                            <option value="deal_closed" className="bg-[#1B1B19]">Deal Closed</option>
                                        </select>
                                    </div>

                                    {/* Type */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                        <select value={draftFilters.leadType} onChange={e => setDraftFilters(prev => ({ ...prev, leadType: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Type</option>
                                            <option value="hot" className="bg-[#1B1B19]">Hot</option>
                                            <option value="warm" className="bg-[#1B1B19]">Warm</option>
                                            <option value="cold" className="bg-[#1B1B19]">Cold</option>
                                        </select>
                                    </div>

                                    {/* Origin */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origin</label>
                                        <select value={draftFilters.leadOrigin} onChange={e => setDraftFilters(prev => ({ ...prev, leadOrigin: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Origin</option>
                                            <option value="whatsapp" className="bg-[#1B1B19]">WhatsApp</option>
                                            <option value="insta" className="bg-[#1B1B19]">Instagram</option>
                                            <option value="fb" className="bg-[#1B1B19]">Facebook</option>
                                            <option value="walk-in" className="bg-[#1B1B19]">Walk-in</option>
                                            <option value="tele" className="bg-[#1B1B19]">Tele Caller</option>
                                            <option value="referral" className="bg-[#1B1B19]">Referral</option>
                                            <option value="web" className="bg-[#1B1B19]">Website</option>
                                            <option value="olx" className="bg-[#1B1B19]">OLX</option>
                                            <option value="team-tech" className="bg-[#1B1B19]">Team-Tech</option>
                                            <option value="other" className="bg-[#1B1B19]">Other</option>
                                        </select>
                                    </div>

                                    {/* Owner */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Owner</label>
                                        <select value={draftFilters.assignedTo} onChange={e => setDraftFilters(prev => ({ ...prev, assignedTo: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Owner</option>
                                            <option value="unassigned" className="bg-[#1B1B19]">Unassigned</option>
                                            {users.map(u => <option key={u._id} value={u._id} className="bg-[#1B1B19]">{u.username}</option>)}
                                        </select>
                                    </div>

                                    {/* Creation Date */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Creation Date</label>
                                        <input type="date" value={draftFilters.date} onChange={e => setDraftFilters(prev => ({ ...prev, date: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium color-scheme-dark w-full" title="Filter by creation date" />
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tags</label>
                                        <TagInput
                                            selectedTags={draftFilters.tags}
                                            onTagsChange={tags => setDraftFilters(prev => ({ ...prev, tags }))}
                                            availableTags={availableTags}
                                            placeholder="Select tags..."
                                            isDark={true}
                                        />
                                    </div>
                                </div>

                                {/* Section 3: Financials & Vehicle Details */}
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1.5">Vehicle & Budget</h4>
                                    
                                    {/* Payment */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payment</label>
                                        <select value={draftFilters.paymentStatus} onChange={e => setDraftFilters(prev => ({ ...prev, paymentStatus: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Payment</option>
                                            <option value="" className="bg-[#1B1B19]">None</option>
                                            <option value="advance payment" className="bg-[#1B1B19]">Advance</option>
                                            <option value="full payment" className="bg-[#1B1B19]">Full</option>
                                        </select>
                                    </div>

                                    {/* Method */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Method</label>
                                        <select value={draftFilters.bookMethod} onChange={e => setDraftFilters(prev => ({ ...prev, bookMethod: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Method</option>
                                            <option value="" className="bg-[#1B1B19]">None</option>
                                            <option value="loan" className="bg-[#1B1B19]">Loan</option>
                                            <option value="cash" className="bg-[#1B1B19]">Cash</option>
                                        </select>
                                    </div>

                                    {/* Intent */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Intent</label>
                                        <select value={draftFilters.intent} onChange={e => setDraftFilters(prev => ({ ...prev, intent: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Intent</option>
                                            <option value="buying" className="bg-[#1B1B19]">Buying</option>
                                            <option value="selling" className="bg-[#1B1B19]">Selling</option>
                                            <option value="exchange" className="bg-[#1B1B19]">Exchange</option>
                                        </select>
                                    </div>

                                    {/* Brand */}
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Brand</label>
                                        <input
                                            value={draftFilters.brand}
                                            onChange={e => setDraftFilters(prev => ({ ...prev, brand: e.target.value }))}
                                            onFocus={() => setBrandFocused(true)}
                                            onBlur={() => setTimeout(() => setBrandFocused(false), 200)}
                                            placeholder="Brand..."
                                            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full"
                                        />
                                        {brandFocused && availableBrandNames.length > 0 && (
                                            <div className="absolute z-50 mt-12 w-full max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#1B1B19] shadow-2xl py-1">
                                                {availableBrandNames
                                                    .filter(b => !draftFilters.brand || b.toLowerCase().includes(draftFilters.brand.toLowerCase()))
                                                    .map(b => (
                                                        <button key={b} type="button" onMouseDown={() => setDraftFilters(prev => ({ ...prev, brand: b }))} className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-600 transition-colors font-medium text-slate-200">{b}</button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Model */}
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Model</label>
                                        <input
                                            value={draftFilters.model}
                                            onChange={e => setDraftFilters(prev => ({ ...prev, model: e.target.value }))}
                                            onFocus={() => setModelFocused(true)}
                                            onBlur={() => setTimeout(() => setModelFocused(false), 200)}
                                            placeholder="Model..."
                                            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full"
                                        />
                                        {modelFocused && availableModelNames.length > 0 && (
                                            <div className="absolute z-50 mt-12 w-full max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#1B1B19] shadow-2xl py-1">
                                                {availableModelNames
                                                    .filter(m => !draftFilters.model || m.toLowerCase().includes(draftFilters.model.toLowerCase()))
                                                    .map(m => (
                                                        <button key={m} type="button" onMouseDown={() => setDraftFilters(prev => ({ ...prev, model: m }))} className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-600 transition-colors font-medium text-slate-200">{m}</button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Fuel */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fuel</label>
                                        <select value={draftFilters.fuelType} onChange={e => setDraftFilters(prev => ({ ...prev, fuelType: e.target.value }))} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium appearance-none w-full cursor-pointer">
                                            <option value="all" className="bg-[#1B1B19]">Any Fuel</option>
                                            <option value="petrol" className="bg-[#1B1B19]">Petrol</option>
                                            <option value="diesel" className="bg-[#1B1B19]">Diesel</option>
                                            <option value="electric" className="bg-[#1B1B19]">Electric</option>
                                            <option value="hybrid" className="bg-[#1B1B19]">Hybrid</option>
                                            <option value="cng" className="bg-[#1B1B19]">CNG</option>
                                        </select>
                                    </div>

                                    {/* Year */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Year</label>
                                        <input value={draftFilters.year} onChange={e => setDraftFilters(prev => ({ ...prev, year: e.target.value.replace(/\D/g, '') }))} placeholder="YYYY" className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all w-full" />
                                    </div>

                                    {/* KM Driven */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">KM Driven</label>
                                        <div className="flex items-center gap-1.5">
                                            <select value={draftFilters.kmDrivenOp} onChange={e => setDraftFilters(prev => ({ ...prev, kmDrivenOp: e.target.value as 'eq' | 'gt' | 'lt' }))} className="text-[10px] px-2 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold appearance-none">
                                                <option value="eq" className="bg-[#1B1B19]">Equal</option><option value="gt" className="bg-[#1B1B19]">Above</option><option value="lt" className="bg-[#1B1B19]">Below</option>
                                            </select>
                                            <input value={draftFilters.kmDriven} onChange={e => setDraftFilters(prev => ({ ...prev, kmDriven: e.target.value.replace(/\D/g, '') }))} placeholder="KM..." className="flex-1 min-w-0 text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none transition-all" />
                                        </div>
                                    </div>

                                    {/* Budget */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Budget</label>
                                        <div className="flex items-center gap-1.5">
                                            <select value={draftFilters.amountOp} onChange={e => setDraftFilters(prev => ({ ...prev, amountOp: e.target.value as 'eq' | 'gt' | 'lt' }))} className="text-[10px] px-2 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold appearance-none">
                                                <option value="eq" className="bg-[#1B1B19]">Equal</option><option value="gt" className="bg-[#1B1B19]">Above</option><option value="lt" className="bg-[#1B1B19]">Below</option>
                                            </select>
                                            <input value={draftFilters.amount} onChange={e => setDraftFilters(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))} placeholder="Price..." className="flex-1 min-w-0 text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Drawer Footer */}
                            <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md shrink-0 flex gap-3">
                                <button
                                    onClick={handleResetFilters}
                                    className="flex-1 py-2.5 text-xs font-bold text-red-100 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <X size={14} /> Reset
                                </button>
                                <button
                                    onClick={() => {
                                        handleApplyFilters();
                                        setShowAdvancedFilters(false); // Close sidebar on apply
                                    }}
                                    className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
                                >
                                    <Filter size={14} /> Apply
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            {currentMode === 'apileads' ? (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start bg-gray-50/30 overflow-y-auto max-h-[calc(100vh-350px)]">
                    {paginatedLeads.map((lead, idx) => (
                        <ApiLeadCard
                            key={lead._id}
                            lead={lead}
                            index={(currentPage - 1) * pageSize + idx + 1}
                            isEditing={editingApiLeadId === lead._id}
                            editData={editData}
                            editFocus={editFocus}
                            setEditData={setEditData}
                            setEditFocus={setEditFocus}
                            availablePlaces={availablePlaces}
                            availableDesignations={availableDesignations}
                            availableBrandNames={availableBrandNames}
                            availableModelNames={availableModelNames}
                            users={users}
                            onStartEdit={startEditApiLead}
                            onCancelEdit={cancelEditApiLead}
                            onSaveEdit={saveEditApiLead}
                            onDelete={() => {
                                if (window.confirm('Delete this pending lead?')) {
                                    deleteApiLead(lead._id!);
                                }
                            }}
                            onApprove={() => {
                                const isExisting = lead.existingInCrm === true;
                                const msg = isExisting
                                    ? 'This contact already exists in CRM. New car details and notes will be merged into them. Continue?'
                                    : 'Approve this lead and add to CRM?';
                                if (window.confirm(msg)) {
                                    approveApiLead(lead._id!);
                                }
                            }}
                            selected={selectedIds.includes(lead._id!)}
                            onSelect={(checked: boolean) => handleSelectLead(lead._id!, checked)}
                            onNavigate={(id: string) => navigate(`/contact/${id}`)}
                        />
                    ))}
                </div>
            ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/30">
                        {paginatedLeads.map(lead => (
                            <LeadMobileCard
                                key={lead._id}
                                lead={lead}
                                onNavigate={(id: string) => navigate(`/contact/${id}`)}
                            />
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-left border-collapse">
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
                            {paginatedLeads.map((lead, idx) => (
                                <LeadTableRow
                                    key={lead._id}
                                    lead={lead}
                                    index={(currentPage - 1) * pageSize + idx + 1}
                                    selected={selectedIds.includes(lead._id!)}
                                    onSelect={(checked: boolean) => handleSelectLead(lead._id!, checked)}
                                    onNavigate={(id: string) => navigate(`/contact/${id}`)}
                                />
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
                        Showing {
                            currentMode === 'apileads'
                                ? (filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0)
                                : (totalLeads > 0 ? (currentPage - 1) * pageSize + 1 : 0)
                        } to {
                            currentMode === 'apileads'
                                ? Math.min(currentPage * pageSize, filteredLeads.length)
                                : Math.min(currentPage * pageSize, totalLeads)
                        } of {
                            currentMode === 'apileads' ? filteredLeads.length : totalLeads
                        }
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Save Smart List</h3>
                        <input
                            type="text"
                            placeholder="List name..."
                            value={smartListName}
                            onChange={(e) => setSmartListName(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none mb-6"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsSmartListModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                            <button onClick={handleSaveSmartList} className="px-6 py-2 bg-[#1B1B19] text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-200 hover:bg-black transition-all">Save List</button>
                        </div>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <LeadImportModal onClose={() => setIsImportModalOpen(false)} />
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

const ApiLeadCard = memo(({ lead, index, isEditing, editData, editFocus, setEditData, setEditFocus, availablePlaces, availableDesignations, availableBrandNames, availableModelNames, users, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onApprove, selected, onSelect, onNavigate }: any) => {
    const isExisting = lead.existingInCrm === true;
    return (
        <div className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-4 h-fit relative ${isEditing ? 'border-indigo-300 ring-2 ring-indigo-100' : isExisting ? 'border-amber-200 ring-1 ring-amber-50' : 'border-gray-200'}`}>
            <div className="absolute top-4 right-4 flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-300">#{index}</span>
                {!isEditing && (
                    <button onClick={() => onStartEdit(lead)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all" title="Edit">
                        <Edit3 size={14} />
                    </button>
                )}
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={e => onSelect(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
            </div>

            {isExisting && !isEditing && (
                <div className="absolute top-4 left-4 flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
                    <AlertTriangle size={10} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600">Existing Lead</span>
                </div>
            )}

            {isEditing ? (
                <div className="flex flex-col gap-3 pr-8">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Name</label>
                        <input value={editData.name} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                        <div className="flex gap-2">
                            <select
                                value={parsePhoneNumber(editData.phone || '').countryCode}
                                onChange={(e) => {
                                    const { localNumber } = parsePhoneNumber(editData.phone || '');
                                    setEditData((d: any) => ({ ...d, phone: `${e.target.value}${localNumber}` }));
                                }}
                                className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            >
                                <option value="">Select</option>
                                {COUNTRIES.map(c => (
                                    <option key={`${c.iso}-${c.code}`} value={c.code}>
                                        {c.flag} {c.code}
                                    </option>
                                ))}
                            </select>
                            <input
                                value={parsePhoneNumber(editData.phone || '').localNumber}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const { countryCode } = parsePhoneNumber(editData.phone || '');
                                    setEditData((d: any) => ({ ...d, phone: `${countryCode}${val}` }));
                                }}
                                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                placeholder="Number"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 relative">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Place</label>
                        <input value={editData.place} onChange={e => setEditData((d: any) => ({ ...d, place: e.target.value }))} onFocus={() => setEditFocus('place')} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                        {editFocus === 'place' && availablePlaces.filter((p: string) => !editData.place || p.toLowerCase().includes(editData.place.toLowerCase())).length > 0 && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                {availablePlaces.filter((p: string) => !editData.place || p.toLowerCase().includes(editData.place.toLowerCase())).map((p: string) => (
                                    <button key={p} type="button" onMouseDown={() => setEditData((d: any) => ({ ...d, place: p }))} className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50 transition-colors">{p}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5 relative">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Designation</label>
                        <input value={editData.designation} onChange={e => setEditData((d: any) => ({ ...d, designation: e.target.value }))} onFocus={() => setEditFocus('designation')} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                        {editFocus === 'designation' && availableDesignations.filter((d: string) => !editData.designation || d.toLowerCase().includes(editData.designation.toLowerCase())).length > 0 && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                {availableDesignations.filter((d: string) => !editData.designation || d.toLowerCase().includes(editData.designation.toLowerCase())).map((d: string) => (
                                    <button key={d} type="button" onMouseDown={() => setEditData((dd: any) => ({ ...dd, designation: d }))} className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50 transition-colors">{d}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source</label>
                        <select value={editData.leadOrigin} onChange={e => setEditData((d: any) => ({ ...d, leadOrigin: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all">
                            <option value="">Select Origin</option>
                            <option value="whatsapp">WhatsApp</option><option value="insta">Instagram</option><option value="fb">Facebook</option>
                            <option value="walk-in">Walk-in</option><option value="tele">Tele Caller</option><option value="referral">Referral</option>
                            <option value="web">Website</option><option value="olx">OLX</option>
                            <option value="team-tech">Team-Tech</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><UserIcon size={10} /> Assign To</label>
                        <select value={editData.assignedTo} onChange={e => setEditData((d: any) => ({ ...d, assignedTo: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all">
                            <option value="">Unassigned</option>
                            {users.map((u: any) => <option key={u._id} value={u._id}>{u.username}</option>)}
                        </select>
                    </div>

                    {(editData.carDetails?.length ?? 0) > 0 && (
                        <div className="flex flex-col gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Car size={10} /> Vehicles</span>
                            {(editData.carDetails ?? []).map((car: CarDetail, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/20 flex flex-col gap-2">
                                    <select value={car.intent} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], intent: e.target.value as 'buying' | 'selling' | 'exchange' }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs">
                                        <option value="buying">Buying</option><option value="selling">Selling</option><option value="exchange">Exchange</option>
                                    </select>
                                    {car.intent !== 'selling' && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Wanted Car</span>
                                            <div className="flex gap-1.5 relative">
                                                <div className="flex-1 relative">
                                                    <input placeholder="Brand" value={car.wantedCar?.brandName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), brandName: e.target.value } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`wb${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                    {editFocus === `wb${idx}` && availableBrandNames.filter((b: string) => !car.wantedCar?.brandName || b.toLowerCase().includes((car.wantedCar?.brandName || '').toLowerCase())).length > 0 && (
                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                            {availableBrandNames.filter((b: string) => !car.wantedCar?.brandName || b.toLowerCase().includes((car.wantedCar?.brandName || '').toLowerCase())).map((b: string) => (
                                                                <button key={b} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), brandName: b } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{b}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input placeholder="Model" value={car.wantedCar?.modelName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), modelName: e.target.value } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`wm${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                    {editFocus === `wm${idx}` && availableModelNames.filter((m: string) => !car.wantedCar?.modelName || m.toLowerCase().includes((car.wantedCar?.modelName || '').toLowerCase())).length > 0 && (
                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                            {availableModelNames.filter((m: string) => !car.wantedCar?.modelName || m.toLowerCase().includes((car.wantedCar?.modelName || '').toLowerCase())).map((m: string) => (
                                                                <button key={m} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], wantedCar: { ...(cd[idx].wantedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), modelName: m } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{m}</button>
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
                                                    <input placeholder="Brand" value={car.ownedCar?.brandName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), brandName: e.target.value } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`ob${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                    {editFocus === `ob${idx}` && availableBrandNames.filter((b: string) => !car.ownedCar?.brandName || b.toLowerCase().includes((car.ownedCar?.brandName || '').toLowerCase())).length > 0 && (
                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                            {availableBrandNames.filter((b: string) => !car.ownedCar?.brandName || b.toLowerCase().includes((car.ownedCar?.brandName || '').toLowerCase())).map((b: string) => (
                                                                <button key={b} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), brandName: b } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{b}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input placeholder="Model" value={car.ownedCar?.modelName || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), modelName: e.target.value } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} onFocus={() => setEditFocus(`om${idx}`)} onBlur={() => setTimeout(() => setEditFocus(null), 150)} className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                    {editFocus === `om${idx}` && availableModelNames.filter((m: string) => !car.ownedCar?.modelName || m.toLowerCase().includes((car.ownedCar?.modelName || '').toLowerCase())).length > 0 && (
                                                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                            {availableModelNames.filter((m: string) => !car.ownedCar?.modelName || m.toLowerCase().includes((car.ownedCar?.modelName || '').toLowerCase())).map((m: string) => (
                                                                <button key={m} type="button" onMouseDown={() => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), modelName: m } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} className="w-full px-2 py-1 text-left text-xs hover:bg-indigo-50">{m}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <input placeholder="Year" value={car.ownedCar?.year || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), year: e.target.value } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                                <input placeholder="KM" value={car.ownedCar?.kmDriven || ''} onChange={e => { const cd = [...(editData.carDetails ?? [])]; cd[idx] = { ...cd[idx], ownedCar: { ...(cd[idx].ownedCar || { brandName: '', modelName: '', fuelType: '', kmDriven: '' }), kmDriven: e.target.value } }; setEditData((d: any) => ({ ...d, carDetails: cd })); }} className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2 mt-2">
                        <button onClick={onCancelEdit} className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all">Cancel</button>
                        <button onClick={onSaveEdit} className="flex-1 px-3 py-2 bg-[#1B1B19] text-white rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-sm"><Save size={14} /> Save</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className={`flex flex-col gap-1 pr-8 ${isExisting ? 'mt-6' : ''}`}>
                        <button
                            onClick={() => onNavigate(lead._id)}
                            className="font-bold text-lg text-gray-900 hover:text-indigo-600 text-left leading-tight"
                        >
                            {lead.name}
                        </button>
                        <a href={`tel:${lead.phone}`} className="text-sm text-indigo-600 font-medium flex items-center gap-1.5 hover:underline w-fit">
                            <Phone size={14} /> {lead.phone}
                        </a>
                    </div>

                    {(lead.place || lead.designation || lead.leadOrigin) && (
                        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg text-xs">
                            {lead.place && <div className="flex items-center justify-between"><span className="text-gray-500">Place</span><span className="font-bold text-gray-700">{lead.place}</span></div>}
                            {lead.designation && <div className="flex items-center justify-between"><span className="text-gray-500">Designation</span><span className="font-bold text-gray-700">{lead.designation}</span></div>}
                            {lead.leadOrigin && <div className="flex items-center justify-between"><span className="text-gray-500">Source</span><span className="font-bold text-gray-700">{lead.leadOrigin}</span></div>}
                        </div>
                    )}

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
                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1"><Car size={12} /> Vehicles ({lead.carDetails.length})</span>
                            {lead.carDetails.map((car: any, idx: number) => (
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

                    <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-gray-100">
                        <div className="flex gap-2">
                            <button
                                onClick={onDelete}
                                className="px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all font-bold text-xs"
                            >
                                Delete
                            </button>
                            <button
                                onClick={onApprove}
                                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm ${isExisting
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                                    }`}
                            >
                                {isExisting ? (
                                    <><AlertTriangle size={14} /> Update in CRM</>
                                ) : (
                                    <><CheckCircle2 size={16} /> Add to CRM</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});

const LeadMobileCard = memo(({ lead, onNavigate }: any) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <button
                        onClick={() => onNavigate(lead._id)}
                        className="font-bold text-base text-gray-900 hover:text-indigo-600 text-left"
                    >
                        {lead.name}
                    </button>
                    <span className="text-xs text-gray-500">{lead.place || 'No Place'}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${lead.leadType === 'hot' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                    lead.leadType === 'warm' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                    {lead.leadType}
                </span>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                    <Briefcase size={12} className="text-gray-400" />
                    <span>{lead.designation || 'No Designation'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-gray-400" />
                    <span>{lead.createdAt ? format(parseISO(lead.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <UserIcon size={12} className="text-gray-400" />
                    <span>{typeof lead.assignedTo === 'object' ? lead.assignedTo?.username : 'Unassigned'}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-1">
                {lead.tags.map((tag: any, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded text-[9px] font-medium">
                        {typeof tag === 'string' ? tag : tag.name}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${lead.status === 'booking_confirmed' || lead.status === 'deal_closed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                    {lead.status.replace('_', ' ')}
                </span>
                <div className="flex gap-2">
                    <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    >
                        <Phone size={12} /> Call
                    </a>
                    <button
                        onClick={() => onNavigate(lead._id)}
                        className="px-3 py-1.5 bg-[#1B1B19] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider"
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    );
});

const LeadTableRow = memo(({ lead, index, selected, onSelect, onNavigate }: any) => {
    return (
        <tr className="hover:bg-indigo-50/30 transition-all group">
            <td className="p-4">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={e => onSelect(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
            </td>
            <td className="p-4 text-[10px] font-bold text-gray-300">
                {index}
            </td>
            <td className="p-4">
                <div className="flex flex-col">
                    <button
                        onClick={() => onNavigate(lead._id)}
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
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${lead.status === 'booking_confirmed' || lead.status === 'deal_closed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
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
                    {lead.tags.length > 0 ? lead.tags.map((tag: any, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded text-[9px] font-medium">
                            {typeof tag === 'string' ? tag : tag.name}
                        </span>
                    )) : <span className="text-[9px] text-gray-300 italic">No tags</span>}
                </div>
            </td>
            <td className="p-4 text-[10px] text-gray-500 whitespace-nowrap">
                {lead.createdAt ? format(parseISO(lead.createdAt), 'MMM d, yyyy') : 'N/A'}
            </td>
        </tr>
    );
});
