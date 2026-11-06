# Builds the app and tray icons from the 1024x1024 logo (white shape on transparent).
#   assets/icon.ico        app icon: white logo on a dark rounded tile, 16-256 px
#   assets/icon.png        same tile at 1024 px (for installers / stores)
#   assets/tray-dark.ico   white logo for a dark taskbar, 16-48 px
#   assets/tray-light.ico  dark logo for a light taskbar, 16-48 px
# Usage: powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1 [path\to\logo.png]
param([string]$Logo = (Join-Path $PSScriptRoot '..\assets\logo.png'))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot '..\assets'
$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Logo))

# Bounding box of the visible shape, so margins are ours and not the source file's.
$minX = $src.Width; $minY = $src.Height; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $src.Height; $y += 2) {
    for ($x = 0; $x -lt $src.Width; $x += 2) {
        if ($src.GetPixel($x, $y).A -gt 8) {
            if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$crop = New-Object System.Drawing.Rectangle ([Math]::Max(0, $minX - 3)), ([Math]::Max(0, $minY - 3)), ($maxX - $minX + 7), ($maxY - $minY + 7)

function New-Canvas([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.PixelOffsetMode = 'HighQuality'
    $g.CompositingQuality = 'HighQuality'
    $g.Clear([System.Drawing.Color]::Transparent)
    return $bmp, $g
}

# Draw the cropped logo centred, $height px tall, optionally recoloured.
function Draw-Logo($g, [int]$size, [double]$height, [System.Drawing.Color]$color) {
    $h = $height
    $w = $h * $crop.Width / $crop.Height
    $dest = New-Object System.Drawing.RectangleF (($size - $w) / 2), (($size - $h) / 2), $w, $h
    $m = New-Object System.Drawing.Imaging.ColorMatrix
    $m.Matrix00 = 0; $m.Matrix11 = 0; $m.Matrix22 = 0
    $m.Matrix40 = $color.R / 255; $m.Matrix41 = $color.G / 255; $m.Matrix42 = $color.B / 255
    $m.Matrix33 = 1; $m.Matrix44 = 1
    $attr = New-Object System.Drawing.Imaging.ImageAttributes
    $attr.SetColorMatrix($m)
    $destRect = New-Object System.Drawing.Rectangle ([int][Math]::Round($dest.X)), ([int][Math]::Round($dest.Y)), ([int][Math]::Round($dest.Width)), ([int][Math]::Round($dest.Height))
    $g.DrawImage($src, $destRect, $crop.X, $crop.Y, $crop.Width, $crop.Height, 'Pixel', $attr)
}

function Render-Tile([int]$size) {
    $bmp, $g = New-Canvas $size
    $r = $size * 0.225
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($size - $d - 0.01, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d - 0.01, $size - $d - 0.01, $d, $d, 0, 90)
    $path.AddArc(0, $size - $d - 0.01, $d, $d, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 0, $size), ([System.Drawing.Color]::FromArgb(255, 38, 38, 42)), ([System.Drawing.Color]::FromArgb(255, 8, 8, 10))
    $g.FillPath($brush, $path)
    Draw-Logo $g $size ($size * 0.62) ([System.Drawing.Color]::White)
    $g.Dispose()
    return $bmp
}

function Render-Tray([int]$size, [System.Drawing.Color]$color) {
    $bmp, $g = New-Canvas $size
    Draw-Logo $g $size ($size * 0.94) $color
    $g.Dispose()
    return $bmp
}

function Get-PngBytes($bmp) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    return , $ms.ToArray()
}

# Classic 32-bit DIB entry (BITMAPINFOHEADER + bottom-up BGRA + empty AND mask).
function Get-DibBytes($bmp) {
    $s = $bmp.Width
    $ms = New-Object System.IO.MemoryStream
    $w = New-Object System.IO.BinaryWriter $ms
    $maskRow = [int]([Math]::Ceiling($s / 32) * 4)
    $w.Write([uint32]40); $w.Write([int32]$s); $w.Write([int32]($s * 2))
    $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]0)
    $w.Write([uint32]($s * $s * 4 + $maskRow * $s))
    $w.Write([int32]0); $w.Write([int32]0); $w.Write([uint32]0); $w.Write([uint32]0)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $s, $s
    $data = $bmp.LockBits($rect, 'ReadOnly', [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $row = New-Object byte[] ($s * 4)
    for ($y = $s - 1; $y -ge 0; $y--) {
        [System.Runtime.InteropServices.Marshal]::Copy([IntPtr]($data.Scan0.ToInt64() + $y * $data.Stride), $row, 0, $s * 4)
        $w.Write($row)
    }
    $bmp.UnlockBits($data)
    $w.Write((New-Object byte[] ($maskRow * $s)))
    $w.Flush()
    return , $ms.ToArray()
}

# .ico: DIB entries below 256 px (widest compatibility), PNG for the 256 px one.
function Write-Ico([string]$path, $bitmaps) {
    $images = @($bitmaps | ForEach-Object { if ($_.Width -ge 256) { , (Get-PngBytes $_) } else { , (Get-DibBytes $_) } })
    $fs = [System.IO.File]::Create($path)
    $w = New-Object System.IO.BinaryWriter $fs
    $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$images.Count)
    $offset = 6 + 16 * $images.Count
    for ($i = 0; $i -lt $images.Count; $i++) {
        $s = $bitmaps[$i].Width
        $w.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))
        $w.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))
        $w.Write([byte]0); $w.Write([byte]0)
        $w.Write([uint16]1); $w.Write([uint16]32)
        $w.Write([uint32]$images[$i].Length); $w.Write([uint32]$offset)
        $offset += $images[$i].Length
    }
    foreach ($img in $images) { $w.Write($img) }
    $w.Close()
}

$appSizes = 16, 20, 24, 32, 40, 48, 64, 96, 128, 256
$traySizes = 16, 20, 24, 32, 40, 48

Write-Ico (Join-Path $assets 'icon.ico') @($appSizes | ForEach-Object { Render-Tile $_ })
(Render-Tile 1024).Save((Join-Path $assets 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Ico (Join-Path $assets 'tray-dark.ico') @($traySizes | ForEach-Object { Render-Tray $_ ([System.Drawing.Color]::White) })
Write-Ico (Join-Path $assets 'tray-light.ico') @($traySizes | ForEach-Object { Render-Tray $_ ([System.Drawing.Color]::FromArgb(255, 24, 24, 24)) })

Get-ChildItem $assets | ForEach-Object { '{0,-16} {1,8:N0} bytes' -f $_.Name, $_.Length }
