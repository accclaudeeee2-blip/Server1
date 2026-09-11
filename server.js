const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const app = express();

app.use(express.json({ limit: '5mb' }));

// Serve icon static dari folder /icons
app.use('/icons', express.static(path.join(__dirname, 'icons')));

// State terakhir
let latestRadarData = null;
let connectedClients = new Set();

// HP lo POST data tiap frame
app.post('/update', (req, res) => {
    latestRadarData = req.body;

    connectedClients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(latestRadarData));
        }
    });

    res.sendStatus(200);
});

// Cek server hidup
app.get('/ping', (req, res) => {
    res.json({
        status: 'ok',
        clients: connectedClients.size,
        hasData: latestRadarData !== null
    });
});

// Lihat data radar terakhir (debug)
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

    // Kirim data terakhir langsung saat teman baru connect
    if (latestRadarData) {
        ws.send(JSON.stringify(latestRadarData));
    }

    ws.on('close', () => {
        connectedClients.delete(ws);
        console.log(`Teman disconnect. Sisa: ${connectedClients.size}`);
    });

    ws.on('error', () => {
        connectedClients.delete(ws);
    });
});
