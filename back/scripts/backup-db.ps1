# Backup de la base de datos Vineyards
# Lee las credenciales del .env y ejecuta mysqldump

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (-not (Test-Path $envPath)) {
    Write-Error "No se encontro .env en $envPath"
    exit 1
}

# Parsear variables del .env
$envContent = Get-Content $envPath
$envVars = @{}
foreach ($line in $envContent) {
    if ($line -match '^(\w+)=(.+)$') {
        $envVars[$matches[1]] = $matches[2]
    }
}

$dbHost = $envVars["DB_HOST"]
$dbUser = $envVars["DB_USER"]
$dbPass = $envVars["DB_PASSWORD"]
$dbName = $envVars["DB_NAME"]

if (-not $dbName) {
    Write-Error "DB_NAME no encontrada en .env"
    exit 1
}

# Crear nombre de archivo con timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $PSScriptRoot "backups\${dbName}_${timestamp}.sql"

# Crear directorio backups si no existe
$backupDir = Join-Path $PSScriptRoot "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Write-Host "Backup de $dbName -> $backupFile"
$mysqldumpPath = (Get-Command mysqldump -ErrorAction SilentlyContinue).Source
if (-not $mysqldumpPath) {
    $candidates = @(
        "C:\xampp\mysql\bin\mysqldump.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysqldump.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $mysqldumpPath = $c; break }
    }
}
if (-not $mysqldumpPath) {
    Write-Error "mysqldump no encontrado. Instalalo o agrega su ruta al PATH."
    exit 1
}

& $mysqldumpPath -h $dbHost -u $dbUser -p"$dbPass" $dbName | Out-File -FilePath $backupFile -Encoding utf8

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $backupFile).Length
    Write-Host "Backup exitoso ($([math]::Round($size/1KB, 1)) KB)"
} else {
    Write-Error "Error al hacer backup (mysqldump no encontro?)"
    exit 1
}
