<p align="center">
  <img src="assets/icon.png" width="112" alt="Tandem">
</p>

<h1 align="center">Tandem</h1>

<p align="center">
  A smart pill at the top of your screen that shows what your PC is doing,<br>
  and a launcher that opens everything with <b>Alt+Space</b>.
</p>

<p align="center">
  <a href="https://github.com/lwbios/tandem-desktop/releases/latest"><b>⬇ Download for Windows</b></a>
  &nbsp;·&nbsp;
  <a href="#features">Features</a>
  &nbsp;·&nbsp;
  <a href="#shortcuts">Shortcuts</a>
  &nbsp;·&nbsp;
  <a href="#faq">FAQ</a>
</p>

<p align="center"><sub>The app's interface is currently in Portuguese (Brazil).</sub></p>

---

## Installation

1. Download **Tandem-Setup.exe** from the [downloads page](https://github.com/lwbios/tandem-desktop/releases/latest).
2. Run the installer and follow the steps. Tandem starts on its own when it finishes.
3. If Windows shows "Windows protected your PC", click **More info → Run anyway**. This happens because the installer isn't digitally signed yet.

That's it: the pill appears at the top of the screen and the Tandem icon sits in the system tray, next to the clock. Double-click it to open the settings.

**Requirements:** Windows 10 or 11.

---

## Features

### The pill

It sits quietly at the top of the screen and grows with a smooth animation when something happens. Hover over it for more details. Clicks outside the pill go straight through to whatever is behind it.

| | |
| --- | --- |
| 🎵 **Now playing** | Album art and an equalizer for Spotify, YouTube and any media app. On hover: title, artist, progress and ⏮ ⏯ ⏭ controls. |
| 🔊 **Volume** | A bar whenever the volume changes. Scroll over the pill to change the volume. |
| 🎧 **Headphones and audio output** | When headphones connect, shows their name and battery (on supported Bluetooth headsets). Switch the audio output with a right-click. |
| 🎙️ **Microphone and calls** | A yellow dot when an app is using the microphone, with the app's icon and a voice meter. A muted mic turns into a red icon; click to mute or unmute. In Discord, it shows the server and channel. |
| 📷 **Camera** | A green dot while an app is using the camera. |
| 🔴 **OBS recording** | "REC" or "LIVE" with the elapsed time, with nothing to set up in OBS. |
| ⏱️ **Timer** | Quick timers from the pill or the right-click menu. When it ends, the pill shakes and plays a chime. |
| 🔋 **Battery** | A "Charging" notice when you plug in the charger. |
| 🎮 **Fullscreen** | In fullscreen games and videos, the pill gets out of the way on its own. |

### The launcher (Alt+Space)

A search bar that opens on top of any window. Just start typing:

| Type | What happens |
| --- | --- |
| `chrome`, `discord`, `vsc` | Opens any installed app |
| `2.5*4+10`, `sqrt(16)` | Calculator (Enter copies the result) |
| `10 km to miles`, `30 c to f`, `2 gb to mb` | Unit conversion |
| `100 usd to brl` | Currency conversion with today's rate |
| `today`, `time in tokyo`, `days until 2027-01-01` | Dates, time zones and countdowns |
| `#ff9f0a`, `rgb(255, 0, 0)` | Shows the colour and converts between HEX, RGB and HSL |
| `timer 15`, `timer 1h30` | Starts a timer on the pill |
| `focus 50` | Focus mode: a purple timer, and distracting apps are kept out of the way |
| `yt lofi`, `g recipe`, `maps bakery`, `tr hello` | Searches YouTube, Google, Maps, Translate… directly |
| `report` | Finds files on your PC |
| `close spotify` | Closes an open app |
| `password`, `uuid` | Generates a strong password or a UUID |
| `uppercase`, `camel`, `snake` | Transforms the text you copied and pastes the result |
| `;data` | Pastes a snippet (saved text) |

And also:

- **Clipboard history**: everything you copied (text and images), with a preview. Enter pastes into the app you were using.
- **Emoji & symbols**: search in English or Portuguese.
- **Recent screenshots**: your latest screenshots in a grid; drag them straight into Discord or a folder.
- **Window management**: left half, right half, maximize, center…
- **System**: lock, sleep, restart, shut down, empty the Recycle Bin, dark mode, mute.

### Quick notes

A small notes window that stays on top of other windows and saves as you type. Open it with **Ctrl+Alt+N**.

### Hyper Key

Optional, under **Settings → General**: hold **Caps Lock** and it becomes Ctrl+Alt+Shift+Win, so you can create shortcuts that never clash with other programs. A quick tap still toggles Caps Lock.

---

## Shortcuts

| Shortcut | Action |
| --- | --- |
| **Alt+Space** | Open the launcher |
| **Ctrl+Alt+N** | Show/hide notes |
| **Ctrl+Alt+I** | Show/hide the pill |
| **Ctrl+Alt+O** | Open settings |

All of them can be changed under **Settings → Shortcuts**, where you can also add shortcuts to mute the microphone and play/pause music.

## Settings

Double-click the tray icon (or press **Ctrl+Alt+O**). From there you can:

- turn each pill feature on or off;
- change the pill's size and position;
- create snippets, quicklinks and favourite folders;
- choose which apps are blocked in focus mode;
- start Tandem with Windows.

## Privacy

Everything runs on your computer. Tandem has no account, collects no data and sends nothing over the internet, except:

- exchange rates, when you ask for a currency conversion (a public service based on European Central Bank data);
- the web searches you open yourself.

Clipboard history stays on your PC and skips passwords copied from password managers.

## FAQ

**The pill disappeared.** It hides in fullscreen. If that's not it, press **Ctrl+Alt+I**.

**The Discord server name is wrong.** It comes from the channel open in the Discord window, which isn't always your voice channel.

**I muted in Discord and the pill didn't show it.** The pill shows the Windows microphone mute; each app's own mute isn't visible to it.

**My headphones don't show the battery.** It only appears for Bluetooth headsets that report their battery to Windows.

**Does it work with two monitors?** The pill stays on the primary monitor.

---

<details>
<summary><b>For developers</b></summary>

### Run from source

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm start
```

### Build the installer

```bash
npm run dist
```

The installer is written to `dist/`. The installed app keeps its settings in `%APPDATA%\Tandem`.

### Project layout

| File | Role |
| --- | --- |
| `main.js` | Electron main process: pill window, tray, global shortcuts, focus mode and the OBS log reader. |
| `index.html`, `style.css`, `renderer.js`, `preload.js` | The pill: states, animations, timer, clock and battery. |
| `media.ps1` | PowerShell process that prints one JSON line per event (media, volume, audio output, microphone, camera, fullscreen, focused window) and takes commands on standard input. |
| `native.cs` | Native code loaded by PowerShell: Core Audio, camera (Media Foundation), fullscreen detection, window management and the Hyper Key. |
| `settings.js`, `settings/` | Saved settings and the settings window. |
| `launcher-main.js`, `launcher/` | The launcher: apps, clipboard history, actions, calculator, converters and emoji. |
| `notes-main.js`, `notes/` | The notes window. |
| `assets/`, `scripts/make-icons.ps1` | Logo and icons; the script builds every icon from `assets/logo.png`. |

</details>
