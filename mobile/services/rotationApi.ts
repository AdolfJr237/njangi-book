import { apiRequest } from '@/services/apiClient';

// Mirrors backend/app/schemas/rotation.py's RotationMemberStatus and
// RotationScheduleOut.
export type RotationMemberStatus = {
  membership_id: number;
  name: string;
  rotation_position: number | null;
  status: 'done' | 'current' | 'pending';
  collected_date: string | null;
};

export type RotationSchedule = {
  cycle_number: number;
  round_number: number;
  member_count: number;
  pot_amount: number;
  members: RotationMemberStatus[];
};

export function getRotationSchedule(groupId: string, token: string) {
  return apiRequest<RotationSchedule>(`/groups/${groupId}/rotation`, { token });
}
