import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

let webSocketServer: WebSocketServer | null = null;

export const initWebSocket = (server: HttpServer): void => {
  try {
    webSocketServer = new WebSocketServer({ server });

    webSocketServer.on('connection', () => {
      console.info('[WS] Client connected');
    });
  } catch (error) {
    console.error('[WS] Failed to initialize WebSocket server', error);
    throw error;
  }
};

export const broadcast = (message: unknown): void => {
  if (!webSocketServer) return;

  let payload: string;

  try {
    payload = JSON.stringify(message);
  } catch (error) {
    console.error('[WS] Failed to serialize message', error);
    return;
  }

  webSocketServer.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};
