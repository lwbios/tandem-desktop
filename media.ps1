# Watches the Windows media session (Spotify, browser, etc.) and prints one JSON
# line per second. Reads "toggle" / "next" / "prev" commands from stdin.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($op, [Type]$type) {
    $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
    $null = $task.Wait(3000)
    if ($task.IsCompleted) { return $task.Result }
    return $null
}

$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]

$SessionManager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$MediaProps = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$StreamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType]

$AsStreamForRead = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [Type[]]@([Windows.Storage.Streams.IInputStream]))

$mgr = Await ($SessionManager::RequestAsync()) $SessionManager

# Core Audio, camera sensor activity and fullscreen detection (see native.cs).
Add-Type -Path (Join-Path $PSScriptRoot 'native.cs')
$lastVol = $null

# Process ids -> distinct process names. Also fills $script:appPaths (name -> exe
# path) so the app can show each app's icon.
$appPaths = @{}
function Get-AppNames($procIds) {
    $names = New-Object System.Collections.Generic.List[string]
    foreach ($procId in $procIds) {
        try { $proc = [System.Diagnostics.Process]::GetProcessById([int]$procId) } catch { continue }
        $name = $proc.ProcessName
        if (-not $names.Contains($name)) { $names.Add($name) }
        if (-not $script:appPaths.ContainsKey($name)) {
            try { $script:appPaths[$name] = $proc.MainModule.FileName } catch {}
        }
    }
    return ,$names.ToArray()
}
function Get-MicApps { return ,(Get-AppNames ([IslandAudio]::MicCapturePids())) }
$micApps = @()
$lastMic = $null

# Camera: the sensor monitor calls back on its own thread; we just read its state.
$cameraError = [SensorWatch]::Start()
if ($cameraError) { [Console]::Error.WriteLine("camera monitor: $cameraError") }
$lastCamera = $null

# Fullscreen app or game on the primary monitor.
$lastFullscreen = $null

# Audio output: default device, the list for the menu, and Bluetooth battery.
$lastOutputId = $null
$lastOutputList = $null
$outputBattery = $null
$batteryCheckedAt = [DateTime]::MinValue
$outputs = @()

# Bluetooth headsets expose their battery as a PnP property on the paired device.
function Get-BtBattery([string]$deviceName) {
    if (-not $deviceName) { return $null }
    $devices = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue |
        Where-Object { $_.FriendlyName -and $_.FriendlyName -like "*$deviceName*" }
    foreach ($d in $devices) {
        $p = Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2' -ErrorAction SilentlyContinue
        if ($p -and $null -ne $p.Data) { return [int]$p.Data }
    }
    return $null
}

function Emit-Output([bool]$initial, [bool]$changed) {
    $cur = [IslandAudio]::DefaultOutput()
    Emit @{
        type     = 'output'
        initial  = $initial
        changed  = $changed
        id       = $cur.Id
        name     = $cur.Name
        desc     = $cur.Description
        device   = $cur.Device
        bt       = $cur.Bluetooth
        battery  = $script:outputBattery
        devices  = @($script:outputs | ForEach-Object { @{ id = $_.Id; name = $_.Name } })
    }
}

# Discord shows "channel | Server - Discord" (or "@friend - Discord") in its window
# title. That is the channel being viewed, which is usually the voice one. When the
# title says nothing useful (Friends page, window in tray) keep the last good value.
$discord = $null
function Get-DiscordContext {
    $title = (Get-Process Discord -ErrorAction SilentlyContinue | Where-Object MainWindowTitle | Select-Object -First 1).MainWindowTitle
    if (-not $title) { return $null }
    $title = $title -replace '^\(\d+\)\s*', '' -replace '^[^\w#@]+\s*', ''
    $title = $title -replace '\s+-\s+Discord$', ''
    $parts = $title -split '\s+\|\s+'
    if ($parts.Count -ge 2) { return @{ server = $parts[-1].Trim(); channel = $parts[0].Trim() } }
    if ($title.StartsWith('@')) { return @{ server = $title.Substring(1).Trim(); channel = ''; dm = $true } }
    return $null
}

function Read-Thumbnail($props) {
    if (-not $props.Thumbnail) { return $null }
    try {
        $ras = Await ($props.Thumbnail.OpenReadAsync()) $StreamType
        if (-not $ras) { return $null }
        # The result comes back as a bare __ComObject, so normal overload binding
        # fails; reflection does the interface cast for us.
        $stream = $AsStreamForRead.Invoke($null, @($ras))
        $ms = New-Object System.IO.MemoryStream
        $stream.CopyTo($ms)
        $bytes = $ms.ToArray()
        if ($bytes.Length -lt 4) { return $null }
        $mime = if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8) { 'image/jpeg' } else { 'image/png' }
        return "data:$mime;base64," + [Convert]::ToBase64String($bytes)
    } catch {
        return $null
    }
}

function Emit($obj) {
    [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress))
    [Console]::Out.Flush()
}

# [Console]::In.ReadLineAsync() blocks on .NET Framework, so wrap the raw stream.
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), [System.Text.Encoding]::UTF8)
$pending = $stdin.ReadLineAsync()
$lastKey = $null
$artTries = 0
$hasArt = $false
$tick = 0

while ($true) {
    if ($pending.IsCompleted) {
        $cmd = $pending.Result
        if ($null -eq $cmd) { break } # parent closed stdin
        try {
            $cmd = $cmd.Trim()
            if ($cmd -match '^vol ([0-9.]+)$') { [IslandAudio]::SetVolume([float]$Matches[1]); $cmd = '' }
            elseif ($cmd -eq 'mute') { [IslandAudio]::ToggleMute(); $cmd = '' }
            elseif ($cmd -eq 'micmute') { [IslandAudio]::ToggleMicMute(); $cmd = '' }
            elseif ($cmd -match '^output (.+)$') { [IslandAudio]::SetDefaultOutput($Matches[1]); $cmd = '' }
            $s = $mgr.GetCurrentSession()
            if ($s -and $cmd) {
                switch ($cmd) {
                    'toggle' { $null = $s.TryTogglePlayPauseAsync() }
                    'next'   { $null = $s.TrySkipNextAsync() }
                    'prev'   { $null = $s.TrySkipPreviousAsync() }
                }
            }
        } catch {}
        $pending = $stdin.ReadLineAsync()
        $tick = 3 # refresh soon after a command
    }

    # Volume is cheap to read, so check it every loop (250 ms) and emit on change.
    try {
        $vol = [Math]::Round([IslandAudio]::GetVolume(), 2)
        $muted = [IslandAudio]::GetMute()
        $volKey = "$vol|$muted"
        if ($volKey -ne $lastVol) {
            Emit @{ type = 'volume'; level = $vol; muted = $muted; initial = ($null -eq $lastVol) }
            $lastVol = $volKey
        }
    } catch {}

    # Microphone: app list once a second (registry), mute + level every loop while in use.
    try {
        if ($tick -le 0) {
            $micApps = Get-MicApps
            if ($micApps -contains 'Discord') {
                $ctx = Get-DiscordContext
                if ($ctx) { $discord = $ctx }
            } else {
                $discord = $null
            }
        }
        $micActive = $micApps.Count -gt 0
        $micMuted = $false
        try { $micMuted = [IslandAudio]::GetMicMute() } catch {}
        $micKey = "$micActive|$micMuted|$($micApps -join ',')|$($discord.server)|$($discord.channel)"
        if ($micActive -or $micKey -ne $lastMic) {
            $level = 0
            if ($micActive -and -not $micMuted) { try { $level = [Math]::Round([IslandAudio]::GetMicPeak(), 3) } catch {} }
            Emit @{ type = 'mic'; active = $micActive; muted = $micMuted; apps = $micApps; level = $level; discord = $discord; paths = $appPaths }
            $lastMic = $micKey
        }
    } catch {}

    # Camera in use (state kept up to date by the sensor monitor callback).
    try {
        $camApps = Get-AppNames ([SensorWatch]::CameraPids())
        $camKey = $camApps -join ','
        if ($camKey -ne $lastCamera) {
            Emit @{ type = 'camera'; active = ($camApps.Count -gt 0); apps = $camApps; paths = $appPaths }
            $lastCamera = $camKey
        }
    } catch {}

    # Fullscreen app or game in front: the island hides itself.
    try {
        $fsPid = [ScreenState]::FullscreenPid()
        $fsActive = $fsPid -ne 0
        if ($fsActive -ne $lastFullscreen) {
            $fsApp = ''
            if ($fsActive) { try { $fsApp = [System.Diagnostics.Process]::GetProcessById([int]$fsPid).ProcessName } catch {} }
            Emit @{ type = 'fullscreen'; active = $fsActive; app = $fsApp }
            $lastFullscreen = $fsActive
        }
    } catch {}

    # Audio output: default device every loop, the device list once a second, and the
    # Bluetooth battery when the device changes and then every two minutes.
    try {
        $outId = [IslandAudio]::DefaultOutputId()
        $outChanged = $outId -ne $lastOutputId
        $listChanged = $false
        if ($tick -le 0 -or $outChanged) {
            $script:outputs = [IslandAudio]::Outputs()
            $listKey = ($script:outputs | ForEach-Object { $_.Id }) -join '|'
            $listChanged = $listKey -ne $lastOutputList
            $lastOutputList = $listKey
        }
        $batteryChanged = $false
        if ($outChanged -or ([DateTime]::Now - $batteryCheckedAt).TotalSeconds -gt 120) {
            $cur = [IslandAudio]::DefaultOutput()
            $newBattery = if ($cur.Bluetooth) { Get-BtBattery $cur.Device } else { $null }
            $batteryChanged = $newBattery -ne $outputBattery
            $outputBattery = $newBattery
            $batteryCheckedAt = [DateTime]::Now
        }
        if ($outChanged -or $listChanged -or $batteryChanged) {
            Emit-Output ($null -eq $lastOutputId) ($outChanged -and $null -ne $lastOutputId)
            $lastOutputId = $outId
        }
    } catch {}

    if ($tick -le 0) {
        $tick = 4
        try {
            $s = $mgr.GetCurrentSession()
            if (-not $s) {
                if ($lastKey -ne '') { $lastKey = ''; $hasArt = $false }
                Emit @{ active = $false }
            } else {
                $p = Await ($s.TryGetMediaPropertiesAsync()) $MediaProps
                $info = $s.GetPlaybackInfo()
                $tl = $s.GetTimelineProperties()
                $playing = [int]$info.PlaybackStatus -eq 4

                $key = "$($p.Title)|$($p.Artist)"
                $out = @{
                    active   = [bool]$p.Title
                    key      = $key
                    title    = $p.Title
                    artist   = $p.Artist
                    album    = $p.AlbumTitle
                    app      = $s.SourceAppUserModelId
                    playing  = $playing
                    position = 0
                    duration = 0
                }

                $dur = ($tl.EndTime - $tl.StartTime).TotalSeconds
                if ($dur -gt 0) {
                    $pos = $tl.Position.TotalSeconds
                    if ($playing) { $pos += ([DateTimeOffset]::Now - $tl.LastUpdatedTime).TotalSeconds }
                    $out.position = [Math]::Max(0, [Math]::Min($pos, $dur))
                    $out.duration = $dur
                }

                # Apps often publish the cover a moment after the title, so retry a few times.
                if ($key -ne $lastKey) { $lastKey = $key; $artTries = 0; $hasArt = $false; $out.art = '' }
                if (-not $hasArt -and $artTries -lt 5) {
                    $artTries++
                    $art = Read-Thumbnail $p
                    if ($art) { $out.art = $art; $hasArt = $true }
                }
                Emit $out
            }
        } catch {
            Emit @{ active = $false; error = $_.Exception.Message }
        }
    }

    $tick--
    Start-Sleep -Milliseconds 250
}
