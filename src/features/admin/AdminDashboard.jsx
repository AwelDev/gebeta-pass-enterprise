import React, { useState, useEffect } from 'react';
import { LogOut, BarChart3, FileText, CalendarRange, Users, School, Settings, Info, CheckCircle, X } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { NavBtn } from './components/AdminUI';
import ServiceOverview from './views/ServiceOverview';
import TodaysReportView from './views/TodaysReportView';
import InvalidAccessLogsView from './views/InvalidAccessLogsView';
import MonthlyReportView from './views/MonthlyReportView';
import StudentDatabaseView from './views/StudentDatabaseView';
import DepartmentControlView from './views/DepartmentControlView';
import SecurityView from './views/SecurityView';
import AboutUsView from './views/AboutUsView';

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    const [data, setData] = useState({ 
        stats: {}, 
        students: [], 
        departments: [], 
        backups: [] 
    });

    useEffect(() => {
        const init = async () => {
            try {
                await refreshData();
            } catch (e) {
                console.error("Init Error", e);
                showNotify('error', "Failed to load system data");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (['overview', 'today', 'invalid_logs'].include