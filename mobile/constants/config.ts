import Constants from 'expo-constants';

// The one place the backend's address lives. Every API call imports
// API_BASE_URL from here instead of writing a URL directly in a screen.
//
// In development, Metro already auto-detects whatever LAN IP it's
// reachable at -- that's what `expo start --lan` does, and it's why
// the app always loads regardless of which network you're on right
// now. Constants.expoConfig.hostUri exposes that exact same host (e.g.
// "192.168.100.165:8081"), so deriving the backend URL from it means
// switching WiFi, hotspot, or anything else just works automatically --
// no .env edit, no Metro restart for this reason, ever again. This also
// covers the Android emulator case for free: when reached via
// `adb reverse`, hostUri is "localhost:8081", so the backend correctly
// resolves to "localhost:8000" too.
//
// In a production build there's no dev server and no hostUri, so this
// falls back to EXPO_PUBLIC_API_URL, which by then should point at the
// real deployed backend (Render), not a LAN address.
//
// On web specifically, Constants.expoConfig?.hostUri isn't reliably
// populated the way it is in Expo Go on a phone -- there's no native
// manifest fetch step. But a browser always knows its own address bar
// host, and that IS the same LAN IP (or localhost) Metro is serving the
// page from, so it's just as good a signal as hostUri is on native.
function resolveApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (__DEV__ && hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8000`;
  }
  if (__DEV__ && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';
}

export const API_BASE_URL = resolveApiBaseUrl();
