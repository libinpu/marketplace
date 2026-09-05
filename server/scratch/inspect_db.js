const pool = require("../config/database");

async function inspectDb() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        const schema = {};
        for (const row of res.rows) {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push(`${row.column_name} (${row.data_type})`);
        }
        
        console.log(JSON.stringify(schema, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspectDb();
