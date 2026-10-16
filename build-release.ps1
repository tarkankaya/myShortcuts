$ErrorActionPreference = 'Stop'

$sourceDirectory = $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $sourceDirectory 'manifest.json') -Raw | ConvertFrom-Json
$releaseDirectory = Join-Path $sourceDirectory 'release'
$packageDirectory = Join-Path $releaseDirectory 'package'
$packageFiles = @('manifest.json', 'popup.html', 'popup.css', 'popup.js', 'privacy.html', 'icon.png')

New-Item -ItemType Directory -Path $packageDirectory -Force | Out-Null
foreach ($fileName in $packageFiles) {
    $sourceFile = Join-Path $sourceDirectory $fileName
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
        throw "Missing release file: $fileName"
    }
    Copy-Item -LiteralPath $sourceFile -Destination (Join-Path $packageDirectory $fileName) -Force
}

$archivePath = Join-Path $releaseDirectory ("my-shortcuts-{0}.zip" -f $manifest.version)
$archiveInputs = $packageFiles | ForEach-Object { Join-Path $packageDirectory $_ }
Compress-Archive -LiteralPath $archiveInputs -DestinationPath $archivePath -CompressionLevel Optimal -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    $actualEntries = @($archive.Entries | ForEach-Object { $_.FullName })
    $differences = Compare-Object -ReferenceObject ($packageFiles | Sort-Object) -DifferenceObject ($actualEntries | Sort-Object)
    if ($differences) { throw 'Archive contents differ from the release file list.' }
} finally {
    $archive.Dispose()
}

$checksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = "$archivePath.sha256"
[System.IO.File]::WriteAllText($checksumPath, "$checksum  $([System.IO.Path]::GetFileName($archivePath))`n", [System.Text.UTF8Encoding]::new($false))
Write-Output "Created: $archivePath"
Write-Output "Version: $($manifest.version)"
Write-Output "Add-on ID: $($manifest.browser_specific_settings.gecko.id)"
Write-Output "SHA256: $checksum"
Write-Output 'Upload this unsigned ZIP as a new version of the existing My Shortcuts Mozilla listing.'
