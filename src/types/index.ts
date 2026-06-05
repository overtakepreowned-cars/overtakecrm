export interface User {
    _id: string;
    username: string;
    role: 'admin' | 'manager' | 'sales';
}

export interface Tag {
    _id: string;
    name: string;
    createdAt?: string;
}

export interface VehicleInfo {
    brandName: string;
    modelName: string;
    fuelType: string;
    kmDriven: string;
    year?: string;
    amount?: string;
}

export interface CarDetail {
    _id?: string;
    // Legacy support
    brandName?: string;
    modelName?: string;
    fuelType?: string;
    kmDriven?: string;

    // New nested structure
    wantedCar?: VehicleInfo;
    ownedCar?: VehicleInfo;

    additionalReqs?: string;
    intent: 'buying' | 'selling' | 'exchange';
}

export interface AssignmentRecord {
    _id?: string;
    userId: User;
    assignedAt: string;
    assignedBy: string;
}

export interface FollowupRecord {
    _id?: string;
    userId?: string;
    scheduledDate: string;
    completedDate: string;
    newScheduledDate?: string;
    note?: string;
    wasMissed: boolean;
    result: 'responded' | 'not_responded' | 'rescheduled';
}

export interface Lead {
    _id: string;
    name: string;
    phone: string;
    place: string;
    designation: string;
    leadOrigin: string; // Keep it simple to avoid enum hell between API and UI

    enquiredVehicle: string;
    leadType: 'hot' | 'warm' | 'cold';
    status: 'new' | 'contacted' | 'booking_confirmed' | 'deal_closed';
    notes: string[];
    tags: (Tag | string)[];
    carDetails: CarDetail[];
    assignedTo?: User;
    assignmentHistory: AssignmentRecord[];
    followupDate?: string;
    followupNote?: string[];
    followupCount: number;
    followupHistory: FollowupRecord[];
    paymentStatus?: 'Advance Payment' | 'Full Payment' | '';
    bookMethod?: 'loan' | 'cash' | '';
    referredBy?: string;
    createdAt: string;
    updatedAt: string;
    // Api lead fields
    isApiLead?: boolean;
    existingInCrm?: boolean;
}

export interface SmartList {
    _id: string;
    name: string;
    filters: LeadFilter;
}

export interface LeadFilter {
    search?: string;
    name?: string;
    phone?: string;
    countryCode?: string;
    place?: string;
    designation?: string;
    tag?: string;
    leadType?: 'hot' | 'warm' | 'cold' | 'all';
    status?: string;
    dateRange?: { start: string; end: string };
    isFollowup?: boolean;
    leadOrigin?: string;
    assignedTo?: string;
    selectedIds?: string[];
    paymentStatus?: 'Advance Payment' | 'Full Payment' | '';
    bookMethod?: 'loan' | 'cash' | '';
    intent?: 'buying' | 'selling' | 'exchange' | 'all';
    brandName?: string;
    modelName?: string;
    fuelType?: string;
    year?: string;
    kmDrivenValue?: string;
    kmDrivenOp?: 'eq' | 'gt' | 'lt';
    amountValue?: string;
    amountOp?: 'eq' | 'gt' | 'lt';
    date?: string;
    followupDate?: string;
    followupCompletedDate?: string;
    followupNotRespondedDate?: string;
    followupMissedDate?: string;
}
export interface ApiLeadEditData {
    name?: string;
    phone?: string;
    place?: string;
    designation?: string;
    leadOrigin?: string;
    assignedTo?: string;
    carDetails?: CarDetail[];
}
