import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

console.log('Applying remaining schema changes...\n')

// 1. Fix irrigation_coverage.irrigation_event_id type and add FK
console.log('1. Fixing irrigation_coverage.irrigation_event_id...')
const [covCols] = await pool.query('SHOW COLUMNS FROM irrigation_coverage')
const hasCovEvent = covCols.some(c => c.Field === 'irrigation_event_id')
if (hasCovEvent) {
  await pool.query('ALTER TABLE irrigation_coverage MODIFY COLUMN irrigation_event_id INT UNSIGNED NULL')
  console.log('   Fixed type to INT UNSIGNED')
  // Check if FK already exists
  const [fks] = await pool.query(
    'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = ?',
    ['vineyards', 'irrigation_coverage', 'FOREIGN KEY']
  )
  const hasFk = fks.some(f => f.CONSTRAINT_NAME.includes('coverage_event') || f.CONSTRAINT_NAME.includes('irrigation_event'))
  if (!hasFk) {
    await pool.query('ALTER TABLE irrigation_coverage ADD CONSTRAINT fk_coverage_event FOREIGN KEY (irrigation_event_id) REFERENCES irrigation_events(id) ON DELETE SET NULL')
    console.log('   Added FK')
  } else {
    console.log('   FK already exists')
  }
}

// 2. Fix irrigation_event_impact FK
console.log('\n2. Fixing irrigation_event_impact FK...')
await pool.query('ALTER TABLE irrigation_event_impact MODIFY COLUMN irrigation_event_id INT UNSIGNED NULL')
const [impFks] = await pool.query(
  'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = ?',
  ['vineyards', 'irrigation_event_impact', 'FOREIGN KEY']
)
const hasImpFk = impFks.some(f => f.CONSTRAINT_NAME.includes('impact_event') || f.CONSTRAINT_NAME.includes('irrigation_event'))
if (!hasImpFk) {
  await pool.query('ALTER TABLE irrigation_event_impact ADD CONSTRAINT fk_impact_event FOREIGN KEY (irrigation_event_id) REFERENCES irrigation_events(id) ON DELETE SET NULL')
  console.log('   Added FK')
} else {
  console.log('   FK already exists')
}

// 3. Seed 5 fixed irrigation system types
console.log('\n3. Seeding irrigation system types...')
const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM irrigation_systems WHERE id <= 5')
if (existing[0].cnt < 5) {
  await pool.query(`INSERT IGNORE INTO irrigation_systems (id, tipo, descripcion) VALUES
    (1, 'goteo', 'Riego por goteo'),
    (2, 'manta', 'Riego por manta'),
    (3, 'aspersión', 'Riego por aspersión'),
    (4, 'surco', 'Riego por surco'),
    (5, 'microaspersión', 'Riego por microaspersión')`)
  console.log('   Seeded 5 types')
}
await pool.query("UPDATE irrigation_systems SET deleted_at = NULL WHERE id IN (1,2,3,4,5)")
console.log('   Cleaned deleted_at for seed types')

// 4. Delete orphan irrigation_systems records (non-seed types)
const [orphanCount] = await pool.query("SELECT COUNT(*) as cnt FROM irrigation_systems WHERE id > 5 AND deleted_at IS NULL")
if (orphanCount[0].cnt > 0) {
  await pool.query("UPDATE irrigation_systems SET deleted_at = CURRENT_TIMESTAMP WHERE id > 5")
  console.log(`   Soft-deleted ${orphanCount[0].cnt} orphan system records`)
}

console.log('\n✅ All schema changes applied!')

// Verify final state
console.log('\n=== Final Schema ===')
const [evCols] = await pool.query('SHOW COLUMNS FROM irrigation_events')
console.log('\nirrigation_events:')
evCols.forEach(c => console.log(`  ${c.Field} ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`))

const [covCols2] = await pool.query('SHOW COLUMNS FROM irrigation_coverage')
console.log('\nirrigation_coverage:')
covCols2.forEach(c => console.log(`  ${c.Field} ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`))

const [impCols] = await pool.query('SHOW COLUMNS FROM irrigation_event_impact')
console.log('\nirrigation_event_impact:')
impCols.forEach(c => console.log(`  ${c.Field} ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`))

const [plotCols] = await pool.query('SHOW COLUMNS FROM plots')
console.log('\nplots:')
plotCols.forEach(c => console.log(`  ${c.Field} ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`))

const [sysCols] = await pool.query('SHOW COLUMNS FROM irrigation_systems')
console.log('\nirrigation_systems:')
sysCols.forEach(c => console.log(`  ${c.Field} ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`))

await pool.end()
