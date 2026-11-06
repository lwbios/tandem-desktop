// Core Audio helpers loaded by media.ps1 (Add-Type): speaker volume, microphone
// mute / level, and which processes are capturing from a microphone right now.
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

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

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
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

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator { }

public static class IslandAudio {
    const int Render = 0, Capture = 1;
    const int ClsctxAll = 23, DeviceStateActive = 1, SessionStateActive = 1;

    static IMMDeviceEnumerator Enumerator() { return (IMMDeviceEnumerator)new MMDeviceEnumerator(); }

    static object Activate(IMMDevice device, Guid iid) {
        object o;
        Marshal.ThrowExceptionForHR(device.Activate(ref iid, ClsctxAll, IntPtr.Zero, out o));
        return o;
    }

    static object ActivateDefault(int flow, int role, Guid iid) {
        IMMDevice device;
        Marshal.ThrowExceptionForHR(Enumerator().GetDefaultAudioEndpoint(flow, role, out device));
        return Activate(device, iid);
    }

    static IAudioEndpointVolume Speaker() { return (IAudioEndpointVolume)ActivateDefault(Render, 1, typeof(IAudioEndpointVolume).GUID); }
    static IAudioEndpointVolume Mic() { return (IAudioEndpointVolume)ActivateDefault(Capture, 0, typeof(IAudioEndpointVolume).GUID); }

    // ----- speaker -----
    public static float GetVolume() { float v; Marshal.ThrowExceptionForHR(Speaker().GetMasterVolumeLevelScalar(out v)); return v; }
    public static bool GetMute() { bool m; Marshal.ThrowExceptionForHR(Speaker().GetMute(out m)); return m; }
    public static void SetVolume(float v) {
        Guid g = Guid.Empty; var ep = Speaker();
        ep.SetMasterVolumeLevelScalar(Math.Max(0f, Math.Min(1f, v)), ref g);
        if (v > 0) ep.SetMute(false, ref g);
    }
    public static void ToggleMute() { Guid g = Guid.Empty; var ep = Speaker(); bool m; ep.GetMute(out m); ep.SetMute(!m, ref g); }

    // ----- microphone (default capture device) -----
    public static bool GetMicMute() { bool m; Marshal.ThrowExceptionForHR(Mic().GetMute(out m)); return m; }
    public static void ToggleMicMute() { Guid g = Guid.Empty; var ep = Mic(); bool m; ep.GetMute(out m); ep.SetMute(!m, ref g); }
    public static float GetMicPeak() {
        var meter = (IAudioMeterInformation)ActivateDefault(Capture, 0, typeof(IAudioMeterInformation).GUID);
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
