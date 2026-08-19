import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

const VINEYARD_ID = 4

// Varietals
const MALBEC = 5
const SYRAH = 4
const TORRONTES = 71

// Add Syrah and Torrontes to vineyard if not present
console.log('Adding varietals to vineyard...')
await pool.query('INSERT IGNORE INTO vineyard_varietals (vineyard_id, varietal_id) VALUES (?, ?)', [VINEYARD_ID, SYRAH])
await pool.query('INSERT IGNORE INTO vineyard_varietals (vineyard_id, varietal_id) VALUES (?, ?)', [VINEYARD_ID, TORRONTES])
console.log('Varietals added.')

// Helper: create a plot with rows and plants
async function createPlotWithPlants({ nombre, area_m2, rows, cols, varietalDistribution, irrigation_system_id }) {
  console.log(`\nCreating plot: ${nombre} (${rows}x${cols} = ${rows * cols} plants)`)

  // Create plot
  const [plotResult] = await pool.query(
    'INSERT INTO plots (vineyard_id, nombre, area_m2, irrigation_system_id) VALUES (?, ?, ?, ?)',
    [VINEYARD_ID, nombre, area_m2, irrigation_system_id]
  )
  const plotId = plotResult.insertId
  console.log(`  Plot created: id=${plotId}`)

  // Build varietal assignment for each plant position
  const totalPlants = rows * cols
  const varietalAssignments = []

  for (const [varietal_id, count] of Object.entries(varietalDistribution)) {
    for (let i = 0; i < count; i++) {
      varietalAssignments.push(parseInt(varietal_id))
    }
  }

  // Shuffle to distribute evenly
  for (let i = varietalAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[varietalAssignments[i], varietalAssignments[j]] = [varietalAssignments[j], varietalAssignments[i]]
  }

  // Create rows and plants
  let plantIndex = 0
  for (let r = 1; r <= rows; r++) {
    // Create row
    const [rowResult] = await pool.query(
      'INSERT INTO vine_rows (plot_id, numero) VALUES (?, ?)',
      [plotId, r]
    )
    const rowId = rowResult.insertId

    // Create plants for this row
    const plants = []
    for (let c = 1; c <= cols; c++) {
      const varietal_id = varietalAssignments[plantIndex]
      const codigo = `${nombre.replace(/\s/g, '').toUpperCase()}-F${r}-P${c}`
      plants.push([rowId, varietal_id, 'espaldera', codigo, null, null])
      plantIndex++
    }

    // Batch insert plants
    await pool.query(
      'INSERT INTO plants (vine_row_id, varietal_id, sistema_conduccion, codigo, latitud, longitud) VALUES ?',
      [plants]
    )
    console.log(`  Row ${r}/${rows} created with ${cols} plants`)
  }

  console.log(`  Total plants: ${plantIndex}`)
  return plotId
}

// Clean up existing partial data for El Esteco
console.log('\nCleaning up existing data...')
await pool.query('SET FOREIGN_KEY_CHECKS = 0')
await pool.query('DELETE FROM plant_status_history WHERE plant_id IN (SELECT id FROM plants WHERE vine_row_id IN (SELECT id FROM vine_rows WHERE plot_id IN (SELECT id FROM plots WHERE vineyard_id = ? AND id > 1)))', [VINEYARD_ID])
await pool.query('DELETE FROM plants WHERE vine_row_id IN (SELECT id FROM vine_rows WHERE plot_id IN (SELECT id FROM plots WHERE vineyard_id = ? AND id > 1))', [VINEYARD_ID])
await pool.query('DELETE FROM vine_rows WHERE plot_id IN (SELECT id FROM plots WHERE vineyard_id = ? AND id > 1)', [VINEYARD_ID])
await pool.query('DELETE FROM plots WHERE vineyard_id = ? AND id > 1', [VINEYARD_ID])
await pool.query('SET FOREIGN_KEY_CHECKS = 1')
console.log('Cleaned up.')

// Parcela 1: 21x21 = 441 plants, ~73% Malbec, ~27% Syrah
const plot1Total = 21 * 21 // 441
const syrahCount1 = Math.round(plot1Total * 0.27) // ~119
const malbecCount1 = plot1Total - syrahCount1 // ~322

console.log(`\n=== Parcela 1: 21x21 ===`)
console.log(`Malbec: ${malbecCount1} (${(malbecCount1/plot1Total*100).toFixed(1)}%)`)
console.log(`Syrah: ${syrahCount1} (${(syrahCount1/plot1Total*100).toFixed(1)}%)`)

await createPlotWithPlants({
  nombre: 'Parcela Norte',
  area_m2: 4410,
  rows: 21,
  cols: 21,
  varietalDistribution: {
    [MALBEC]: malbecCount1,
    [SYRAH]: syrahCount1
  },
  irrigation_system_id: 1 // goteo
})

// Parcela 2: 14x14 = 196 plants, mostly Malbec with some Torrontes
const plot2Total = 14 * 14 // 196
const torrontesCount = Math.round(plot2Total * 0.15) // ~29 (15%)
const malbecCount2 = plot2Total - torrontesCount // ~167

console.log(`\n=== Parcela 2: 14x14 ===`)
console.log(`Malbec: ${malbecCount2} (${(malbecCount2/plot2Total*100).toFixed(1)}%)`)
console.log(`Torrontes: ${torrontesCount} (${(torrontesCount/plot2Total*100).toFixed(1)}%)`)

await createPlotWithPlants({
  nombre: 'Parcela Sur',
  area_m2: 1960,
  rows: 14,
  cols: 14,
  varietalDistribution: {
    [MALBEC]: malbecCount2,
    [TORRONTES]: torrontesCount
  },
  irrigation_system_id: 1 // goteo
})

console.log('\n✅ Done!')
await pool.end()
