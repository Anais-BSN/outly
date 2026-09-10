import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarDrawer } from './components/SidebarDrawer';
import { GroupBanner } from './components/GroupBanner';
import { GroupTabs } from './components/GroupTabs';

// Tabs
import { AgendaTab } from './components/tabs/AgendaTab';
import { DiscussionTab } from './components/tabs/DiscussionTab';
import { SondagesTab } from './components/tabs/SondagesTab';
import { GalerieTab } from './components/tabs/GalerieTab';
import { LogistiqueTab } from './components/tabs/LogistiqueTab';
import { PartageFraisTab } from './components/tabs/PartageFraisTab';

// Modals
import { ProfileModal } from './components/modals/ProfileModal';
import { AuthModal } from './components/modals/AuthModal';
import { CalendarViewModal } from './components/modals/CalendarViewModal';
import { AddFriendsModal } from './components/modals/AddFriendsModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { CreateGroupModal } from './components/modals/CreateGroupModal';
import { CreateEventModal } from './components/modals/CreateEventModal';
import { CreatePollModal } from './components/modals/CreatePollModal';
import { PollTieBreakModal } from './components/modals/PollTieBreakModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { AddTaskModal } from './components/modals/AddTaskModal';
import { ImageViewerModal } from './components/modals/ImageViewerModal';
import { AddGroupMemberModal } from './components/modals/AddGroupMemberModal';
import { ConvertChoicePollModal } from './components/modals/ConvertChoicePollModal';
import { formatDateOnly } from './utils/formatters';

// API Client & Types
import { api } from './services/api';
import {
  TabType,
  UserProfile,
  Group,
  EventItem,
  ChatMessage,
  Poll,
  PollOption,
  GalleryItem,
  LogisticsTask,
  Expense,
  DebtSettlement,
  Friend,
  AppNotification,
  GroupMember,
} from './types';
import { Loader2, RefreshCw, PlusCircle, UserPlus, Users } from 'lucide-react';

export default function App() {
  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Global App States - Default to null for clean unauthenticated state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('agenda');

  // Core PostgreSQL Datasets
  const [events, setEvents] = useState<EventItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [tasks, setTasks] = useState<LogisticsTask[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<DebtSettlement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Modal / View states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddGroupMemberOpen, setIsAddGroupMemberOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [tieBreakPoll, setTieBreakPoll] = useState<Poll | null>(null);
  const [tieBreakOptions, setTieBreakOptions] = useState<PollOption[]>([]);
  const [convertChoiceData, setConvertChoiceData] = useState<{ poll: Poll; winningOption: PollOption | null } | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<GalleryItem | null>(null);
  const [initialEventDate, setInitialEventDate] = useState<string | undefined>(undefined);

  // Dark Mode (strict toggle via profile button, decoupled from prefers-color-scheme)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('outly_theme') === 'dark';
  });

  // Load all data from PostgreSQL Render
  const loadData = useCallback(async (userId?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const activeUserId = userId || localStorage.getItem('outly_user_id');

      // If not logged in, prompt authentication immediately
      if (!activeUserId) {
        setCurrentUser(null);
        setIsAuthOpen(true);
        setIsLoading(false);
        setGroups([]);
        setEvents([]);
        setMessages([]);
        setPolls([]);
        setGalleryItems([]);
        setTasks([]);
        setExpenses([]);
        setFriends([]);
        setNotifications([]);
        return;
      }

      const [
        userRes,
        allUsersRes,
        groupsRes,
        eventsRes,
        messagesRes,
        pollsRes,
        galleryRes,
        tasksRes,
        expensesRes,
        friendsRes,
        notifsRes,
      ] = await Promise.all([
        api.getUser(activeUserId),
        api.getAllUsers().catch(() => []),
        api.getGroups(activeUserId),
        api.getEvents(undefined, activeUserId),
        api.getMessages(),
        api.getPolls(),
        api.getGallery(),
        api.getTasks(),
        api.getExpenses(),
        api.getFriends(activeUserId),
        api.getNotifications(activeUserId),
      ]);

      setCurrentUser(userRes);
      localStorage.setItem('outly_user_id', userRes.id);
      setAllUsers(allUsersRes);
      
      const themeFromDb = userRes.themePreference || (localStorage.getItem('outly_theme') as any) || 'light';
      setIsDarkMode(themeFromDb === 'dark');

      setGroups(groupsRes);
      if (groupsRes.length > 0) {
        setActiveGroupId((prev) => (prev && groupsRes.some((g) => g.id === prev) ? prev : groupsRes[0].id));
      } else {
        setActiveGroupId('');
      }
      setEvents(eventsRes);
      setMessages(messagesRes);
      setPolls(pollsRes);
      setGalleryItems(galleryRes);
      setTasks(tasksRes);
      setExpenses(expensesRes);
      setFriends(friendsRes);
      setNotifications(notifsRes);
    } catch (err: any) {
      console.error('Failed to load data from Render PostgreSQL database:', err);
      if (err.message && (err.message.includes('404') || err.message.includes('introuvable') || err.message.includes('non trouvé'))) {
        localStorage.removeItem('outly_user_id');
        setCurrentUser(null);
        setIsAuthOpen(true);
      } else {
        setLoadError(err.message || 'Impossible de se connecter à la base PostgreSQL Render');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Derived current group & active datasets
  const activeGroup: Group =
    groups.find((g) => g.id === activeGroupId) ||
    groups[0] || {
      id: 'default',
      name: 'Mon Groupe',
      description: '',
      coverImage: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1000&auto=format&fit=crop&q=80',
      members: [],
      createdAt: new Date().toISOString(),
    };

  const groupEvents = events.filter((e) => e.groupId === activeGroupId);
  const groupMessages = messages.filter((m) => m.groupId === activeGroupId);
  const groupPolls = polls.filter((p) => p.groupId === activeGroupId);
  const groupGallery = galleryItems.filter((item) => item.groupId === activeGroupId);
  const groupTasks = tasks.filter((t) => t.groupId === activeGroupId);
  const groupExpenses = expenses.filter((exp) => exp.groupId === activeGroupId);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // Handlers: Auth
  const handleAuthSuccess = (user: UserProfile) => {
    localStorage.setItem('outly_user_id', user.id);
    setCurrentUser(user);
    setIsAuthOpen(false);
    loadData(user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('outly_user_id');
    setCurrentUser(null);
    setIsProfileOpen(false);
    setIsDrawerOpen(false);
    setGroups([]);
    setEvents([]);
    setMessages([]);
    setPolls([]);
    setGalleryItems([]);
    setTasks([]);
    setExpenses([]);
    setFriends([]);
    setNotifications([]);
    setIsAuthOpen(true);
  };

  const handleSwitchUser = (user: UserProfile) => {
    localStorage.setItem('outly_user_id', user.id);
    setCurrentUser(user);
    loadData(user.id);
  };

  // Handlers: RSVP
  const handleRsvpChange = async (eventId: string, status: 'going' | 'maybe' | 'declined') => {
    if (!currentUser) return;
    // Optimistic UI update
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          return {
            ...e,
            rsvp: {
              ...e.rsvp,
              [currentUser.id]: status,
            },
          };
        }
        return e;
      })
    );

    try {
      await api.updateRsvp(eventId, status, currentUser.id);
    } catch (err) {
      console.error('Error updating RSVP in PostgreSQL:', err);
    }
  };

  // Handlers: Chat Message & Emoji Reactions
  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!currentUser || !activeGroupId) return;
    const tempId = `msg-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      groupId: activeGroupId,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      senderAvatar: currentUser.avatar,
      timestamp: new Date().toISOString(),
      text,
      imageUrl,
      readBy: [currentUser.id],
      reactions: [],
    };

    setMessages((prev) => [...prev, newMsg]);

    if (imageUrl) {
      setGalleryItems((prev) => {
        const exists = prev.some((item) => item.imageUrl === imageUrl);
        if (exists) return prev;
        return [
          {
            id: `gal-${Date.now()}`,
            groupId: activeGroupId,
            imageUrl,
            uploaderId: currentUser.id,
            uploaderName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
            uploaderAvatar: currentUser.avatar,
            timestamp: new Date().toISOString(),
            caption: text || 'Photo partagée dans le fil',
          },
          ...prev,
        ];
      });
    }

    try {
      const savedMsg = await api.sendMessage({
        id: tempId,
        groupId: activeGroupId,
        senderId: currentUser.id,
        text,
        imageUrl,
        timestamp: newMsg.timestamp,
        readBy: [currentUser.id],
        reactions: [],
      });
      // Replace with confirmed DB message
      setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
    } catch (err) {
      console.error('Error saving message in PostgreSQL:', err);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    // Optimistic reaction update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        let reactions = [...(msg.reactions || [])];
        const existingGroup = reactions.find((r) => r.emoji === emoji);

        if (existingGroup) {
          if (existingGroup.users.includes(currentUser.id)) {
            existingGroup.users = existingGroup.users.filter((u) => u !== currentUser.id);
          } else {
            existingGroup.users.push(currentUser.id);
          }
        } else {
          reactions.push({ emoji, users: [currentUser.id] });
        }

        reactions = reactions.filter((r) => r.users.length > 0);
        return { ...msg, reactions };
      })
    );

    try {
      await api.toggleMessageReaction(messageId, emoji, currentUser.id);
    } catch (err) {
      console.error('Error toggling reaction in PostgreSQL:', err);
    }
  };

  // Handlers: Poll Vote
  const handleVotePoll = async (
    pollId: string,
    optionId: string,
    status: 'available' | 'unavailable' | 'yes' | 'no' = 'available'
  ) => {
    if (!currentUser) return;
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id === pollId) {
          const updatedOptions = (poll.options || []).map((opt) => {
            if (opt.id === optionId) {
              const currentVotes = opt.votes || [];
              const otherVotes = currentVotes.filter((v) => v.userId !== currentUser.id);
              return {
                ...opt,
                votes: [
                  ...otherVotes,
                  {
                    userId: currentUser.id,
                    userName: currentUser.firstName,
                    userAvatar: currentUser.avatar,
                    status,
                  },
                ],
              };
            }
            return opt;
          });
          return { ...poll, options: updatedOptions };
        }
        return poll;
      })
    );

    try {
      await api.votePoll(pollId, optionId, status, currentUser.id);
    } catch (err) {
      console.error('Error voting in PostgreSQL:', err);
    }
  };

  // Handlers: Convert Poll to Event
  const handleConvertPollToEvent = (poll: Poll, winningOption: PollOption | null, tiedOptions?: PollOption[]) => {
    if (tiedOptions && tiedOptions.length > 1) {
      setTieBreakPoll(poll);
      setTieBreakOptions(tiedOptions);
    } else if (poll.type === 'choice') {
      setConvertChoiceData({ poll, winningOption });
    } else if (winningOption) {
      executeConvertToEvent(poll, winningOption);
    }
  };

  const executeConvertToEvent = async (
    poll: Poll,
    option: PollOption,
    customDates?: { start: string; end?: string; location?: string }
  ) => {
    if (!currentUser) return;

    // 1. Clean Title
    const cleanTitle = poll.type === 'choice' && option.text
      ? `${poll.title} • ${option.text}`
      : poll.title
          .replace(/^(sondage\s*:\s*|sondage\s*-\s*|\[sondage\]\s*)/i, '')
          .replace(/\([^)]*date[^)]*\)/gi, '')
          .replace(/\([^)]*\d{1,2}[\/\-\.\s]\d{1,2}[^)]*\)/gi, '')
          .trim() || poll.title;

    // 2. Exact target start and end dates
    let startDateTime: string;
    let endDateTime: string | undefined;

    if (customDates) {
      startDateTime = customDates.start;
      endDateTime = customDates.end || customDates.start;
    } else if (option.startDate || option.dateValue) {
      startDateTime = option.startDate || option.dateValue!;
      endDateTime = option.endDate || option.endDateValue || startDateTime;
    } else {
      const matched = option.text.match(/\d{4}-\d{2}-\d{2}/);
      const targetDate = matched ? matched[0] : new Date().toISOString().split('T')[0];
      startDateTime = `${targetDate}T09:00:00.000Z`;
      endDateTime = startDateTime;
    }

    const newEventData: Partial<EventItem> = {
      groupId: poll.groupId,
      title: cleanTitle,
      startDateTime,
      endDateTime,
      location: customDates?.location || '',
      gpsUrl: customDates?.location ? `https://maps.google.com/?q=${encodeURIComponent(customDates.location)}` : undefined,
      description: '',
      bannerImage:
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
      organizerId: currentUser.id,
      organizerName: currentUser.firstName,
      organizerAvatar: currentUser.avatar,
      reminder24h: true,
      rsvp: {
        [currentUser.id]: 'going',
      },
    };

    try {
      const createdEvent = await api.createEvent(newEventData);
      setEvents((prev) => [createdEvent, ...prev]);

      // 3. Single conversion & immediate deletion/archive from PostgreSQL
      await api.deletePoll(poll.id);
      setPolls((prev) => prev.filter((p) => p.id !== poll.id));

      // Close modals
      setTieBreakPoll(null);
      setTieBreakOptions([]);
      setConvertChoiceData(null);

      // Switch to agenda tab
      setActiveTab('agenda');

      const systemMsg: Partial<ChatMessage> = {
        id: `msg-sys-${Date.now()}`,
        groupId: poll.groupId,
        senderId: 'system',
        text: `L'événement "${cleanTitle}" a été planifié pour le ${new Date(startDateTime).toLocaleDateString('fr-FR')} dans l'Agenda.`,
        isSystem: true,
        systemType: 'event',
      };
      const savedMsg = await api.sendMessage(systemMsg);
      setMessages((prev) => [...prev, savedMsg]);
    } catch (err) {
      console.error('Error converting poll to event in PostgreSQL:', err);
    }
  };

  // Handlers: Gallery Upload & Delete
  const handleUploadGalleryImage = async (imageUrl: string, caption?: string) => {
    if (!currentUser || !activeGroupId) return;
    try {
      const newItem = await api.uploadGalleryItem({
        groupId: activeGroupId,
        imageUrl,
        uploaderId: currentUser.id,
        caption,
        timestamp: new Date().toISOString(),
      });
      setGalleryItems((prev) => {
        const exists = prev.some((item) => item.id === newItem.id || item.imageUrl === newItem.imageUrl);
        if (exists) return prev;
        return [newItem, ...prev];
      });
    } catch (err) {
      console.error('Error uploading gallery image in PostgreSQL:', err);
    }
  };

  const handleDeleteGalleryItem = async (item: GalleryItem) => {
    setGalleryItems((prev) => prev.filter((g) => g.id !== item.id));
    try {
      await api.deleteGalleryItem(item.id);
    } catch (err) {
      console.error('Error deleting gallery item in PostgreSQL:', err);
    }
  };

  // Handlers: Tasks
  const handleToggleTaskComplete = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );

    try {
      await api.toggleTaskComplete(taskId);
    } catch (err) {
      console.error('Error toggling task in PostgreSQL:', err);
    }
  };

  const handleClaimTask = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assignedToId: currentUser.id,
              assignedToName: currentUser.firstName,
              assignedToAvatar: currentUser.avatar,
            }
          : t
      )
    );

    try {
      await api.claimTask(taskId, currentUser.id);
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        handleSendMessage(`Je me charge de "${task.title}" (quantité : ${task.quantity}).`);
      }
    } catch (err) {
      console.error('Error claiming task in PostgreSQL:', err);
    }
  };

  const handleUnclaimTask = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assignedToId: null,
              assignedToName: null,
              assignedToAvatar: null,
            }
          : t
      )
    );

    try {
      await api.unclaimTask(taskId);
    } catch (err) {
      console.error('Error unclaiming task in PostgreSQL:', err);
    }
  };

  const handleAddTask = async (taskData: Partial<LogisticsTask>) => {
    try {
      const newTask = await api.createTask({
        groupId: activeGroupId,
        title: taskData.title || 'Nouvelle tâche',
        quantity: taskData.quantity || '1',
        category: taskData.category || 'Matériel',
        assignedToId: taskData.assignedToId || null,
        createdBy: currentUser.id,
      });
      setTasks((prev) => [...prev, newTask]);
      handleSendMessage(`Nouvel objet ajouté à la logistique : "${newTask.title}" (x${newTask.quantity}).`);
    } catch (err) {
      console.error('Error adding task in PostgreSQL:', err);
    }
  };

  // Handlers: Expenses & Settlements
  const handleAddExpense = async (expenseData: Partial<Expense>) => {
    try {
      const newExp = await api.createExpense({
        groupId: activeGroupId,
        title: expenseData.title || 'Dépense',
        amount: expenseData.amount || 0,
        date: expenseData.date || new Date().toISOString().split('T')[0],
        category: expenseData.category || 'Autre',
        paidById: expenseData.paidById || currentUser.id,
        splitMode: 'custom',
        participantIds: expenseData.participantIds || activeGroup.members.map((m) => m.userId || m.id),
        sharesSnapshot: expenseData.sharesSnapshot || {},
      });

      setExpenses((prev) => [newExp, ...prev]);
      handleSendMessage(
        `Nouvelle dépense enregistrée : "${newExp.title}" de ${Number(newExp.amount).toFixed(2)} € par ${newExp.paidByName}.`
      );
    } catch (err) {
      console.error('Error adding expense in PostgreSQL:', err);
    }
  };

  const handleToggleSettlementStatus = (settlement: DebtSettlement) => {
    const isNowSettled = settlement.status !== 'settled';

    setSettlements((prev) => {
      const existing = prev.find((s) => s.id === settlement.id);
      if (existing) {
        return prev.map((s) =>
          s.id === settlement.id ? { ...s, status: isNowSettled ? 'settled' : 'pending' } : s
        );
      }
      return [...prev, { ...settlement, status: isNowSettled ? 'settled' : 'pending' }];
    });

    if (isNowSettled) {
      handleSendMessage(
        `Règlement soldé : ${settlement.fromUserName} a remboursé ${settlement.amount.toFixed(2)} € à ${settlement.toUserName}.`
      );
    }
  };

  // Handlers: Create & Edit & Delete Group
  const handleCreateGroup = async (groupData: Partial<Group>, invitedFriendIds: string[]) => {
    try {
      const newGroup = await api.createGroup(groupData, invitedFriendIds, currentUser?.id || 'user-me');
      setGroups((prev) => [newGroup, ...prev]);
      setActiveGroupId(newGroup.id);
      setActiveTab('agenda');
    } catch (err) {
      console.error('Error creating group in PostgreSQL:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !activeGroupId) return;
    const leavingGroupId = activeGroupId;
    try {
      await api.leaveGroup(leavingGroupId, currentUser.id);
      const remainingGroups = groups.filter((g) => g.id !== leavingGroupId);
      setGroups(remainingGroups);
      if (remainingGroups.length > 0) {
        setActiveGroupId(remainingGroups[0].id);
      } else {
        setActiveGroupId('');
      }
    } catch (err) {
      console.error('Error leaving group in PostgreSQL:', err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroupId) return;
    const groupToDelete = groups.find((g) => g.id === activeGroupId);
    const groupName = groupToDelete?.name || 'ce groupe';
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le groupe "${groupName}" ?`
    );
    if (!confirmDelete) return;

    const groupIdToDelete = activeGroupId;
    const remaining = groups.filter((g) => g.id !== groupIdToDelete);
    setGroups(remaining);
    setActiveGroupId(remaining.length > 0 ? remaining[0].id : '');

    try {
      await api.deleteGroup(groupIdToDelete);
    } catch (err) {
      console.error('Error deleting group in PostgreSQL:', err);
    }
  };

  // Handlers: Create, Edit & Delete Event
  const handleSaveEvent = async (eventData: Partial<EventItem>) => {
    if (!currentUser) return;
    try {
      if (eventData.id) {
        // Edit existing event
        const updated = await api.updateEvent(eventData.id, eventData);
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        handleSendMessage(`L'événement "${updated.title}" a été modifié.`);
      } else {
        // Create new event
        const newEvent = await api.createEvent({
          ...eventData,
          groupId: activeGroupId,
          organizerId: currentUser.id,
        });
        setEvents((prev) => [newEvent, ...prev]);
        handleSendMessage(
          `Nouvel événement programmé : "${newEvent.title}" pour le ${new Date(newEvent.startDateTime).toLocaleDateString('fr-FR')}.`
        );
      }
      setEditingEvent(null);
    } catch (err) {
      console.error('Error saving event in PostgreSQL:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const deletedEvent = events.find((e) => e.id === eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await api.deleteEvent(eventId);
      if (deletedEvent) {
        handleSendMessage(`L'événement "${deletedEvent.title}" a été supprimé.`);
      }
    } catch (err) {
      console.error('Error deleting event in PostgreSQL:', err);
    }
  };

  // Handlers: Polls
  const handleCreatePoll = async (pollData: Partial<Poll>) => {
    if (!currentUser) return;
    try {
      const newPoll = await api.createPoll({
        ...pollData,
        groupId: activeGroupId,
        createdBy: currentUser.id,
      });
      setPolls((prev) => [newPoll, ...prev]);
      handleSendMessage(`Nouveau sondage ouvert : "${newPoll.title}".`);
    } catch (err) {
      console.error('Error creating poll in PostgreSQL:', err);
    }
  };

  const handleUpdatePoll = async (pollId: string, pollData: Partial<Poll>) => {
    try {
      const updated = await api.updatePoll(pollId, pollData);
      setPolls((prev) => prev.map((p) => (p.id === pollId ? updated : p)));
      setEditingPoll(null);
    } catch (err) {
      console.error('Error updating poll in PostgreSQL:', err);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
    try {
      await api.deletePoll(pollId);
    } catch (err) {
      console.error('Error deleting poll in PostgreSQL:', err);
    }
  };

  // Handlers: Friends
  const handleSendFriendRequest = async (handleOrEmail: string) => {
    try {
      const newFriend = await api.sendFriendRequest(handleOrEmail, currentUser?.id || 'user-me');
      setFriends((prev) => {
        const existing = prev.filter((f) => f.id !== newFriend.id);
        return [newFriend, ...existing];
      });
      return newFriend;
    } catch (err: any) {
      console.error('Error sending friend request in PostgreSQL:', err);
      throw err;
    }
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    if (!currentUser) return;
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, status: 'accepted' as const } : f))
    );
    try {
      await api.acceptFriendRequest(friendId, currentUser.id);
      const updatedFriends = await api.getFriends(currentUser.id);
      setFriends(updatedFriends);
    } catch (err) {
      console.error('Error accepting friend request in PostgreSQL:', err);
    }
  };

  const handleDeclineFriendRequest = async (friendId: string) => {
    if (!currentUser) return;
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    try {
      await api.declineFriendRequest(friendId, currentUser.id);
    } catch (err) {
      console.error('Error declining friend request in PostgreSQL:', err);
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    if (!currentUser) return;
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    try {
      await api.deleteFriend(friendId, currentUser.id);
    } catch (err) {
      console.error('Error deleting friend in PostgreSQL:', err);
    }
  };

  // Handlers: Profile Save
  const handleSaveProfile = async (updated: UserProfile) => {
    setCurrentUser(updated);
    setIsDarkMode(updated.themePreference === 'dark');

    // Update members profile representation in local groups
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        members: g.members.map((m) =>
          m.userId === updated.id || m.id === updated.id
            ? {
                ...m,
                name: `${updated.firstName} ${updated.lastName}`.trim(),
                avatar: updated.avatar,
                shares: updated.shares,
              }
            : m
        ),
      }))
    );

    try {
      await api.updateUser(updated.id, updated);
    } catch (err) {
      console.error('Error saving profile in PostgreSQL:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    try {
      await api.deleteUser(currentUser.id);
      localStorage.removeItem('outly_user_id');
      localStorage.removeItem('outly_auth_token');
      setCurrentUser(null);
      setGroups([]);
      setEvents([]);
      setMessages([]);
      setPolls([]);
      setGalleryItems([]);
      setTasks([]);
      setExpenses([]);
      setFriends([]);
      setNotifications([]);
      setIsAuthOpen(true);
    } catch (err) {
      console.error('Error deleting account in PostgreSQL:', err);
    }
  };

  // Notifications
  const handleMarkAllNotifsAsRead = async () => {
    if (!currentUser) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead(currentUser.id);
    } catch (err) {
      console.error('Error marking notifications read in PostgreSQL:', err);
    }
  };

  const handleMarkNotifAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await api.markNotificationRead(id);
    } catch (err) {
      console.error('Error marking notification read in PostgreSQL:', err);
    }
  };

  const handleDismissNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.dismissNotification(id);
    } catch (err) {
      console.error('Error dismissing notification in PostgreSQL:', err);
    }
  };

  const isUserInActiveGroup =
    Boolean(activeGroup) &&
    Boolean(currentUser) &&
    activeGroup.members?.some(
      (m) => m.userId === currentUser?.id || m.id === currentUser?.id
    );

  const tabBadges = {
    agenda: groupEvents.length,
    discussion: 0,
    sondages: groupPolls.length,
    galerie: groupGallery.length,
    logistique: groupTasks.filter((t) => !t.completed).length,
    partage_frais: 0,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connexion à PostgreSQL Render</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chargement en direct de vos données Outly...</p>
        </div>
      </div>
    );
  }

  if (loadError && groups.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl max-w-md text-center">
          <h3 className="font-semibold text-lg mb-2">Erreur de connexion à la base de données</h3>
          <p className="text-sm">{loadError}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9EB] dark:bg-[#18181B] text-[#27272A] dark:text-[#FFF9EB] flex flex-col font-sans transition-colors duration-200">
      {/* 1. Header Fixe */}
      <Header
        currentUser={currentUser}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenSearchFriends={() => setIsFriendsOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotifsCount}
      />

      {/* 2. Menu Burger / Lateral Drawer */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUser={currentUser}
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={(id) => {
          setActiveGroupId(id);
          setIsDrawerOpen(false);
        }}
        onOpenProfile={() => {
          setIsDrawerOpen(false);
          setIsProfileOpen(true);
        }}
        onOpenCalendar={() => {
          setIsDrawerOpen(false);
          setIsCalendarOpen(true);
        }}
        onOpenAddFriends={() => {
          setIsDrawerOpen(false);
          setIsFriendsOpen(true);
        }}
        onOpenNotifications={() => {
          setIsDrawerOpen(false);
          setIsNotificationsOpen(true);
        }}
        onOpenCreateGroup={() => {
          setIsDrawerOpen(false);
          setIsCreateGroupOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pt-2 pb-24">
        {!currentUser ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E8D8C4] flex items-center justify-center animate-pulse text-[#6D2932] mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#6D2932] dark:text-zinc-300">
              Veuillez vous connecter pour accéder à votre espace Outly.
            </p>
          </div>
        ) : groups.length === 0 || !activeGroupId || !isUserInActiveGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto my-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#E8D8C4] dark:bg-[#27272A] flex items-center justify-center text-[#6D2932] dark:text-amber-300 shadow-sm border border-[#C7B7A3]/50">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-serif text-[#6D2932] dark:text-[#FFF9EB] mb-1.5">
                Bienvenue sur Outly, {currentUser.firstName} !
              </h3>
              <p className="text-xs sm:text-sm text-[#27272A]/80 dark:text-zinc-300 leading-relaxed">
                Vous ne faites partie d'aucun groupe actif pour le moment. Créez un nouveau groupe pour organiser vos sorties entre amis ou demandez à vos proches de vous inviter !
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
              <button
                id="empty-state-btn-create-group"
                onClick={() => setIsCreateGroupOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#6D2932] text-[#FFF9EB] text-xs font-bold hover:bg-[#541C24] transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Créer un groupe</span>
              </button>
              <button
                id="empty-state-btn-add-friends"
                onClick={() => setIsFriendsOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#E8D8C4] dark:bg-zinc-800 text-[#27272A] dark:text-[#FFF9EB] text-xs font-bold hover:bg-[#C7B7A3] transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-[#C7B7A3]/50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Ajouter des amis</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 3. Group Cover Banner */}
            <GroupBanner
              group={activeGroup}
              currentUser={currentUser}
              onInviteMember={() => setIsAddGroupMemberOpen(true)}
              onOpenInviteModal={() => setIsAddGroupMemberOpen(true)}
              onLeaveGroup={handleLeaveGroup}
              onDeleteGroup={handleDeleteGroup}
            />

            {/* 4. Group Tabs */}
            <GroupTabs activeTab={activeTab} onTabChange={setActiveTab} badges={tabBadges} />

            {/* 5. Active Tab View */}
            <div className="flex-1">
              {activeTab === 'agenda' && (
                <AgendaTab
                  events={groupEvents}
                  currentUser={currentUser}
                  members={activeGroup.members}
                  groupId={activeGroupId}
                  onOpenCreateEvent={(date?: string) => {
                    setEditingEvent(null);
                    setInitialEventDate(date);
                    setIsCreateEventOpen(true);
                  }}
                  onOpenCalendarView={() => setIsCalendarOpen(true)}
                  onRsvp={handleRsvpChange}
                  onEditEvent={(event) => {
                    setEditingEvent(event);
                    setInitialEventDate(undefined);
                    setIsCreateEventOpen(true);
                  }}
                  onDeleteEvent={handleDeleteEvent}
                />
              )}

              {activeTab === 'discussion' && (
                <DiscussionTab
                  messages={groupMessages}
                  currentUser={currentUser}
                  members={activeGroup.members}
                  onSendMessage={handleSendMessage}
                  onAddReaction={handleAddReaction}
                />
              )}

              {activeTab === 'sondages' && (
                <SondagesTab
                  polls={groupPolls}
                  currentUser={currentUser}
                  members={activeGroup.members}
                  onOpenCreatePoll={() => {
                    setEditingPoll(null);
                    setIsCreatePollOpen(true);
                  }}
                  onVoteOption={handleVotePoll}
                  onConvertPollToEvent={handleConvertPollToEvent}
                  onEditPoll={(poll) => {
                    setEditingPoll(poll);
                    setIsCreatePollOpen(true);
                  }}
                  onDeletePoll={handleDeletePoll}
                />
              )}

              {activeTab === 'galerie' && (
                <GalerieTab
                  galleryItems={groupGallery}
                  currentUser={currentUser}
                  members={activeGroup.members}
                  onUploadImage={handleUploadGalleryImage}
                  onViewImage={(item) => setViewingImage(item)}
                />
              )}

              {activeTab === 'logistique' && (
                <LogistiqueTab
                  tasks={groupTasks}
                  currentUser={currentUser}
                  members={activeGroup.members}
                  onOpenAddTask={() => setIsAddTaskOpen(true)}
                  onToggleComplete={handleToggleTaskComplete}
                  onClaimTask={handleClaimTask}
                  onUnclaimTask={handleUnclaimTask}
                />
              )}

              {activeTab === 'partage_frais' && (
                <PartageFraisTab
                  expenses={groupExpenses}
                  currentUser={currentUser}
                  members={activeGroup.members}
                  settlements={settlements}
                  onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                  onToggleSettlementStatus={handleToggleSettlementStatus}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* 6. All Interactive Application Modals */}
      {/* Auth Modal (Inscription & Connexion & Google OAuth) */}
      <AuthModal
        isOpen={isAuthOpen || !currentUser}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        canClose={Boolean(currentUser)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser || {
          id: 'temp',
          firstName: 'Invité',
          lastName: '',
          email: '',
          handle: '@invite',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          shares: 1,
          themePreference: 'light',
        }}
        availableUsers={allUsers}
        onSaveProfile={handleSaveProfile}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Aggregated Calendar Modal */}
      {currentUser && (
        <CalendarViewModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          allEvents={events}
          groups={groups}
          currentUser={currentUser}
          onSelectGroupFromEvent={(groupId) => {
            setActiveGroupId(groupId);
            setActiveTab('agenda');
          }}
        />
      )}

      {/* Add Friends Modal */}
      {currentUser && (
        <AddFriendsModal
          isOpen={isFriendsOpen}
          onClose={() => setIsFriendsOpen(false)}
          friends={friends}
          currentUser={currentUser}
          onSendFriendRequest={handleSendFriendRequest}
          onAcceptFriendRequest={handleAcceptFriendRequest}
          onDeclineFriendRequest={handleDeclineFriendRequest}
          onDeleteFriend={handleDeleteFriend}
        />
      )}

      {/* Add Group Member Modal (Dedicated to the active group) */}
      {currentUser && (
        <AddGroupMemberModal
          isOpen={isAddGroupMemberOpen}
          onClose={() => setIsAddGroupMemberOpen(false)}
          group={activeGroup}
          currentUser={currentUser}
          friends={friends}
          onMemberAdded={(newMember) => {
            setGroups((prev) =>
              prev.map((g) =>
                g.id === activeGroupId
                  ? { ...g, members: [...(g.members || []), newMember] }
                  : g
              )
            );
          }}
        />
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        groups={groups}
        onMarkAllAsRead={handleMarkAllNotifsAsRead}
        onMarkAsRead={handleMarkNotifAsRead}
        onDismissNotification={handleDismissNotification}
        onSelectGroupFromNotif={(groupId) => {
          setActiveGroupId(groupId);
        }}
        onOpenAddFriends={() => setIsFriendsOpen(true)}
      />

      {/* Create Group Modal */}
      {currentUser && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          friends={friends}
          currentUser={currentUser}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* Create / Edit Event Modal */}
      {currentUser && (
        <CreateEventModal
          isOpen={isCreateEventOpen}
          onClose={() => {
            setIsCreateEventOpen(false);
            setEditingEvent(null);
            setInitialEventDate(undefined);
          }}
          currentUser={currentUser}
          groupId={activeGroupId}
          initialEvent={editingEvent}
          initialDate={initialEventDate}
          onCreateEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      {/* Create / Edit Poll Modal */}
      {currentUser && (
        <CreatePollModal
          isOpen={isCreatePollOpen}
          onClose={() => {
            setIsCreatePollOpen(false);
            setEditingPoll(null);
          }}
          currentUser={currentUser}
          groupId={activeGroupId}
          onCreatePoll={handleCreatePoll}
          initialPoll={editingPoll}
          onUpdatePoll={handleUpdatePoll}
        />
      )}

      {/* Poll Tie Break Modal */}
      <PollTieBreakModal
        isOpen={Boolean(tieBreakPoll)}
        onClose={() => {
          setTieBreakPoll(null);
          setTieBreakOptions([]);
        }}
        poll={tieBreakPoll}
        tiedOptions={tieBreakOptions}
        onConfirmSelection={(chosenOption) => {
          if (tieBreakPoll) {
            executeConvertToEvent(tieBreakPoll, chosenOption);
          }
        }}
      />

      {/* Convert Choice Poll to Event Modal */}
      {convertChoiceData && (
        <ConvertChoicePollModal
          isOpen={Boolean(convertChoiceData)}
          onClose={() => setConvertChoiceData(null)}
          poll={convertChoiceData.poll}
          winningOption={convertChoiceData.winningOption}
          onConfirm={(startDateIso, endDateIso, location) => {
            if (convertChoiceData.winningOption) {
              executeConvertToEvent(
                convertChoiceData.poll,
                convertChoiceData.winningOption,
                { start: startDateIso, end: endDateIso, location }
              );
            }
          }}
        />
      )}

      {/* Add Expense Modal */}
      {currentUser && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          currentUser={currentUser}
          members={activeGroup.members}
          groupId={activeGroupId}
          onAddExpense={handleAddExpense}
        />
      )}

      {/* Add Task Modal */}
      {currentUser && (
        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          currentUser={currentUser}
          members={activeGroup.members}
          groupId={activeGroupId}
          onAddTask={handleAddTask}
        />
      )}

      {/* Full-Screen Image Viewer Modal */}
      <ImageViewerModal
        item={viewingImage}
        onClose={() => setViewingImage(null)}
        onDeleteImage={handleDeleteGalleryItem}
        currentUser={currentUser || undefined}
        members={activeGroup.members}
      />
    </div>
  );
}
