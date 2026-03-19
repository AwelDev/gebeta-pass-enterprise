import React, { useMemo } from 'react';
import { UserCheck, Ban, Stethoscope, Briefcase, Activity, CheckCircle, BarChart3, Home, ShieldX } from 'lucide-react';
import { Card } from '../components/DesignSystem';
import { useAdmin } from '../context/AdminContext';

const ServiceOverview = () => {
    const { stats, students, departments } = useAdmin();
    
    // --- OPTIMIZED CALCULATION ENGINE ---
    const activeDeptList = useMemo(() => {
        const safeStudents = students || [];
        const safeDepts = departments || [];

        // Fast Counting (Frequency Map Pattern)
        const counts = {};
        for (let i = 0; i < safeStudents.length; i++) {
            const dept = safeStudents[i].department;
            if (dept) {
                counts[dept] = (counts[dept] || 0) + 1;
            }
        }

        return safeDepts
            .filter(d => d.allowed === 1)
            .map(d => ({
                name: d.name,
                count: counts[d.name] || 0
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, departments]);

    return (
        <Card title="Service Overview" icon={BarChart3} theme="blue">
            <div className="flex gap-5 w-full flex-1 min-h-0 items-stretch h-full overflow-y-auto scrollbar-thin pr-2 pb-4">
                
                {/* --- LEFT COLUMN: KEY METRICS --- */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-white/80 border-[0.75px] border-blue-300 rounded-2xl shadow-sm flex-1 flex flex-col min-h-[200px] overflow-hidden shrink-0">
                        
                        {/* Metric 1: Total Registered */}
                        <div className="flex-1 flex flex-col items-center justify-center p-3 border-b-[0.75px] border-blue-200 bg-blue-50/20">
                            {/* Adjusted Size: text-6xl fits perfectly */}
                            <h1 className="text-6xl font-black text-blue-900 font-display mb-1 drop-shadow-sm leading-none">
                                {stats?.pop?.total || 0}
                            </h1>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 shadow-sm">
                                <Activity size={12} className="text-blue-600"/>
                                <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Total Registered Students</span>
                            </div>
                        </div>
                        
                        {/* Metric 2: Eligible */}
                        <div className="flex-1 flex flex-col items-center justify-center p-3 bg-emerald-50/20">
                            {/* Adjusted Size: text-6xl fits perfectly */}
                            <h1 className="text-6xl font-black text-emerald-600 font-display mb-1 drop-shadow-sm leading-none">
                                {stats?.pop?.eligible || 0}
                            </h1>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 shadow-sm">
                                <UserCheck size={12} className="text-emerald-600"/>
                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Eligible to Eat</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Detailed Stats (Custom Big Rows) */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <BigStatRow label="Non Cafe" value={stats?.pop?.nonCafe || 0} icon={<Ban size={16}/>} color="text-red-600" bg="bg-red-50" border="border-red-200"/>
                        <BigStatRow label="Interns" value={stats?.pop?.interns || 0} icon={<Stethoscope size={16}/>} color="text-orange-600" bg="bg-orange-50" border="border-orange-200"/>
                        <BigStatRow label="Restricted" value={stats?.pop?.restricted || 0} icon={<ShieldX size={16}/>} color="text-gray-600" bg="bg-gray-100" border="border-gray-200"/>
                        <BigStatRow label="Off Campus" value={stats?.pop?.offCampus || 0} icon={<Home size={16}/>} color="text-blue-600" bg="bg-blue-50" border="border-blue-200"/>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: ACTIVE DEPARTMENTS --- */}
                <div className="flex-[2] bg-white/80 border-[0.75px] border-emerald-300 rounded-2xl p-6 shadow-sm flex flex-col min-h-0 hover:border-emerald-400 transition-colors">
                    <div className="flex items-center gap-3 mb-4 text-emerald-800 shrink-0">
                        <div className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-200"><Briefcase size={18}/></div>
                        <h3 className="text-xs font-black uppercase tracking-widest font-display">Active Departments</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <div className="grid grid-cols-2 gap-3">
                            {activeDeptList.map((d) => (
                                <div key={d.name} className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all shadow-sm group">
                                    <span className="font-bold text-xs text-coffee truncate max-w-[140px]">{d.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-2xl text-emerald-600 font-display group-hover:scale-110 transition-transform leading-none">
                                            {d.count}
                                        </span>
                                        <CheckCircle size={12} className="text-emerald-400 opacity-50"/>
                                    </div>
                                </div>
                            ))}
                            {activeDeptList.length === 0 && (
                                <div className="col-span-2 text-center text-gray-400 text-xs font-bold mt-10 opacity-60">
                                    No Active Departments Configured
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

// --- Local Component: Bigger Stat Row ---
const BigStatRow = ({ label, value, icon, color, bg, border }) => (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/80 border-[0.75px] ${border} hover:bg-white hover:shadow-md transition-all group shrink-0`}>
        <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${bg} bg-opacity-50 group-hover:scale-110 transition-transform ${color}`}>
                {icon}
            </div>
            <span className="font-bold text-coffee text-xs uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-right">
             <span className={`font-black text-2xl ${color} leading-none font-display block`}>{value}</span>
        </div>
    </div>
);

export default ServiceOverview;