import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { ScoredMember } from '../data-structures/sorted-set';

export class WebSocketService {
  // Fan-out: one JSON.stringify per score event (O(K) for top-K), then one
  // O(1) send per subscriber — total O(K + S) per update. Chosen: stateful WS
  // push over polling (polling = S clients × 1 req/s of mostly-unchanged data)
  // and over SSE (half-duplex; WS allows future client→server pings/auth
  // refresh). Trade-off: server holds S sockets (memory per conn) and a slow
  // consumer must not block the loop — production adds per-socket backpressure
  // (drop/skip if bufferedAmount > threshold) and Redis pub/sub so N API nodes
  // share one broadcast channel instead of each tracking all S clients.
  private wss: WebSocketServer;
  private subscribers: Set<WebSocket>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/leaderboard' });
    this.subscribers = new Set();

    this.wss.on('connection', (ws: WebSocket) => {
      this.subscribers.add(ws);
      
      ws.on('close', () => {
        this.subscribers.delete(ws);
      });
      
      ws.on('error', () => {
         this.subscribers.delete(ws);
      });
    });
  }

  public broadcastLeaderboard(entries: ScoredMember[]): void {
    const message = JSON.stringify({
      type: 'LEADERBOARD_UPDATE',
      data: entries
    });

    for (const ws of this.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.subscribers.size;
  }
}
