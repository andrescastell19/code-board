const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { VM } = require('vm2');


const allowCors = require('./allowCors');
const app = express();
app.use(allowCors);
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const SECRET = 'clave_super_secreta';

app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));


const { initDB, addUser, findUser } = require('./db');

(async () => {
    await initDB();
    // Si no hay usuarios, crea los 3 por defecto
    if (!(await findUser('admin'))) await addUser('admin', '12345', 'admin');
    if (!(await findUser('dev'))) await addUser('dev', '12345', 'dev');
    if (!(await findUser('observer'))) await addUser('observer', '12345', 'observer');
})();

// Endpoint para crear usuarios (solo para pruebas/admin)
// Debe ir después de la declaración de app
app.post('/register', async (req, res) => {
    // Solo permite si el usuario autenticado es admin
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    let decoded;
    try {
        decoded = jwt.verify(token, SECRET);
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
    // Buscar el usuario en la base y verificar rol
    const userObj = await findUser(decoded.user);
    if (!userObj || userObj.role !== 'admin') {
        return res.status(403).json({ error: 'Solo admin puede registrar usuarios' });
    }
    const { user, pass, role } = req.body;
    if (!user || !pass || !role) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    if (await findUser(user)) {
        return res.status(409).json({ error: 'Usuario ya existe' });
    }
    await addUser(user, pass, role);
    res.json({ success: true, user, role });
});

let currentCode = '';
let adminEditing = false;

app.post('/login', async (req, res) => {
    const { user, pass } = req.body;
    const u = await findUser(user);
    if (u && bcrypt.compareSync(pass, u.passHash)) {
        const token = jwt.sign({ user }, SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: false }).json({ success: true, user: u.role });
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
    // Permitir cualquier origen para WebSocket (solo desarrollo)
    // ¡No usar en producción!
    // Obtener token de cookie o query string
    let token = getCookie('token', req.headers.cookie || '');
    if (!token) {
        // Buscar en query string
        const url = require('url');
        const query = url.parse(req.url, true).query;
        token = query.token;
    }
    console.log('WebSocket upgrade: token recibido:', token);
    try {
        const decoded = jwt.verify(token, SECRET);
        wss.handleUpgrade(req, socket, head, ws => {
            ws.user = decoded.user;
            wss.emit('connection', ws, req);
        });
    } catch (err) {
        console.log('WebSocket auth failed:', err.message, 'Token:', token);
        socket.destroy();
    }
});


wss.on('connection', (ws) => {
    console.log('WebSocket conectado:', ws.user);
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

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
