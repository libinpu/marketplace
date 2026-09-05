const pool = require("../config/database");
const fs = require("fs");
const path = require("path");

async function runPopulate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, "populate_ml.sql"), "utf8");
        await pool.query(sql);
        console.log("Populated ML translations.");
    } catch (err) {
        console.error("Populate failed:", err);
    } finally {
        pool.end();
    }
}

runPopulate();
