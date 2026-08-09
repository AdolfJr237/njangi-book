import { apiRequest } from '@/services/apiClient';

// Mirrors backend/app/schemas/contribution.py's LedgerMemberStatus and
// ContributionsLedgerOut.
export type LedgerMemberStatus = {
  membership_id: number;
  name: string;
  has_paid: boolean;
  paid_date: string | null;
  amount: number | null;
  // The specific Contribution row backing has_paid -- targets the exact
  // row to reverse without a second lookup. Null when has_paid is false.
  contribution_id: number | null;
};

// Mirrors backend/app/schemas/contribution.py's ReversalEntry -- one
// correction that happened in a given meeting, shown separately from
// the member grid so it reads as "recorded, then corrected."
export type ReversalEntry = {
  original_contribution_id: number;
  member_name: string;
  amount: number;
  original_paid_date: string;
  reversed_by_name: string;
  reversed_at: string;
  reason: string | null;
};

export type ContributionsLedger = {
  meeting_id: number | null;
  meeting_date: string | null;
  round_number: number;
  // False when browsing a past cycle -- hides the Record Contribution
  // FAB and the Close Cycle prompt on a read-only historical view.
  is_current_cycle: boolean;
  contribution_amount: number;
  total_expected: number;
  total_collected: number;
  paid_count: number;
  member_count: number;
  // Server-computed (paid_count === member_count) -- never derive this
  // in the app; CLAUDE.md says the app displays state, it doesn't
  // compute ledger truth locally.
  ready_to_close: boolean;
  members: LedgerMemberStatus[];
  reversals: ReversalEntry[];
  my_role: 'treasurer' | 'member';
};

// Mirrors backend/app/schemas/contribution.py's MeetingSummary -- one
// entry per real cycle this group has ever had, powers a cycle picker.
export type MeetingSummary = {
  id: number;
  cycle_number: number;
  round_number: number;
  meeting_date: string;
  status: 'scheduled' | 'completed' | 'voided';
};

export function getContributionsLedger(groupId: string, token: string, meetingId?: number) {
  const query = meetingId !== undefined ? `?meeting_id=${meetingId}` : '';
  return apiRequest<ContributionsLedger>(`/groups/${groupId}/contributions${query}`, { token });
}

export function getMeetings(groupId: string, token: string) {
  return apiRequest<MeetingSummary[]>(`/groups/${groupId}/contributions/meetings`, { token });
}

export function recordContribution(
  groupId: string,
  payerMembershipId: number,
  token: string,
  meetingId?: number
) {
  return apiRequest<{ status: string }>(`/groups/${groupId}/contributions`, {
    method: 'POST',
    token,
    body: {
      payer_membership_id: payerMembershipId,
      ...(meetingId !== undefined ? { meeting_id: meetingId } : {}),
    },
  });
}

// Mirrors backend/app/schemas/contribution.py's MyContributionEntry,
// OutstandingEntry, and MyContributionsOut -- the caller's OWN payment
// history in this group, not the full member-by-member Ledger.
export type MyContributionEntry = {
  id: number;
  cycle_number: number;
  meeting_date: string;
  amount: number;
  paid_date: string;
  recorded_by_name: string;
  // True only on a correcting entry itself.
  is_reversal: boolean;
  // True on an original entry that has since been reversed -- still
  // shown in history, just no longer counted anywhere.
  reversed: boolean;
};

export type OutstandingEntry = {
  meeting_id: number;
  cycle_number: number;
  round_number: number;
  meeting_date: string;
  amount: number;
};

export type MyContributions = {
  payments_count: number;
  total_paid: number;
  outstanding_amount: number;
  outstanding: OutstandingEntry[];
  history: MyContributionEntry[];
  // The VIEWER's own role, not the target member's -- gates whether
  // "Record now" shows on someone else's outstanding list.
  my_role: 'treasurer' | 'member';
};

export function getMyContributions(groupId: string, token: string) {
  return apiRequest<MyContributions>(`/groups/${groupId}/contributions/mine`, { token });
}

// Same shape as getMyContributions, for any OTHER member -- powers
// Member Detail's outstanding list and late-settlement action.
export function getMemberContributions(groupId: string, membershipId: number, token: string) {
  return apiRequest<MyContributions>(`/groups/${groupId}/contributions/member/${membershipId}`, { token });
}

export type ReverseContributionResult = {
  reversal_contribution_id: number;
  member_name: string;
  amount: number;
};

// Additive correction -- never edits or deletes contributionId's row.
// Adds a second, equal-and-opposite row that cancels its effect while
// both stay visible in the ledger forever.
export function reverseContribution(
  groupId: string,
  contributionId: number,
  token: string,
  reason?: string
) {
  return apiRequest<ReverseContributionResult>(`/groups/${groupId}/contributions/${contributionId}/reverse`, {
    method: 'POST',
    token,
    body: { reason: reason || null },
  });
}
