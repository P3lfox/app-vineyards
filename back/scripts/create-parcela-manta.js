import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

const VINEYARD_ID = 4
const MALBEC = 5
const TORRONTES = 71
const MANTA = 2

const rows = 14
const cols = 14
const total = rows * cols // 196
const torrontesCount = Math.round(total * 0.15) // ~29
const malbecCount = total - torrontesCount // ~167

console.log(`Creating Parcela Manta: ${rows}x${cols} = ${total} plants`)
console.log(`  Malbec: ${malbecCount} (${(malbecCount/total*100).toFixed(1)}%)`)
console.log(`  Torrontes: ${torrontesCount} (${(torrontesCount/total*100).toFixed(1)}%)`)
console.log(`  Riego: manta`)

// Create plot
const [plotResult] = await pool.query(
  'INSERT INTO plots (vineyard_id, nombre, area_m2, irrigation_system_id) VALUES (?, ?, ?, ?)',
  [VINEYARD_ID, 'Parcela Manta', 1960, MANTA]
)
const plotId = plotResult.insertId
console.log(`\nPlot created: id=${plotId}`)

// Build varietal assignments
const assignments = []
for (let i = 0; i < malbecCount; i++) assignments.push(MALBEC)
for (let i = 0; i < torrontesCount; i++) assignments.push(TORRONTES)

// Shuffle
for (let i = assignments.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1))
  ;[assignments[i], assignments[j]] = [assignments[j], assignments[i]]
}

// Create rows and plants
let idx = 0
for (let r = 1; r <= rows; r++) {
  const [rowResult] = await pool.query(
    'INSERT INTO vine_rows (plot_id, numero) VALUES (?, ?)',
    [plotId, r]
  )
  const rowId = rowResult.insertId

  const plants = []
  for (let c = 1; c <= cols; c++) {
    const codigo = `PMANTA-F${r}-P${c}`
    plants.push([rowId, assignments[idx], 'espaldera', codigo, null, null])
    idx++
  }

  await pool.query(
    'INSERT INTO plants (vine_row_id, varietal_id, sistema_conduccion, codigo, latitud, longitud) VALUES ?',
    [plants]
  )
  console.log(`  Row ${r}/${rows} created`)
}

// Verify
const [varietals] = await pool.query(
  'SELECT v.nombre, COUNT(*) as cnt FROM plants pl JOIN vine_rows vr ON pl.vine_row_id = vr.id JOIN varietals v ON pl.varietal_id = v.id WHERE vr.plot_id = ? AND pl.deleted_at IS NULL GROUP BY v.nombre',
  [plotId]
)

console.log('\n=== Parcela Manta ===')
varietals.forEach(v => console.log(`  ${v.nombre}: ${v.cnt} plantas (${(v.cnt/total*100).toFixed(1)}%)`))
console.log(`\n✅ Done!`)

await pool.end()
