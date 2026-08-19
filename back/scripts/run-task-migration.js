import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

const [cols] = await pool.query('SHOW COLUMNS FROM tasks')
const hasCompleted = cols.some(c => c.Field === 'completed_at')

if (!hasCompleted) {
  console.log('Adding completed_at column...')
  await pool.query('ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL AFTER deleted_at')
  console.log('Column added')

  const [count] = await pool.query("SELECT COUNT(*) as cnt FROM tasks WHERE estado = 'completada'")
  console.log('Completed tasks to backfill:', count[0].cnt)

  if (count[0].cnt > 0) {
    await pool.query("UPDATE tasks SET completed_at = NOW() WHERE estado = 'completada' AND completed_at IS NULL")
    console.log('Backfill done')
  }
} else {
  console.log('Migration already applied')
}

// Verify
const [finalCols] = await pool.query('SHOW COLUMNS FROM tasks')
console.log('\n=== tasks table ===')
finalCols.forEach(c => console.log(`  ${c.Field} ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`))

await pool.end()
