import { dealerSocketService } from './dealerSocketService';
import api from './api';

export interface OrderChatMessage {
  id: string;
  orderId: string;
  sender: 'consumer' | 'dealer';
  senderName: string;
  text: string;
  timestamp: string;
  formattedTime: string;
}

export const formatChatTime = (
  timestamp?: string | Date | number,
  fallbackTime?: string
): string => {
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return fallbackTime || '';
};

type MessageListener = (messages: OrderChatMessage[]) => void;

class OrderChatService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<MessageListener>> = new Map();
  private socketCleanups: Map<string, () => void> = new Map();
  private pollingTimers: Map<string, any> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('scrapwala_order_chat');
        this.channel.onmessage = (event) => {
          const msg: OrderChatMessage = event.data;
          if (msg && msg.orderId) {
            this.handleIncomingMessage(msg);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('scrapwala_chat_')) {
          const orderId = e.key.replace('scrapwala_chat_', '');
          this.notifyListeners(orderId);
        }
      });
    }
  }

  private getStorageKey(orderId: string): string {
    return `scrapwala_chat_${orderId}`;
  }

  public getMessages(orderId: string): OrderChatMessage[] {
    if (typeof window === 'undefined' || !orderId) return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey(orderId));
      if (!raw) {
        const initTime = new Date(Date.now() - 3 * 60 * 1000);
        const defaultMessages: OrderChatMessage[] = [
          {
            id: `msg_init_${orderId}`,
            orderId,
            sender: 'dealer',
            senderName: 'Dealer Partner',
            text: 'Hello! I am on the way with a certified digital scale. Please keep your scrap ready at the doorstep.',
            timestamp: initTime.toISOString(),
            formattedTime: formatChatTime(initTime),
          },
        ];
        this.saveMessages(orderId, defaultMessages);
        return defaultMessages;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((m: OrderChatMessage) => ({
          ...m,
          formattedTime: formatChatTime(m.timestamp, m.formattedTime),
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  private saveMessages(orderId: string, messages: OrderChatMessage[]): void {
    if (typeof window === 'undefined' || !orderId) return;
    try {
      localStorage.setItem(this.getStorageKey(orderId), JSON.stringify(messages));
    } catch (err) {
      console.warn('Failed to persist chat messages to localStorage:', err);
    }
  }

  public async syncFromServer(orderId: string): Promise<void> {
    if (!orderId) return;
    try {
      const res = await api.get(`/orders/${orderId}/chat`);
      if (res.data && Array.isArray(res.data.data)) {
        const serverMsgs: any[] = res.data.data;
        if (serverMsgs.length > 0) {
          const current = this.getMessages(orderId);
          let changed = false;

          for (const sm of serverMsgs) {
            const rawTime = sm.timestamp || new Date().toISOString();
            const formatted: OrderChatMessage = {
              id: sm.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              orderId,
              sender: sm.sender,
              senderName: sm.senderName || '',
              text: sm.text,
              timestamp: rawTime,
              formattedTime: formatChatTime(rawTime, sm.formattedTime),
            };

            const existingIdx = current.findIndex(
              (m) => m.id === formatted.id || (m.text === formatted.text && m.sender === formatted.sender)
            );
            if (existingIdx === -1) {
              current.push(formatted);
              changed = true;
            } else {
              // Ensure existing message has accurate time
              if (
                current[existingIdx].formattedTime !== formatted.formattedTime ||
                current[existingIdx].timestamp !== formatted.timestamp
              ) {
                current[existingIdx].formattedTime = formatted.formattedTime;
                current[existingIdx].timestamp = formatted.timestamp;
                changed = true;
              }
            }
          }

          if (changed) {
            this.saveMessages(orderId, current);
            this.notifyListeners(orderId);
          }
        }
      }
    } catch (err) {
      // Server sync fallback silent
    }
  }

  public sendMessage(
    orderId: string,
    sender: 'consumer' | 'dealer',
    senderName: string,
    text: string
  ): OrderChatMessage {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Message cannot be empty');
    }

    const now = new Date();
    const message: OrderChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      orderId,
      sender,
      senderName,
      text: cleanText,
      timestamp: now.toISOString(),
      formattedTime: formatChatTime(now),
    };

    // 1. Optimistically save to local storage & notify current listeners
    const current = this.getMessages(orderId);
    current.push(message);
    this.saveMessages(orderId, current);
    this.notifyListeners(orderId);

    // 2. Broadcast across tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('BroadcastChannel postMessage error:', err);
      }
    }

    // 3. Emit via Socket.IO
    try {
      const socket = dealerSocketService.connect();
      if (socket) {
        socket.emit('order:chat:send', message);
      }
    } catch (err) {
      console.warn('Dealer socket chat emission fallback warning:', err);
    }

    // 4. Persist to MongoDB backend and trigger cross-app sync
    api.post(`/orders/${orderId}/chat`, { text: cleanText, senderName }).catch((err) => {
      console.warn('Backend dealer chat persistence warning:', err.message);
    });

    return message;
  }

  private handleIncomingMessage(msg: OrderChatMessage): void {
    const current = this.getMessages(msg.orderId);
    const existingIdx = current.findIndex(
      (m) => m.id === msg.id || (m.text === msg.text && m.sender === msg.sender)
    );
    const processedMsg: OrderChatMessage = {
      ...msg,
      formattedTime: formatChatTime(msg.timestamp, msg.formattedTime),
    };

    if (existingIdx === -1) {
      current.push(processedMsg);
      this.saveMessages(msg.orderId, current);
    } else {
      current[existingIdx] = {
        ...current[existingIdx],
        ...processedMsg,
      };
      this.saveMessages(msg.orderId, current);
    }
    this.notifyListeners(msg.orderId);
  }

  private notifyListeners(orderId: string): void {
    const orderListeners = this.listeners.get(orderId);
    if (orderListeners && orderListeners.size > 0) {
      const updatedMessages = this.getMessages(orderId);
      orderListeners.forEach((listener) => {
        try {
          listener(updatedMessages);
        } catch (err) {
          console.error('Error in chat message listener:', err);
        }
      });
    }
  }

  public subscribe(orderId: string, listener: MessageListener): () => void {
    if (!this.listeners.has(orderId)) {
      this.listeners.set(orderId, new Set());
    }
    this.listeners.get(orderId)!.add(listener);

    // 1. Provide cached messages immediately
    listener(this.getMessages(orderId));

    // 2. Fetch server history right away
    this.syncFromServer(orderId);

    // 3. Connect socket listener
    if (!this.socketCleanups.has(orderId)) {
      try {
        const socket = dealerSocketService.connect();
        if (socket) {
          const onMsg = (data: any) => {
            if (data && data.orderId === orderId) {
              const rawTime = data.timestamp || new Date().toISOString();
              this.handleIncomingMessage({
                id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                orderId: data.orderId,
                sender: data.sender || 'consumer',
                senderName: data.senderName || 'Customer',
                text: data.text || '',
                timestamp: rawTime,
                formattedTime: formatChatTime(rawTime, data.formattedTime),
              });
            }
          };
          socket.on('order:chat:message', onMsg);
          this.socketCleanups.set(orderId, () => {
            socket.off('order:chat:message', onMsg);
          });
        }
      } catch (err) {
        console.warn('Socket chat subscription warning:', err);
      }
    }

    // 4. Polling timer every 2500ms to guarantee real-time delivery across different devices/browsers
    if (!this.pollingTimers.has(orderId)) {
      const timer = setInterval(() => {
        this.syncFromServer(orderId);
      }, 2500);
      this.pollingTimers.set(orderId, timer);
    }

    return () => {
      const set = this.listeners.get(orderId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(orderId);

          const cleanup = this.socketCleanups.get(orderId);
          if (cleanup) {
            cleanup();
            this.socketCleanups.delete(orderId);
          }

          const timer = this.pollingTimers.get(orderId);
          if (timer) {
            clearInterval(timer);
            this.pollingTimers.delete(orderId);
          }
        }
      }
    };
  }
}

export const orderChatService = new OrderChatService();
