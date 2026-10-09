import Pusher, { Channel } from 'pusher-js';
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
    const pusherKey = (import.meta as any).env?.VITE_PUSHER_KEY;
    const pusherCluster = (import.meta as any).env?.VITE_PUSHER_CLUSTER || 'eu';

    if (pusherKey && !pusherKey.includes('ton_key')) {
      try {
        this.pusher = new Pusher(pusherKey, {
          cluster: pusherCluster,
          forceTLS: true,
        });

        this.pusher.connection.bind('connected', () => {
          this.isPusherActive = true;
          console.debug('[Realtime:Pusher] Connecté avec succès au cluster', pusherCluster);
        });

        this.pusher.connection.bind('error', (err: any) => {
          console.warn('[Realtime:Pusher] Avertissement connexion Pusher:', err);
        });

        this.pusher.connection.bind('disconnected', () => {
          this.isPusherActive = false;
        });
      } catch (err) {
        console.error('[Realtime:Pusher] Erreur initialisation Pusher:', err);
        this.isPusherActive = false;
      }
    } else {
      console.debug('[Realtime] Clés Pusher non configurées, bascule sur flux temps réel standard');
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined' || this.networkListenersAttached) return;

    window.addEventListener('online', () => {
      console.debug('[Realtime] Réseau rétabli (online)');
      this.reconnectAttempts = 0;
      if (this.pusher && this.pusher.connection.state !== 'connected') {
        this.pusher.connect();
      }
      if (!this.isPusherActive) {
        this.reconnectImmediately();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (this.pusher && this.pusher.connection.state !== 'connected') {
          this.pusher.connect();
        }
        if (!this.isPusherActive && (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED)) {
          this.reconnectAttempts = 0;
          this.reconnectImmediately();
        }
      }
    });

    this.networkListenersAttached = true;
  }

  public connect(userId: string): void {
    if (this.currentUserId === userId) {
      return;
    }

    this.currentUserId = userId;

    // 1. Abonnement au canal utilisateur Pusher
    if (this.pusher) {
      if (this.userChannel) {
        this.pusher.unsubscribe(`user-${this.currentUserId}`);
      }
      const userChannelName = `user-${userId}`;
      this.userChannel = this.pusher.subscribe(userChannelName);
      
      this.userChannel.bind_global((eventName: string, data: any) => {
        if (eventName.startsWith('pusher:')) return;
        const normalizedEvent: RealtimeEvent = {
          type: data?.type || eventName,
          groupId: data?.groupId,
          userId: data?.userId || userId,
          data: data?.data !== undefined ? data.data : data,
          timestamp: data?.timestamp || new Date().toISOString(),
        };
        this.notifyListeners(normalizedEvent);
      });
    }

    // 2. Flux SSE de secours si Pusher n'est pas actif
    if (!this.isPusherActive) {
      this.disconnectSSE();
      this.initEventSource();
    }
  }

  public setActiveGroup(groupId: string): void {
    if (this.currentGroupId === groupId) return;

    // Désabonnement propre du groupe précédent
    if (this.pusher && this.activeGroupChannel && this.currentGroupId) {
      this.pusher.unsubscribe(`group-${this.currentGroupId}`);
      this.activeGroupChannel = null;
    }

    this.currentGroupId = groupId;

    if (!groupId || !this.pusher) return;

    // Abonnement au canal dédié du nouveau groupe
    const groupChannelName = `group-${groupId}`;
    this.activeGroupChannel = this.pusher.subscribe(groupChannelName);

    this.activeGroupChannel.bind_global((eventName: string, data: any) => {
      if (eventName.startsWith('pusher:')) return;
      const normalizedEvent: RealtimeEvent = {
        type: data?.type || eventName,
        groupId: data?.groupId || groupId,
        userId: data?.userId,
        data: data?.data !== undefined ? data.data : data,
        timestamp: data?.timestamp || new Date().toISOString(),
      };
      this.notifyListeners(normalizedEvent);
    });
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

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: RealtimeEvent): void {
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
