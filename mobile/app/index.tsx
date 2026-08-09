import { Redirect } from 'expo-router';

/**
 * The app's real entry point. Every launch starts at Splash, which is
 * where the actual session check happens (see AuthContext + splash.tsx)
 * before deciding whether to land on Dashboard, Login, or Onboarding.
 */
export default function Index() {
  return <Redirect href="/(auth)/splash" />;
}
