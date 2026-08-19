import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

const [plots] = await pool.query(
  'SELECT p.id, p.nombre, p.area_m2, p.irrigation_system_id, ist.tipo as sistema FROM plots p LEFT JOIN irrigation_systems ist ON p.irrigation_system_id = ist.id WHERE p.vineyard_id = 4 AND p.deleted_at IS NULL'
)

console.log('=== Viñedo: El Esteco ===\n')

for (const p of plots) {
  const total = p.id === 5 ? 441 : 196
  const [varietals] = await pool.query(
    'SELECT v.nombre, v.tipo, COUNT(*) as cnt FROM plants pl JOIN vine_rows vr ON pl.vine_row_id = vr.id JOIN varietals v ON pl.varietal_id = v.id WHERE vr.plot_id = ? AND pl.deleted_at IS NULL GROUP BY v.nombre, v.tipo ORDER BY cnt DESC',
    [p.id]
  )

  const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM vine_rows WHERE plot_id = ?', [p.id])

  console.log(`${p.nombre} (id=${p.id})`)
  console.log(`  Tamaño: ${p.id === 5 ? '21x21' : '14x14'} | Área: ${p.area_m2}m² | Filas: ${rows[0].cnt} | Riego: ${p.sistema}`)
  console.log(`  Total plantas: ${total}`)
  varietals.forEach(v => {
    console.log(`    ${v.nombre} (${v.tipo}): ${v.cnt} plantas (${(v.cnt/total*100).toFixed(1)}%)`)
  })
  console.log()
}

await pool.end()
