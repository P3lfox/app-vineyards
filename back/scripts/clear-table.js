import { pool } from "../src/db.js"

const table = process.argv[2]

if (!table) {
  console.error("Usage: node scripts/clear-table.js <table_name>")
  process.exit(1)
}

const allowed = /^[a-zA-Z_][a-zA-Z0-9_]*$/
if (!allowed.test(table)) {
  console.error(`Invalid table name: ${table}`)
  process.exit(1)
}

try {
  const [result] = await pool.query(`DELETE FROM \`${table}\``)
  console.log(`Deleted ${result.affectedRows} rows from ${table}`)
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
} finally {
  await pool.end()
}
