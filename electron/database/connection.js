const Database = require("better-sqlite3");
let db;
const connectDB = (p) => {
  if (db) return db;
  db = new Database(p);
  db.pragma("journal_mode = WAL");
  return db;
};
const getDB = () => {
  if (!db) throw new Error("DB not init");
  return db;
};
module.exports = { connectDB, getDB };
