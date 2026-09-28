$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json
$version = $package.version
$bundleName = "ARPG Seasons_${version}_x64-setup.exe"
$source = Join-Path $projectRoot "src-tauri\target\release\bundle\nsis\$bundleName"
$destination = Join-Path $projectRoot "ARPG-Seasons-${version}-x64-setup.exe"
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$defaultSigningKey = Join-Path $env:USERPROFILE ".tauri\arpg-seasons-updater.key"

if ((Test-Path -LiteralPath $cargoBin) -and -not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  $env:Path = "$cargoBin;$env:Path"
}
if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and (Test-Path -LiteralPath $defaultSigningKey)) {
  $env:TAURI_SIGNING_PRIVATE_KEY = $defaultSigningKey
}
if (-not $env:TAURI_SIGNING_PRIVATE_KEY) { throw "Set TAURI_SIGNING_PRIVATE_KEY or store the key at $defaultSigningKey." }
if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) { throw "Set TAURI_SIGNING_PRIVATE_KEY_PASSWORD for this shell before building a release." }

Push-Location $projectRoot
try {
  npm run tauri build
  if ($LASTEXITCODE -ne 0) { throw "Tauri release build failed with exit code $LASTEXITCODE." }
  if (-not (Test-Path -LiteralPath $source)) { throw "Expected installer was not produced at $source." }
  Copy-Item -LiteralPath $source -Destination $destination -Force
  Copy-Item -LiteralPath "$source.sig" -Destination "$destination.sig" -Force
  Write-Output "Windows installer copied to $destination"
} finally {
  Pop-Location
}
