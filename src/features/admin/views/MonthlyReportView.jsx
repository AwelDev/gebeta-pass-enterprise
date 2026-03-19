import React, { useState } from 'react';
import { CalendarRange, Download, FileSpreadsheet, Target, CheckCircle, Users, Clock, UserX, CheckSquare, Utensils, Loader, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, StatRow } from '../components/DesignSystem';
import { generatePDF } from '../../../utils/helpers';
import { useAdmin } from '../context/AdminContext';
import { playSound } from '../../../utils/audio';

// --- CUSTOM MODAL FOR ADMIN ACTIONS ---
const ActionModal = ({ title, msg, onConfirm, onCancel, icon: Icon, confirmText = "Confirm", color = "red" }) => {
    const colors = {
        red: { bg: 'bg-red-50', border: 'border-red-100', btn: 'bg-red-600 hover:bg-red-700', text: 'text-red-600' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', btn: 'bg-blue-600 hover:bg-blue-700', text: 'text-blue-600' }
    }[color];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
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

const MonthlyReportView = () => {
    const { stats, notify, actions } = useAdmin();
    const [pdfLoading, setPdfLoading] = useState(false);
    const [excelLoading, setExcelLoading] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false); // Modal State

    const cycle = stats?.cycle || {
        eligible_students: 0, students_served: 0,
        expected_sessions: 0, sessions_served: 0,
        expected_meals: 0, meals_served: 0,
        expected_missed: 0, total_missed: 0,
        repeat_attempts: 0, cycle_start_date: null
    };

    const today = new Date();
    const startDate = cycle.cycle_start_date ? new Date(cycle.cycle_start_date) : today;
    const dateRangeStr = `${format(startDate, 'MMM do')} - ${format(today, 'MMM do, yyyy')}`;
    
    const showSpecial = (stats?.ate?.special || 0) > 0;

    const handleSavePDF = async () => {
        playSound('click'); setPdfLoading(true); notify('success', "Generating PDF...");
        try { await generatePDF('monthly-report-area', 'Monthly_Cycle_Report', 'landscape'); notify('success', "Report Downloaded!"); } 
        catch { notify('error', "Failed to save PDF"); } 
        finally { setPdfLoading(false); }
    };

    const handleExcel = async (type) => {
        if (excelLoading) return;
        playSound('click'); setExcelLoading(type); notify('success', `Generating ${type}...`);
        try {
            const res = await window.api.generateReport(type);
            if(!res.success && res.message !== 'Export Cancelled') notify('error', 'Export Failed');
            else if (res.success) notify('success', 'Excel Opened');
        } catch (e) { notify('error', 'System Error'); } 
        finally { setExcelLoading(null); }
    };

    const handleResetConfirm = async () => {
        playSound('click');
        setShowResetModal(false);
        await actions.resetCycle();
    };

    return (
        <Card title="30-Day Analysis" icon={CalendarRange} theme="blue">
            <div className="flex flex-col h-full px-2 pb-6 overflow-y-auto scrollbar-thin">
                
                {/* --- RESET MODAL --- */}
                {showResetModal && (
                    <ActionModal 
                        title="Reset Cycle?"
                        msg="This will delete ALL meal logs for the current 30-day period. This cannot be undone."
                        icon={AlertTriangle}
                        onConfirm={handleResetConfirm}
                        onCancel={() => setShowResetModal(false)}
                        confirmText="Reset Now"
                        color="red"
                    />
                )}

                <div className="flex justify-between items-center mb-4 shrink-0 border-b-[0.75px] border-dashed border-orange-300 pb-2">
                    <div className="flex items-center gap-2 text-orange-900 bg-white px-4 py-1.5 rounded-xl border-[0.75px] border-orange-400 shadow-sm select-none">
                        <Clock size={14} strokeWidth={2.5}/>
                        <span className="text-xs font-black uppercase tracking-widest font-display pt-0.5">{dateRangeStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Modified Button to open Modal */}
                        <button onClick={() => { playSound('click'); setShowResetModal(true); }} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-xl shadow-sm hover:bg-red-600 hover:text-white hover:shadow-lg active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest border-[0.75px] border-red-200 group">
                            <RotateCcw size={14} strokeWidth={3} className="group-hover:-rotate-180 transition-transform duration-500"/>
                            <span>Reset Cycle</span>
                        </button>
                        <button onClick={handleSavePDF} disabled={pdfLoading} className="flex items-center gap-2 bg-orange-600 text-white px-5 py-1.5 rounded-xl shadow-md hover:bg-orange-700 hover:shadow-lg active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest border-[0.75px] border-orange-500 group disabled:opacity-50">
                            {pdfLoading ? <Loader size={14} className="animate-spin"/> : <Download size={14} strokeWidth={3} className="group-hover:animate-bounce"/>}
                            <span>{pdfLoading ? 'Saving...' : 'Download'}</span>
                        </button>
                    </div>
                </div>

                <div id="monthly-report-area" className="flex flex-col gap-10">
                    <div className="grid grid-cols-2 gap-6 w-full shrink-0">
                        <div className="bg-white/80 border-[0.75px] border-blue-300 rounded-2xl p-6 shadow-sm h-full hover:border-blue-400 transition-colors">
                            <div className="flex items-center gap-3 mb-4 text-blue-900">
                                <div className="bg-blue-100 p-2 rounded-lg border-[0.75px] border-blue-200"><Target size={16}/></div>
                                <h3 className="text-xs font-black uppercase tracking-widest font-display">Expected Goals</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                <StatRow icon={<Users size={14}/>} label="Eligible Students" value={cycle.eligible_students} color="text-blue-900" bg="bg-blue-100"/>
                                <StatRow icon={<Clock size={14}/>} label="Expected Sessions" value={cycle.expected_sessions} color="text-blue-900" bg="bg-blue-100"/>
                                <StatRow icon={<CheckSquare size={14}/>} label="Total Expected Meals" value={cycle.expected_meals} color="text-coffee/60" bg="bg-gray-100"/>
                                <StatRow icon={<UserX size={14}/>} label="Expected Missed Meals" value={0} color="text-coffee/60" bg="bg-gray-100"/>
                            </div>
                        </div>

                        <div className="bg-white/80 border-[0.75px] border-emerald-300 rounded-2xl p-6 shadow-sm h-full hover:border-emerald-400 transition-colors">
                            <div className="flex items-center gap-3 mb-4 text-emerald-800">
                                <div className="bg-emerald-100 p-2 rounded-lg border-[0.75px] border-emerald-200"><CheckCircle size={16}/></div>
                                <h3 className="text-xs font-black uppercase tracking-widest font-display">Actual Performance</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                <StatRow icon={<Users size={14}/>} label="Students Served" value={cycle.students_served} color="text-emerald-700" bg="bg-emerald-100"/>
                                <StatRow icon={<Clock size={14}/>} label="Sessions Served" value={cycle.sessions_served} color="text-emerald-700" bg="bg-emerald-100"/>
                                <StatRow icon={<Utensils size={14}/>} label="Meals Served" value={cycle.meals_served} color="text-emerald-700" bg="bg-emerald-100"/>
                                <StatRow icon={<UserX size={14}/>} label="Total Missed Meals" value={cycle.total_missed} color="text-red-500" bg="bg-red-100"/>
                            </div>
                        </div>
                    </div>

                    <div className={`grid gap-5 ${showSpecial ? 'grid-cols-5' : 'grid-cols-4'} w-full`} data-html2canvas-ignore="true">
                        <CuteReportBtn label="Breakfast" loading={excelLoading === 'breakfast'} onClick={() => handleExcel('breakfast')} icon={<FileSpreadsheet size={24} strokeWidth={2.5}/>} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-300"/>
                        <CuteReportBtn label="Lunch" loading={excelLoading === 'lunch'} onClick={() => handleExcel('lunch')} icon={<FileSpreadsheet size={24} strokeWidth={2.5}/>} color="text-amber-700" bg="bg-amber-50" border="border-amber-300"/>
                        <CuteReportBtn label="Dinner" loading={excelLoading === 'dinner'} onClick={() => handleExcel('dinner')} icon={<FileSpreadsheet size={24} strokeWidth={2.5}/>} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-300"/>
                        {showSpecial && <CuteReportBtn label="Special" loading={excelLoading === 'special'} onClick={() => handleExcel('special')} icon={<FileSpreadsheet size={24} strokeWidth={2.5}/>} color="text-purple-700" bg="bg-purple-50" border="border-purple-300"/>}
                        <CuteReportBtn label="Full Summary" loading={excelLoading === 'summary'} onClick={() => handleExcel('summary')} icon={<FileSpreadsheet size={24} strokeWidth={2.5}/>} color="text-brandOrange" bg="bg-orange-50" border="border-orange-300"/>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const CuteReportBtn = ({ label, icon, color, bg, border, onClick, loading }) => (
    <button onClick={onClick} disabled={loading} className={`group flex flex-col justify-between p-3 h-28 ${bg} rounded-2xl border-[0.75px] ${border} hover:bg-white hover:border-blue-400 shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-out disabled:opacity-70 disabled:cursor-wait`}>
        <div className="flex flex-row items-center justify-center gap-3 flex-1 w-full">
            <div className={`p-2.5 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform duration-300 ${color}`}>
                {loading ? <Loader size={24} className="animate-spin text-gray-400"/> : icon}
            </div>
            <div className={`font-black text-xs uppercase tracking-wide transition-colors ${color}`}>{label}</div>
        </div>
        <div className="w-full flex justify-center mt-1">
            <div className="bg-white/90 px-4 py-1.5 rounded-full flex items-center gap-2 border-[0.75px] border-black/10 group-hover:bg-brandGreen group-hover:text-white group-hover:border-transparent transition-colors duration-300 shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider">{loading ? 'Wait...' : 'Open'}</span>
                {!loading && <Download size={10} strokeWidth={3} />}
            </div>
        </div>
    </button>
);

export default MonthlyReportView;