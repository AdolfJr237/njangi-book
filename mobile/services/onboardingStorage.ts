import AsyncStorage from '@react-native-async-storage/async-storage';

// CLAUDE.md: onboarding is "first install only." This is a separate
// flag from the auth token -- a logged-out user who already saw
// onboarding once (then logged out, or never finished signing up)
// shouldn't see the intro cards again, they should land on Login.
const ONBOARDING_SEEN_KEY = 'njangibook_has_seen_onboarding';

export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
  return value === 'true';
}

export function markOnboardingSeen() {
  return AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
}
