const { getDB } = require("../database/connection");

// ✅ Get Admin Phone (SAFE + DEFAULT HANDLING)
const getAdminPhone = () => {
  const db = getDB();

  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get("admin_phone");

  if (!row || !row.value) {
    const defaultPhone = "Not Set";

    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    ).run("admin_phone", defaultPhone);

    return defaultPhone;
  }

  return row.value;
};

// ✅ Update Admin Phone
const updateAdminPhone = (phone) => {
  const db = getDB();

  db.prepare(
    `
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `,
  ).run("admin_phone", phone);

  return { success: true };
};

module.exports = {
  getAdminPhone,
  updateAdminPhone,
};
