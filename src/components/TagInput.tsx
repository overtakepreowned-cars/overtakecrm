import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { clsx } from 'clsx';

interface TagInputProps {
    selectedTags: (string | { _id: string, name: string })[];
    onTagsChange: (tags: string[]) => void;
    availableTags: { _id: string, name: string }[];
    placeholder?: string;
    className?: string;
    isDark?: boolean;
    onCreateTag?: (name: string) => Promise<void>;
}

export function TagInput({ selectedTags, onTagsChange, availableTags, placeholder = "Add tags...", className = "", isDark = false, onCreateTag }: TagInputProps) {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const getTagName = (tag: string | { name: string }) => typeof tag === 'string' ? tag : tag.name;
    const getTagId = (tag: string | { _id: string }) => typeof tag === 'string' ? tag : tag._id;

    const suggestions = useMemo(() => {
        if (!input) return [];
        return availableTags.filter(tag =>
            tag.name.toLowerCase().includes(input.toLowerCase()) &&
            !selectedTags.some(t => getTagId(t) === tag._id)
        );
    }, [input, availableTags, selectedTags]);

    const handleAddTag = async (tag: string | { _id: string, name: string }) => {
        const tagName = typeof tag === 'string' ? tag.trim().toLowerCase() : tag.name;

        if (tagName && !selectedTags.some(t => getTagName(t) === tagName)) {
            // If it's a new string tag and we have a creation handler, call it
            if (typeof tag === 'string' && onCreateTag) {
                try {
                    await onCreateTag(tagName);
                } catch (err) {
                    console.error('Failed to create tag globally:', err);
                    // We still add it to the local list so the form works
                }
            }
            onTagsChange([...selectedTags.map(t => getTagName(t)), tagName]);
        }
        setInput('');
        setShowSuggestions(false);
    };

    const handleRemoveTag = (tag: string | { name: string }) => {
        const nameToRemove = getTagName(tag);
        onTagsChange(selectedTags.map(t => getTagName(t)).filter(t => t !== nameToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (input.trim()) {
                handleAddTag(input.trim());
            }
        } else if (e.key === 'Backspace' && !input && selectedTags.length > 0) {
            handleRemoveTag(selectedTags[selectedTags.length - 1]);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className={clsx(
                "flex flex-wrap gap-1 px-3 py-1.5 rounded-xl transition-all",
                isDark 
                    ? "bg-white/5 border border-white/10 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10" 
                    : "bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-gray-100 focus-within:border-gray-400"
            )}>
                {selectedTags.map(tag => (
                    <span key={getTagId(tag)} className={clsx(
                        "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                        isDark 
                            ? "bg-white/10 text-white border-white/10" 
                            : "bg-[#1B1B19]/5 text-[#1B1B19] border-[#1B1B19]/10"
                    )}>
                        {getTagName(tag)}
                        <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className={clsx(
                                "transition-colors",
                                isDark ? "hover:text-red-400" : "hover:text-black"
                            )}
                        >
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedTags.length === 0 ? placeholder : ''}
                    className={clsx(
                        "flex-1 bg-transparent border-none outline-none text-xs min-w-[80px] py-0.5 selection:bg-indigo-500/30",
                        isDark ? "text-white placeholder:text-slate-600" : "text-sm placeholder:text-gray-400"
                    )}
                />
            </div>

            {showSuggestions && (suggestions.length > 0 || (input.trim() && !selectedTags.includes(input.trim()))) && (
                <div className={clsx(
                    "absolute z-50 w-full mt-1 rounded-xl shadow-2xl overflow-hidden animate-fadeIn max-h-48 overflow-y-auto border",
                    isDark 
                        ? "bg-[#1B1B19] border-white/10" 
                        : "bg-white border-gray-200 shadow-xl"
                )}>
                    {suggestions.map(suggestion => (
                        <button
                            key={suggestion._id}
                            type="button"
                            onClick={() => handleAddTag(suggestion)}
                            className={clsx(
                                "w-full text-left px-3 py-2 text-xs transition-all flex items-center justify-between group",
                                isDark 
                                    ? "text-slate-200 hover:bg-white/10" 
                                    : "text-gray-700 hover:bg-[#1B1B19]/5"
                            )}
                        >
                            <span className="font-medium">{suggestion.name}</span>
                            <Plus size={12} className={clsx(
                                "transition-colors",
                                isDark ? "text-slate-600 group-hover:text-white" : "text-gray-300 group-hover:text-[#1B1B19]"
                            )} />
                        </button>
                    ))}
                    {input.trim() && !availableTags.some(t => t.name.toLowerCase() === input.trim().toLowerCase()) && (
                        <button
                            type="button"
                            onClick={() => handleAddTag(input)}
                            className={clsx(
                                "w-full text-left px-3 py-2 text-xs transition-all flex items-center gap-2",
                                isDark 
                                    ? "text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10" 
                                    : "text-[#1B1B19] bg-[#1B1B19]/5 hover:bg-[#1B1B19]/10"
                            )}
                        >
                            <Plus size={12} />
                            <span className="font-bold">Create "{input.trim()}"</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}


