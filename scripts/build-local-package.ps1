$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json
$version = $package.version
$outputRoot = Join-Path $projectRoot "local-packages"
$packageName = "ARPG-Seasons-${version}-Windows-x64"
$packageDirectory = Join-Path $outputRoot $packageName
$installerName = "ARPG-Seasons-${version}-x64-local-setup.exe"
$sourceInstaller = Join-Path $projectRoot "src-tauri\target\release\bundle\nsis\ARPG Seasons_${version}_x64-setup.exe"
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if ((Test-Path -LiteralPath $cargoBin) -and -not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  $env:Path = "$cargoBin;$env:Path"
}

Push-Location $projectRoot
try {
  npm run tauri -- build --bundles nsis --config src-tauri/tauri.local-installer.conf.json
  if ($LASTEXITCODE -ne 0) { throw "Local installer build failed with exit code $LASTEXITCODE." }
  if (-not (Test-Path -LiteralPath $sourceInstaller)) { throw "Expected installer not found: $sourceInstaller" }
  New-Item -ItemType Directory -Force -Path $packageDirectory | Out-Null
  $installer = Join-Path $packageDirectory $installerName
  Copy-Item -LiteralPath $sourceInstaller -Destination $installer -Force
  Copy-Item -LiteralPath (Join-Path $projectRoot "docs\INSTALL.md") -Destination (Join-Path $packageDirectory "INSTALL.txt") -Force
  $hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -LiteralPath (Join-Path $packageDirectory "SHA256SUMS.txt") -Value "$hash  $installerName" -Encoding ascii
  $archive = Join-Path $outputRoot "$packageName.zip"
  Compress-Archive -Path (Join-Path $packageDirectory "*") -DestinationPath $archive -Force
  Write-Output "Local installation package: $archive"
  Write-Output "Installer SHA256: $hash"
} finally {
  Pop-Location
}
