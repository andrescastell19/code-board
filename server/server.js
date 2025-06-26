const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { VM } = require('vm2');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const SECRET = 'clave_super_secreta';

app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const users = {
  admin: bcrypt.hashSync('12345', 8),
  dev: bcrypt.hashSync('12345', 8)
};

let currentCode = '';
let adminEditing = false;

app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  if (users[user] && bcrypt.compareSync(pass, users[user])) {
    const token = jwt.sign({ user }, SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true }).json({ success: true, user }); // Agrega el usuario a la respuesta
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const getCookie = (name, cookieHeader) => {
  const value = `; ${cookieHeader}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

server.on('upgrade', (req, socket, head) => {
  const token = getCookie('token', req.headers.cookie || '');
  try {
    const decoded = jwt.verify(token, SECRET);
    wss.handleUpgrade(req, socket, head, ws => {
      ws.user = decoded.user;
      wss.emit('connection', ws, req);
    });
  } catch (err) {
    socket.destroy();
  }
});


wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', code: currentCode }));

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.type === 'code') {
      currentCode = data.code;
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'code', code: data.code }));
        }
      });
    } else if (data.type === 'run') {
      const vm = new VM({ timeout: 1000, sandbox: {} });
      try {
        const result = vm.run(data.code);
        ws.send(JSON.stringify({ type: 'output', output: String(result) }));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'output', output: e.message }));
      }
    } else if (data.type === 'admin_editing') {
      adminEditing = data.editing;
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'admin_editing', editing: adminEditing }));
        }
      });
    } else if (data.type === 'dev_editing') {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'dev_editing', editing: data.editing }));
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
