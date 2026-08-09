import { apiRequest } from '@/services/apiClient';

export type MeetingFrequency = 'every_two_days' | 'weekly' | 'biweekly' | 'monthly';

// Mirrors backend/app/schemas/group.py's GroupOut -- same fields, same
// names, since this is exactly the JSON the backend sends back.
export type Group = {
  id: number;
  name: string;
  contribution_amount: number;
  meeting_frequency: MeetingFrequency;
  start_date: string;
  invite_code: string;
  created_at: string;
};

type CreateGroupPayload = {
  name: string;
  contributionAmount: number;
  meetingFrequency: MeetingFrequency;
  /** 'YYYY-MM-DD' -- what a JS Date.toISOString().split('T')[0] gives you,
   * and what FastAPI's `date` type parses on the other end. */
  startDate: string;
};

export function createGroup(payload: CreateGroupPayload, token: string) {
  return apiRequest<Group>('/groups', {
    method: 'POST',
    token,
    body: {
      name: payload.name,
      contribution_amount: payload.contributionAmount,
      meeting_frequency: payload.meetingFrequency,
      start_date: payload.startDate,
    },
  });
}

// Mirrors backend/app/schemas/group.py's GroupSummary -- the Dashboard's
// group cards, one per group the logged-in user belongs to.
export type GroupSummary = {
  id: number;
  name: string;
  contribution_amount: number;
  invite_code: string;
  collector_name: string | null;
  next_due_date: string | null;
  my_role: 'treasurer' | 'member';
};

export function listMyGroups(token: string) {
  return apiRequest<GroupSummary[]>('/groups', { token });
}

export function getGroup(groupId: string, token: string) {
  return apiRequest<Group>(`/groups/${groupId}`, { token });
}

export function joinGroup(inviteCode: string, token: string) {
  return apiRequest<Group>('/groups/join', {
    method: 'POST',
    token,
    body: { invite_code: inviteCode },
  });
}

// Mirrors backend/app/schemas/group.py's GroupHomeOut -- powers the
// Group Home hub (whose turn, this cycle's pot, the caller's own
// standing). No welfare field on purpose -- see the backend schema's
// docstring for why.
export type GroupHome = {
  id: number;
  name: string;
  contribution_amount: number;
  cycle_number: number;
  collecting_date: string | null;
  collector_name: string | null;
  collector_position: number | null;
  total_pot_this_cycle: number;
  has_paid_this_cycle: boolean;
  my_role: 'treasurer' | 'member';
};

export function getGroupHome(groupId: string, token: string) {
  return apiRequest<GroupHome>(`/groups/${groupId}/home`, { token });
}
