import { apiRequest } from '@/services/apiClient';

// Mirrors backend/app/schemas/member.py's MemberRow and MembersListOut.
export type MemberRow = {
  membership_id: number;
  name: string;
  phone_number: string;
  role: 'treasurer' | 'member';
  rotation_position: number | null;
  is_self: boolean;
};

export type MembersList = {
  member_count: number;
  contribution_amount: number;
  meeting_frequency: 'every_two_days' | 'weekly' | 'biweekly' | 'monthly';
  members: MemberRow[];
  my_role: 'treasurer' | 'member';
};

export function getMembers(groupId: string, token: string) {
  return apiRequest<MembersList>(`/groups/${groupId}/members`, { token });
}

export function removeMember(groupId: string, membershipId: number, token: string) {
  return apiRequest<null>(`/groups/${groupId}/members/${membershipId}`, {
    method: 'DELETE',
    token,
  });
}

// Mirrors backend/app/schemas/member.py's TransferTreasurerResult.
export type TransferTreasurerResult = {
  new_treasurer_name: string;
  former_treasurer_name: string;
};

export function transferTreasurer(groupId: string, successorMembershipId: number, token: string) {
  return apiRequest<TransferTreasurerResult>(`/groups/${groupId}/members/transfer-treasurer`, {
    method: 'POST',
    token,
    body: { successor_membership_id: successorMembershipId },
  });
}
