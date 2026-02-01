# Crea panatickets.zip con el contenido de .next/standalone para subir a SiteGround.
# Ejecutar desde la raíz del proyecto, después de: npm run build:siteground

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$standalone = Join-Path $root ".next\standalone"
$zipPath = Join-Path $root "panatickets.zip"

if (-not (Test-Path $standalone)) {
    Write-Host "No existe .next/standalone. Ejecuta antes: npm run build:siteground"
    exit 1
}

# Borrar ZIP anterior si existe
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Comprimir el CONTENIDO de standalone (no la carpeta standalone)
$items = Get-ChildItem $standalone -Force
Compress-Archive -Path ($items | ForEach-Object { $_.FullName }) -DestinationPath $zipPath -Force

Write-Host "Creado: panatickets.zip"
Write-Host "Sube este archivo a SiteGround (File Manager) y extrae dentro de la carpeta de tu app Node."
