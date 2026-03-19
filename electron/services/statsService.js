const studentRepo = require('../repositories/studentRepo');
const logRepo = require('../repositories/logRepo');
const userRepo = require('../repositories/userRepo');
const deptRepo = require('../repositories/deptRepo');
const { app, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// --- HELPER: CALCULATE EXPECTED SESSIONS ---
const calculateCycleLogic = (startDateStr, eligibleCount, totalServed) => {
    try {
        const start = new Date(startDateStr);
        const now = new Date();

        // 1. Calculate Full Days Passed (Midnight to Midnight)
        const startMidnight = new Date(start); startMidnight.setHours(0,0,0,0);
        const nowMidnight = new Date(now); nowMidnight.setHours(0,0,0,0);
        
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffMs = nowMidnight - startMidnight;
        const fullDaysPassed = Math.floor(diffMs / msPerDay);
        
        // 2. Sessions Served TODAY
        // We only count sessions that actually happened today.
        // If the day is incomplete, we don't guess—we just look at the logs.
        const logsToday = logRepo.getLogsInDateRange(nowMidnight.toISOString(), now.toISOString()) || [];
        const uniqueMealsToday = new Set(logsToday.map(l => l.meal_type)).size;

        // 3. Total Expected Sessions
        // Past Days: 3 per day (Fixed)
        // Today: Actual sessions served so far (Dynamic)
        const pastExpected = Math.max(0, fullDaysPassed) * 3;
        const totalExpectedSessions = pastExpected + uniqueMealsToday;

        // 4. Meals Logic
        const totalExpectedMeals = eligibleCount * totalExpectedSessions;
        const totalMissed = Math.max(0, totalExpectedMeals - totalServed);

        return {
            expected_sessions: totalExpectedSessions,
            expected_meals: totalExpectedMeals,
            total_missed: totalMissed
        };

    } catch (e) {
        console.error("Math Error:", e);
        return { expected_sessions: 0, expected_meals: 0, total_missed: 0 };
    }
};

const getDashboardStats = () => {
    // Basic Counts
    const total = studentRepo.countTotal();
    const nonCafe = studentRepo.countCategory('Non Cafe');
    const interns = studentRepo.countCategory('Medical Intern');
    const offCampus = studentRepo.countCategory('Off Campus');
    
    const allStudents = studentRepo.getAll();
    const allDepts = deptRepo.getAll();
    const allowedDepts = new Set(allDepts.filter(d => d.allowed === 1).map(d => d.name));
    
    const eligible = allStudents.filter(s => 
        s.category === 'Eligible' && allowedDepts.has(s.department)
    ).length;

    const restricted = total - eligible - nonCafe - interns - offCampus;

    // Today's Stats
    const ateToday = logRepo.countStatusToday('ATE');
    const b = logRepo.countMealToday('Breakfast');
    const l = logRepo.countMealToday('Lunch');
    const d = logRepo.countMealToday('Dinner');
    const s = logRepo.countMealToday('Special');

    // Security Logs
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const rawSecurityLogs = logRepo.getSecurityLogs(startOfToday.toISOString()) || [];
    
    const securityBySession = { 
        Breakfast: rawSecurityLogs.filter(log => log.meal_type === 'Breakfast'), 
        Lunch: rawSecurityLogs.filter(log => log.meal_type === 'Lunch'), 
        Dinner: rawSecurityLogs.filter(log => log.meal_type === 'Dinner'), 
        Special: rawSecurityLogs.filter(log => log.meal_type === 'Special') 
    };

    // --- DYNAMIC CYCLE ANALYTICS ---
    const dbCycleStart = userRepo.getCycleStart()?.value; 
    let startDateStr = dbCycleStart;
    
    // Auto-Fix Date if missing
    if (!startDateStr) {
        startDateStr = new Date().toISOString();
        userRepo.updateCycleStart(startDateStr);
    }

    const now = new Date().toISOString();
    const cycleData = logRepo.getCycleSummary(startDateStr, now);
    
    // --- APPLY PERFECT MATH ---
    const math = calculateCycleLogic(startDateStr, eligible, cycleData.served);

    const cycleStats = {
        eligible_students: eligible,
        students_served: cycleData.uniqueServed,
        
        expected_sessions: math.expected_sessions,
        sessions_served: cycleData.sessions,
        
        expected_meals: math.expected_meals,
        meals_served: cycleData.served,
        
        expected_missed: 0, // Hardcoded to 0 as requested
        total_missed: math.total_missed, 
        
        repeat_attempts: cycleData.double,
        cycle_start_date: startDateStr
    };

    return { 
        pop: { total, eligible, nonCafe, interns, offCampus, restricted }, 
        ate: { total: ateToday, breakfast: b, lunch: l, dinner: d, special: s }, 
        security: securityBySession,
        cycle: cycleStats
    };
};

const getDailyStatus = () => {
    let currentActive = null;
    try {
        const sess = userRepo.getSession();
        if (sess && sess.value) {
            const parsed = JSON.parse(sess.value);
            if (parsed.active) currentActive = parsed.mealType;
        }
    } catch(e) {}
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const todaysLogs = logRepo.getLogsInDateRange(startOfDay, endOfDay) || [];
    const status = {};
    const meals = ['Breakfast', 'Lunch', 'Dinner', 'Special'];
    meals.forEach(meal => {
        const hasData = todaysLogs.some(l => l.meal_type === meal && l.status === 'ATE');
        if (currentActive === meal) status[meal] = 'active';
        else if (hasData) status[meal] = 'ended';
        else status[meal] = 'new';
    });
    return status;
};

// --- EXCEL GENERATOR ---
const generateReport = async (reportType) => {
    try {
        const dbCycleStart = userRepo.getCycleStart()?.value; 
        let startDateStr = dbCycleStart || new Date().toISOString();
        
        const students = studentRepo.getAll();
        const logs = logRepo.getLogsInDateRange(startDateStr, new Date().toISOString());
        
        // --- REUSE MATH LOGIC FOR EXCEL ---
        // We need to calculate expected sessions to determine "Missed" per student
        // Note: For individual students, "Missed" is roughly (Expected - Eaten)
        
        // 1. Calculate Full Days & Today's Sessions
        const start = new Date(startDateStr);
        const now = new Date();
        const startMidnight = new Date(start); startMidnight.setHours(0,0,0,0);
        const nowMidnight = new Date(now); nowMidnight.setHours(0,0,0,0);
        const msPerDay = 1000 * 60 * 60 * 24;
        const fullDaysPassed = Math.floor((nowMidnight - startMidnight) / msPerDay);
        
        const logsToday = logs.filter(l => l.timestamp >= nowMidnight.toISOString());
        const uniqueMealsToday = new Set(logsToday.map(l => l.meal_type)).size;
        
        const dynamicExpected = (Math.max(0, fullDaysPassed) * 3) + uniqueMealsToday;

        const analysisMap = {};
        const activeDatesSet = new Set();

        logs.forEach(l => {
            if (!analysisMap[l.student_id]) {
                analysisMap[l.student_id] = {
                    stats: { brk: 0, lun: 0, din: 0, dbl: 0, nc: 0, int: 0, rest: 0 },
                    history: {}
                };
            }
            const record = analysisMap[l.student_id];
            
            if (l.status === 'DOUBLE') record.stats.dbl++;
            if (l.status === 'NON_CAFE') record.stats.nc++;
            if (l.status === 'INTERN') record.stats.int++;
            if (l.status === 'RESTRICTED') record.stats.rest++;

            if (l.status === 'ATE') {
                const dateKey = l.timestamp.split('T')[0];
                activeDatesSet.add(dateKey);
                if (!record.history[dateKey]) record.history[dateKey] = {};
                record.history[dateKey][l.meal_type] = true;

                if (l.meal_type === 'Breakfast') record.stats.brk++;
                if (l.meal_type === 'Lunch') record.stats.lun++;
                if (l.meal_type === 'Dinner') record.stats.din++;
            }
        });

        const finalStudents = students.filter(s => s.category === 'Eligible' || analysisMap[s.id]);

        let excelData = [];
        let sheetName = "";

        if (reportType === 'summary') {
            sheetName = "30-Day_Summary";
            excelData = finalStudents.map(s => {
                const data = analysisMap[s.id] || { stats: { brk: 0, lun: 0, din: 0, dbl: 0, nc: 0, int: 0, rest: 0 } };
                const totalEaten = data.stats.brk + data.stats.lun + data.stats.din;
                
                let missed = 0;
                if (s.category === 'Eligible') {
                    missed = Math.max(0, dynamicExpected - totalEaten);
                }

                return {
                    "ID": s.id, "Name": s.full_name, "Dept": s.department, "Category": s.category,
                    "Total Breakfast": data.stats.brk, "Total Lunch": data.stats.lun, "Total Dinner": data.stats.din,
                    "GRAND TOTAL EATEN": totalEaten, "TOTAL MISSED": missed,
                    "Double Trials": data.stats.dbl, "Non-Cafe Trials": data.stats.nc, "Intern/Restricted Trials": data.stats.int + data.stats.rest
                };
            });
        } else {
            const targetMeal = reportType.charAt(0).toUpperCase() + reportType.slice(1);
            sheetName = `30-Day_${targetMeal}`;
            const sortedDates = Array.from(activeDatesSet).sort();

            excelData = finalStudents.map(s => {
                const data = analysisMap[s.id] || { history: {} };
                const row = { "ID": s.id, "Name": s.full_name, "Dept": s.department, "Category": s.category };
                let rowTotal = 0;
                sortedDates.forEach(date => {
                    const didEat = data.history[date]?.[targetMeal];
                    const val = didEat ? 1 : 0;
                    row[date] = val;
                    rowTotal += val;
                });
                row["TOTAL"] = rowTotal;
                return row;
            });
        }

        const docPath = app.getPath('documents');
        const reportDir = path.join(docPath, 'Gebeta_Reports');
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${sheetName}_${dateStr}_${Date.now()}.xlsx`;
        const filePath = path.join(reportDir, fileName);

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, filePath);

        await shell.openPath(filePath);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
};

const generateMasterExcel = async () => generateReport('summary');

module.exports = { getDashboardStats, getDailyStatus, generateReport, generateMasterExcel };