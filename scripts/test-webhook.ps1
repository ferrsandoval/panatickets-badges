# Prueba del webhook en localhost
# Uso: .\scripts\test-webhook.ps1   o   .\scripts\test-webhook.ps1 -Count 3

param(
    [int]$Count = 1
)

$baseUrl = "http://localhost:3000/api/webhook/codereadr"
$token = "c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47"
$uri = "${baseUrl}?token=$token"

$samplePayload = @"
Name: Itzel Ortega
Company: Subliprint de Panamá
Email: itzelortega@subliprintpma.com
Phone: 50765246551
Cell: 50767185505
Reg No: 061953377372
Control:
"@

$names = @("Itzel Ortega", "Juan Pérez", "María García", "Carlos López", "Ana Martínez")

for ($i = 0; $i -lt $Count; $i++) {
    $name = $names[$i % $names.Length]
    $scanId = "test-" + (Get-Date -Format "HHmmss") + "-$i"
    $payload = $samplePayload -replace "Name: Itzel Ortega", "Name: $name"

    $barcodeEnc = [uri]::EscapeDataString($payload)
    $body = "scan_id=$scanId&barcode_data=$barcodeEnc"

    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -Body $body -ContentType "application/x-www-form-urlencoded" -UseBasicParsing
        $json = $response.Content | ConvertFrom-Json
        Write-Host "OK ($($response.StatusCode)) - Job: $($json.id) - Name: $name"
    } catch {
        Write-Host "Error: $_"
    }
}

Write-Host "`nAbre http://localhost:3000 para ver la cola."
