import { Response } from 'express';

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

  constructor() {
    // Keepalive ping every 25 seconds to prevent timeout
    this.pingInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
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
