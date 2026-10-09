import { Response } from 'express';
import Pusher from 'pusher';
import dotenv from 'dotenv';

dotenv.config();

export interface RealtimeEvent {
  type: string;
  groupId?: string;
  userId?: string;
  data?: any;
  timestamp?: string;
}

interface Subscriber {
  id: string;
  userId?: string;
  groupId?: string;
  res: Response;
}

class EventBroadcaster {
  private subscribers: Map<string, Subscriber> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private pusher: Pusher | null = null;

  constructor() {
    this.initPusher();
    // Keepalive ping every 25 seconds to prevent timeout for SSE subscribers
    this.pingInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  private initPusher(): void {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || 'eu';

    if (appId && key && secret && !appId.includes('ton_app_id')) {
      try {
        this.pusher = new Pusher({
          appId,
          key,
          secret,
          cluster,
          useTLS: true,
        });
        console.log('[Pusher] Initialisé avec succès sur le cluster', cluster);
      } catch (err: any) {
        console.error('[Pusher] Erreur lors de l\'initialisation:', err?.message || err);
      }
    } else {
      console.log('[Pusher] Clés non définies ou par défaut, fallback SSE actif');
    }
  }

  public addSubscriber(id: string, res: Response, userId?: string, groupId?: string): void {
    this.subscribers.set(id, { id, res, userId, groupId });
  }

  public removeSubscriber(id: string): void {
    this.subscribers.delete(id);
  }

  private sendHeartbeat(): void {
    const data = `:ping\n\n`;
    for (const [id, sub] of this.subscribers.entries()) {
      try {
        sub.res.write(data);
      } catch (err) {
        this.subscribers.delete(id);
      }
    }
  }

  public broadcast(event: RealtimeEvent): void {
    const payload = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    // 1. Diffusion via Pusher Channels (si configuré)
    if (this.pusher) {
      const channels: string[] = [];
      if (event.groupId) {
        channels.push(`group-${event.groupId}`);
      }
      if (event.userId) {
        channels.push(`user-${event.userId}`);
      }
      if (channels.length === 0) {
        channels.push('global');
      }

      // Émission sur les canaux ciblés avec le nom de l'événement exact (ex: message:created, poll:voted)
      this.pusher.trigger(channels, event.type, payload).catch((err: any) => {
        console.warn('[Pusher] Erreur lors de l\'émission de l\'événement:', err?.message || err);
      });

      // Émission également sur le canal générique de l'application
      if (!channels.includes('global') && !channels.includes(`user-${event.userId}`)) {
        this.pusher.trigger(channels, 'outlys-event', payload).catch(() => {});
      }
    }

    // 2. Diffusion via SSE (flux résilient / fallback)
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    for (const [id, sub] of this.subscribers.entries()) {
      try {
        // If event targets a specific user and subscriber has different userId, skip
        if (event.userId && sub.userId && event.userId !== sub.userId) {
          continue;
        }
        sub.res.write(message);
      } catch (err) {
        this.subscribers.delete(id);
      }
    }
  }
}

export const realtimeBroadcaster = new EventBroadcaster();
