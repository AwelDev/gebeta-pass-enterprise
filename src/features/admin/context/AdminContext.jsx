import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { playSound } from '../../../utils/audio';

const AdminContext = createContext();

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) throw new Error("useAdmin must be used within an AdminProvider");
    return context;
};

export const AdminProvider = ({ children, onLogout }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [notification, setNotification] = useState(null);
    
    // Central Data Store
    const [data, setData] = useState({
        stats: {},
        students: [],
        departments: [],
        backups: []
    });

    // --- NOTIFICATION SYSTEM ---
    const notify = useCallback((type, msg) => {
        playSound(type === 'error' ? 'warning' : 'click');
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // --- DATA FETCHING ---
    const refreshData = useCallback(async () => {
        try {
            const [stats, students, departments, backups] = await Promise.all([
                window.api.getDashboardStats(),
                window.api.getAllStudents(),
                window.api.getDepartments(),
                window.api.getBackups()
            ]);
            setData({ 
                stats: stats || {}, 
                students: students || [], 
                departments: departments || [], 
                backups: backups || [] 
            });
        } catch (e) {
            console.error("Refresh Error", e);
            notify('error', "Sync Failed");
        }
    }, [notify]);

    // --- INITIAL LOAD ---
    useEffect(() => {
        const init = async () => {
            await refreshData();
            setLoading(false);
        };
        init();
    }, [refreshData]);

    // --- LIVE POLLING ---
    useEffect(() => {
        const interval = setInterval(async () => {
            if (['overview', 'today'].includes(activeTab)) {
                const stats = await window.api.getDashboardStats();
                const backups = await window.api.getBackups();
                if (stats) setData(prev => ({ ...prev, stats, backups: backups || [] }));
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    // --- CENTRALIZED ACTIONS (FIXED: NO NATIVE CONFIRMS) ---
    // The View components now handle the Custom UI Modals. 
    // These actions simply execute the backend request.
    const actions = {
        resetCycle: async () => {
            const res = await window.api.clearAnalytics();
            if(res.success) { 
                notify('success', "Cycle Reset"); 
                refreshData(); 
            } else {
                notify('error', "Reset Failed");
            }
        },
        resetToday: async () => {
            const res = await window.api.resetTodayStats();
            if(res.success) { 
                notify('success', "Today's Data Wiped"); 
                refreshData(); 
            } else {
                notify('error', "Wipe Failed");
            }
        },
        recoverStudents: async () => {
            const res = await window.api.recoverStudents();
            if(res.success) { 
                notify('success', "Recovered!"); 
                refreshData(); 
            } else {
                notify('error', "Recovery Failed");
            }
        },
        deleteAllStudents: async () => {
            const res = await window.api.deleteAllStudents();
            if(res.success) { 
                notify('success', "Database Wiped"); 
                refreshData(); 
            } else {
                notify('error', "Delete Failed");
            }
        },
        toggleDepartment: async (name, status) => {
            await window.api.toggleDepartment({ name, status });
            await refreshData();
        }
    };

    return (
        <AdminContext.Provider value={{ 
            ...data, 
            loading, 
            activeTab, 
            setActiveTab, 
            notification, 
            notify, 
            refreshData, 
            actions,
            onLogout 
        }}>
            {children}
        </AdminContext.Provider>
    );
};
export default AdminContext;