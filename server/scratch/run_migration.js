const pool = require("../config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, "../migrations/016_add_malayalam_translations.sql"), "utf8");
        await pool.query(sql);
        console.log("Migration 016 applied successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

runMigration();
