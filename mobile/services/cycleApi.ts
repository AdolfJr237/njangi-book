import { apiRequest } from '@/services/apiClient';

// Mirrors backend/app/schemas/cycle.py's CloseCycleResult.
export type CloseCycleResult = {
  previous_meeting_date: string;
  new_meeting_date: string;
  new_collector_name: string;
  started_new_round: boolean;
  round_number: number;
  unpaid_member_names: string[];
};

// Mirrors backend/app/schemas/cycle.py's ReopenCycleResult.
export type ReopenCycleResult = {
  reopened_meeting_date: string;
  collector_name: string | null;
};

export function closeCycle(groupId: string, token: string) {
  return apiRequest<CloseCycleResult>(`/groups/${groupId}/cycle/close`, {
    method: 'POST',
    token,
  });
}

export function reopenCycle(groupId: string, token: string) {
  return apiRequest<ReopenCycleResult>(`/groups/${groupId}/cycle/reopen`, {
    method: 'POST',
    token,
  });
}
