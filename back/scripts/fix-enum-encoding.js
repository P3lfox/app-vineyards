import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

console.log('Fixing irrigation_systems ENUM encoding...\n')

// Check current state
const [before] = await pool.query('SELECT id, tipo, HEX(tipo) as hex_tipo FROM irrigation_systems ORDER BY id')
console.log('Before fix:')
before.forEach(r => console.log(`  ID ${r.id}: tipo="${r.tipo}" hex=${r.hex_tipo}`))

// Recreate the ENUM with proper UTF-8
await pool.query(`ALTER TABLE irrigation_systems MODIFY COLUMN tipo ENUM('goteo', 'aspersión', 'surco', 'manta', 'microaspersión') NOT NULL`)

// Now update tipo for records 3 and 5
await pool.query("UPDATE irrigation_systems SET tipo = 'aspersión' WHERE id = 3 AND (tipo = '' OR tipo IS NULL)")
await pool.query("UPDATE irrigation_systems SET tipo = 'microaspersión' WHERE id = 5 AND (tipo = '' OR tipo IS NULL)")

// Verify
console.log('\nAfter fix:')
const [after] = await pool.query('SELECT id, tipo, descripcion, presion_media_bar, caudal_l_h FROM irrigation_systems ORDER BY id')
for (const row of after) {
  console.log(`\nID ${row.id}: ${row.tipo}`)
  console.log(`  ${row.descripcion}`)
  console.log(`  Presión: ${row.presion_media_bar} bar | Caudal: ${row.caudal_l_h} L/h`)
}

await pool.end()
