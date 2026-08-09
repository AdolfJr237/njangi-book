import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type PrimaryTab = 'home' | 'contributions' | 'funds' | 'members' | 'more';

const TABS: { key: PrimaryTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'contributions', label: 'Contrib.', icon: 'book' },
  { key: 'funds', label: 'Funds', icon: 'folder' },
  { key: 'members', label: 'Members', icon: 'people' },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' },
];

type CustomTabBarProps = {
  groupId: string;
  /** Which of the five pills to highlight. Detail screens (Loan Detail,
   * Rotation Schedule, etc.) pass whichever primary tab they logically
   * belong under, even though they aren't one of the five themselves. */
  activeTab: PrimaryTab;
};

/**
 * A floating pill tab bar rendered directly by each screen -- not by a
 * React Navigation Tabs navigator. We tried registering every screen
 * (detail screens included) inside one Tabs navigator so this bar would
 * "come for free," but Tab Navigators don't reliably support repeated
 * push/pop between many screens the way a Stack does -- switching to
 * the same tab a second time could silently no-op. A plain component
 * backed by real Stack navigation (router.replace between the five
 * primary tabs, router.push into detail screens) is more code per
 * screen, but it's the version that actually works on repeat visits.
 */
export function CustomTabBar({ groupId, activeTab }: CustomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = (tab: PrimaryTab) => {
    if (tab === activeTab) return;
    // Typed routes needs a literal pathname per destination -- a
    // computed template string can't be matched against the union type.
    switch (tab) {
      case 'home':
        router.replace({ pathname: '/group/[groupId]/home', params: { groupId } });
        break;
      case 'contributions':
        router.replace({ pathname: '/group/[groupId]/contributions', params: { groupId } });
        break;
      case 'funds':
        router.replace({ pathname: '/group/[groupId]/funds', params: { groupId } });
        break;
      case 'members':
        router.replace({ pathname: '/group/[groupId]/members', params: { groupId } });
        break;
      case 'more':
        router.replace({ pathname: '/group/[groupId]/more', params: { groupId } });
        break;
    }
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + Spacing.sm }]}>
      <View style={[styles.pill, { backgroundColor: colors.primary }]}>
        {TABS.map((tab) => {
          const isFocused = tab.key === activeTab;
          return (
            <Pressable key={tab.key} onPress={() => handlePress(tab.key)} style={styles.tab}>
              <View style={[styles.iconCircle, isFocused && { backgroundColor: colors.primaryLight }]}>
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={isFocused ? colors.white : 'rgba(255,255,255,0.55)'}
                />
              </View>
              <Text style={[styles.label, { color: isFocused ? colors.white : 'rgba(255,255,255,0.55)' }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: Typography.family.medium,
  },
});
