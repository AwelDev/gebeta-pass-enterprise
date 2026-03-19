const { machineIdSync } = require("node-machine-id");
const { app } = require("electron");
const userRepo = require("../repositories/userRepo");
const studentRepo = require("../repositories/studentRepo");

// --- CONFIGURATION ---
const TRIAL_DAYS = 15; // 15 Days Trial in Production
const TRIAL_STUDENT_LIMIT = 100;

const KEY_INSTALL_DATE = "sys_install_date";
const KEY_LAST_RUN = "sys_last_run";
const KEY_LICENSE_DATA = "sys_license_data";

const HWID = machineIdSync();
const isDev = !app.isPackaged; // True in Dev, False in Production

const initialize = async () => {
  const now = new Date().toISOString();
  const installDate = userRepo.getSetting(KEY_INSTALL_DATE);
  
  if (!installDate) {
    userRepo.saveSetting(KEY_INSTALL_DATE, now);
    userRepo.saveSetting(KEY_LAST_RUN, now);
    return;
  }
  
  const lastRun = userRepo.getSetting(KEY_LAST_RUN);
  if (new Date(now) < new Date(lastRun)) {
    userRepo.saveSetting("sys_lock", "TIME_TAMPER");
  } else {
    userRepo.saveSetting(KEY_LAST_RUN, now);
  }
};

const checkLicense = () => {
  // 1. DEVELOPMENT BYPASS (Always PRO in Dev)
  if (isDev) {
    return {
      valid: true,
      type: "PRO",
      daysLeft: 9999,
      message: "Developer Mode",
    };
  }

  // 2. Security Lock Check
  const lock = userRepo.getSetting("sys_lock");
  if (lock)
    return {
      valid: false,
      reason: "LOCKED",
      message: "System Clock Tampered.",
    };

  // 3. Check for Activated License
  const licenseRow = userRepo.getSetting(KEY_LICENSE_DATA);
  if (licenseRow) {
    try {
      const data = JSON.parse(licenseRow);
      if (data.hwid !== HWID)
        return { valid: false, reason: "THEFT", message: "License Copied." };
      const expiry = new Date(data.expiry);
      if (new Date() > expiry)
        return { valid: false, reason: "EXPIRED", message: "Expired." };
      return {
        valid: true,
        type: "PRO",
        daysLeft: Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)),
      };
    } catch (e) {
      return { valid: false, reason: "CORRUPT" };
    }
  }

  // 4. Trial Logic (Only runs in Production)
  const installRow = userRepo.getSetting(KEY_INSTALL_DATE);
  const installDate = new Date(installRow);
  const daysUsed = Math.floor(
    (new Date() - installDate) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUsed > TRIAL_DAYS)
    return { valid: false, reason: "TRIAL_OVER", message: "Trial Expired." };
  
  return {
    valid: true,
    type: "TRIAL",
    daysLeft: TRIAL_DAYS - daysUsed,
    studentLimit: TRIAL_STUDENT_LIMIT,
  };
};

const checkStudentLimit = (amountToAdd) => {
  // In Dev, checkLicense returns 'PRO', so this passes automatically
  const status = checkLicense();
  
  if (status.type === "PRO") return { allowed: true };
  
  const current = studentRepo.countTotal();
  if (current + amountToAdd > TRIAL_STUDENT_LIMIT)
    return { allowed: false, message: "Trial Limit Reached." };
  
  return { allowed: true };
};

const activateLicense = (code) => {
  try {
    const payload = JSON.parse(atob(code));
    if (payload.hwid !== HWID) return { success: false, message: "Invalid ID" };
    userRepo.saveSetting(KEY_LICENSE_DATA, JSON.stringify(payload));
    userRepo.saveSetting("sys_lock", null);
    return { success: true };
  } catch (e) {
    return { success: false, message: "Invalid Code" };
  }
};

const getSystemID = () => HWID;

module.exports = {
  initialize,
  checkLicense,
  checkStudentLimit,
  activateLicense,
  getSystemID,
};