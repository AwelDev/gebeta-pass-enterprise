const { getDB } = require('../database/connection');

const addLog = (log) => getDB().prepare(`INSERT INTO meal_logs (student_id, meal_type, session_number, session_name, status, scan_method, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(log.id, log.type, log.num, log.name, log.status, log.method, new Date().toISOString());

const checkDouble = (id, type, num) => getDB().prepare(`SELECT * FROM meal_logs WHERE student_id = ? AND meal_type = ? AND session_number = ? AND status = 'ATE' AND date(timestamp, 'localtime') = date('now', 'localtime')`).get(id, type, num);

const countStatusToday = (status) => getDB().prepare(`SELECT count(*) as c FROM meal_logs WHERE status = ? AND date(timestamp, 'localtime') = date('now', 'localtime')`).get(status).c;

const countMethodToday = (method) => getDB().prepare(`SELECT count(*) as c FROM meal_logs WHERE scan_method = ? AND date(timestamp, 'localtime') = date('now', 'localtime')`).get(method).c;

const countMealToday = (meal) => getDB().prepare(`SELECT count(*) as c FROM meal_logs WHERE status = 'ATE' AND meal_type = ? AND date(timestamp, 'localtime') = date('now', 'localtime')`).get(meal).c;

const getLastSessionNum = (type) => getDB().prepare(`SELECT MAX(session_number) as num FROM meal_logs WHERE meal_type = ? AND date(timestamp, 'localtime') = date('now', 'localtime')`).get(type);

const getSessionCount = (type) => getDB().prepare(`SELECT count(*) as c FROM meal_logs WHERE meal_type = ? AND status = 'ATE' AND date(timestamp, 'localtime') = date('now', 'localtime')`).get(type).c;

const getSecurityLogs = (startDateStr) => getDB().prepare(`SELECT l.student_id, l.status, l.meal_type, l.timestamp, s.full_name FROM meal_logs l LEFT JOIN students s ON l.student_id = s.id WHERE l.status IN ('DOUBLE', 'INVALID', 'NON_CAFE', 'INTERN', 'RESTRICTED') AND l.timestamp >= ? ORDER BY l.timestamp DESC LIMIT 200`).all(startDateStr);

const getSessionLogs = (type, num) => getDB().prepare(`SELECT l.*, s.full_name FROM meal_logs l LEFT JOIN students s ON l.student_id = s.id WHERE l.meal_type = ? AND l.session_number = ? AND date(l.timestamp, 'localtime') = date('now', 'localtime')`).all(type, num);

const getLogsInDateRange = (start, end) => getDB().prepare("SELECT * FROM meal_logs WHERE timestamp >= ? AND timestamp <= ?").all(start, end);

// --- THE CRITICAL MISSING FUNCTION ---
const getCycleSummary = (start, end) => {
    const db = getDB();
    
    // 1. Total Served
    const served = db.prepare("SELECT count(*) as c FROM meal_logs WHERE status = 'ATE' AND timestamp >= ? AND timestamp <= ?").get(start, end).c;
    
    // 2. Double Attempts
    const double = db.prepare("SELECT count(*) as c FROM meal_logs WHERE status = 'DOUBLE' AND timestamp >= ? AND timestamp <= ?").get(start, end).c;
    
    // 3. Unique Sessions
    const sessions = db.prepare(`
        SELECT count(*) as c FROM (
            SELECT DISTINCT date(timestamp, 'localtime'), meal_type 
            FROM meal_logs 
            WHERE status = 'ATE' AND timestamp >= ? AND timestamp <= ?
        )
    `).get(start, end).c;

    // 4. Unique Students Served
    const uniqueServed = db.prepare(`
        SELECT count(DISTINCT l.student_id) as c 
        FROM meal_logs l
        JOIN students s ON l.student_id = s.id
        WHERE l.status = 'ATE' 
        AND s.category = 'Eligible'
        AND l.timestamp >= ? AND l.timestamp <= ?
    `).get(start, end).c;

    return { served, double, sessions, uniqueServed };
};

const clearAnalytics = () => { try { getDB().prepare("DELETE FROM meal_logs").run(); return { success: true }; } catch(e) { return { success: false, message: e.message }; } };

const deleteTodayLogs = () => { try { getDB().prepare("DELETE FROM meal_logs WHERE date(timestamp, 'localtime') = date('now', 'localtime')").run(); return { success: true }; } catch (e) { return { success: false, message: e.message }; } };

module.exports = { 
    addLog, checkDouble, countStatusToday, countMethodToday, countMealToday, 
    getLastSessionNum, getSessionCount, getSecurityLogs, getSessionLogs, 
    getLogsInDateRange, getCycleSummary, clearAnalytics, deleteTodayLogs 
};