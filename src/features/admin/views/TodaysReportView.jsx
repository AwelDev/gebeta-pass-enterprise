import React, { useState, useMemo } from 'react';
import { 
    FileText, Coffee, Sun, Moon, Star, AlertTriangle, AlertOctagon, 
    Ban, Shield, Download, Utensils, Calendar, FileDown, Trash2, Loader, FileSpreadsheet 
} from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

const TodaysReportView = () => {
    const { stats, students, departments, backups, notify, actions, loading } = useAdmin();
    const [isDownloading, setIsDownloading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false); // Modal State

    const data = useMemo(() => {
        try {
            const safeStats = stats || {};
            const ate = safeStats.ate || { breakfast: 0, lunch: 0, dinner: 0, special: 0 };
            const allowedDeptNames = (departments || []).filter(d => d.allowed === 1).map(d => d.name);
            const realEligible = (students || []).filter(s => s.category === 'Eligible' && allowedDeptNames.includes(s.department)).length;
            const missed = {
                breakfast: Math.max(0, realEligible - (ate.breakfast || 0)),
                lunch: Math.max(0, realEligible - (ate.lunch || 0)),
                dinner: Math.max(0, realEligible - (ate.dinner || 0)),
                special: Math.max(0, realEligible - (ate.special || 0))
            };
            const securityLogs = safeStats.security || {};
            let invalidCount = 0;
            let doubleCount = 0;
            let restrictedCount = 0;
            const allSecurityLogs = Object.values(securityLogs).flat();
            allSecurityLogs.forEach(log => {
                const status = (log.status || '').toUpperCase();
                switch (status) {
                    case 'DOUBLE': doubleCount++; break;
                    case 'INVALID': invalidCount++; break;
                    case 'RESTRICTED': case 'NON_CAFE': case 'INTERN': restrictedCount++; break;
                    default: invalidCount++; break;
                }
            });
            return { ate, missed, errors: { invalid: invalidCount, double: doubleCount, restricted: restrictedCount }, realEligible };
        } catch (error) {
            console.error("Stats Calculation Error:", error);
            return { ate: { breakfast: 0, lunch: 0, dinner: 0, special: 0 }, missed: { breakfast: 0, lunch: 0, dinner: 0, special: 0 }, realEligible: 0, errors: { invalid: 0, double: 0, restricted: 0 } };
        }
    }, [stats, students, departments]);

    const handleOpenMeal = async (meal) => {
        playSound('click');
        if (!backups) return;
        const todayStr = new Date().toISOString().split('T')[0]; 
        const match = backups.find(b => b && b.name.includes(todayStr) && b.name.toLowerCase().includes(meal.toLowerCase()));
        if (match) { 
            window.api.openFile(match.path); 
            notify('success', `Opened ${meal} Report`); 
        } else { 
            notify('error', `No report found for ${meal} yet.`); 
        }
    };

    const handleDownloadPDF = async () => {
        playSound('click');
        const element = document.getElementById('today-report-capture');
        if (!element) return;
        setIsDownloading(true);
        notify('success', "Generating PDF...");
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#eff6ff', logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`Daily_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            notify('success', "PDF Downloaded!");
        } catch (error) { 
            notify('error', "PDF Generation Failed"); 
        } finally { 
            setIsDownloading(false); 
        }
    };

    const handleResetConfirm = async () => {
        playSound('click');
        setShowResetModal(false);
        await actions.resetToday();
    };

    if (loading || !stats) {
        return (
            <Card title="Today's Report" icon={FileText} theme="blue">
                <div className="h-full flex items-center justify-center">
                    <Loader size={32} className="animate-spin text-blue-400"/>
                </div>
            </Card>
        );
    }

    return (
        <Card title="Today's Report" icon={FileText} theme="blue">
            <div className="flex flex-col h-full px-2 pb-6 overflow-y-auto scrollbar-thin">
                
                {/* --- RESET MODAL --- */}
                {showResetModal && (
                    <ActionModal 
                        title="Reset Today's Data?"
                        msg="This will permanently delete today's meal logs and Excel reports. Cannot be undone."
                        icon={Trash2}
                        onConfirm={handleResetConfirm}
                        onCancel={() => setShowResetModal(false)}
                        confirmText="Wipe Data"
                        color="red"
                    />
                )}

                <div className="flex justify-between items-center mb-6 shrink-0 border-b-[0.75px] border-dashed border-blue-300 pb-4">
                    <div className="flex items-center gap-2 text-blue-900 bg-white px-4 py-2 rounded-xl border-[0.75px] border-blue-400 shadow-sm">
                        <Calendar size={14} strokeWidth={2.5}/>
                        <span className="text-xs font-black uppercase tracking-widest font-display pt-0.5">
                            {format(new Date(), 'EEEE, MMM do')}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Modified Button to open Modal */}
                        <button onClick={() => { playSound('click'); setShowResetModal(true); }} className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2 rounded-xl shadow-sm hover:bg-red-600 hover:text-white hover:shadow-lg active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest border-[0.75px] border-red-200 group">
                            <Trash2 size={14} strokeWidth={3} className="group-hover:animate-bounce"/>
                            <span>Reset Today's Data</span>
                        </button>
                        <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest border-[0.75px] border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed group">
                            {isDownloading ? <Loader size={14} className="animate-spin"/> : <FileDown size={14} strokeWidth={3} className="group-hover:animate-bounce"/>}
                            <span>{isDownloading ? 'Saving...' : 'Download PDF'}</span>
                        </button>
                    </div>
                </div>

                <div id="today-report-capture" className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                        <div className="lg:col-span-2">
                            <div className="bg-white/80 border-[0.75px] border-blue-300 rounded-2xl p-6 shadow-sm hover:border-blue-400 transition-colors">
                                <div className="flex items-center gap-3 mb-4 text-blue-900">
                                    <div className="bg-blue-100 p-2 rounded-lg border-[0.75px] border-blue-200"><Utensils size={16}/></div>
                                    <h3 className="text-xs font-black uppercase tracking-widest font-display">Meal Service Overview</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-3 opacity-60 border-b-[0.75px] border-dashed border-blue-900/10 pb-2 px-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest pl-2">Session</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-center">Served</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-center">Missed</div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <CuteServiceRow label="Breakfast" icon={<Coffee size={14}/>} served={data.ate.breakfast} missed={data.missed.breakfast} />
                                    <CuteServiceRow label="Lunch" icon={<Sun size={14}/>} served={data.ate.lunch} missed={data.missed.lunch} />
                                    <CuteServiceRow label="Dinner" icon={<Moon size={14}/>} served={data.ate.dinner} missed={data.missed.dinner} />
                                    {data.ate.special > 0 && <CuteServiceRow label="Special" icon={<Star size={14}/>} served={data.ate.special} missed={data.missed.special} />}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="bg-white/80 border-[0.75px] border-blue-300 rounded-2xl p-6 shadow-sm h-full hover:border-blue-400 transition-colors">
                                <div className="flex items-center gap-3 mb-4 text-orange-700">
                                    <div className="bg-orange-100 p-2 rounded-lg border-[0.75px] border-orange-200"><AlertTriangle size={16}/></div>
                                    <h3 className="text-xs font-black uppercase tracking-widest font-display">Invalid ID Scans</h3>
                                </div>
                                <div className="flex flex-col gap-3 justify-center h-full pb-8">
                                    <CuteSecurityRow label="Invalid IDs" value={data.errors.invalid} icon={<AlertOctagon size={14}/>} color="text-orange-600" bg="bg-orange-100"/>
                                    <CuteSecurityRow label="Repeated" value={data.errors.double} icon={<Ban size={14}/>} color="text-red-600" bg="bg-red-100"/>
                                    <CuteSecurityRow label="Restricted" value={data.errors.restricted} icon={<Shield size={14}/>} color="text-yellow-700" bg="bg-yellow-100"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full" data-html2canvas-ignore="true">
                        <CuteFileBtn label="Breakfast" color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-300" onClick={() => handleOpenMeal('Breakfast')} />
                        <CuteFileBtn label="Lunch" color="text-amber-700" bg="bg-amber-50" border="border-amber-300" onClick={() => handleOpenMeal('Lunch')} />
                        <CuteFileBtn label="Dinner" color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-300" onClick={() => handleOpenMeal('Dinner')} />
                        <CuteFileBtn label="Special" color="text-purple-700" bg="bg-purple-50" border="border-purple-300" onClick={() => handleOpenMeal('Special')} />
                    </div>
                </div>
            </div>
        </Card>
    );
};

const CuteServiceRow = ({ label, icon, served, missed }) => (
    <div className="flex items-center justify-between py-4 px-3 rounded-xl bg-white/60 border-[0.75px] border-black/10 hover:bg-white hover:shadow-sm transition-all group shrink-0">
        <div className="flex items-center gap-3 w-1/3 overflow-visible">
            <div className="text-coffee/40 opacity-70 group-hover:text-emerald-600 transition-colors shrink-0">{icon}</div>
            <span className="font-bold text-coffee text-xs uppercase tracking-wide leading-none pt-0.5">{label}</span>
        </div>
        <div className="w-1/3 text-center"><span className="font-black text-lg text-brandGreen leading-none font-display">{served}</span></div>
        <div className="w-1/3 text-center"><span className="font-black text-lg text-red-400 leading-none font-display">{missed}</span></div>
    </div>
);

const CuteSecurityRow = ({ label, value, icon, color, bg }) => (
    <div className="flex items-center justify-between py-4 px-3 rounded-xl bg-white/60 border-[0.75px] border-black/10 hover:bg-white hover:shadow-sm transition-all group shrink-0">
        <div className="flex items-center gap-3 overflow-visible">
            <div className={`p-1.5 rounded-lg ${bg} ${color} bg-opacity-50 group-hover:scale-110 transition-transform shrink-0`}>{icon}</div>
            <span className="font-bold text-coffee text-xs uppercase tracking-wide leading-none pt-0.5">{label}</span>
        </div>
        <span className={`font-black text-xl ${color} leading-none font-display shrink-0`}>{value}</span>
    </div>
);

const CuteFileBtn = ({ label, color, bg, border, onClick }) => (
    <button onClick={onClick} className={`group flex flex-col justify-between p-3 h-full min-h-[100px] ${bg} rounded-2xl border-[0.75px] ${border} hover:bg-white hover:border-coffee/20 shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-out`}>
        <div className="flex flex-row items-center justify-center gap-3 flex-1 w-full">
            <div className={`p-2.5 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform duration-300 ${color}`}><FileSpreadsheet size={24} strokeWidth={2.5}/></div>
            <div className={`font-black text-xs uppercase tracking-wide transition-colors ${color}`}>{label}</div>
        </div>
        <div className="w-full flex justify-center mt-1">
            <div className="bg-white/80 px-4 py-1.5 rounded-full flex items-center gap-2 border-[0.75px] border-black/10 group-hover:bg-brandGreen group-hover:text-white group-hover:border-transparent transition-colors duration-300 shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider">Open</span>
                <Download size={10} strokeWidth={3} />
            </div>
        </div>
    </button>
);

export default TodaysReportView;