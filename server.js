const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json({ limit: '50mb' })); // gede karena terima base64 icon
app.use('/icons', express.static(path.join(__dirname, 'icons')));

// Buat folder icons kalau belum ada
if (!fs.existsSync('./icons')) fs.mkdirSync('./icons');

let latestRadarData = null;
let connectedClients = new Set();

// ── Upload icon dari Jaln (dipanggil sekali pas pertama run) ──
app.post('/upload-icon', (req, res) => {
    const { heroID, base64 } = req.body;
    if (!heroID || !base64) return res.sendStatus(400);
    const buf = Buffer.from(base64, 'base64');
    fs.writeFileSync(`./icons/${heroID}.png`, buf);
    res.sendStatus(200);
});

// ── Cek icon sudah ada belum ──
app.get('/icons-list', (req, res) => {
    const files = fs.readdirSync('./icons').map(f => parseInt(f));
    res.json(files);
});

// ── HP lo POST data tiap frame ──
app.post('/update', (req, res) => {
    latestRadarData = req.body;
    connectedClients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(latestRadarData));
        }
    });
    res.sendStatus(200);
});

app.get('/ping', (req, res) => {
    res.json({
        status: 'ok',
        clients: connectedClients.size,
        hasData: latestRadarData !== null
    });
});

app.get('/latest', (req, res) => {
    res.json(latestRadarData || { message: 'Belum ada data' });
});

const server = app.listen(process.env.PORT || 3000, () => {
    console.log('Radar server running...');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log(`Teman connect! Total: ${connectedClients.size}`);
    if (latestRadarData) ws.send(JSON.stringify(latestRadarData));
    ws.on('close', () => connectedClients.delete(ws));
    ws.on('error', () => connectedClients.delete(ws));
});
