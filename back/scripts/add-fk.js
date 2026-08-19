import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

// Check existing FK constraints on plots
const [fks] = await pool.query(
  'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = ? AND CONSTRAINT_NAME LIKE ?',
  ['vineyards', 'plots', 'FOREIGN KEY', '%irrigation%']
)
console.log('Existing irrigation FKs on plots:', fks)

// Try adding FK
try {
  await pool.query(
    'ALTER TABLE plots ADD CONSTRAINT fk_plot_irrigation_system FOREIGN KEY (irrigation_system_id) REFERENCES irrigation_systems(id) ON DELETE SET NULL'
  )
  console.log('FK added successfully!')
} catch (err) {
  console.error('FK error:', err.message)
  // Check column types
  const [plotCols] = await pool.query('SHOW COLUMNS FROM plots WHERE Field = ?', ['irrigation_system_id'])
  const [sysCols] = await pool.query('SHOW COLUMNS FROM irrigation_systems WHERE Field = ?', ['id'])
  console.log('plots.irrigation_system_id:', plotCols[0])
  console.log('irrigation_systems.id:', sysCols[0])
}

await pool.end()
