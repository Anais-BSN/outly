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
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;
  private isConnecting: boolean = false;

  public connect(userId: string): void {
    if (this.currentUserId === userId && this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    this.disconnect();
    this.currentUserId = userId;
    this.initEventSource();
  }

  private initEventSource(): void {
    if (!this.currentUserId || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const url = `/api/events?userId=${encodeURIComponent(this.currentUserId)}&stream=true`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        console.debug('[Realtime] Flux SSE connecté avec succès pour', this.currentUserId);
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
        // EventSource tente automatiquement de se reconnecter, mais on sécurise
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (this.currentUserId) {
        this.initEventSource();
      }
    }, 3000);
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
