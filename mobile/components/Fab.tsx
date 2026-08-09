import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type FabProps = {
  onPress?: () => void;
};

/**
 * Treasurer-only record button. Per CLAUDE.md, recording actions never
 * get their own tab -- they show up as this FAB on Contributions and
 * Funds instead, floating above the pill tab bar.
 */
export function Fab({ onPress }: FabProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.fab,
        { backgroundColor: colors.primary, bottom: insets.bottom + 84 },
      ]}
    >
      <Ionicons name="add" size={26} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
