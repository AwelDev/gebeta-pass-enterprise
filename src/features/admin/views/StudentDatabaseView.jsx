import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, Upload, Plus, Edit, Trash2, AlertTriangle, Users, RotateCcw, ChevronRight, FileDown, FileUp, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card } from '../components/DesignSystem';
import { useAdmin } from '../context/AdminContext';
import { playSound } from '../../../utils/audio';

// --- CUSTOM MODAL FOR ADMIN ACTIONS ---
const ActionModal = ({ title, msg, onConfirm, onCancel, icon: Icon, confirmText = "Confirm", color = "red" }) => {
    const colors = {
        red: { bg: 'bg-red-50', border: 'border-red-100', btn: 'bg-red-600 hover:bg-red-700', text: 'text-red-600' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', btn: 'bg-blue-600 hover:bg-blue-700', text: 'text-blue-600' }
    }[color];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] animate-in fade-in duration-200">
            <div className="bg-white w-[320px] p-6 rounded-[2.5rem] shadow-2xl border-2 border-slate-100 text-center animate-in zoom-in-95">
                <div className="flex justify-center -mt-10 mb-4">
                    <div className={`${colors.bg} p-4 rounded-full border-[6px] border-white shadow-lg`}>
                        <Icon size={32} className={colors.text} strokeWidth={2.5}/>
                    </div>
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide mb-2">{title}</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed mb-6">{msg}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">Cancel</button>
                    <button onClick={onConfirm} className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase text-white shadow-lg transition-all active:scale-95 ${colors.btn}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StudentDatabaseView = () => {
    const { students, refreshData, notify, actions } = useAdmin();
    const [searchTerm, setSearchTerm] = useState("");
    const [visibleCount, setVisibleCount] = useState(50);
    const [isAdding, setIsAdding] = useState(false);
    const [deptList, setDeptList] = useState([]);
    
    // Modal States
    const [modalType, setModalType] = useState(null); // 'recover', 'deleteAll', 'deleteSingle'
    
    // Form State
    const [formData, setFormData] = useState({ 
        id: '', name: '', photo: '', category: 'Eligible', customCategory: '', sex: 'M', deptSelect: '', deptCustom: '' 
    });
    const [editingId, setEditingId] = useState(null);
    const [isNameError, setIsNameError] = useState(false);

    // Initial Load
    useEffect(() => { loadDepts(); }, []);
    
    const loadDepts = async () => { 
        const d = await window.api.getDepartments(); 
        setDeptList(d.map(i => i.name)); 
    };

    // Filtering & Performance
    const filtered = useMemo(() => 
        (students || []).filter(s => 
            (s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        ), [students, searchTerm]
    );
    
    const displayed = filtered.slice(0, visibleCount);

    const isValid = () => {
        if (!formData.id.trim() || !formData.name.trim() || isNameError || !formData.photo.trim()) return false;
        if (!formData.deptSelect) return false;
        if (formData.deptSelect === 'Other' && !formData.deptCustom.trim()) return false;
        if (formData.category === 'Others' && !formData.customCategory.trim()) return false;
        return true;
    };

    const handleNameChange = (val) => {
        const regex = /^[a-zA-Z\s]*$/;
        setIsNameError(!regex.test(val));
        setFormData({ ...formData, name: val });
    };

    const openAdd = () => {
        setEditingId(null);
        setFormData({ id: '', name: '', photo: '', category: 'Eligible', customCategory: '', sex: 'M', deptSelect: '', deptCustom: '' });
        setIsNameError(false);
        setIsAdding(true);
    };

    const openEdit = (s) => {
        setEditingId(s.id);
        const isStandardCat = ['Eligible', 'Non Cafe', 'Medical Intern', 'Off Campus'].includes(s.category);
        setFormData({ 
            id: s.id, 
            name: s.full_name, 
            photo: s.photo_path, 
            category: isStandardCat ? s.category : 'Others',
            customCategory: isStandardCat ? '' : s.category,
            sex: s.sex, 
            deptSelect: deptList.includes(s.department) ? s.department : 'Other', 
            deptCustom: deptList.includes(s.department) ? '' : s.department 
        });
        setIsNameError(false);
        setIsAdding(true);
    };

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        if (!isValid()) return;
        
        const cleanPhoto = formData.photo.trim().replace(/\.[^/.]+$/, "");
        const finalDept = formData.deptSelect === 'Other' ? formData.deptCustom.trim() : formData.deptSelect;
        const finalCategory = formData.category === 'Others' ? formData.customCategory.trim() : formData.category;
        
        const cleanData = { 
            id: formData.id.toUpperCase(), 
            name: formData.name, 
            photo: cleanPhoto, 
            category: finalCategory, 
            sex: formData.sex, 
            department: finalDept 
        };
        
        const res = await (editingId ? window.api.updateStudent(cleanData) : window.api.addStudent(cleanData)); 
        
        if(res.success) { 
            notify('success', "Saved Successfully!"); 
            await refreshData(); 
            await loadDepts(); 
            setIsAdding(false); 
        } else { 
            notify('error', res.message); 
        } 
    };

    // --- MODAL ACTION HANDLERS ---
    const handleConfirmAction = async () => {
        playSound('click');
        setModalType(null); // Close Modal

        if (modalType === 'recover') {
            await actions.recoverStudents();
        } else if (modalType === 'deleteAll') {
            await actions.deleteAllStudents();
        } else if (modalType === 'deleteSingle') {
            await window.api.deleteStudent(editingId);
            await refreshData();
            setIsAdding(false);
            notify('success', "Record Deleted");
        }
    };

    // Bulk Operations
    const handleExport = () => { 
        try { 
            if (students.length === 0) return notify('error', "No data to export"); 
            const ws = XLSX.utils.json_to_sheet(students); 
            const wb = XLSX.utils.book_new(); 
            XLSX.utils.book_append_sheet(wb, ws, "Students"); 
            XLSX.writeFile(wb, "Student_Database_Export.xlsx"); 
            notify('success', "Database Exported!"); 
        } catch(e) { notify('error', "Export Failed"); } 
    };

    const handleImport = async () => { 
        const f = await window.api.pickExcelFile(); 
        if(f) { 
            const r = await window.api.readExcelData(f); 
            if(r.success) { 
                await window.api.bulkAddStudents(r.data); 
                await refreshData(); 
                await loadDepts(); 
                notify('success', "Import Successful!"); 
            } else {
                notify('error', "Import Failed: Check Format");
            }
        } 
    };

    return (
        <Card title="Student Database" icon={Users} theme="blue" className="mt-0 h-full">
            
            {/* --- ACTION MODALS --- */}
            {modalType === 'recover' && (
                <ActionModal 
                    title="Recover Students?" 
                    msg="Restore student data from the last 'Delete All' backup? This will merge with existing data."
                    icon={RotateCcw} onCancel={() => setModalType(null)} onConfirm={handleConfirmAction} confirmText="Recover" color="blue"
                />
            )}
            {modalType === 'deleteAll' && (
                <ActionModal 
                    title="Delete All Students?" 
                    msg="Are you sure you want to wipe the entire database? A backup will be created automatically."
                    icon={ShieldAlert} onCancel={() => setModalType(null)} onConfirm={handleConfirmAction} confirmText="Wipe All" color="red"
                />
            )}
            {modalType === 'deleteSingle' && (
                <ActionModal 
                    title="Delete Record?" 
                    msg="This action cannot be undone. Are you sure you want to delete this student?"
                    icon={Trash2} onCancel={() => setModalType(null)} onConfirm={handleConfirmAction} confirmText="Delete" color="red"
                />
            )}

            <div className="flex flex-col h-full gap-4">
                
                {/* --- HEADER: ACTIONS --- */}
                <div className="flex justify-between items-center shrink-0 px-1 gap-4">
                    {/* Search */}
                    <div className="relative w-80 group shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="text-blue-400 group-focus-within:text-blue-600 transition-colors" size={18}/>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search by ID or Name..." 
                            value={searchTerm} 
                            onChange={e => { setSearchTerm(e.target.value); setVisibleCount(50); }} 
                            className="w-full pl-11 pr-4 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder-blue-300 text-sm"
                        />
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-white rounded-xl border border-blue-100 p-1 shadow-sm gap-1">
                            {/* REPLACED DIRECT ACTION WITH MODAL STATE */}
                            <ToolbarBtn onClick={() => { playSound('click'); setModalType('recover'); }} icon={<RotateCcw size={14}/>} label="Recover" color="text-slate-500 hover:text-blue-600"/>
                            <div className="w-px bg-slate-100 my-1"/>
                            <ToolbarBtn onClick={handleImport} icon={<FileUp size={14}/>} label="Import" color="text-slate-500 hover:text-emerald-600"/>
                            <ToolbarBtn onClick={handleExport} icon={<FileDown size={14}/>} label="Export" color="text-slate-500 hover:text-emerald-600"/>
                            <div className="w-px bg-slate-100 my-1"/>
                            <ToolbarBtn onClick={() => { playSound('click'); setModalType('deleteAll'); }} icon={<Trash2 size={14}/>} label="Delete All" color="text-red-400 hover:text-red-600"/>
                        </div>
                        
                        <button onClick={openAdd} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-wide border border-blue-400 ml-2">
                            <Plus size={14} strokeWidth={3}/> Add New
                        </button>
                    </div>
                </div>

                {/* --- TABLE --- */}
                <div className="flex-1 min-h-0 bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="flex items-center px-6 py-3 border-b border-blue-100 bg-blue-50/30 gap-4">
                        <div className="w-32 shrink-0 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</div>
                        <div className="flex-[2] min-w-0 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</div>
                        <div className="w-16 shrink-0 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex</div>
                        <div className="flex-1 min-w-0 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept</div>
                        <div className="w-32 shrink-0 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</div>
                        <div className="w-10 shrink-0 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Edit</div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <div className="divide-y divide-blue-50">
                            {displayed.map((s) => (
                                <div key={s.id} className="flex items-center px-6 py-3 hover:bg-blue-50/40 transition-colors group gap-4">
                                    <div className="w-32 shrink-0 text-left font-mono text-xs font-bold text-slate-600 truncate">{s.id}</div>
                                    <div className="flex-[2] min-w-0 text-left font-bold text-sm text-slate-700 truncate">{s.full_name}</div>
                                    <div className="w-16 shrink-0 text-left text-xs font-medium text-slate-500">{s.sex}</div>
                                    <div className="flex-1 min-w-0 text-left text-xs font-bold text-slate-500 truncate">{s.department}</div>
                                    <div className="w-32 shrink-0 text-left">
                                        <Badge category={s.category} />
                                    </div>
                                    <div className="w-10 shrink-0 text-right">
                                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95">
                                            <Edit size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Users size={40} className="text-slate-300 mb-2"/>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Students Found</span>
                            </div>
                        )}

                        {filtered.length > visibleCount && (
                            <div className="p-2 bg-white sticky bottom-0 z-10 border-t border-blue-50">
                                <button onClick={() => setVisibleCount(c => c + 50)} className="w-full py-2.5 text-[10px] uppercase font-black bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors rounded-xl flex items-center justify-center gap-2">
                                    Load More <ChevronRight size={12}/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ADD/EDIT MODAL --- */}
            {isAdding && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg border border-blue-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-emerald-400"/>
                        
                        <h3 className="text-xl font-black mb-1 text-slate-700 text-center">
                            {editingId ? 'Edit Student' : 'New Student'}
                        </h3>
                        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                            Enter Details Below
                        </p>

                        <div className="space-y-3">
                            <input className="w-full p-3.5 bg-blue-50/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-200 border border-blue-100 focus:border-blue-300 text-slate-700 placeholder-blue-300" value={formData.id} onChange={e=>setFormData({...formData, id:e.target.value.toUpperCase()})} placeholder="Student ID" required disabled={!!editingId}/>
                            
                            <div className="relative">
                                <input className={`w-full p-3.5 bg-blue-50/50 rounded-xl font-bold text-sm outline-none border transition-all text-slate-700 placeholder-blue-300 ${isNameError ? 'border-red-400 focus:ring-red-200' : 'border-blue-100 focus:border-blue-300 focus:ring-2 focus:ring-blue-200'}`} value={formData.name} onChange={e=>handleNameChange(e.target.value)} placeholder="Full Name" required />
                                {isNameError && <div className="absolute right-4 top-3.5 text-red-500 text-xs font-bold flex items-center gap-1"><AlertTriangle size={14}/> Text only!</div>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <select className="w-full p-3.5 bg-blue-50/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-200 border border-blue-100 focus:border-blue-300 text-slate-700" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                                    <option>Eligible</option>
                                    <option>Non Cafe</option>
                                    <option>Medical Intern</option>
                                    <option>Off Campus</option>
                                    <option>Others</option>
                                </select>
                                <select className="w-full p-3.5 bg-blue-50/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-200 border border-blue-100 focus:border-blue-300 text-slate-700" value={formData.sex} onChange={e=>setFormData({...formData, sex:e.target.value})}><option>M</option><option>F</option></select>
                            </div>

                            {formData.category === 'Others' && (
                                <input className="w-full p-3.5 bg-orange-50 border border-orange-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-orange-200 text-orange-900 placeholder-orange-300 animate-in slide-in-from-top-2" value={formData.customCategory} onChange={e=>setFormData({...formData, customCategory:e.target.value})} placeholder="Enter Custom Status Name" required />
                            )}

                            <select className="w-full p-3.5 bg-blue-50/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-200 border border-blue-100 focus:border-blue-300 text-slate-700" value={formData.deptSelect} onChange={e=>setFormData({...formData, deptSelect:e.target.value})}>
                                <option value="">Select Department</option>
                                {deptList.map(d => <option key={d} value={d}>{d}</option>)}
                                <option value="Other">Other (Add New)</option>
                            </select>
                            
                            {formData.deptSelect === 'Other' && (
                                <input className="w-full p-3.5 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-200" value={formData.deptCustom} onChange={e=>setFormData({...formData, deptCustom:e.target.value})} placeholder="Enter New Department Name" required/>
                            )}

                            <input className="w-full p-3.5 bg-blue-50/50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-200 border border-blue-100 focus:border-blue-300 text-slate-700 placeholder-blue-300" value={formData.photo} onChange={e=>setFormData({...formData, photo:e.target.value})} placeholder="Photo Filename" required />

                            <div className="flex gap-3 pt-4">
                                {editingId && (
                                    // Trigger Delete Single Modal
                                    <button type="button" onClick={() => setModalType('deleteSingle')} className="p-3.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors border border-red-100 shadow-sm"><Trash2 size={20}/></button>
                                )}
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-xs uppercase tracking-wider transition-colors">Cancel</button>
                                <button type="submit" disabled={!isValid()} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">{editingId ? 'Update Record' : 'Save Student'}</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </Card>
    );
};

// --- Sub Components ---

const ToolbarBtn = ({ onClick, icon, label, color }) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all active:scale-95 group hover:bg-slate-50 ${color}`}>
        {icon} <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:block">{label}</span>
    </button>
);

const Badge = ({ category }) => {
    let styles = "bg-slate-100 text-slate-600";
    if (category === 'Eligible') styles = "bg-emerald-100 text-emerald-700 border border-emerald-200";
    else if (category === 'Non Cafe') styles = "bg-red-100 text-red-600 border border-red-200";
    else if (category === 'Medical Intern') styles = "bg-orange-100 text-orange-700 border border-orange-200";
    else if (category === 'Off Campus') styles = "bg-blue-100 text-blue-700 border border-blue-200";
    
    return (
        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md tracking-wide ${styles}`}>
            {category}
        </span>
    );
};

export default StudentDatabaseView;