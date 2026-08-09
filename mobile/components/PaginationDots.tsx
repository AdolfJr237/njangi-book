import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type PaginationDotsProps = {
  total: number;
  activeIndex: number;
};

/** The active dot stretches into a pill; the rest stay small circles --
 * matches the onboarding carousel indicator in the Figma design. */
export function PaginationDots({ total, activeIndex }: PaginationDotsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: isActive ? 20 : 8,
                backgroundColor: isActive ? colors.primary : colors.border,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
