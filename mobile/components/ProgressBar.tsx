import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ProgressBarProps = {
  /** 0 to 1 */
  progress: number;
  /** Defaults to the success/green color; loans use amber/red/green
   * depending on status, contributions always use green. */
  color?: string;
};

export function ProgressBar({ progress, color }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.track, { backgroundColor: colors.border }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color ?? colors.success }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
