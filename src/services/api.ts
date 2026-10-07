import { Capacitor } from '@capacitor/core';
import {
  UserProfile,
  Friend,
  Group,
  GroupMember,
  EventItem,
  ChatMessage,
  Poll,
  GalleryItem,
  LogisticsTask,
  Expense,
  DebtSettlement,
  AppNotification,
} from '../types';

/**
 * URL de base absolue officielle de l'API de production Outlys
 */
export const PROD_API_BASE = 'https://www.outlys.fr/api';
export const PROD_HOST_BASE = 'https://www.outlys.fr';

/**
 * Résout dynamiquement l'URL de base des endpoints API :
 * - Sur mobile natif (Capacitor Android / iOS) et production -> STRICTEMENT 'https://www.outlys.fr/api'
 * - Si import.meta.env.VITE_API_URL est défini -> `${VITE_API_URL}/api`
 * - Dans tous les cas, renvoie une URL absolue complète pour éviter tout appel vers localhost
 */
export const getApiBaseUrl = (): string => {
  // 1. Mobile natif Capacitor (Android / iOS) -> STRICTEMENT l'API de production
  if (Capacitor.isNativePlatform()) {
    return PROD_API_BASE;
  }

  // 2. Variable d'environnement prioritaire si explicitement définie
  const envApiUrl = (((import.meta as any).env?.VITE_API_URL as string) || '').trim();
  if (envApiUrl) {
    const clean = envApiUrl.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 3. Navigateur web local (localhost / 127.0.0.1) en développement
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
  }

  // 4. URL absolue stricte de production par défaut
  return PROD_API_BASE;
};

/**
 * Résout l'URL de base de l'hôte Outlys (sans /api)
 */
export const getHostBaseUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    return PROD_HOST_BASE;
  }
  const envApiUrl = (((import.meta as any).env?.VITE_API_URL as string) || '').trim();
  if (envApiUrl) {
    return envApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.origin;
    }
  }
  return PROD_HOST_BASE;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const apiBase = getApiBaseUrl();
  let fullUrl: string;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    fullUrl = url;
  } else {
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    fullUrl = `${apiBase}${normalizedPath}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    ...(options?.headers as Record<string, string>),
  };

  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    credentials: 'include',
    ...options,
    headers,
  };

  console.log('[API Call]', fullUrl);

  const response = await fetch(fullUrl, fetchOptions);

  const rawText = await response.text();
  let data: any = null;

  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error(`[API Error] Réponse non-JSON reçue depuis ${fullUrl}:`, rawText.slice(0, 150));
      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status}) : Impossible de joindre l'API Outlys.`);
      }
      throw new Error(`Format de réponse invalide reçu du serveur.`);
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Erreur requête (${response.status})`;
    throw new Error(errorMsg);
  }

  return (data !== null ? data : {}) as T;
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
    const registerUrl = 'https://www.outlys.fr/api/auth/register';
    console.log('[Auth] Initiating register request to:', registerUrl);
    return request<UserProfile>(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  },

  async login(emailOrHandle: string, password?: string): Promise<UserProfile> {
    const loginUrl = 'https://www.outlys.fr/api/auth/login';

    console.log('[Auth] Initiating login request to:', loginUrl);

    return request<UserProfile>(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
    const googleLoginUrl = 'https://www.outlys.fr/api/auth/google';
    console.log('[Auth] Initiating Google login request to:', googleLoginUrl);
    return request<UserProfile>(googleLoginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const forgotUrl = 'https://www.outlys.fr/api/auth/forgot-password';
    console.log('[Auth] Initiating forgot-password request to:', forgotUrl);
    return request<{ success: boolean; message: string }>(forgotUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
  },

  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string; firstName?: string; error?: string }> {
    const verifyUrl = `https://www.outlys.fr/api/auth/verify-reset-token/${encodeURIComponent(token)}`;
    console.log('[Auth] Initiating verify-reset-token request to:', verifyUrl);
    return request<{ valid: boolean; email?: string; firstName?: string; error?: string }>(verifyUrl);
  },

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const resetUrl = 'https://www.outlys.fr/api/auth/reset-password';
    console.log('[Auth] Initiating reset-password request to:', resetUrl);
    return request<{ success: boolean; message: string }>(resetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
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

  async sendBatchFriendRequests(handlesOrEmails: string[], userId: string = 'user-me'): Promise<{ success: boolean; count: number; results: any[] }> {
    return request<{ success: boolean; count: number; results: any[] }>('/friends/invite', {
      method: 'POST',
      body: JSON.stringify({ handlesOrEmails, userId }),
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

  async getGroup(groupId: string): Promise<Group> {
    return request<Group>(`/groups/${groupId}`);
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
    role: string = 'member',
    authorId: string = 'user-me'
  ): Promise<any> {
    return request<any>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role, authorId }),
    });
  },

  async addVirtualMember(
    groupId: string,
    data: { firstName: string; avatar?: string; shares?: number }
  ): Promise<any> {
    return request<any>(`/groups/${groupId}/virtual-member`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async mergeGroupMember(
    groupId: string,
    virtualUserId: string,
    targetUserId: string,
    role: string = 'member'
  ): Promise<any> {
    return request<any>(`/groups/${groupId}/merge-member`, {
      method: 'POST',
      body: JSON.stringify({ virtualUserId, targetUserId, role }),
    });
  },

  async updateGroup(groupId: string, data: Partial<Group> & { authorId?: string }): Promise<Group> {
    return request<Group>(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGroup(groupId: string, authorId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/groups/${groupId}?authorId=${encodeURIComponent(authorId)}`, {
      method: 'DELETE',
    });
  },

  async leaveGroup(groupId: string, userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/groups/${groupId}/members/${userId}?authorId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  async removeGroupMember(groupId: string, userId: string, authorId: string = 'user-me'): Promise<{
    success: boolean;
    demotedToVirtual?: boolean;
    virtualMember?: GroupMember;
    group?: Group;
    expenses?: Expense[];
    settlements?: DebtSettlement[];
  }> {
    return request<{
      success: boolean;
      demotedToVirtual?: boolean;
      virtualMember?: GroupMember;
      group?: Group;
      expenses?: Expense[];
      settlements?: DebtSettlement[];
    }>(`/groups/${groupId}/members/${userId}?authorId=${encodeURIComponent(authorId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ authorId }),
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

  async markGroupMessagesAsRead(groupId: string, userId: string = 'user-me'): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/groups/${encodeURIComponent(groupId)}/messages/read`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
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

  // 9. Organisation & Tâches (ex-Logistique)
  async getTasks(groupId?: string, eventId?: string): Promise<LogisticsTask[]> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (eventId) params.append('eventId', eventId);
    const query = params.toString() ? `?${params.toString()}` : '';
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

  async deleteTask(taskId: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // 10. Partage des Frais & Règlements
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

  async updateExpense(expenseId: string, expenseData: Partial<Expense>): Promise<Expense> {
    return request<Expense>(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
  },

  async deleteExpense(expenseId: string): Promise<{ success: boolean; id: string }> {
    return request<{ success: boolean; id: string }>(`/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  async getSettlements(groupId?: string): Promise<DebtSettlement[]> {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return request<DebtSettlement[]>(`/settlements${query}`);
  },

  async toggleSettlement(data: {
    id?: string;
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    status: 'pending' | 'settled';
  }): Promise<DebtSettlement> {
    return request<DebtSettlement>('/settlements/toggle', {
      method: 'POST',
      body: JSON.stringify(data),
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

  async inviteGroupMembers(
    groupId: string,
    data: {
      emails: string[];
      senderName?: string;
      senderId?: string;
    }
  ): Promise<{ success: boolean; count: number; results?: any[]; invitations?: any[] }> {
    return request(`/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async sendInvitationEmail(data: {
    toEmail?: string;
    emails?: string[];
    senderName?: string;
    groupName?: string;
    inviteLink?: string;
    groupId?: string;
    senderId?: string;
  }): Promise<{ success: boolean; count: number; results?: any[]; invitations?: any[] }> {
    return request('/invitations/send-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInvitationByToken(token: string): Promise<any> {
    return request(`/invitations/${encodeURIComponent(token)}`);
  },

  async getGroupPreview(groupIdOrToken: string): Promise<any> {
    return request(`/groups/preview/${encodeURIComponent(groupIdOrToken)}`);
  },

  async acceptInvitationByToken(token: string, userId: string = 'user-me'): Promise<any> {
    return request(`/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
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

  async registerPushToken(userId: string, token: string, platform?: string): Promise<any> {
    return request('/push/register', {
      method: 'POST',
      body: JSON.stringify({ userId, token, platform }),
    });
  },
};
