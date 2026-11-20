$ErrorActionPreference = 'Stop'
$arch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
switch ($arch) {
    'AMD64' { $target = 'x86_64'; $digest = 'edd61f7f5728a56cc62455386661860bdfc7bab65872f39b0c25bdcc1d8e1beb' }
    'ARM64' { $target = 'aarch64'; $digest = '72eed595983a4d7d22d79f21065b0f4479cc7e5c7a89104bb410c8f47559a878' }
    default { throw "Unsupported Windows architecture: $arch" }
}
$runtime = New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot '../.runtime') -Force
$stage = New-Item -ItemType Directory -Path (Join-Path $runtime.FullName ([guid]::NewGuid().ToString()))
try {
    Write-Host 'Preparing the local workbench for its first run...'
    $archive = Join-Path $stage.FullName 'uv.zip'
    $uri = "https://github.com/astral-sh/uv/releases/download/0.13.9/uv-$target-pc-windows-msvc.zip"
    Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $archive
    $stream = [IO.File]::OpenRead($archive)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '')
        if ($actual -ne $digest) { throw 'Download checksum mismatch.' }
    } finally { $stream.Dispose(); $sha.Dispose() }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($archive, $stage.FullName)
    $exe = Get-ChildItem -LiteralPath $stage.FullName -Filter uv.exe -Recurse -File
    if (@($exe).Count -ne 1) { throw 'Missing uv launcher in the downloaded archive.' }
    $destination = Join-Path $runtime.FullName 'uv.exe'
    if (!(Test-Path -LiteralPath $destination)) { Move-Item -LiteralPath $exe.FullName -Destination $destination }
} finally {
    if ($stage.Parent.FullName -eq $runtime.FullName) { Remove-Item -LiteralPath $stage.FullName -Recurse -Force }
}
