import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Input } from '@/components/Input';
import { InviteCodeCard } from '@/components/InviteCodeCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedChips } from '@/components/SegmentedChips';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/apiClient';
import { createGroup, Group, MeetingFrequency } from '@/services/groupsApi';

const FREQUENCY_OPTIONS: { label: string; value: MeetingFrequency }[] = [
  { label: 'Every 2 days', value: 'every_two_days' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

// FastAPI's `date` type expects 'YYYY-MM-DD' -- toISOString() gives us
// that as the part before the 'T'.
function formatDateForApi(date: Date) {
  return date.toISOString().split('T')[0];
}

type FieldErrors = {
  groupName?: string;
  contributionAmount?: string;
};

export default function CreateGroup() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [frequency, setFrequency] = useState<MeetingFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Once set, we show the success screen (code + copy button) instead
  // of the form -- a native Alert can't hold a custom copy button.
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  // Client-side validation is a UX nicety (fail fast, specific message)
  // -- the backend re-validates everything independently (contribution_amount
  // > 0 is enforced by the Pydantic schema), since the app can be
  // bypassed and the server never trusts client input.
  const validate = () => {
    const errors: FieldErrors = {};
    if (groupName.trim().length === 0) {
      errors.groupName = 'Group name is required';
    }
    const amount = Number(contributionAmount);
    if (!contributionAmount || Number.isNaN(amount) || amount <= 0) {
      errors.contributionAmount = 'Enter a valid contribution amount';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !token) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      const group = await createGroup(
        {
          name: groupName.trim(),
          contributionAmount: Number(contributionAmount),
          meetingFrequency: frequency,
          startDate: formatDateForApi(startDate),
        },
        token
      );

      // Shows the success screen below instead of navigating immediately
      // -- the UX doc's "every successful action gets visible feedback"
      // rule. The code is also fetchable again later from More (via
      // GET /groups/:id), so this isn't the user's only chance to see it.
      setCreatedGroup(group);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdGroup) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <ScreenHeader title="Group Created" />
        <SafeAreaView edges={['bottom']} style={styles.container}>
          <View style={styles.successContent}>
            <View style={[styles.successIconWrap, { backgroundColor: `${colors.success}1A` }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>{createdGroup.name} is ready</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              Share this invite code so others can join
            </Text>

            <InviteCodeCard code={createdGroup.invite_code} />

            <View style={styles.spacer} />

            <Button
              label="Continue to Group"
              onPress={() =>
                router.replace({
                  pathname: '/group/[groupId]/home',
                  params: { groupId: String(createdGroup.id) },
                })
              }
              style={styles.button}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScreenHeader title="Create Group" onBack={() => router.back()} />

      <SafeAreaView edges={['bottom']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Input
              label="Group Name"
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text);
                if (fieldErrors.groupName) setFieldErrors((prev) => ({ ...prev, groupName: undefined }));
              }}
              error={fieldErrors.groupName}
              placeholder="e.g. Famille Béti Réunis"
            />
            <Input
              label="Contribution Amount (XAF)"
              value={contributionAmount}
              onChangeText={(text) => {
                setContributionAmount(text);
                if (fieldErrors.contributionAmount) {
                  setFieldErrors((prev) => ({ ...prev, contributionAmount: undefined }));
                }
              }}
              error={fieldErrors.contributionAmount}
              placeholder="e.g. 25000"
              keyboardType="number-pad"
            />

            <Text style={[styles.label, { color: colors.text }]}>Meeting Frequency</Text>
            <View style={styles.fieldSpacing}>
              <SegmentedChips
                options={FREQUENCY_OPTIONS}
                value={frequency}
                onChange={(value) => setFrequency(value as MeetingFrequency)}
              />
            </View>

            <DateField label="Start Date" value={startDate} onChange={setStartDate} />

            {formError && <Banner message={formError} tone="danger" />}

            <View style={styles.spacer} />

            <Button
              label="Save & Create Group"
              onPress={handleSave}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.button}
            />
            <Button
              label="Cancel"
              variant="outline"
              onPress={() => router.back()}
              disabled={isSubmitting}
              style={styles.button}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  label: {
    fontSize: Typography.size.sm,
    fontFamily: Typography.family.semibold,
    marginBottom: Spacing.sm,
  },
  fieldSpacing: {
    marginBottom: Spacing.xl,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.xxl,
  },
  button: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  successContent: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
  },
  successIconWrap: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    fontSize: Typography.size.md,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
});
