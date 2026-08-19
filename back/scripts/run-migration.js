import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards',
  multipleStatements: true
})

const sql = fs.readFileSync(
  path.resolve('migrations/001_redesign_irrigation_model.sql'),
  'utf-8'
)

console.log('Running migration...')

// Split by semicolons and execute each statement individually
// (mysql2 multipleStatements doesn't handle PREPARE/EXECUTE well)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

for (const stmt of statements) {
  if (stmt.length === 0) continue
  try {
    await pool.query(stmt)
    console.log(`  OK: ${stmt.slice(0, 80)}...`)
  } catch (err) {
    // Some statements might fail (e.g., FK doesn't exist)
    if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY' || err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEY') {
      console.log(`  SKIP (already exists): ${stmt.slice(0, 80)}...`)
    } else {
      console.error(`  ERROR: ${err.message}`)
      console.error(`  SQL: ${stmt.slice(0, 120)}`)
    }
  }
}

console.log('\nMigration complete!')
await pool.end()
