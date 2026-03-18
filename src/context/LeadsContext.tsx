import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { isSameDay } from 'date-fns';
import { Lead, User, SmartList, Tag, FollowupRecord, ApiLeadEditData } from '../types';

interface LeadsContextType {
    leads: Lead[];
    users: User[];
    smartLists: SmartList[];
    tags: Tag[];
    loading: boolean;
    error: string | null;
    apiLeads: Lead[];
    fetchLeads: () => Promise<void>;
    addLead: (lead: Partial<Lead>) => Promise<void>;
    updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;
    updateApiLead: (id: string, updates: ApiLeadEditData | Partial<Lead>) => Promise<void>;
    deleteApiLead: (id: string) => Promise<void>;
    approveApiLead: (id: string) => Promise<void>;
    addUser: (user: Partial<User>) => Promise<void>;
    updateUser: (id: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    addSmartList: (list: Partial<SmartList>) => Promise<void>;
    deleteSmartList: (id: string) => Promise<void>;
    addTag: (tag: Partial<Tag>) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    bulkDeleteLeads: (ids: string[]) => Promise<void>;
    bulkAssignLeads: (ids: string[], userId: string) => Promise<void>;
    bulkUpdateLeads: (ids: string[], updates?: Partial<Lead>, addTags?: string[], removeTags?: string[]) => Promise<void>;
    completeFollowup: (leadId: string, note?: string, result?: 'responded' | 'not_responded') => Promise<void>;
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

export function LeadsProvider({ children }: { children: React.ReactNode }) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [apiLeads, setApiLeads] = useState<Lead[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [smartLists, setSmartLists] = useState<SmartList[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isFirstLoad = useRef(true);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [leadsRes, usersRes, listsRes, tagsRes, apiLeadsRes] = await Promise.all([
                fetch('/api/leads'),
                fetch('/api/users'),
                fetch('/api/smartlists'),
                fetch('/api/tags'),
                fetch('/api/api-leads')
            ]);

            if (leadsRes.ok) {
                const fetchedLeads = await leadsRes.json();
                const mappedLeads = fetchedLeads.map((l: Record<string, unknown>) => ({
                    ...l,
                    tags: l.tags || [],
                    carDetails: l.carDetails || [],
                    username: l.username || 'Unknown',
                    phone: l.phone || 'Unknown',
                    assignmentHistory: l.assignmentHistory || [],
                    followupHistory: l.followupHistory || []
                } as unknown as Lead));

                setLeads(mappedLeads);
            }
            if (apiLeadsRes.ok) {
                const fetchedApiLeads = await apiLeadsRes.json();
                const mappedApiLeads = fetchedApiLeads.map((l: Record<string, unknown>) => ({
                    ...l,
                    isApiLead: true, // helpful flag
                    tags: l.tags || [],
                    carDetails: l.carDetails || [],
                    phone: l.phone || 'Unknown',
                    assignmentHistory: l.assignmentHistory || [],
                    followupHistory: l.followupHistory || []
                } as unknown as Lead));
                setApiLeads(mappedApiLeads);
            }
            if (usersRes.ok) {
                const fetchedUsers = await usersRes.json();
                setUsers(fetchedUsers.map((u: Record<string, unknown>) => ({
                    ...u,
                    username: u.username || u.name || 'User'
                } as User)));
            }
            if (listsRes.ok) setSmartLists(await listsRes.json());
            if (tagsRes.ok) setTags(await tagsRes.json());
            setError(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            if (!silent) {
                console.error('Failed to fetch data', message);
                setError(message);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (isFirstLoad.current) {
            fetchData();
            isFirstLoad.current = false;
        }

        // Live Update Polling (every 10 seconds)
        const intervalId = setInterval(() => {
            fetchData(true);
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const addLead = async (leadData: Partial<Lead>) => {
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
            });
            if (res.ok) {
                await fetchData();
            } else {
                const errorData = await res.json();
                console.error('Failed to add lead', errorData);
            }
        } catch (err) { 
            console.error('Error adding lead', err);
        }
    };

    const updateLead = async (id: string, updates: Partial<Lead>) => {
        try {
            const res = await fetch(`/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                await fetchData();
            } else {
                const errorData = await res.json();
                console.error('Failed to update lead', errorData);
            }
        } catch (err) { 
            console.error('Error updating lead', err);
        }
    };

    const deleteLead = async (id: string) => {
        try {
            const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setLeads(prev => prev.filter(l => l._id !== id));
            }
        } catch (err) { console.error('Error deleting lead', err); }
    };

    const updateApiLead = async (id: string, updates: ApiLeadEditData | Partial<Lead>) => {
        try {
            const res = await fetch(`/api/api-leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                await fetchData();
            } else {
                const errorData = await res.json();
                console.error('Failed to update API lead', errorData);
            }
        } catch (err) { 
            console.error('Error updating api lead', err);
        }
    };

    const deleteApiLead = async (id: string) => {
        try {
            const res = await fetch(`/api/api-leads/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setApiLeads(prev => prev.filter(l => l._id !== id));
            }
        } catch (err) { console.error('Error deleting api lead', err); }
    };

    const approveApiLead = async (id: string) => {
        try {
            const res = await fetch(`/api/api-leads/${id}/approve`, { method: 'POST' });
            if (res.ok) {
                await fetchData(); // Refresh both leads and api-leads lists
            } else {
                const error = await res.json();
                console.error('Failed to approve API lead', error);
                alert(error.message || 'Failed to add to CRM');
            }
        } catch (err) { console.error('Error approving api lead', err); }
    };

    const addUser = async (userData: Partial<User>) => {
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (res.ok) {
                const newUser = await res.json();
                setUsers(prev => [newUser, ...prev]);
            } else {
                const errorData = await res.json();
                console.error('Failed to add user', errorData);
            }
        } catch (err) { 
            console.error('Error adding user', err);
        }
    };

    const updateUser = async (id: string, updates: Partial<User>) => {
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setUsers(prev => prev.map(u => u._id === id ? updatedUser : u));
            }
        } catch (err) { console.error('Error updating user', err); }
    };

    const deleteUser = async (id: string) => {
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u._id !== id));
            }
        } catch (err) { console.error('Error deleting user', err); }
    };

    const addSmartList = async (listData: Partial<SmartList>) => {
        try {
            const res = await fetch('/api/smartlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(listData)
            });
            if (res.ok) {
                const newList = await res.json();
                setSmartLists(prev => [newList, ...prev]);
            }
        } catch (err) { console.error('Error adding list', err); }
    };

    const deleteSmartList = async (id: string) => {
        try {
            const res = await fetch(`/api/smartlists/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSmartLists(prev => prev.filter(l => l._id !== id));
            }
        } catch (err) { console.error('Error deleting list', err); }
    };

    const addTag = async (tagData: Partial<Tag>) => {
        try {
            const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tagData)
            });
            if (res.ok) {
                const newTag = await res.json();
                setTags(prev => [newTag, ...prev]);
            }
        } catch (err) { console.error('Error adding tag', err); }
    };

    const deleteTag = async (id: string) => {
        try {
            const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTags(prev => prev.filter(t => t._id !== id));
            }
        } catch (err) { console.error('Error deleting tag', err); }
    };

    const bulkDeleteLeads = async (ids: string[]) => {
        try {
            const res = await fetch('/api/leads/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            if (res.ok) await fetchData();
        } catch (err) { console.error('Error bulk deleting leads', err); }
    };

    const bulkAssignLeads = async (ids: string[], userId: string) => {
        try {
            const res = await fetch('/api/leads/bulk-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, userId })
            });
            if (res.ok) await fetchData();
        } catch (err) { console.error('Error bulk assigning leads', err); }
    };

    const bulkUpdateLeads = async (ids: string[], updates?: Partial<Lead>, addTags?: string[], removeTags?: string[]) => {
        try {
            const res = await fetch('/api/leads/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, updates, addTags, removeTags })
            });
            if (res.ok) await fetchData();
        } catch (err) { console.error('Error bulk updating leads', err); }
    };

    const completeFollowup = async (leadId: string, note?: string, status: 'responded' | 'not_responded' | 'rescheduled' = 'responded') => {
        const lead = leads.find(l => l._id === leadId);
        if (!lead || !lead.followupDate) return;

        const scheduledDate = new Date(lead.followupDate);
        const today = new Date();
        const wasMissed = scheduledDate < today && !isSameDay(scheduledDate, today);

        const assignedToId = typeof lead.assignedTo === 'object' ? lead.assignedTo?._id : lead.assignedTo;

        const newHistoryRecord: FollowupRecord = {
            userId: assignedToId,
            scheduledDate: lead.followupDate,
            completedDate: today.toISOString(),
            note,
            wasMissed,
            result: status as "responded" | "not_responded"
        };

        const updates: Partial<Lead> = {
            followupDate: '',
            followupCount: lead.followupCount + 1,
            followupHistory: [...(lead.followupHistory || []), newHistoryRecord]
        };

        await updateLead(leadId, updates);
    };

    return (
        <LeadsContext.Provider value={{
            leads, apiLeads, users, smartLists, tags, loading, error,
            fetchLeads: fetchData, addLead, updateLead, deleteLead,
            updateApiLead, deleteApiLead, approveApiLead,
            addUser, updateUser, deleteUser, addSmartList, deleteSmartList,
            addTag, deleteTag,
            bulkDeleteLeads, bulkAssignLeads, bulkUpdateLeads,
            completeFollowup
        }}>
            {children}
        </LeadsContext.Provider>
    );
}

export const useLeads = () => {
    const context = useContext(LeadsContext);
    if (!context) throw new Error('useLeads must be used within a LeadsProvider');
    return context;
};
