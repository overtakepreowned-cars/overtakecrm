import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, ArrowRight, Loader2, Table } from 'lucide-react';
import { useLeads } from '../../context/LeadsContext';
import { TagInput } from '../../components/TagInput';

interface LeadImportModalProps {
    onClose: () => void;
}

type Step = 'upload' | 'mode' | 'mapping' | 'processing' | 'results';
type ImportMode = 'buy' | 'sell' | 'exchange';

export function LeadImportModal({ onClose }: LeadImportModalProps) {
    const { importLeads, tags, addTag } = useLeads();
    const availableTags = tags.map(t => ({ _id: t._id, name: t.name }));
    const [step, setStep] = useState<Step>('upload');
    const [importMode, setImportMode] = useState<ImportMode>('buy');
    const [fileData, setFileData] = useState<{ headers: string[], rows: Record<string, string>[] } | null>(null);
    const [mapping, setMapping] = useState<Record<string, string | string[]>>({});
    const [globalTags, setGlobalTags] = useState<string[]>([]);
    const [importResult, setImportResult] = useState<{
        created: number;
        updated: number;
        skipped: number;
        completedRows: Record<string, unknown>[];
        failedRows: Record<string, unknown>[];
    } | null>(null);
    const [, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getCrmFields = () => {
        const common = [
            { key: 'name', label: 'Full Name', required: true },
            { key: 'phone', label: 'Phone Number', required: true },
            { key: 'place', label: 'Place' },
            { key: 'designation', label: 'Designation' },
            { key: 'leadOrigin', label: 'Lead Origin' },
            { key: 'leadType', label: 'Lead Type' },
            { key: 'status', label: 'Status' },
            { key: 'notes', label: 'Notes' },
            { key: 'tags', label: 'Tags' },
            { key: 'countryCode', label: 'Country Code' },
        ];

        if (importMode === 'buy') {
            return [
                ...common,
                { key: 'brandName', label: 'Wanted Car Brand' },
                { key: 'modelName', label: 'Wanted Car Model' },
                { key: 'fuelType', label: 'Fuel Type' },
                { key: 'year', label: 'Model Year' },
                { key: 'amount', label: 'Budget' },
            ];
        }

        if (importMode === 'sell') {
            return [
                ...common,
                { key: 'brandName', label: 'Owned Car Brand' },
                { key: 'modelName', label: 'Owned Car Model' },
                { key: 'fuelType', label: 'Fuel Type' },
                { key: 'kmDriven', label: 'KM Driven' },
                { key: 'year', label: 'Manufacturing Year' },
                { key: 'amount', label: 'Expected Price' },
            ];
        }

        return [
            ...common,
            { key: 'wantedCar.brandName', label: 'Wanted Car Brand' },
            { key: 'wantedCar.modelName', label: 'Wanted Car Model' },
            { key: 'ownedCar.brandName', label: 'Owned Car Brand' },
            { key: 'ownedCar.modelName', label: 'Owned Car Model' },
            { key: 'ownedCar.kmDriven', label: 'Owned Car KM' },
            { key: 'amount', label: 'Expected Difference' },
        ];
    };

    const crmFields = getCrmFields();

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return null;

        const parseLine = (line: string) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else current += char;
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseLine(lines[0]);
        const rows = lines.slice(1).map(line => {
            const values = parseLine(line);
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row;
        });

        return { headers, rows };
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            if (parsed) {
                setFileData(parsed);
                setStep('mode');
            } else {
                alert('Could not parse CSV file. Please ensure it has headers and at least one row.');
            }
        };
        reader.readAsText(file);
    };

    const startMapping = () => {
        if (!fileData) return;
        const initialMapping: Record<string, string> = {};
        crmFields.forEach(field => {
            const match = fileData.headers.find(h => 
                h.toLowerCase().includes(field.key.toLowerCase()) || 
                h.toLowerCase().includes(field.label.toLowerCase())
            );
            if (match) initialMapping[field.key] = match;
        });
        setMapping(initialMapping);
        setStep('mapping');
    };

    const handleImport = async () => {
        const missingRequired = crmFields.filter(f => f.required && !mapping[f.key]);
        if (missingRequired.length > 0) {
            alert(`Please map the following required fields: ${missingRequired.map(f => f.label).join(', ')}`);
            return;
        }

        setIsImporting(true);
        setStep('processing');
        try {
            const finalMapping = { ...mapping };
            let intentValue = 'buying';
            if (importMode === 'sell') intentValue = 'selling';
            if (importMode === 'exchange') intentValue = 'exchange';
            
            const currentTags = [...globalTags];

            const result = await importLeads({ 
                rows: fileData!.rows, 
                mapping: finalMapping,
                fixedFields: { intent: intentValue },
                globalTags: currentTags
            });
            setImportResult(result.results);
            setStep('results');
        } catch (_error) {
            alert('Import failed. Please check the console for details.');
            setStep('mapping');
        } finally {
            setIsImporting(false);
        }
    };

    const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const val = row[header] === undefined || row[header] === null ? '' : String(row[header]);
                return `"${val.replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Bulk Import Leads</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {step === 'upload' && 'Upload CSV file'}
                            {step === 'mode' && 'Select Import Category'}
                            {step === 'mapping' && `Mapping for ${importMode.toUpperCase()} leads`}
                            {step === 'results' && 'Import summary'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-gray-200 rounded-3xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Choose CSV File</h3>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".csv" 
                                onChange={handleFileUpload} 
                            />
                            <button className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                Select File
                            </button>
                        </div>
                    )}

                    {step === 'mode' && (
                        <div className="flex flex-col gap-8 py-6">
                            <h3 className="text-center text-lg font-bold text-gray-700">What kind of leads are these?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { id: 'buy', label: 'Buy', icon: <Table />, desc: 'Customers looking to buy a car' },
                                    { id: 'sell', label: 'Sell', icon: <Upload />, desc: 'Customers looking to sell their car' },
                                    { id: 'exchange', label: 'Exchange', icon: <ArrowRight />, desc: 'Customers looking to exchange' },
                                ].map(m => (
                                    <button 
                                        key={m.id}
                                        onClick={() => { setImportMode(m.id as ImportMode); }}
                                        className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all text-center group ${importMode === m.id ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100' : 'border-gray-100 hover:border-indigo-200'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${importMode === m.id ? 'bg-indigo-600 text-white scale-110' : 'bg-gray-100 text-gray-400 group-hover:text-indigo-400'}`}>
                                            {m.icon}
                                        </div>
                                        <h4 className="font-bold text-gray-900">{m.label}</h4>
                                        <p className="text-xs text-gray-500 mt-2">{m.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'mapping' && fileData && (
                        <div className="flex flex-col gap-6">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
                                <AlertCircle className="text-indigo-600 shrink-0" size={20} />
                                <p className="text-sm text-indigo-800 font-medium">
                                    Map your sheet columns to CRM fields. Required fields are marked with an asterisk (*).
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {crmFields.map(field => (
                                    <div key={field.key} className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        
                                        {field.key === 'notes' ? (
                                            <div className="flex flex-col gap-2">
                                                {(Array.isArray(mapping[field.key]) ? (mapping[field.key] as string[]) : [mapping[field.key] as string || '']).map((val, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <select 
                                                            value={val}
                                                            onChange={(e) => {
                                                                const current = Array.isArray(mapping[field.key]) ? [...(mapping[field.key] as string[])] : [mapping[field.key] as string || ''];
                                                                current[idx] = e.target.value;
                                                                setMapping(prev => ({ ...prev, [field.key]: current }));
                                                            }}
                                                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 outline-none"
                                                        >
                                                            <option value="">-- Don't Map --</option>
                                                            {fileData.headers.map(header => (
                                                                <option key={header} value={header}>{header}</option>
                                                            ))}
                                                        </select>
                                                        {idx > 0 && (
                                                            <button 
                                                                onClick={() => {
                                                                    const current = mapping[field.key] as string[];
                                                                    setMapping(prev => ({ ...prev, [field.key]: current.filter((_, i) => i !== idx) }));
                                                                }}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => {
                                                        const current = Array.isArray(mapping[field.key]) ? [...(mapping[field.key] as string[])] : [mapping[field.key] as string || ''];
                                                        setMapping(prev => ({ ...prev, [field.key]: [...current, ''] }));
                                                    }}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 w-fit flex items-center gap-1"
                                                >
                                                    <Table size={12} /> Add another column for notes
                                                </button>
                                            </div>
                                        ) : (
                                            <select 
                                                value={mapping[field.key] as string || ''}
                                                onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                            >
                                                <option value="">-- Don't Map --</option>
                                                {fileData.headers.map(header => (
                                                    <option key={header} value={header}>{header}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-6 border-t border-gray-100">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 block">
                                    Global Tags (Applied to all imported leads)
                                </label>
                                <TagInput 
                                    selectedTags={globalTags}
                                    onTagsChange={setGlobalTags}
                                    availableTags={availableTags}
                                    onCreateTag={async (name) => {
                                        await addTag({ name });
                                    }}
                                    placeholder="Add global tags for this import..."
                                />
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-gray-900">Importing Data...</h3>
                            <p className="text-sm text-gray-500 mt-1">Please wait while we process your file and merge duplicates.</p>
                        </div>
                    )}

                    {step === 'results' && importResult && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Import Complete!</h3>
                            <p className="text-gray-500 mt-2">Your lead data has been processed and merged into the CRM.</p>
                            
                            <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-lg">
                                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="text-3xl font-bold text-indigo-600">{importResult.created || 0}</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Created</span>
                                </div>
                                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="text-3xl font-bold text-green-600">{importResult.updated || 0}</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Updated</span>
                                </div>
                                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="text-3xl font-bold text-red-500">{importResult.skipped || 0}</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Failed</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-10 w-full max-w-md">
                                <button 
                                    onClick={() => downloadCSV(importResult.completedRows, 'successful_imports.csv')}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-xl font-bold text-sm border border-green-100 hover:bg-green-100 transition-all"
                                >
                                    <Table size={16} /> Download Success CSV
                                </button>
                                {importResult.failedRows && importResult.failedRows.length > 0 && (
                                    <button 
                                        onClick={() => downloadCSV(importResult.failedRows, 'failed_imports.csv')}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-700 rounded-xl font-bold text-sm border border-red-100 hover:bg-red-100 transition-all"
                                    >
                                        <AlertCircle size={16} /> Download Failed CSV
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    {step === 'mode' && (
                        <>
                            <button 
                                onClick={() => setStep('upload')}
                                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Back
                            </button>
                            <button 
                                onClick={startMapping}
                                className="flex items-center gap-2 px-8 py-2.5 bg-[#1B1B19] text-white rounded-xl font-bold text-sm shadow-lg shadow-gray-200 hover:bg-black transition-all"
                            >
                                Next <ArrowRight size={16} />
                            </button>
                        </>
                    )}
                    {step === 'mapping' && (
                        <>
                            <button 
                                onClick={() => setStep('mode')}
                                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleImport}
                                className="flex items-center gap-2 px-8 py-2.5 bg-[#1B1B19] text-white rounded-xl font-bold text-sm shadow-lg shadow-gray-200 hover:bg-black transition-all"
                            >
                                Start Import <CheckCircle2 size={16} />
                            </button>
                        </>
                    )}
                    {step === 'results' && (
                        <button 
                            onClick={onClose}
                            className="px-10 py-2.5 bg-[#1B1B19] text-white rounded-xl font-bold text-sm shadow-lg shadow-gray-200 hover:bg-black transition-all"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
