export type TabType = 'agenda' | 'discussion' | 'sondages' | 'galerie' | 'logistique' | 'partage_frais';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  handle: string; // @pseudo
  avatar: string;
  shares: number; // 1 to 20
  themePreference: 'light' | 'dark';
}

export interface Friend {
  id: string;
  firstName: string;
  lastName: string;
  handle: string;
  email: string;
  avatar: string;
  shares: number;
  status: 'accepted' | 'pending_sent' | 'pending_received';
}

export interface GroupMember {
  id: string;
  userId?: string;
  name?: string;
  firstName: string;
  lastName: string;
  handle: string;
  avatar: string;
  shares: number;
  role: 'admin' | 'member';
}

export interface Group {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  members: GroupMember[];
  createdAt: string;
}

export type RSVPStatus = 'going' | 'maybe' | 'cant_go';

export interface EventItem {
  id: string;
  groupId: string;
  title: string;
  startDateTime: string; // ISO string
  endDateTime?: string; // ISO string
  location: string;
  gpsUrl?: string;
  description: string;
  bannerImage?: string;
  organizerId: string;
  organizerName: string;
  organizerAvatar: string;
  rsvp: Record<string, RSVPStatus>; // userId -> status
  reminder24h: boolean;
}

export interface EmojiReaction {
  emoji: string;
  users: string[]; // userIds
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: string; // ISO string
  text?: string;
  imageUrl?: string;
  readBy: string[]; // userIds
  reactions: EmojiReaction[];
  isSystem?: boolean;
  systemType?: 'event' | 'poll' | 'task' | 'settlement' | 'expense' | 'member_joined' | 'member_left';
}

export interface PollVote {
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'available' | 'unavailable' | 'yes' | 'no';
}

export interface PollOption {
  id: string;
  text: string;
  dateValue?: string; // start ISO string or date
  endDateValue?: string; // end ISO string or date
  startDate?: string; // start ISO string
  endDate?: string; // end ISO string
  votes: PollVote[];
}

export interface Poll {
  id: string;
  groupId: string;
  title: string;
  type: 'date' | 'choice';
  description?: string;
  createdBy: string;
  creatorName: string;
  creatorAvatar: string;
  createdAt: string;
  options: PollOption[];
  isClosed?: boolean;
  convertedEventId?: string;
}

export interface GalleryItem {
  id: string;
  groupId: string;
  imageUrl: string;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar: string;
  caption?: string;
  timestamp: string;
}

export type TaskCategory = 'Matériel' | 'Nourriture' | 'Organisation' | 'Autre';

export interface LogisticsTask {
  id: string;
  groupId: string;
  title: string;
  quantity: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedToAvatar: string | null;
  completed: boolean;
  category: TaskCategory;
  createdBy: string;
  createdAt: string;
}

export type ExpenseCategory = 'Restaurant' | 'Courses' | 'Transport' | 'Logement' | 'Activités' | 'Autre';

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidById: string;
  paidByName: string;
  paidByAvatar: string;
  category: ExpenseCategory;
  date: string;
  splitMode: 'all' | 'custom';
  participantIds: string[];
  sharesSnapshot: Record<string, number>; // userId -> shares at expense time
  createdAt: string;
}

export interface DebtSettlement {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  toUserName: string;
  toUserAvatar: string;
  amount: number;
  status: 'pending' | 'settled';
}

export type NotificationType = 'reminder' | 'invite' | 'chat' | 'expense' | 'poll' | 'task' | 'rsvp';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  groupId?: string;
  eventId?: string;
}
