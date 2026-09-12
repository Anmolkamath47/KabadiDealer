import { DealerProfile } from '../types';

class CrossOriginSyncService {
  private bridgeIframe: HTMLIFrameElement | null = null;
  private isBridgeReady: boolean = false;
  private pendingPayload: any = null;

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
    }
  }

  private getConsumerOrigin(): string {
    if (typeof window === 'undefined') return 'https://kabadiwala-iota.vercel.app';
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5173';
    }
    return 'https://kabadiwala-iota.vercel.app';
  }

  private initBridge() {
    if (typeof document === 'undefined' || this.bridgeIframe) return;

    try {
      const iframe = document.createElement('iframe');
      iframe.id = 'kabadiwala-sync-bridge-frame';
      iframe.style.display = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.src = `${this.getConsumerOrigin()}/sync-bridge.html`;

      iframe.onload = () => {
        this.isBridgeReady = true;
        if (this.pendingPayload) {
          this.sendToBridge(this.pendingPayload);
          this.pendingPayload = null;
        }
      };

      document.body.appendChild(iframe);
      this.bridgeIframe = iframe;
    } catch (err) {
      console.warn('Could not initialize cross-origin sync bridge iframe:', err);
    }
  }

  private sendToBridge(payload: any) {
    if (!this.bridgeIframe?.contentWindow) return;
    try {
      this.bridgeIframe.contentWindow.postMessage(payload, '*');
    } catch (err) {
      console.warn('Cross-origin bridge postMessage failed:', err);
    }
  }

  public syncDealer(dealer: DealerProfile) {
    if (typeof window === 'undefined') return;

    // 1. Same-origin BroadcastChannel (for same origin / localhost)
    try {
      const channel = new BroadcastChannel('kabadiwala_cross_app_sync');
      channel.postMessage({
        type: 'DEALER_SYNC_UPDATE',
        dealer,
        timestamp: Date.now(),
      });
      channel.close();
    } catch {
      // Ignored
    }

    // 2. Same-origin localStorage
    try {
      localStorage.setItem('kabadidealer_dealer', JSON.stringify(dealer));
    } catch {
      // Ignored
    }

    // 3. Cross-origin Vercel Bridge
    const payload = {
      type: 'KABADI_PARTNER_SYNC',
      dealer,
      timestamp: Date.now(),
    };

    if (!this.bridgeIframe) {
      this.pendingPayload = payload;
      this.initBridge();
    } else if (this.isBridgeReady) {
      this.sendToBridge(payload);
    } else {
      this.pendingPayload = payload;
    }
  }
}

export const crossOriginSync = new CrossOriginSyncService();
