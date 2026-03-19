const {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  shell,
  dialog,
} = require("electron");

// --- 🔧 CRITICAL FIX: DISABLE HARDWARE ACCELERATION ---
// This prevents the "Unclickable Input" bug and "Ghost Elements"
// caused by Neumorphic CSS shadows on Windows/GPU.
app.disableHardwareAcceleration();
// ------------------------------------------------------

const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const log = require("electron-log");

// --- LOGGER INIT ---
log.initialize();
log.transports.file.level = "info";
Object.assign(console, log.functions);

const {
  getAdminPhone,
  updateAdminPhone,
} = require("./repositories/settingsRepo");
const { connectDB, getDB } = require("./database/connection");
const { initSchema } = require("./database/schema");
const authService = require("./services/authService");
const scanService = require("./services/scanService");
const statsService = require("./services/statsService");
const licenseService = require("./services/licenseService");
const securityService = require("./security/securityService");
const studentRepo = require("./repositories/studentRepo");
const userRepo = require("./repositories/userRepo");
const logRepo = require("./repositories/logRepo");
const deptRepo = require("./repositories/deptRepo");
const { performBackup } = require("./utils/backup");

let win;
const isDev = !app.isPackaged;

// --- FAST IMAGE PROTOCOL ---
function setupProtocols() {
  protocol.handle("student-photo", (request) => {
    try {
      const cleanUrl = request.url.replace("student-photo://", "");
      const filename = decodeURIComponent(cleanUrl.split("?")[0]);
      // Fetch Raw Buffer (Fastest Method)
      const buffer = securityService.getPhotoBuffer(filename);
      if (buffer)
        return new Response(buffer, {
          headers: { "Content-Type": "image/jpeg" },
        });
      return new Response("404", { status: 404 });
    } catch (e) {
      log.error("Protocol Error:", e);
      return new Response("500", { status: 500 });
    }
  });
}

function ensureDataIntegrity() {
  if (isDev) return;
  try {
    const userDataPath = app.getPath("userData");
    const liveDbPath = path.join(userDataPath, "cafeteria.db");
    const livePhotosPath = path.join(userDataPath, "photos");
    const backupsDaily = path.join(userDataPath, "backups_daily");
    const backupsSpecial = path.join(userDataPath, "backups_special");
    const masterPath = path.join(process.resourcesPath, "master_data");
    const masterDbPath = path.join(masterPath, "cafeteria.db");

    let dbRestore = !fs.existsSync(liveDbPath);
    if (!dbRestore) {
      try {
        const Database = require("better-sqlite3");
        const test = new Database(liveDbPath, { fileMustExist: true });
        test.prepare("SELECT count(*) FROM sqlite_master").get();
        test.close();
      } catch (e) {
        dbRestore = true;
      }
    }

    if (dbRestore && fs.existsSync(masterDbPath)) {
      fs.copyFileSync(masterDbPath, liveDbPath);
      if (fs.existsSync(masterDbPath + "-wal"))
        fs.copyFileSync(masterDbPath + "-wal", liveDbPath + "-wal");
      if (fs.existsSync(masterDbPath + "-shm"))
        fs.copyFileSync(masterDbPath + "-shm", liveDbPath + "-shm");
    }

    if (!fs.existsSync(livePhotosPath))
      fs.mkdirSync(livePhotosPath, { recursive: true });
    if (!fs.existsSync(backupsDaily))
      fs.mkdirSync(backupsDaily, { recursive: true });
    if (!fs.existsSync(backupsSpecial))
      fs.mkdirSync(backupsSpecial, { recursive: true });
  } catch (e) {
    log.error("Integrity Error", e);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, "../public/images/logo.png"),
  });
  win.maximize();
  if (isDev) win.loadURL("http://localhost:5173");
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(async () => {
  ensureDataIntegrity();
  setupProtocols();
  if (!isDev && process.platform === "win32")
    exec(`attrib +h +s "${app.getPath("userData")}"`, () => {});

  securityService.initialize(); // AES Migration happens here

  const dbPath = isDev
    ? path.join(__dirname, "../database", "cafeteria.db")
    : path.join(app.getPath("userData"), "cafeteria.db");
  connectDB(dbPath);
  initSchema();

  await licenseService.initialize();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handler Wrapper for Logging
const handle = (channel, callback) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await callback(event, ...args);
    } catch (error) {
      log.error(`IPC [${channel}]`, error);
      return { success: false, message: "Internal Error" };
    }
  });
};

handle("check-license", () => licenseService.checkLicense());
handle("activate-license", (_, code) => licenseService.activateLicense(code));
handle("get-system-id", () => licenseService.getSystemID());
handle("login", (_, c) => authService.login(c));

handle("start-session", (_, d) => scanService.startSession(d));
handle("scan-student", (_, d) => scanService.processScan(d));
handle("end-session", (_, d) => {
  const r = scanService.endSession(d);
  if (r.success) performBackup(d, r.logs);
  return r;
});

handle("get-dashboard-stats", () => statsService.getDashboardStats());
handle("get-daily-status", () => statsService.getDailyStatus());
handle("generate-report", (_, type) => statsService.generateReport(type));
handle("generate-master-excel", () => statsService.generateMasterExcel());

handle("clear-analytics", () => {
  logRepo.clearAnalytics();
  userRepo.updateCycleStart(new Date().toISOString());
  const ud = app.getPath("userData");
  ["backups_daily", "backups_special"].forEach((f) => {
    const dp = path.join(ud, f);
    if (fs.existsSync(dp))
      fs.readdirSync(dp).forEach((x) => {
        try {
          fs.unlinkSync(path.join(dp, x));
        } catch (e) {}
      });
  });
  return { success: true };
});

handle("reset-today-stats", () => {
  getDB()
    .prepare(
      "DELETE FROM meal_logs WHERE date(timestamp, 'localtime') = date('now', 'localtime')",
    )
    .run();
  const today = new Date().toISOString().split("T")[0];
  const bp = path.join(app.getPath("userData"), "backups_daily");
  if (fs.existsSync(bp))
    fs.readdirSync(bp).forEach((f) => {
      if (f.includes(today))
        try {
          fs.unlinkSync(path.join(bp, f));
        } catch (e) {}
    });
  return { success: true };
});

handle("get-backups", () => {
  const d = path.join(app.getPath("userData"), "backups_daily");
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .map((f) => ({ name: f, path: path.join(d, f), type: "Daily" }));
});
handle("export-backup", async (_, sp) => {
  const { filePath } = await dialog.showSaveDialog(win, {
    title: "Save",
    defaultPath: "Backup.xlsx",
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });
  if (filePath) {
    fs.copyFileSync(sp, filePath);
    return true;
  }
  return false;
});
handle("open-file", (_, p) => shell.openPath(p));
handle("delete-file", (_, p) => {
  fs.unlinkSync(p);
  return true;
});

handle("add-student", (_, s) => {
  const c = licenseService.checkStudentLimit(1);
  if (!c.allowed) return { success: false, message: c.message };
  const r = studentRepo.add(s);
  if (r.success && s.department) deptRepo.add(s.department);
  return r;
});
handle("bulk-add-students", (_, d) => {
  const c = licenseService.checkStudentLimit(d.length);
  if (!c.allowed) return { success: false, message: c.message };
  d.forEach((s) => {
    if (s.department) deptRepo.add(s.department);
  });
  return studentRepo.bulkInsert(d);
});
handle("get-all-students", () => studentRepo.getAll());
handle("update-student", (_, s) => {
  const r = studentRepo.update(s);
  if (r.success && s.department) deptRepo.add(s.department);
  return r;
});
handle("delete-student", (_, id) => studentRepo.remove(id));
handle("delete-all-students", () => studentRepo.snapshotAndClear());
handle("recover-students", () => studentRepo.recoverFromSnapshot());
handle("check-photo-usage", (_, p) => studentRepo.checkPhoto(p));
handle("find-student-photo", (_, id) => securityService.getPhotoBase64(id)); // Legacy fallback

handle("pick-excel-file", async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
  });
  return r.canceled ? null : r.filePaths[0];
});
handle("read-excel-data", async (_, fp) => {
  const X = require("xlsx");
  const w = X.readFile(fp);
  const s = w.Sheets[w.SheetNames[0]];
  const d = X.utils.sheet_to_json(s, {
    header: ["id", "name", "photo", "category", "sex", "department"],
    range: 1,
  });
  return { success: true, data: d };
});

handle("toggle-fullscreen", () => {
  if (win) win.setFullScreen(!win.isFullScreen());
  return !win.isFullScreen();
});
handle("exit-fullscreen", () => {
  if (win) win.setFullScreen(false);
});
handle("force-focus", () => {
  if (win) win.focus();
});
handle("get-session-state", () =>
  userRepo.getSession() ? JSON.parse(userRepo.getSession().value) : null,
);
handle("verify-password", (_, d) => authService.verifyPassword(d));
handle("update-settings", (_, d) => authService.updateSettings(d));
handle("check-student-id", (_, id) => !!studentRepo.getById(id));
handle("search-student", (_, id) => studentRepo.getById(id));
handle("get-departments", () => deptRepo.getAll());
handle("toggle-department", (_, d) => deptRepo.toggle(d.name, d.status));
handle("getAdminPhone", () => getAdminPhone());
handle("updateAdminPhone", (_, phone) => updateAdminPhone(phone));
