import { useState, useEffect, useMemo } from 'react';
import { Save, X, Plus, Trash2, Car, AlertCircle, Tag, Edit3 } from 'lucide-react';
import { useLeads } from '../../context/LeadsContext';
import { Lead, CarDetail, VehicleInfo } from '../../types';
import { TagInput } from '../../components/TagInput';
import { format } from 'date-fns';
import { COUNTRIES, DEFAULT_COUNTRY, parsePhoneNumber } from '../../constants/countries';

const formatLocalDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getMinFollowupDate = () => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(17, 30, 0, 0); // 5:30 PM
    
    if (now > cutoff) {
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        return formatLocalDate(tomorrow);
    } else {
        return formatLocalDate(now);
    }
};

interface LeadFormModalProps {
    onClose: () => void;
    initialData?: Lead;
    inline?: boolean;
}

export function LeadFormModal({ onClose, initialData, inline }: LeadFormModalProps) {
    const { addLead, updateLead, updateApiLead, users, leads, tags: globalTags, addTag } = useLeads();

    // Get unique tags from all leads for suggestions
    const availableTags = useMemo(() => globalTags.map(t => ({ _id: t._id, name: t.name })), [globalTags]);

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

    const [formData, setFormData] = useState<Partial<Lead>>({
        name: '',
        phone: '',
        place: '',
        designation: '',
        leadOrigin: 'Other',
        enquiredVehicle: '',
        leadType: 'hot',
        status: 'new',
        notes: [],
        tags: [],
        carDetails: [],
        assignedTo: undefined,
        followupDate: '',
        followupNote: [],
        followupCount: 0,
        paymentStatus: '',
        bookMethod: '',
        referredBy: ''
    });

    const [phoneData, setPhoneData] = useState({
        countryCode: DEFAULT_COUNTRY.code,
        localPhone: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [newGeneralNote, setNewGeneralNote] = useState('');
    const [newFollowupNote, setNewFollowupNote] = useState('');

    const handleAddNote = () => {
        if (!newGeneralNote.trim()) return;
        setFormData(prev => ({
            ...prev,
            notes: [...(prev.notes || []), `${format(new Date(), 'EEEE, do MMMM yyyy')} - ${newGeneralNote.trim()}`]
        }));
        setNewGeneralNote('');
    };

    const handleAddFollowupNote = () => {
        if (!newFollowupNote.trim()) return;
        setFormData(prev => ({
            ...prev,
            followupNote: [...(prev.followupNote || []), `${format(new Date(), 'EEEE, do MMMM yyyy')} - ${newFollowupNote.trim()}`]
        }));
        setNewFollowupNote('');
    };

    useEffect(() => {
        if (initialData) {
            // Normalize carDetails to ensure legacy data is moved to nested structure for the form
            // Also ensure all fields are initialized to avoid undefined issues in the form
            const normalizedCarDetails = (initialData.carDetails || []).map(car => {
                const normalized = { ...car };
                
                // Initialize nested objects if they don't exist but data is present in legacy fields
                if (car.intent === 'buying' || car.intent === 'exchange') {
                    if (!normalized.wantedCar) {
                        normalized.wantedCar = {
                            brandName: car.brandName || '',
                            modelName: car.modelName || '',
                            fuelType: car.fuelType || '',
                            kmDriven: car.kmDriven || '',
                            year: '',
                            amount: ''
                        } as VehicleInfo;
                    }
                }
                
                if (car.intent === 'selling' || car.intent === 'exchange') {
                    if (!normalized.ownedCar) {
                        normalized.ownedCar = {
                            brandName: car.brandName || '',
                            modelName: car.modelName || '',
                            fuelType: car.fuelType || '',
                            kmDriven: car.kmDriven || '',
                            year: '',
                            amount: ''
                        } as VehicleInfo;
                    }
                }
                
                return normalized;
            });

            // Special handling for API leads which store countryCode and phone separately
            const isApiLead = (initialData as any).isApiLead;
            if (isApiLead && (initialData as any).countryCode !== undefined) {
                setPhoneData({ 
                    countryCode: (initialData as any).countryCode || '', 
                    localPhone: initialData.phone || '' 
                });
            } else {
                const { countryCode, localNumber } = parsePhoneNumber(initialData.phone || '');
                setPhoneData({ countryCode, localPhone: localNumber });
            }

            setFormData({
                ...initialData,
                carDetails: normalizedCarDetails,
                assignedTo: typeof initialData.assignedTo === 'object' ? (initialData.assignedTo as { _id: string })._id : initialData.assignedTo
            } as any);
        } else {
            setPhoneData({ countryCode: DEFAULT_COUNTRY.code, localPhone: '' });
        }
    }, [initialData?._id]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Name is required';

        const { countryCode, localPhone } = phoneData;
        const country = COUNTRIES.find(c => c.code === countryCode) || DEFAULT_COUNTRY;
        
        if (!localPhone.trim()) {
            newErrors.phone = 'Phone is required';
        } else if (!countryCode) {
            newErrors.phone = 'Country code is required';
        } else {
            const isValid = Array.isArray(country.length) 
                ? country.length.includes(localPhone.length) 
                : localPhone.length === country.length;
            
            if (!isValid) {
                const expected = Array.isArray(country.length) ? country.length.join(' or ') : country.length;
                newErrors.phone = `Phone must be ${expected} digits for ${country.name}`;
            } else {
                // Check for duplicate phone
                const fullPhone = `${countryCode}${localPhone}`;
                const isDuplicate = leads.some(l => l.phone === fullPhone && l._id !== initialData?._id);
                if (isDuplicate) {
                    newErrors.phone = `A contact with phone ${fullPhone} already exists`;
                }
            }
        }

        if (formData.followupDate) {
            const dateStr = formData.followupDate.split('T')[0];
            const minDate = getMinFollowupDate();
            if (dateStr < minDate) {
                const now = new Date();
                const cutoff = new Date();
                cutoff.setHours(17, 30, 0, 0);
                if (now > cutoff && dateStr === formatLocalDate(now)) {
                    newErrors.followupDate = 'Cannot schedule same-day follow-up after 5:30 PM';
                } else {
                    newErrors.followupDate = 'Cannot select a past date';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        const { value } = e.target;

        // Restrict phone logic moved to specialized handlers
        if (name === 'phone') return;

        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const handleCarDetailChange = (index: number, field: keyof CarDetail | `wantedCar.${keyof VehicleInfo}` | `ownedCar.${keyof VehicleInfo}`, value: string) => {
        const newCarDetails = [...(formData.carDetails || [])];
        const currentCar = { ...newCarDetails[index] };

        if ((field as string).startsWith('wantedCar.')) {
            const subField = (field as string).split('.')[1] as keyof VehicleInfo;
            currentCar.wantedCar = { ...(currentCar.wantedCar || {} as VehicleInfo), [subField]: value };
        } else if ((field as string).startsWith('ownedCar.')) {
            const subField = (field as string).split('.')[1] as keyof VehicleInfo;
            currentCar.ownedCar = { ...(currentCar.ownedCar || {} as VehicleInfo), [subField]: value };
        } else {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            (currentCar as any)[field] = value;
        }

        // Auto-initialize nested objects based on intent
        if (field === 'intent') {
            if (value === 'buying' || value === 'exchange') {
                if (!currentCar.wantedCar) currentCar.wantedCar = { brandName: '', modelName: '', fuelType: '', kmDriven: '', year: '', amount: '' };
            }
            if (value === 'selling' || value === 'exchange') {
                if (!currentCar.ownedCar) currentCar.ownedCar = { brandName: '', modelName: '', fuelType: '', kmDriven: '', year: '', amount: '' };
            }
        }

        newCarDetails[index] = currentCar;
        setFormData(prev => ({ ...prev, carDetails: newCarDetails }));
    };

    const addCarDetail = () => {
        const newCar: CarDetail = {
            additionalReqs: '',
            intent: 'buying',
            wantedCar: { brandName: '', modelName: '', fuelType: '', kmDriven: '', year: '', amount: '' }
        };
        setFormData(prev => ({ ...prev, carDetails: [...(prev.carDetails || []), newCar] }));
    };

    const removeCarDetail = (index: number) => {
        setFormData(prev => ({
            ...prev,
            carDetails: prev.carDetails?.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const finalData = { 
            ...formData, 
            phone: `${phoneData.countryCode}${phoneData.localPhone}` 
        };

        if (initialData) {
            if (!window.confirm('Are you sure you want to update this contact?')) return;
            // Check if it's an API Lead based on the flag we set in context
            if ((initialData as Lead & { isApiLead?: boolean }).isApiLead) {
                updateApiLead(initialData._id!, finalData);
            } else {
                updateLead(initialData._id!, finalData);
            }
        } else {
            addLead(finalData);
        }
        onClose();
    };

    const isEdit = !!initialData;

    const formContent = (
        <form onSubmit={handleSubmit} className={inline ? "flex flex-col gap-6 p-6 lg:p-8" : "flex flex-col gap-6 p-6 overflow-y-auto max-h-[90vh]"}>
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Name <span className="text-red-500">*</span></label>
                    <input
                        name="name"
                        required
                        value={formData.name || ''}
                        onChange={handleChange}
                        className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-4 ${errors.name ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'}`}
                    />
                    {errors.name && <span className="mt-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 flex items-center gap-1.5"><AlertCircle size={12} /> {errors.name}</span>}
                </div>
                <div className="flex flex-col gap-1">
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Phone <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                        <select
                            value={phoneData.countryCode}
                            onChange={(e) => {
                                setPhoneData(prev => ({ ...prev, countryCode: e.target.value }));
                                if (errors.phone) setErrors(prev => {
                                    const updated = { ...prev };
                                    delete updated.phone;
                                    return updated;
                                });
                            }}
                            className={`w-28 rounded-xl border px-3 py-3 text-sm transition-all focus:outline-none focus:ring-4 ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'}`}
                        >
                            {COUNTRIES.map(c => (
                                <option key={`${c.iso}-${c.code}`} value={c.code}>
                                    {c.flag} {c.code || 'None'}
                                </option>
                            ))}
                        </select>
                        <input
                            name="phone"
                            required
                            value={phoneData.localPhone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const country = COUNTRIES.find(c => c.code === phoneData.countryCode) || DEFAULT_COUNTRY;
                                const maxLen = Array.isArray(country.length) ? Math.max(...country.length) : country.length;
                                if (val.length <= maxLen) {
                                    setPhoneData(prev => ({ ...prev, localPhone: val }));
                                    if (errors.phone) setErrors(prev => {
                                        const updated = { ...prev };
                                        delete updated.phone;
                                        return updated;
                                    });
                                }
                            }}
                            className={`flex-1 rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-4 ${errors.phone ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'}`}
                            placeholder="Phone Number"
                        />
                    </div>
                    {errors.phone && <span className="mt-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 flex items-center gap-1.5"><AlertCircle size={12} /> {errors.phone}</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="relative">
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Place</label>
                    <input
                        name="place"
                        value={formData.place}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('place')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    />
                    {availablePlaces.length > 0 && formData.place && focusedField === 'place' && (
                        <div className="absolute top-full left-0 z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {availablePlaces
                                .filter(p => p.toLowerCase().includes((formData.place || '').toLowerCase()))
                                .map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onMouseDown={() => setFormData(prev => ({ ...prev, place: p }))}
                                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                    >
                                        {p}
                                    </button>
                                ))}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Designation</label>
                    <input
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('designation')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    />
                    {availableDesignations.length > 0 && formData.designation && focusedField === 'designation' && (
                        <div className="absolute top-full left-0 z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {availableDesignations
                                .filter(d => d.toLowerCase().includes((formData.designation || '').toLowerCase()))
                                .map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onMouseDown={() => setFormData(prev => ({ ...prev, designation: d }))}
                                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                    >
                                        {d}
                                    </button>
                                ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Lead Origin</label>
                    <select name="leadOrigin" value={formData.leadOrigin?.toLowerCase()} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium">
                        <option value="whatsapp">WhatsApp</option>
                        <option value="insta">Insta</option>
                        <option value="fb">FB</option>
                        <option value="walk-in">Walk-in</option>
                        <option value="tele">Tele</option>
                        <option value="referral">Referral</option>
                        <option value="web">Web</option>
                        <option value="olx">OLX</option>
                        <option value="team-tech">Team-Tech</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                {formData.leadOrigin?.toLowerCase() === 'referral' && (
                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Referred By</label>
                        <input
                            name="referredBy"
                            value={formData.referredBy || ''}
                            onChange={handleChange}
                            placeholder="Name of referrer"
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>
                )}
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Assign To</label>
                    <select
                        name="assignedTo"
                        value={typeof formData.assignedTo === 'object' ? (formData.assignedTo as { _id: string })._id : formData.assignedTo}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    >
                        <option value="">Select User</option>
                        {users.map(user => (
                            <option key={user._id} value={user._id}>{user.username}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Payment Status</label>
                    <select
                        name="paymentStatus"
                        value={formData.paymentStatus?.toLowerCase()}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    >
                        <option value="">None</option>
                        <option value="advance payment">Advance Payment</option>
                        <option value="full payment">Full Payment</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Book Method</label>
                    <select
                        name="bookMethod"
                        value={formData.bookMethod?.toLowerCase()}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    >
                        <option value="">None</option>
                        <option value="loan">Loan</option>
                        <option value="cash">Cash</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Lead Type</label>
                    <select name="leadType" value={formData.leadType} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium">
                        <option value="hot">Hot</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium">
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="booking_confirmed">Booking Confirmed</option>
                        <option value="deal_closed">Deal Closed</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Tag size={16} className="text-indigo-500" />
                    Tags
                </label>
                <TagInput
                    selectedTags={formData.tags || []}
                    onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                    availableTags={availableTags}
                    onCreateTag={async (name) => {
                        await addTag({ name });
                    }}
                    placeholder="Add tags (e.g. priority, web-lead)..."
                />
            </div>

            {/* Car Details Section */}
            <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold text-indigo-900">
                        <Car size={20} />
                        Car Details
                    </h3>
                    <button
                        type="button"
                        onClick={addCarDetail}
                        className="flex items-center gap-1.5 rounded-lg bg-[#1B1B19] px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-black"
                    >
                        <Plus size={14} /> Add Car
                    </button>
                </div>

                {formData.carDetails?.map((car, idx) => (
                    <div key={idx} className="relative grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                        <button
                            type="button"
                            onClick={() => removeCarDetail(idx)}
                            className="absolute -top-2 -right-2 rounded-full bg-red-50 p-1.5 text-red-500 border border-red-200 hover:bg-red-100"
                        >
                            <Trash2 size={14} />
                        </button>
                        <div className="flex flex-col gap-1.5 md:col-span-3">
                            <label className="text-[10px] font-bold uppercase text-gray-700">Intent</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleCarDetailChange(idx, 'intent', 'buying')}
                                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition-all ${car.intent === 'buying' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                > buying </button>
                                <button
                                    type="button"
                                    onClick={() => handleCarDetailChange(idx, 'intent', 'selling')}
                                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition-all ${car.intent === 'selling' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                > selling </button>
                                <button
                                    type="button"
                                    onClick={() => handleCarDetailChange(idx, 'intent', 'exchange')}
                                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold border transition-all ${car.intent === 'exchange' ? 'bg-[#1B1B19] text-white border-[#1B1B19]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                > exchange </button>
                            </div>
                        </div>

                        {/* RENDER WANTED CAR IF BUYING OR EXCHANGE */}
                        {(car.intent === 'buying' || car.intent === 'exchange') && (
                            <div className="md:col-span-3 rounded-xl border border-blue-100 bg-blue-50/30 p-3 mt-2">
                                <h4 className="text-xs font-bold text-blue-800 mb-3 border-b border-blue-100 pb-2">Wanted Car (To Buy)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Brand Name</label>
                                        <input
                                            value={car.wantedCar?.brandName || ''}
                                            onChange={(e) => handleCarDetailChange(idx, 'wantedCar.brandName', e.target.value)}
                                            onFocus={() => setFocusedField(`car-${idx}-wanted-brand`)}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                        {availableBrandNames.length > 0 && car.wantedCar?.brandName && focusedField === `car-${idx}-wanted-brand` && (
                                            <div className="absolute top-full left-0 z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                {availableBrandNames
                                                    .filter(b => b.toLowerCase().includes((car.wantedCar?.brandName || '').toLowerCase()))
                                                    .map(b => (
                                                        <button
                                                            key={b}
                                                            type="button"
                                                            onMouseDown={() => handleCarDetailChange(idx, 'wantedCar.brandName', b)}
                                                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                                        >
                                                            {b}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Model Name</label>
                                        <input
                                            value={car.wantedCar?.modelName || ''}
                                            onChange={(e) => handleCarDetailChange(idx, 'wantedCar.modelName', e.target.value)}
                                            onFocus={() => setFocusedField(`car-${idx}-wanted-model`)}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                        {availableModelNames.length > 0 && car.wantedCar?.modelName && focusedField === `car-${idx}-wanted-model` && (
                                            <div className="absolute top-full left-0 z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                {availableModelNames
                                                    .filter(m => m.toLowerCase().includes((car.wantedCar?.modelName || '').toLowerCase()))
                                                    .map(m => (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            onMouseDown={() => handleCarDetailChange(idx, 'wantedCar.modelName', m)}
                                                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Fuel Type</label>
                                        <select value={car.wantedCar?.fuelType?.toLowerCase() || ''} onChange={(e) => handleCarDetailChange(idx, 'wantedCar.fuelType', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium">
                                            <option value="">Select Fuel</option>
                                            <option value="petrol">Petrol</option>
                                            <option value="diesel">Diesel</option>
                                            <option value="electric">Electric</option>
                                            <option value="hybrid">Hybrid</option>
                                            <option value="cng">CNG</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Year</label>
                                        <input
                                            value={car.wantedCar?.year || ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleCarDetailChange(idx, 'wantedCar.year', val);
                                            }}
                                            placeholder="YYYY"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">KM Driven</label>
                                        <input
                                            value={car.wantedCar?.kmDriven || ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleCarDetailChange(idx, 'wantedCar.kmDriven', val);
                                            }}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Amount / Budget</label>
                                        <input
                                            value={car.wantedCar?.amount || ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleCarDetailChange(idx, 'wantedCar.amount', val);
                                            }}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RENDER OWNED CAR IF SELLING OR EXCHANGE */}
                        {(car.intent === 'selling' || car.intent === 'exchange') && (
                            <div className="md:col-span-3 rounded-xl border border-amber-100 bg-amber-50/30 p-3 mt-2">
                                <h4 className="text-xs font-bold text-amber-800 mb-3 border-b border-amber-100 pb-2">Owned Car (To Trade/Sell)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Brand Name</label>
                                        <input
                                            value={car.ownedCar?.brandName || ''}
                                            onChange={(e) => handleCarDetailChange(idx, 'ownedCar.brandName', e.target.value)}
                                            onFocus={() => setFocusedField(`car-${idx}-owned-brand`)}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                        {availableBrandNames.length > 0 && car.ownedCar?.brandName && focusedField === `car-${idx}-owned-brand` && (
                                            <div className="absolute top-full left-0 z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                {availableBrandNames
                                                    .filter(b => b.toLowerCase().includes((car.ownedCar?.brandName || '').toLowerCase()))
                                                    .map(b => (
                                                        <button
                                                            key={b}
                                                            type="button"
                                                            onMouseDown={() => handleCarDetailChange(idx, 'ownedCar.brandName', b)}
                                                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                                        >
                                                            {b}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 relative">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Model Name</label>
                                        <input
                                            value={car.ownedCar?.modelName || ''}
                                            onChange={(e) => handleCarDetailChange(idx, 'ownedCar.modelName', e.target.value)}
                                            onFocus={() => setFocusedField(`car-${idx}-owned-model`)}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                        {availableModelNames.length > 0 && car.ownedCar?.modelName && focusedField === `car-${idx}-owned-model` && (
                                            <div className="absolute top-full left-0 z-40 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                {availableModelNames
                                                    .filter(m => m.toLowerCase().includes((car.ownedCar?.modelName || '').toLowerCase()))
                                                    .map(m => (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            onMouseDown={() => handleCarDetailChange(idx, 'ownedCar.modelName', m)}
                                                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50"
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Fuel Type</label>
                                        <select value={car.ownedCar?.fuelType?.toLowerCase() || ''} onChange={(e) => handleCarDetailChange(idx, 'ownedCar.fuelType', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium">
                                            <option value="">Select Fuel</option>
                                            <option value="petrol">Petrol</option>
                                            <option value="diesel">Diesel</option>
                                            <option value="electric">Electric</option>
                                            <option value="hybrid">Hybrid</option>
                                            <option value="cng">CNG</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Year</label>
                                        <input
                                            value={car.ownedCar?.year || ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleCarDetailChange(idx, 'ownedCar.year', val);
                                            }}
                                            placeholder="YYYY"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">KM Driven</label>
                                        <input
                                            value={car.ownedCar?.kmDriven || ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleCarDetailChange(idx, 'ownedCar.kmDriven', val);
                                            }}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Selling Price / Amount</label>
                                        <input
                                            value={car.ownedCar?.amount || ''}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                handleCarDetailChange(idx, 'ownedCar.amount', val);
                                            }}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5 md:col-span-3">
                            <label className="text-[10px] font-bold uppercase text-gray-700">Additional Requirements</label>
                            <input value={car.additionalReqs} onChange={(e) => handleCarDetailChange(idx, 'additionalReqs', e.target.value)} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm" />
                        </div>
                    </div>
                ))}

                {(!formData.carDetails || formData.carDetails.length === 0) && (
                    <div className="py-4 text-center text-sm text-indigo-400 italic">No car details added yet.</div>
                )}
            </div>


            <div className="flex flex-col gap-4 bg-gray-50/30 p-6 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2">
                    <Edit3 size={18} className="text-gray-700" />
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">General Notes</h3>
                </div>
                <div className="flex flex-col gap-4">
                    {/* New Note Input */}
                    <div className="flex gap-2">
                        <textarea
                            value={newGeneralNote}
                            onChange={(e) => setNewGeneralNote(e.target.value)}
                            placeholder="Type a general note..."
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm min-h-[80px] focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={handleAddNote}
                            disabled={!newGeneralNote.trim()}
                            className="self-end rounded-xl bg-[#1B1B19] px-4 py-2.5 text-xs font-bold text-white hover:bg-black transition-all disabled:opacity-50"
                        >
                            Add Note
                        </button>
                    </div>

                    {/* Existing Notes List */}
                    {formData.notes?.map((note, idx) => (
                        <div key={idx} className="flex gap-2 items-start relative">
                            <textarea
                                value={note}
                                onChange={(e) => {
                                    const newNotes = [...(formData.notes || [])];
                                    newNotes[idx] = e.target.value;
                                    setFormData(prev => ({ ...prev, notes: newNotes }));
                                }}
                                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm min-h-[80px] focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, notes: prev.notes?.filter((_, i) => i !== idx) }))}
                                className="p-1.5 text-gray-700 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all absolute top-2 right-2"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="flex flex-col gap-3">
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Follow-up Date</label>
                    <input
                        type="date"
                        name="followupDate"
                        min={getMinFollowupDate()}
                        value={formData.followupDate ? formData.followupDate.split('T')[0] : ''}
                        onChange={handleChange}
                        className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-4 ${
                            errors.followupDate
                                ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10'
                                : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                        }`}
                    />
                    {errors.followupDate && (
                        <span className="mt-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 flex items-center gap-1.5">
                            <AlertCircle size={12} /> {errors.followupDate}
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-3">
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-700 uppercase tracking-widest">Follow-up Notes</label>
                    <div className="flex flex-col gap-3">
                        {/* New Follow-up Note Input */}
                        <div className="flex gap-2">
                            <textarea
                                value={newFollowupNote}
                                onChange={(e) => setNewFollowupNote(e.target.value)}
                                placeholder="Type a follow-up summary..."
                                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm min-h-[60px] focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                            />
                            <button
                                type="button"
                                onClick={handleAddFollowupNote}
                                disabled={!newFollowupNote.trim()}
                                className="self-end rounded-xl bg-[#1B1B19] px-4 py-2.5 text-xs font-bold text-white hover:bg-black transition-all disabled:opacity-50"
                            >
                                Add Note
                            </button>
                        </div>

                        {/* Existing Follow-up Notes List */}
                        {formData.followupNote?.map((note, idx) => (
                            <div key={idx} className="flex gap-2 items-start relative group">
                                <textarea
                                    value={note}
                                    onChange={(e) => {
                                        const newNotes = [...(formData.followupNote || [])];
                                        newNotes[idx] = e.target.value;
                                        setFormData(prev => ({ ...prev, followupNote: newNotes }));
                                    }}
                                    placeholder="Write a follow-up note..."
                                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm min-h-[60px] focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newNotes = formData.followupNote?.filter((_, i) => i !== idx);
                                        setFormData(prev => ({ ...prev, followupNote: newNotes }));
                                    }}
                                    className="p-1.5 text-gray-700 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all absolute top-2 right-2"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-6">
                <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all">Cancel</button>
                <button type="submit" className="flex items-center gap-2 rounded-xl bg-[#1B1B19] px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-black transition-all active:scale-95">
                    <Save size={18} /> {isEdit ? 'Update Contact' : 'Save Contact'}
                </button>
            </div>
        </form>
    );

    if (inline) {
        return (
            <div className="w-full animate-fadeIn pb-10">
                <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                        <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Contact' : 'Add New Contact'}</h2>
                        <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900">
                            Cancel
                        </button>
                    </div>
                    {formContent}
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="flex w-full max-w-[95%] max-h-[95vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                    <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Contact' : 'Add New Contact'}</h2>
                    <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 shadow-sm border">
                        <X size={24} />
                    </button>
                </div>
                {formContent}
            </div>
        </div>
    );
}
