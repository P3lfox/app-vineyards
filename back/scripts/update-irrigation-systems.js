import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vineyards'
})

console.log('Updating irrigation_systems with descriptions and typical values...\n')

// First check the actual ENUM values
const [cols] = await pool.query('SHOW COLUMNS FROM irrigation_systems WHERE Field = ?', ['tipo'])
console.log('Current ENUM:', cols[0].Type)

// Fix tipo for records 3 and 5 (encoding issue in ENUM)
// The ENUM has 'aspersi??n' instead of 'aspersión'
// We need to update using the actual ENUM value

// Update each record with description and typical values
const updates = [
  {
    id: 1,
    tipo: 'goteo',
    descripcion: 'Sistema que aplica agua directamente en la zona radicular mediante goteros. Alta eficiencia (90-95%), ideal para viñedos. Reduce evaporación y evita mojar el follaje, minimizando enfermedades fúngicas.',
    presion_media_bar: 1.5,
    caudal_l_h: 4.0
  },
  {
    id: 2,
    tipo: 'manta',
    descripcion: 'Riego por inundación controlada donde el agua se distribuye en una lámina superficial sobre el suelo. Bajo costo de instalación pero menor eficiencia (60-70%). Requiere terreno nivelado y mayor volumen de agua.',
    presion_media_bar: 0.0,
    caudal_l_h: 0.0
  },
  {
    id: 3,
    tipo: 'aspersión',
    descripcion: 'Sistema que distribuye agua por aspersores que simulan lluvia. Cobertura uniforme, eficiencia del 75-85%. Requiere presión media-alta (2-4 bar). Puede favorecer enfermedades foliares al mojar la planta.',
    presion_media_bar: 3.0,
    caudal_l_h: 500.0
  },
  {
    id: 4,
    tipo: 'surco',
    descripcion: 'Método gravitacional donde el agua circula por canales entre las hileras de plantas. Simple y económico, eficiencia del 50-70%. Depende de la pendiente del terreno y del tipo de suelo.',
    presion_media_bar: 0.0,
    caudal_l_h: 0.0
  },
  {
    id: 5,
    tipo: 'microaspersión',
    descripcion: 'Variación del aspersor con emisores de bajo caudal que mojan un área reducida alrededor de cada planta. Eficiencia del 80-90%. Combina ventajas del goteo con mayor cobertura. Presión baja-media (1-2 bar).',
    presion_media_bar: 1.5,
    caudal_l_h: 60.0
  }
]

for (const u of updates) {
  // Try direct update first (might fail on ENUM mismatch)
  try {
    await pool.query(
      'UPDATE irrigation_systems SET tipo = ?, descripcion = ?, presion_media_bar = ?, caudal_l_h = ? WHERE id = ?',
      [u.tipo, u.descripcion, u.presion_media_bar, u.caudal_l_h, u.id]
    )
    console.log(`✅ ID ${u.id} (${u.tipo}): updated`)
  } catch (err) {
    // If ENUM mismatch, try to find the actual value
    console.log(`⚠️ ID ${u.id}: ENUM mismatch, trying alternative...`)
    const [existing] = await pool.query('SELECT tipo FROM irrigation_systems WHERE id = ?', [u.id])
    const actualTipo = existing[0]?.tipo
    if (actualTipo) {
      await pool.query(
        'UPDATE irrigation_systems SET tipo = ?, descripcion = ?, presion_media_bar = ?, caudal_l_h = ? WHERE id = ?',
        [actualTipo, u.descripcion, u.presion_media_bar, u.caudal_l_h, u.id]
      )
      console.log(`✅ ID ${u.id} (tipo="${actualTipo}"): updated with existing ENUM value`)
    }
  }
}

// Verify
console.log('\n=== Final state ===')
const [final] = await pool.query('SELECT id, tipo, descripcion, presion_media_bar, caudal_l_h FROM irrigation_systems ORDER BY id')
for (const row of final) {
  console.log(`\nID ${row.id}: ${row.tipo}`)
  console.log(`  Descripción: ${row.descripcion}`)
  console.log(`  Presión: ${row.presion_media_bar} bar`)
  console.log(`  Caudal: ${row.caudal_l_h} L/h`)
}

await pool.end()
