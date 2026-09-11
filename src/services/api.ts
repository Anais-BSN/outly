import {
  UserProfile,
  Friend,
  Group,
  EventItem,
  ChatMessage,
  Poll,
  GalleryItem,
  LogisticsTask,
  Expense,
  AppNotification,
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // 1. Authentification & Profil Utilisateur
  async getUser(userId: string = 'user-me'): Promise<UserProfile> {
    return request<UserProfile>(`/user/me?userId=${encodeURIComponent(userId)}`);
  },

  async getAllUsers(): Promise<UserProfile[]> {
    return request<UserProfile[]>('/users');
  },

  async checkHandle(handle: string): Promise<{ available: boolean }> {
    return request<{ available: boolean }>(`/auth/check-handle?handle=${encodeURIComponent(handle)}`);
  },

  async register(data: {
    firstName: string;
    lastName?: string;
    email: string;
    handle?: string;
    password?: string;
    avatar?: string;
  }): Promise<UserProfile> {
    return request<UserProfile>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(emailOrHandle: string, password?: string): Promise<UserProfile> {
    return request<UserProfile>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrHandle, password }),
    });
  },

  async loginWithGoogle(data: {
    email: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    googleId?: string;
  }): Promise<UserProfile> {
    return request<UserProfile>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/users/${userId}/password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async updateUser(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return request<UserProfile>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean; userId: string }> {
    return request<{ success: boolean; userId: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // 2. Amis
  async getFriends(userId: string = 'user-me'): Promise<Friend[]> {
    return request<Friend[]>(`/friends?userId=${encodeURIComponent(userId)}`);
  },

  async sendFriendRequest(handleOrEmail: string, userId: string = 'user-me'): Promise<Friend> {
    return request<Friend>('/friends', {
      method: 'POST',
      body: JSON.stringify({ handleOrEmail, userId }),
    });
  },

  async acceptFriendRequest(friendId: string, userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/friends/${friendId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, status: 'accepted' }),
    });
  },

  async declineFriendRequest(friendId: string, userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/friends/${friendId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  async deleteFriend(friendId: string, userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/friends/${friendId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  // 3. Groupes & Membres
  async getGroups(userId?: string): Promise<Group[]> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request<Group[]>(`/groups${query}`);
  },

  async createGroup(
    groupData: Partial<Group>,
    invitedFriendIds: string[],
    creatorId: string = 'user-me'
  ): Promise<Group> {
    return request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify({
        ...groupData,
        creatorId,
        invitedFriendIds,
      }),
    });
  },

  async addGroupMember(
    groupId: string,
    userId: string,
    role: string = 'member'
  ): Promise<any> {
    return request<any>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  async deleteGroup(groupId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  async leaveGroup(groupId: string, userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // 4. Événements & RSVP & Édition
  async getEvents(groupId?: string, userId?: string): Promise<EventItem[]> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (userId) params.append('userId', userId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<EventItem[]>(`/events${query}`);
  },

  async createEvent(eventData: Partial<EventItem>): Promise<EventItem> {
    return request<EventItem>('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  async updateEvent(id: string, eventData: Partial<EventItem>): Promise<EventItem> {
    return request<EventItem>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  async deleteEvent(id: string): Promise<{ success: boolean; eventId: string }> {
    return request<{ success: boolean; eventId: string }>(`/events/${id}`, {
      method: 'DELETE',
    });
  },

  async updateRsvp(eventId: string, status: string, userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/events/${eventId}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify({ userId, status }),
    });
  },

  // 5. Disponibilités style Teams
  async getAvailability(
    groupId: string,
    date?: string
  ): Promise<{
    date: string;
    timeSlots: string[];
    members: Array<{
      memberId: string;
      memberName: string;
      memberAvatar: string;
      slots: Array<{ time: string; status: 'free' | 'busy'; label: string }>;
    }>;
  }> {
    const query = date ? `&date=${encodeURIComponent(date)}` : '';
    return request(`/availability?groupId=${encodeURIComponent(groupId)}${query}`);
  },

  // 6. Messages de Chat & Réactions
  async getMessages(groupId?: string, limit?: number, before?: string): Promise<ChatMessage[]> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (limit) params.append('limit', String(limit));
    if (before) params.append('before', before);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<ChatMessage[]>(`/messages${query}`);
  },

  async sendMessage(msgData: Partial<ChatMessage>): Promise<ChatMessage> {
    return request<ChatMessage>('/messages', {
      method: 'POST',
      body: JSON.stringify(msgData),
    });
  },

  async editMessage(messageId: string, text: string): Promise<ChatMessage> {
    return request<ChatMessage>(`/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  },

  async deleteMessage(messageId: string): Promise<{ success: boolean; id: string; groupId: string }> {
    return request<{ success: boolean; id: string; groupId: string }>(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  async toggleMessageReaction(
    messageId: string,
    emoji: string,
    userId: string = 'user-me'
  ): Promise<{ success: boolean; reactions: any[] }> {
    return request<{ success: boolean; reactions: any[] }>(`/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji, userId }),
    });
  },

  // 7. Sondages & Votes
  async getPolls(groupId?: string): Promise<Poll[]> {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return request<Poll[]>(`/polls${query}`);
  },

  async createPoll(pollData: Partial<Poll>): Promise<Poll> {
    return request<Poll>('/polls', {
      method: 'POST',
      body: JSON.stringify(pollData),
    });
  },

  async updatePoll(pollId: string, pollData: Partial<Poll>): Promise<Poll> {
    return request<Poll>(`/polls/${pollId}`, {
      method: 'PUT',
      body: JSON.stringify(pollData),
    });
  },

  async votePoll(
    pollId: string,
    optionId: string,
    status: 'available' | 'unavailable' | 'yes' | 'no' = 'available',
    userId: string = 'user-me'
  ): Promise<{ success: boolean; votes: any[] }> {
    return request<{ success: boolean; votes: any[] }>(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, status, userId }),
    });
  },

  async deletePoll(pollId: string): Promise<{ success: boolean; pollId: string }> {
    return request<{ success: boolean; pollId: string }>(`/polls/${pollId}`, {
      method: 'DELETE',
    });
  },

  // 8. Galerie Médias
  async getGallery(groupId?: string): Promise<GalleryItem[]> {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return request<GalleryItem[]>(`/gallery${query}`);
  },

  async uploadGalleryItem(itemData: Partial<GalleryItem>): Promise<GalleryItem> {
    return request<GalleryItem>('/gallery', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  async deleteGalleryItem(id: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/gallery/${id}`, {
      method: 'DELETE',
    });
  },

  // 9. Logistique & Tâches
  async getTasks(groupId?: string): Promise<LogisticsTask[]> {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return request<LogisticsTask[]>(`/tasks${query}`);
  },

  async createTask(taskData: Partial<LogisticsTask>): Promise<LogisticsTask> {
    return request<LogisticsTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  async toggleTaskComplete(taskId: string): Promise<{ id: string; completed: boolean }> {
    return request<{ id: string; completed: boolean }>(`/tasks/${taskId}/toggle`, {
      method: 'PUT',
    });
  },

  async claimTask(
    taskId: string,
    userId: string = 'user-me'
  ): Promise<{ id: string; assignedToId: string; assignedToName: string; assignedToAvatar: string }> {
    return request<{ id: string; assignedToId: string; assignedToName: string; assignedToAvatar: string }>(
      `/tasks/${taskId}/claim`,
      {
        method: 'PUT',
        body: JSON.stringify({ userId }),
      }
    );
  },

  async unclaimTask(taskId: string): Promise<{ id: string; assignedToId: null }> {
    return request<{ id: string; assignedToId: null }>(`/tasks/${taskId}/unclaim`, {
      method: 'PUT',
    });
  },

  // 10. Partage des Frais
  async getExpenses(groupId?: string): Promise<Expense[]> {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return request<Expense[]>(`/expenses${query}`);
  },

  async createExpense(expenseData: Partial<Expense>): Promise<Expense> {
    return request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  },

  // 11. Notifications & Resend
  async getNotifications(userId: string = 'user-me'): Promise<AppNotification[]> {
    return request<AppNotification[]>(`/notifications?userId=${encodeURIComponent(userId)}`);
  },

  async markAllNotificationsRead(userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/notifications/read-all', {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  async dismissNotification(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  async sendInvitationEmail(data: {
    toEmail: string;
    senderName: string;
    groupName?: string;
    inviteLink?: string;
  }): Promise<any> {
    return request('/invitations/send-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async sendReminderEmail(data: {
    toEmail: string;
    eventTitle: string;
    startDateTime: string;
    location?: string;
    gpsUrl?: string;
  }): Promise<any> {
    return request('/reminders/send-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
