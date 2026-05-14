import { useState } from 'react';
import { Tag as TagIcon, Plus, Trash2, X, Calendar, AlertCircle } from 'lucide-react';
import { useLeads } from '../../context/LeadsContext';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

export function TagsView() {
    const { tags, addTag, deleteTag } = useLeads();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setIsSubmitting(true);
        setError(null);
        
        try {
            await addTag({ name: newName.trim() });
            setNewName('');
            setIsModalOpen(false);
        } catch (err: any) {
            setError(err.message || 'Failed to create tag');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 lg:p-10 animate-fadeIn">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Global Tags</h2>
                <button 
                    onClick={() => {
                        setError(null);
                        setNewName('');
                        setIsModalOpen(!isModalOpen);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#1B1B19] px-6 py-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-black active:scale-95"
                >
                    {isModalOpen ? <X size={16} /> : <Plus size={16} />}
                    {isModalOpen ? 'Close' : 'Create New Tag'}
                </button>
            </div>

            {/* Inline Creation Popup Div */}
            {isModalOpen && (
                <div className="mb-8 bg-white rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-500/5 overflow-hidden animate-slideDown">
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Tag Name</label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={newName}
                                    onChange={(e) => {
                                        setNewName(e.target.value);
                                        setError(null);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    placeholder="e.g. priority-lead"
                                    className={clsx(
                                        "w-full rounded-xl border px-5 py-3 text-sm font-bold outline-none transition-all",
                                        error 
                                            ? "border-red-200 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-500/5" 
                                            : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5"
                                    )}
                                />
                            </div>
                            <button 
                                onClick={handleAdd}
                                disabled={!newName.trim() || isSubmitting}
                                className="rounded-xl bg-[#1B1B19] px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-black disabled:opacity-50 h-[46px]"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Tag'}
                            </button>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-wide mt-3 ml-1">
                                <AlertCircle size={12} />
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tags Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Tag Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">Created Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {tags.length > 0 ? (
                                tags.map((tag) => (
                                    <tr key={tag._id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-indigo-400" />
                                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 border border-gray-100">
                                                    {tag.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                                                <Calendar size={12} className="text-gray-300" />
                                                {tag.createdAt ? format(parseISO(tag.createdAt), 'MMM d, yyyy') : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Delete tag "${tag.name}"?`)) {
                                                        deleteTag(tag._id);
                                                    }
                                                }}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                title="Delete Tag"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <TagIcon size={40} />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">No tags found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
