import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage is a simple key-value store that survives app restarts
// (backed by a small file on the device, not memory). It's not
// encrypted -- fine for a JWT, since the token itself is already
// designed to be safe if read (see security.py's comment on
// signed-not-encrypted), but it's the wrong place for anything more
// sensitive later. expo-secure-store would be the upgrade for that.
const TOKEN_KEY = 'njangibook_token';

export function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}
