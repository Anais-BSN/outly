import Pusher, { Channel } from 'pusher-js';
import { App as CapacitorApp } from '@capacitor/app';
import { getApiBaseUrl } from './api';

export interface RealtimeEvent {
  type: string;
  groupId?: string;
  userId?: string;
  data?: any;
  timestamp?: string;
}

type EventListener = (event: RealtimeEvent) => void;

class RealtimeService {
  private pusher: Pusher | null = null;
  private userChannel: Channel | null = null;
  private activeGroupChannel: Channel | null = null;
  private globalChannel: Channel | null = null;
  private currentGroupId: string | null = null;
  private currentUserId: string | null = null;

  private eventSource: EventSource | null = null;
  private listeners: Set<EventListener> = new Set();
  private reconnectTimeout: any = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private networkListenersAttached: boolean = false;
  private isPusherActive: boolean = false;

  constructor() {
    this.setupNetworkListeners();
    this.initPusher();
  }

  private initPusher(): void {
    const PUSHER_HARDCODED_KEY = 'ffb22ce4e830df75afc1';
    const PUSHER_HARDCODED_CLUSTER = 'eu';

    const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUSHER_KEY) || '';
    const envCluster = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUSHER_CLUSTER) || '';

    const pusherKey = (envKey && !envKey.includes('ton_key')) ? envKey : PUSHER_HARDCODED_KEY;
    const pusherCluster = envCluster || PUSHER_HARDCODED_CLUSTER;

    if (pusherKey) {
      try {
        this.pusher = new Pusher(pusherKey, {
          cluster: pusherCluster,
          forceTLS: true,
          enabledTransports: ['ws', 'wss', 'xhr_streaming', 'xhr_polling', 'sockjs'],
          activityTimeout: 60000,
          pongTimeout: 30000,
        });

        // Diagnostic et écouteur des changements d'état de connexion Pusher
        this.pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
          console.debug(`[Realtime:Pusher] État de connexion: ${states.previous} -> ${states.current}`);
          if (states.current === 'connected') {
            this.isPusherActive = true;
            this.reconnectAttempts = 0;
            if (this.currentUserId) {
              this.ensureUserChannel(this.currentUserId);
            }
            if (this.currentGroupId) {
              this.ensureGroupChannel(this.currentGroupId);
            }
          } else if (states.current === 'disconnected' || states.current === 'unavailable' || states.current === 'failed') {
            this.isPusherActive = false;
            console.warn(`[Realtime:Pusher] Connexion interrompue (${states.current}), tentative de reconnexion immédiate...`);
            setTimeout(() => {
              if (this.pusher && (this.pusher.connection.state === 'disconnected' || this.pusher.connection.state === 'unavailable' || this.pusher.connection.state === 'failed')) {
                this.pusher.connect();
              }
            }, 500);
          }
        });

        this.pusher.connection.bind('connected', () => {
          this.isPusherActive = true;
          console.debug('[Realtime:Pusher] Connecté avec succès au cluster', pusherCluster);
          if (this.currentUserId) {
            this.ensureUserChannel(this.currentUserId);
          }
          if (this.currentGroupId) {
            this.ensureGroupChannel(this.currentGroupId);
          }
        });

        this.pusher.connection.bind('error', (err: any) => {
          console.warn('[Realtime:Pusher] Avertissement connexion Pusher:', err);
        });

        this.pusher.connection.bind('disconnected', () => {
          this.isPusherActive = false;
        });

        // Abonnement au canal global pour tous les événements partagés
        const globalCh = this.pusher.channel('global') || this.pusher.subscribe('global');
        this.globalChannel = globalCh;
        try {
          (globalCh as any).unbind_global?.();
        } catch (_) {}
        globalCh.bind_global((eventName: string, data: any) => {
          if (eventName.startsWith('pusher:') || eventName === 'outlys-event') return;
          const normalizedEvent: RealtimeEvent = {
            type: data?.type || eventName,
            groupId: data?.groupId,
            userId: data?.userId,
            data: data?.data !== undefined ? data.data : data,
            timestamp: data?.timestamp || new Date().toISOString(),
          };
          this.notifyListeners(normalizedEvent);
        });
      } catch (err) {
        console.error('[Realtime:Pusher] Erreur initialisation Pusher:', err);
        this.isPusherActive = false;
      }
    } else {
      console.debug('[Realtime] Clés Pusher non configurées, bascule sur flux temps réel standard');
    }
  }

  private ensureUserChannel(userId: string): void {
    if (!this.pusher || !userId) return;
    const cleanUserId = String(userId).trim();
    const userChannelName = `user-${cleanUserId}`;
    let ch = this.pusher.channel(userChannelName);
    if (!ch) {
      ch = this.pusher.subscribe(userChannelName);
    }
    this.userChannel = ch;
    try {
      (ch as any).unbind_global?.();
    } catch (_) {}
    ch.bind_global((eventName: string, data: any) => {
      if (eventName.startsWith('pusher:') || eventName === 'outlys-event') return;
      const normalizedEvent: RealtimeEvent = {
        type: data?.type || eventName,
        groupId: data?.groupId,
        userId: data?.userId || cleanUserId,
        data: data?.data !== undefined ? data.data : data,
        timestamp: data?.timestamp || new Date().toISOString(),
      };
      this.notifyListeners(normalizedEvent);
    });
  }

  private ensureGroupChannel(groupId: string): void {
    if (!this.pusher || !groupId) return;
    const cleanGroupId = String(groupId).trim();
    const groupChannelName = `group-${cleanGroupId}`;
    let ch = this.pusher.channel(groupChannelName);
    if (!ch) {
      ch = this.pusher.subscribe(groupChannelName);
    }
    this.activeGroupChannel = ch;
    try {
      (ch as any).unbind_global?.();
    } catch (_) {}
    ch.bind_global((eventName: string, data: any) => {
      if (eventName.startsWith('pusher:') || eventName === 'outlys-event') return;
      const normalizedEvent: RealtimeEvent = {
        type: data?.type || eventName,
        groupId: data?.groupId || cleanGroupId,
        userId: data?.userId,
        data: data?.data !== undefined ? data.data : data,
        timestamp: data?.timestamp || new Date().toISOString(),
      };
      this.notifyListeners(normalizedEvent);
    });
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined' || this.networkListenersAttached) return;

    const handleAppResume = () => {
      console.debug('[Realtime:Capacitor] Reprise application (reconnexion Pusher)');
      if (this.pusher) {
        const state = this.pusher.connection.state;
        if (state !== 'connected' && state !== 'connecting') {
          this.pusher.connect();
        }
      }
      if (this.currentUserId) {
        this.ensureUserChannel(this.currentUserId);
      }
      if (this.currentGroupId) {
        this.ensureGroupChannel(this.currentGroupId);
      }
      if (!this.isPusherActive) {
        this.reconnectImmediately();
      }
    };

    // Écouteur natif Capacitor pour reprise d'activité au premier plan sur mobile Android/iOS
    try {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          handleAppResume();
        }
      }).catch(() => {});

      CapacitorApp.addListener('resume', () => {
        handleAppResume();
      }).catch(() => {});
    } catch (_) {}

    window.addEventListener('online', () => {
      console.debug('[Realtime] Réseau rétabli (online)');
      this.reconnectAttempts = 0;
      handleAppResume();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleAppResume();
      }
    });

    this.networkListenersAttached = true;
  }

  public connect(userId: string): void {
    if (!userId) return;

    if (this.currentUserId === userId) {
      if (this.pusher) {
        this.ensureUserChannel(userId);
      }
      return;
    }

    if (this.currentUserId && this.pusher && this.userChannel) {
      this.pusher.unsubscribe(`user-${this.currentUserId}`);
      this.userChannel = null;
    }

    this.currentUserId = userId;

    // 1. Abonnement au canal utilisateur personnel Pusher
    if (this.pusher) {
      this.ensureUserChannel(userId);
    }

    // 2. Flux SSE de secours si Pusher n'est pas actif
    if (!this.isPusherActive) {
      this.disconnectSSE();
      this.initEventSource();
    }
  }

  public setActiveGroup(groupId: string): void {
    if (this.currentGroupId === groupId) {
      if (groupId && this.pusher) {
        this.ensureGroupChannel(groupId);
      }
      return;
    }

    // Désabonnement propre du groupe précédent
    if (this.pusher && this.activeGroupChannel && this.currentGroupId) {
      this.pusher.unsubscribe(`group-${this.currentGroupId}`);
      this.activeGroupChannel = null;
    }

    this.currentGroupId = groupId;

    if (!groupId || !this.pusher) return;

    this.ensureGroupChannel(groupId);
  }

  private initEventSource(): void {
    if (!this.currentUserId || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const apiBase = getApiBaseUrl();
      const url = `${apiBase}/events/stream?userId=${encodeURIComponent(this.currentUserId)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.debug('[Realtime:SSE] Flux connecté avec succès');
      };

      this.eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data === ':ping') return;
          const parsed: RealtimeEvent = JSON.parse(e.data);
          this.notifyListeners(parsed);
        } catch (err) {
          console.debug('[Realtime] Erreur de parsing événement:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private reconnectImmediately(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.currentUserId) {
      this.disconnectSSE();
      this.isConnecting = false;
      this.initEventSource();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    const delay = Math.min(8000, 1000 * Math.pow(1.8, Math.min(this.reconnectAttempts, 4)));
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (this.currentUserId && !this.isPusherActive) {
        this.initEventSource();
      }
    }, delay);
  }

  private disconnectSSE(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public disconnect(): void {
    if (this.pusher) {
      if (this.userChannel && this.currentUserId) {
        this.pusher.unsubscribe(`user-${this.currentUserId}`);
        this.userChannel = null;
      }
      if (this.activeGroupChannel && this.currentGroupId) {
        this.pusher.unsubscribe(`group-${this.currentGroupId}`);
        this.activeGroupChannel = null;
      }
    }

    this.disconnectSSE();
    this.currentUserId = null;
    this.currentGroupId = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  private seenEventKeys: Map<string, number> = new Map();

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: RealtimeEvent): void {
    // Évite les doublons d'événements reçus quasi-simultanément (ex: SSE + Pusher ou triggers multiples)
    const now = Date.now();
    const eventIdentifier = event.data?.id || event.data?.messageId || event.data?.eventId || event.data?.pollId || event.data?.optionId || '';
    const dedupeKey = `${event.type}:${event.groupId || ''}:${eventIdentifier}`;

    if (dedupeKey.length > 5) {
      const lastSeen = this.seenEventKeys.get(dedupeKey);
      if (lastSeen && now - lastSeen < 1200) {
        return; // Événement identique déjà traité il y a moins de 1,2 seconde
      }
      this.seenEventKeys.set(dedupeKey, now);

      // Nettoyage régulier
      if (this.seenEventKeys.size > 200) {
        for (const [k, timestamp] of this.seenEventKeys.entries()) {
          if (now - timestamp > 5000) {
            this.seenEventKeys.delete(k);
          }
        }
      }
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[Realtime] Erreur dans le listener:', err);
      }
    }
  }
}

export const realtimeService = new RealtimeService();
