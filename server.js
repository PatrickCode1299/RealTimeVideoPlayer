import { WebSocketServer } from 'ws'; // Use WebSocketServer for ES module imports

const wss = new WebSocketServer({
  host:"0.0.0.0",
   port: 8080 }); // Create WebSocket server

let clients = [];

wss.on('connection', (ws) => {
  // Add connected client to clients array
  clients.push(ws);
  console.log("New client connected");

  // Listen for messages from client (streamer/viewer)
  ws.on('message', (message) => {
    // Broadcast incoming message to all clients except the sender
    for (const client of clients) {
      if (client !== ws) {
        client.send(message);
      }
    }
  });

  // When client disconnects, remove them from the clients array
  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
  });
});

console.log('WebSocket server running on ws://localhost:8080');
