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
  private eventSource: EventSource | null = null;
  private listeners: Set<EventListener> = new Set();
  private reconnectTimeout: any = null;
  private currentUserId: string | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private wasConnected: boolean = false;
  private networkListenersAttached: boolean = false;

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined' || this.networkListenersAttached) return;

    window.addEventListener('online', () => {
      console.log('[Realtime] Réseau rétabli (online) - vérification de la connexion');
      this.reconnectAttempts = 0;
      this.reconnectImmediately();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          console.log('[Realtime] Application revenue au premier plan - reconnexion immédiate');
          this.reconnectAttempts = 0;
          this.reconnectImmediately();
        }
      }
    });

    this.networkListenersAttached = true;
  }

  public connect(userId: string): void {
    if (this.currentUserId === userId && this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return;
    }

    this.disconnect();
    this.currentUserId = userId;
    this.reconnectAttempts = 0;
    this.initEventSource();
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
        const hadPriorConnection = this.wasConnected;
        this.wasConnected = true;
        this.reconnectAttempts = 0;
        console.debug('[Realtime] Flux SSE connecté avec succès pour', this.currentUserId, 'sur', url);

        // Si la connexion a été rétablie après une coupure, notifier les composants pour rafraîchir les données
        if (hadPriorConnection) {
          this.notifyListeners({
            type: 'connection:restored',
            userId: this.currentUserId || undefined,
            timestamp: new Date().toISOString(),
          });
        }
      };

      this.eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data === ':ping') return;
          const parsed: RealtimeEvent = JSON.parse(e.data);
          this.notifyListeners(parsed);
        } catch (err) {
          console.debug('[Realtime] Erreur de parsing SSE:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        // Si la connexion est fermée, planifier une reconnexion silencieuse avec backoff exponentiel
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
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.isConnecting = false;
      this.initEventSource();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    // Backoff exponentiel : 1s, 2s, 4s, plafonné à 8s
    const delay = Math.min(8000, 1000 * Math.pow(1.8, Math.min(this.reconnectAttempts, 4)));
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (this.currentUserId) {
        this.initEventSource();
      }
    }, delay);
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentUserId = null;
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
        console.error('[Realtime] Erreur dans le listener SSE:', err);
      }
    }
  }
}

export const realtimeService = new RealtimeService();
