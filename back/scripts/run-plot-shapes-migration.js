import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

// Check and add plot shape columns
const [plotCols] = await pool.query('SHOW COLUMNS FROM plots')
const hasForma = plotCols.some(c => c.Field === 'forma_parcela')
if (!hasForma) {
  console.log('Adding plot shape columns...')
  await pool.query("ALTER TABLE plots ADD COLUMN forma_parcela ENUM('rectangular', 'trapezoidal', 'abanicado', 'terrazas', 'irregular') NULL DEFAULT 'rectangular'")
  await pool.query("ALTER TABLE plots ADD COLUMN terreno ENUM('plano', 'ladera', 'pendiente', 'con_cauce') NULL DEFAULT 'plano'")
  console.log('Plot shape columns added')
} else {
  console.log('Plot shape columns already exist')
}

// Check and add row shape columns
const [rowCols] = await pool.query('SHOW COLUMNS FROM vine_rows')
const hasLongitud = rowCols.some(c => c.Field === 'longitud_m')
if (!hasLongitud) {
  console.log('Adding row shape columns...')
  await pool.query('ALTER TABLE vine_rows ADD COLUMN longitud_m DECIMAL(6,2) NULL')
  await pool.query('ALTER TABLE vine_rows ADD COLUMN num_plantas_esperadas INT NULL')
  console.log('Row shape columns added')
} else {
  console.log('Row shape columns already exist')
}

// Check and add plant position column
const [plantCols] = await pool.query('SHOW COLUMNS FROM plants')
const hasPos = plantCols.some(c => c.Field === 'posicion_en_fila')
if (!hasPos) {
  console.log('Adding plant position column...')
  await pool.query('ALTER TABLE plants ADD COLUMN posicion_en_fila INT NULL')
  console.log('Plant position column added')
} else {
  console.log('Plant position column already exists')
}

// Backfill posicion_en_fila
console.log('Backfilling posicion_en_fila...')
const [plants] = await pool.query('SELECT id, vine_row_id FROM plants ORDER BY vine_row_id, id')
let currentRow = 0
let pos = 0
for (const plant of plants) {
  if (plant.vine_row_id !== currentRow) {
    currentRow = plant.vine_row_id
    pos = 0
  }
  await pool.query('UPDATE plants SET posicion_en_fila = ? WHERE id = ?', [pos, plant.id])
  pos++
}
console.log(`Backfilled ${plants.length} plants`)

// Verify
console.log('\n=== plots table ===')
const [finalPlotCols] = await pool.query('SHOW COLUMNS FROM plots')
finalPlotCols.filter(c => ['forma_parcela', 'terreno'].includes(c.Field)).forEach(c => console.log(`  ${c.Field} ${c.Type} DEFAULT ${c.Default}`))

console.log('\n=== vine_rows table ===')
const [finalRowCols] = await pool.query('SHOW COLUMNS FROM vine_rows')
finalRowCols.filter(c => ['longitud_m', 'num_plantas_esperadas'].includes(c.Field)).forEach(c => console.log(`  ${c.Field} ${c.Type}`))

console.log('\n=== plants table ===')
const [finalPlantCols] = await pool.query('SHOW COLUMNS FROM plants')
finalPlantCols.filter(c => c.Field === 'posicion_en_fila').forEach(c => console.log(`  ${c.Field} ${c.Type}`))

console.log('\n✅ Migration complete!')
await pool.end()
