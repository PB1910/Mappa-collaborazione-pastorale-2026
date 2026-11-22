# Sposta backup e file non usati in _archivio (non cancella nulla).
# Uso: tasto destro sul file > "Esegui con PowerShell", oppure: powershell -ExecutionPolicy Bypass -File pulisci_cartella.ps1
Set-Location $PSScriptRoot
$dest = Join-Path $PSScriptRoot '_archivio'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# Backup (file e cartelle)
Get-ChildItem -Path . -Filter '*backup*' | Where-Object { $_.Name -ne '_archivio' } | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination $dest -Force
    Write-Host "Spostato: $($_.Name)"
}
Get-ChildItem -Path .\segnaposti -Filter '*backup*' -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination $dest -Force
    Write-Host "Spostato: segnaposti\$($_.Name)"
}

# Dati non referenziati da index.html
foreach ($f in 'scuole_altre.json', 'strutture_parrocchiali.json') {
    $p = Join-Path .\segnaposti $f
    if (Test-Path $p) { Move-Item -LiteralPath $p -Destination $dest -Force; Write-Host "Spostato (non usato): segnaposti\$f" }
}
Write-Host "Fatto. Controlla la mappa; se tutto va bene puoi eliminare la cartella _archivio."
