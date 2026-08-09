import { Stack } from 'expo-router';

// Flat Stack for everything inside a group. The five primary screens
// (home, contributions, funds, members, more) and the detail screens
// reached from them (loan-detail, member-detail, etc.) are all plain
// Stack.Screens now -- each renders its own CustomTabBar,
// switching between the five primary tabs with router.replace and
// pushing into detail screens with router.push. This replaced an
// earlier attempt at hiding detail screens inside a Tabs navigator,
// which didn't reliably support navigating to the same screen twice.
// record-contribution/record-welfare-entry/add-fine stay modal
// presentations with no tab bar, matching their Figma mockups.
export default function GroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="contributions" />
      <Stack.Screen name="funds" />
      <Stack.Screen name="members" />
      <Stack.Screen name="more" />
      <Stack.Screen name="my-contributions" />
      <Stack.Screen name="rotation-schedule" />
      <Stack.Screen name="loans" />
      <Stack.Screen name="loan-detail" />
      <Stack.Screen name="fines" />
      <Stack.Screen name="member-detail" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="group-settings" />
      <Stack.Screen name="record-contribution" options={{ presentation: 'modal' }} />
      <Stack.Screen name="record-welfare-entry" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-fine" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
