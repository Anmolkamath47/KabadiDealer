import { DealerProfile } from '../types';

class CrossOriginSyncService {
  private bridgeIframes: Map<string, HTMLIFrameElement> = new Map();
  private isBridgeReady: boolean = false;
  private pendingPayload: any = null;
  private currentDealer: DealerProfile | null = null;
  private heartbeatTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'KABADI_BRIDGE_READY') {
          this.isBridgeReady = true;
          if (this.pendingPayload) {
            this.sendToBridge(this.pendingPayload);
            this.pendingPayload = null;
          }
        }
      });

      // On window focus or visibility change, immediately re-broadcast dealer state
      window.addEventListener('focus', () => {
        if (this.currentDealer) this.syncDealer(this.currentDealer);
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.currentDealer) {
          this.syncDealer(this.currentDealer);
        }
      });
    }
  }

  private getConsumerOrigins(): string[] {
    const origins = new Set<string>();

    const envConsumerUrl =
      (import.meta as any).env?.VITE_CONSUMER_APP_URL ||
      (import.meta as any).env?.VITE_CLIENT_APP_URL;
    if (envConsumerUrl) origins.add(envConsumerUrl.replace(/\/$/, ''));

    if (typeof window === 'undefined') {
      origins.add('https://scrapwala.vercel.app');
      origins.add('https://kabadiwala-iota.vercel.app');
      return Array.from(origins);
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const queryConsumer = params.get('consumerUrl') || params.get('consumerOrigin');
      if (queryConsumer) origins.add(queryConsumer.replace(/\/$/, ''));
    } catch {}

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      origins.add('http://localhost:5173');
      origins.add('http://127.0.0.1:5173');
      origins.add('http://localhost:5174');
    }
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
      origins.add(`http://${host}:5173`);
    }
    origins.add('https://scrapwala.vercel.app');
    origins.add('https://kabadiwala-iota.vercel.app');

    return Array.from(origins);
  }

  private initBridges() {
    if (typeof document === 'undefined') return;

    const targetOrigins = this.getConsumerOrigins();
    for (const origin of targetOrigins) {
      if (this.bridgeIframes.has(origin)) continue;

      try {
        const iframe = document.createElement('iframe');
        iframe.id = `kabadiwala-sync-bridge-${origin.replace(/[^a-zA-Z0-9]/g, '_')}`;
        iframe.style.display = 'none';
        iframe.setAttribute('aria-hidden', 'true');
        iframe.src = `${origin}/sync-bridge.html`;

        iframe.onload = () => {
          this.isBridgeReady = true;
          if (this.pendingPayload) {
            this.sendToBridge(this.pendingPayload);
            this.pendingPayload = null;
          }
        };

        document.body.appendChild(iframe);
        this.bridgeIframes.set(origin, iframe);
      } catch (err) {
        console.warn(`Could not initialize sync bridge for ${origin}:`, err);
      }
    }
  }

  private sendToBridge(payload: any) {
    for (const iframe of this.bridgeIframes.values()) {
      try {
        iframe.contentWindow?.postMessage(payload, '*');
      } catch (err) {
        console.warn('Cross-origin bridge postMessage failed:', err);
      }
    }
  }

  public syncDealer(dealer: DealerProfile) {
    if (typeof window === 'undefined') return;
    this.currentDealer = dealer;

    // 1. Same-origin BroadcastChannel
    try {
      const channel = new BroadcastChannel('kabadiwala_cross_app_sync');
      channel.postMessage({
        type: 'DEALER_SYNC_UPDATE',
        dealer,
        timestamp: Date.now(),
      });
      channel.close();
    } catch {}

    // 2. Same-origin localStorage
    try {
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(dealer));
    } catch {}

    // 3. Cross-origin Bridge
    const payload = {
      type: 'KABADI_PARTNER_SYNC',
      dealer,
      timestamp: Date.now(),
    };

    if (this.bridgeIframes.size === 0) {
      this.pendingPayload = payload;
      this.initBridges();
    } else {
      this.sendToBridge(payload);
    }

    // 4. Ensure ongoing heartbeat sync every 4s
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        if (this.currentDealer && this.currentDealer.isOnline) {
          const hbPayload = {
            type: 'KABADI_PARTNER_SYNC',
            dealer: this.currentDealer,
            timestamp: Date.now(),
          };
          this.sendToBridge(hbPayload);
        }
      }, 4000);
    }
  }
}

export const crossOriginSync = new CrossOriginSyncService();

