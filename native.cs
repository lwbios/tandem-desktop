// Native Windows helpers loaded by media.ps1 (Add-Type):
//   IslandAudio  - speaker volume, audio outputs (list / switch), microphone mute, level
//                  and capture sessions, all through Core Audio
//   SensorWatch  - which processes are streaming from a camera (Media Foundation
//                  sensor activity monitor, the same source as Windows' camera indicator)
//   ScreenState  - whether a fullscreen app or game is in front on the primary monitor
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

// ---------------------------------------------------------------- Core Audio

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int _RegisterControlChangeNotify(); int _UnregisterControlChangeNotify();
    int _GetChannelCount(); int _SetMasterVolumeLevel();
    int SetMasterVolumeLevelScalar(float level, ref Guid context);
    int _GetMasterVolumeLevel();
    int GetMasterVolumeLevelScalar(out float level);
    int _SetChannelVolumeLevel(); int _SetChannelVolumeLevelScalar();
    int _GetChannelVolumeLevel(); int _GetChannelVolumeLevelScalar();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
}

[Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioMeterInformation {
    int GetPeakValue(out float peak);
}

[StructLayout(LayoutKind.Sequential)]
struct PropertyKey {
    public Guid fmtid; public int pid;
    public PropertyKey(string g, int p) { fmtid = new Guid(g); pid = p; }
}

[StructLayout(LayoutKind.Explicit)]
struct PropVariant {
    [FieldOffset(0)] public short vt;
    [FieldOffset(8)] public IntPtr pointer;
}

[Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore {
    int _GetCount(); int _GetAt();
    int GetValue(ref PropertyKey key, out PropVariant value);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
    int OpenPropertyStore(int access, out IPropertyStore store);
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int stateMask, [MarshalAs(UnmanagedType.IUnknown)] out object devices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
}

[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceCollection {
    int GetCount(out int count);
    int Item(int index, out IMMDevice device);
}

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionManager2 {
    int _GetAudioSessionControl(); int _GetSimpleAudioVolume();
    int GetSessionEnumerator([MarshalAs(UnmanagedType.IUnknown)] out object sessionEnum);
}

[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionEnumerator {
    int GetCount(out int count);
    int GetSession(int index, [MarshalAs(UnmanagedType.IUnknown)] out object session);
}

[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionControl2 {
    int GetState(out int state);
    int _GetDisplayName(); int _SetDisplayName(); int _GetIconPath(); int _SetIconPath();
    int _GetGroupingParam(); int _SetGroupingParam(); int _Register(); int _Unregister();
    int _GetSessionIdentifier(); int _GetSessionInstanceIdentifier();
    int GetProcessId(out uint pid);
}

// Undocumented but stable since Windows 7; the only way to change the default device.
[Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfig {
    int _GetMixFormat(); int _GetDeviceFormat(); int _ResetDeviceFormat(); int _SetDeviceFormat();
    int _GetProcessingPeriod(); int _SetProcessingPeriod(); int _GetShareMode(); int _SetShareMode();
    int _GetPropertyValue(); int _SetPropertyValue();
    int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string deviceId, int role);
}

[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
class PolicyConfigClient { }

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator { }

public class AudioOutput {
    public string Id;
    public string Name;        // "Fones de ouvido (WH-1000XM4)"
    public string Description; // "Fones de ouvido"
    public string Device;      // "WH-1000XM4"
    public bool Bluetooth;
}

public static class IslandAudio {
    const int Render = 0, Capture = 1;
    const int ClsctxAll = 23, DeviceStateActive = 1, SessionStateActive = 1;

    static PropertyKey FriendlyName = new PropertyKey("a45c254e-df1c-4efd-8020-67d146a850e0", 14);
    static PropertyKey DeviceDesc = new PropertyKey("a45c254e-df1c-4efd-8020-67d146a850e0", 2);
    static PropertyKey EnumeratorName = new PropertyKey("a45c254e-df1c-4efd-8020-67d146a850e0", 24);
    static PropertyKey InterfaceName = new PropertyKey("026e516e-b814-414b-83cd-856d6fef4822", 2);

    [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropVariant pv);

    static IMMDeviceEnumerator Enumerator() { return (IMMDeviceEnumerator)new MMDeviceEnumerator(); }

    static object Activate(IMMDevice device, Guid iid) {
        object o;
        Marshal.ThrowExceptionForHR(device.Activate(ref iid, ClsctxAll, IntPtr.Zero, out o));
        return o;
    }

    static IMMDevice DefaultDevice(int flow, int role) {
        IMMDevice device;
        Marshal.ThrowExceptionForHR(Enumerator().GetDefaultAudioEndpoint(flow, role, out device));
        return device;
    }

    static IAudioEndpointVolume Speaker() { return (IAudioEndpointVolume)Activate(DefaultDevice(Render, 1), typeof(IAudioEndpointVolume).GUID); }
    static IAudioEndpointVolume Mic() { return (IAudioEndpointVolume)Activate(DefaultDevice(Capture, 0), typeof(IAudioEndpointVolume).GUID); }

    static string ReadString(IPropertyStore store, PropertyKey key) {
        PropVariant v;
        if (store.GetValue(ref key, out v) != 0) return "";
        string s = v.vt == 31 ? Marshal.PtrToStringUni(v.pointer) : ""; // VT_LPWSTR
        PropVariantClear(ref v);
        return s ?? "";
    }

    static AudioOutput Describe(IMMDevice device) {
        var o = new AudioOutput();
        device.GetId(out o.Id);
        IPropertyStore store;
        if (device.OpenPropertyStore(0, out store) == 0) {
            o.Name = ReadString(store, FriendlyName);
            o.Description = ReadString(store, DeviceDesc);
            o.Device = ReadString(store, InterfaceName);
            o.Bluetooth = ReadString(store, EnumeratorName).ToUpperInvariant().StartsWith("BTH");
        }
        return o;
    }

    // ----- speaker -----
    public static float GetVolume() { float v; Marshal.ThrowExceptionForHR(Speaker().GetMasterVolumeLevelScalar(out v)); return v; }
    public static bool GetMute() { bool m; Marshal.ThrowExceptionForHR(Speaker().GetMute(out m)); return m; }
    public static void SetVolume(float v) {
        Guid g = Guid.Empty; var ep = Speaker();
        ep.SetMasterVolumeLevelScalar(Math.Max(0f, Math.Min(1f, v)), ref g);
        if (v > 0) ep.SetMute(false, ref g);
    }
    public static void ToggleMute() { Guid g = Guid.Empty; var ep = Speaker(); bool m; ep.GetMute(out m); ep.SetMute(!m, ref g); }

    // ----- outputs -----
    public static string DefaultOutputId() { string id; DefaultDevice(Render, 1).GetId(out id); return id; }
    public static AudioOutput DefaultOutput() { return Describe(DefaultDevice(Render, 1)); }

    public static AudioOutput[] Outputs() {
        var list = new List<AudioOutput>();
        object colObj;
        Marshal.ThrowExceptionForHR(Enumerator().EnumAudioEndpoints(Render, DeviceStateActive, out colObj));
        var col = (IMMDeviceCollection)colObj;
        int n; col.GetCount(out n);
        for (int i = 0; i < n; i++) {
            IMMDevice dev; col.Item(i, out dev);
            try { list.Add(Describe(dev)); } catch { }
        }
        return list.ToArray();
    }

    // Make a device the default for every role (console, multimedia, communications).
    public static void SetDefaultOutput(string id) {
        var policy = (IPolicyConfig)new PolicyConfigClient();
        for (int role = 0; role < 3; role++) Marshal.ThrowExceptionForHR(policy.SetDefaultEndpoint(id, role));
    }

    // ----- microphone (default capture device) -----
    public static bool GetMicMute() { bool m; Marshal.ThrowExceptionForHR(Mic().GetMute(out m)); return m; }
    public static void ToggleMicMute() { Guid g = Guid.Empty; var ep = Mic(); bool m; ep.GetMute(out m); ep.SetMute(!m, ref g); }
    public static float GetMicPeak() {
        var meter = (IAudioMeterInformation)Activate(DefaultDevice(Capture, 0), typeof(IAudioMeterInformation).GUID);
        float p; meter.GetPeakValue(out p); return p;
    }

    // Process ids that are capturing from any active microphone right now.
    public static uint[] MicCapturePids() {
        var result = new List<uint>();
        object colObj;
        Marshal.ThrowExceptionForHR(Enumerator().EnumAudioEndpoints(Capture, DeviceStateActive, out colObj));
        var col = (IMMDeviceCollection)colObj;
        int n; col.GetCount(out n);
        for (int d = 0; d < n; d++) {
            try {
                IMMDevice dev; col.Item(d, out dev);
                var mgr = (IAudioSessionManager2)Activate(dev, typeof(IAudioSessionManager2).GUID);
                object enumObj;
                if (mgr.GetSessionEnumerator(out enumObj) != 0) continue;
                var sessions = (IAudioSessionEnumerator)enumObj;
                int count; sessions.GetCount(out count);
                for (int i = 0; i < count; i++) {
                    object sObj; sessions.GetSession(i, out sObj);
                    var s = (IAudioSessionControl2)sObj;
                    int state; s.GetState(out state);
                    uint pid; s.GetProcessId(out pid);
                    if (state == SessionStateActive && pid != 0 && !result.Contains(pid)) result.Add(pid);
                }
            } catch { }
        }
        return result.ToArray();
    }
}

// ---------------------------------------------------------------- camera

[ComImport, Guid("39dc7f4a-b141-4719-813c-a7f46162a2b8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMFSensorProcessActivity {
    [PreserveSig] int GetProcessId(out uint pid);
    [PreserveSig] int GetStreamingState([MarshalAs(UnmanagedType.Bool)] out bool streaming);
}

[ComImport, Guid("3e8c4be1-a8c2-4528-90de-2851bde5fead"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMFSensorActivityReport {
    [PreserveSig] int GetFriendlyName([MarshalAs(UnmanagedType.LPWStr)] StringBuilder name, uint cch, out uint written);
    [PreserveSig] int GetSymbolicLink([MarshalAs(UnmanagedType.LPWStr)] StringBuilder link, uint cch, out uint written);
    [PreserveSig] int GetProcessCount(out uint count);
    [PreserveSig] int GetProcessActivity(uint index, out IMFSensorProcessActivity activity);
}

[ComImport, Guid("683f7a5e-4a19-43cd-b1a9-dbf4ab3f7777"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMFSensorActivitiesReport {
    [PreserveSig] int GetCount(out uint count);
    [PreserveSig] int GetActivityReport(uint index, out IMFSensorActivityReport report);
}

[ComImport, Guid("de5072ee-dbe3-46dc-8a87-b6f631194751"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMFSensorActivitiesReportCallback {
    [PreserveSig] int OnActivitiesReport(IMFSensorActivitiesReport report);
}

[ComImport, Guid("d0cef145-b3f4-4340-a2e5-7a5080ca05cb"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMFSensorActivityMonitor {
    [PreserveSig] int Start();
    [PreserveSig] int Stop();
}

public class SensorWatch : IMFSensorActivitiesReportCallback {
    [DllImport("mfplat.dll")] static extern int MFStartup(int version, int flags);
    [DllImport("mfsensorgroup.dll")] static extern int MFCreateSensorActivityMonitor(IMFSensorActivitiesReportCallback callback, out IMFSensorActivityMonitor monitor);

    const string AudioCategory = "6994ad04-93ef-11d0-a3cc-00a0c9223196"; // KSCATEGORY_AUDIO
    static IMFSensorActivityMonitor monitor;
    static SensorWatch instance;
    // device symbolic link -> process ids streaming from it (each report carries the full list)
    static readonly Dictionary<string, uint[]> streaming = new Dictionary<string, uint[]>();

    public static string Start() {
        try {
            int hr = MFStartup(0x20070, 0);
            if (hr != 0) return "MFStartup 0x" + hr.ToString("X");
            instance = new SensorWatch();
            hr = MFCreateSensorActivityMonitor(instance, out monitor);
            if (hr != 0) return "MFCreateSensorActivityMonitor 0x" + hr.ToString("X");
            hr = monitor.Start();
            return hr == 0 ? "" : "Start 0x" + hr.ToString("X");
        } catch (Exception e) {
            return e.Message;
        }
    }

    public int OnActivitiesReport(IMFSensorActivitiesReport report) {
        try {
            uint n; report.GetCount(out n);
            for (uint i = 0; i < n; i++) {
                IMFSensorActivityReport r;
                if (report.GetActivityReport(i, out r) != 0) continue;
                var link = new StringBuilder(1024); uint written;
                r.GetSymbolicLink(link, 1024, out written);
                string key = link.ToString();
                if (key.ToLowerInvariant().Contains(AudioCategory)) continue;
                uint count; r.GetProcessCount(out count);
                var pids = new List<uint>();
                for (uint p = 0; p < count; p++) {
                    IMFSensorProcessActivity a;
                    if (r.GetProcessActivity(p, out a) != 0) continue;
                    uint pid; bool on;
                    a.GetProcessId(out pid);
                    a.GetStreamingState(out on);
                    if (on && !pids.Contains(pid)) pids.Add(pid);
                }
                lock (streaming) streaming[key] = pids.ToArray();
            }
        } catch { }
        return 0;
    }

    public static uint[] CameraPids() {
        var all = new List<uint>();
        lock (streaming) {
            foreach (var pids in streaming.Values)
                foreach (var pid in pids)
                    if (!all.Contains(pid)) all.Add(pid);
        }
        return all.ToArray();
    }
}

// ---------------------------------------------------------------- fullscreen

public static class ScreenState {
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MonitorInfo { public int Size; public Rect Monitor; public Rect Work; public uint Flags; }

    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
    [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder name, int max);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);

    static readonly string[] ShellClasses = { "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd" };

    static ScreenState() { SetProcessDPIAware(); }

    // Process id of the app covering the whole primary monitor, or 0.
    public static uint FullscreenPid() {
        IntPtr h = GetForegroundWindow();
        if (h == IntPtr.Zero || !IsWindowVisible(h) || IsZoomed(h)) return 0;
        var cls = new StringBuilder(256);
        GetClassName(h, cls, 256);
        if (Array.IndexOf(ShellClasses, cls.ToString()) >= 0) return 0;

        var info = new MonitorInfo { Size = Marshal.SizeOf(typeof(MonitorInfo)) };
        if (!GetMonitorInfo(MonitorFromWindow(h, 2), ref info) || (info.Flags & 1) == 0) return 0; // primary only
        Rect r;
        if (!GetWindowRect(h, out r)) return 0;
        var m = info.Monitor;
        if (r.Left > m.Left || r.Top > m.Top || r.Right < m.Right || r.Bottom < m.Bottom) return 0;

        uint pid; GetWindowThreadProcessId(h, out pid);
        return pid;
    }
}

// ---------------------------------------------------------------- launcher helpers

// Remembers the last window the user was in (anything but Tandem itself), so the
// launcher can paste into it and move it around after it closes.
public static class WindowManager {
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MonitorInfo { public int Size; public Rect Monitor; public Rect Work; public uint Flags; }

    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd, int cmd);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int w, int h, uint flags);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
    [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder name, int max);
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, IntPtr extra);

    static IntPtr last = IntPtr.Zero;
    public static uint OwnPid = 0;

    public static void Track() {
        IntPtr h = GetForegroundWindow();
        if (h == IntPtr.Zero) return;
        uint pid; GetWindowThreadProcessId(h, out pid);
        if (pid == OwnPid) return;
        var cls = new StringBuilder(64); GetClassName(h, cls, 64);
        string c = cls.ToString();
        if (c == "Shell_TrayWnd" || c == "Progman" || c == "WorkerW") return;
        last = h;
    }

    public static bool Focus() {
        if (last == IntPtr.Zero || !IsWindow(last)) return false;
        return SetForegroundWindow(last);
    }

    // Ctrl+V into the remembered window.
    public static void Paste() {
        Focus();
        System.Threading.Thread.Sleep(120);
        keybd_event(0x11, 0, 0, IntPtr.Zero);       // Ctrl down
        keybd_event(0x56, 0, 0, IntPtr.Zero);       // V down
        keybd_event(0x56, 0, 2, IntPtr.Zero);       // V up
        keybd_event(0x11, 0, 2, IntPtr.Zero);       // Ctrl up
    }

    // left, right, top, bottom, maximize, center, almost, restore
    public static string Arrange(string action) {
        if (last == IntPtr.Zero || !IsWindow(last)) return "no window";
        var info = new MonitorInfo { Size = Marshal.SizeOf(typeof(MonitorInfo)) };
        if (!GetMonitorInfo(MonitorFromWindow(last, 2), ref info)) return "no monitor";
        var w = info.Work;
        int W = w.Right - w.Left, H = w.Bottom - w.Top;
        if (action == "maximize") { ShowWindow(last, 3); Focus(); return ""; }
        if (action == "restore") { ShowWindow(last, 9); Focus(); return ""; }
        int x = w.Left, y = w.Top, cw = W, ch = H;
        switch (action) {
            case "left": cw = W / 2; break;
            case "right": cw = W / 2; x = w.Left + W - cw; break;
            case "top": ch = H / 2; break;
            case "bottom": ch = H / 2; y = w.Top + H - ch; break;
            case "center": cw = W * 3 / 5; ch = H * 3 / 4; x = w.Left + (W - cw) / 2; y = w.Top + (H - ch) / 2; break;
            case "almost": cw = W * 9 / 10; ch = H * 9 / 10; x = w.Left + (W - cw) / 2; y = w.Top + (H - ch) / 2; break;
            default: return "unknown";
        }
        if (IsZoomed(last)) ShowWindow(last, 9);
        SetWindowPos(last, IntPtr.Zero, x, y, cw, ch, 0x0004 | 0x0010); // NOZORDER | NOACTIVATE
        Focus();
        return "";
    }
}

public static class ClipboardWatch {
    [DllImport("user32.dll")] static extern uint GetClipboardSequenceNumber();
    public static uint Sequence() { return GetClipboardSequenceNumber(); }
}
