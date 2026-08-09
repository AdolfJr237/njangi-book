import { Stack } from 'expo-router';

// Top level: no bottom bar. Dashboard is a plain stack screen; the
// five-tab bar only exists once you're inside a specific group
// (see group/[groupId]/_layout.tsx).
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="create-group" />
      <Stack.Screen name="join-group" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="group/[groupId]" />
    </Stack>
  );
}
