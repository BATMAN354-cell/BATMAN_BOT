const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

let botStatus = 'Disconnected';
let latestQr = '';
let customCommands = {};

let sock;
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            latestQr = qr;
            botStatus = 'Scan QR Code';
            qrcodeTerminal.generate(qr, { small: true });
        }
        if (connection === 'open') {
            botStatus = 'Connected (FAMOUS BATMAN BOT Active)';
            latestQr = '';
            console.log('FAMOUS BATMAN BOT successfully connect ho gaya!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        
        const messageType = Object.keys(m.message)[0];
        const text = messageType === 'conversation' ? m.message.conversation : 
                     messageType === 'extendedTextMessage' ? m.message.extendedTextMessage.text : '';

        const sender = m.key.remoteJid;

        if (customCommands[text]) {
            await sock.sendMessage(sender, { text: customCommands[text] });
        }
    });
}

startBot();

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FAMOUS BATMAN BOT Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial, sans-serif; background: #121212; color: #fff; padding: 20px; text-align: center; }
                h1 { color: #f39c12; }
                .box { background: #1e1e1e; padding: 15px; border-radius: 8px; margin-top: 20px; display: inline-block; width: 100%; max-width: 400px; box-sizing: border-box; }
                input, textarea { width: 90%; padding: 10px; margin: 8px 0; background: #2c2c2c; border: 1px solid #444; color: #fff; border-radius: 5px; }
                button { background: #f39c12; color: #000; border: none; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>FAMOUS BATMAN BOT</h1>
            <div class="box">
                <p><strong>Status:</strong> ${botStatus}</p>
                ${latestQr ? '<p style="color: yellow;">Terminal ya logs mein QR code check karein scan karne ke liye.</p>' : ''}
                <hr style="border-color: #444;">
                <h3>Custom Command Add Karein</h3>
                <form action="/add-command" method="POST">
                    <input type="text" name="keyword" placeholder="Command (e.g. .hi)" required><br>
                    <textarea name="reply" placeholder="Bot ka jawab..." required></textarea><br>
                    <button type="submit">Save Command</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/add-command', (req, res) => {
    const { keyword, reply } = req.body;
    customCommands[keyword] = reply;
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FAMOUS BATMAN BOT Dashboard http://localhost:${PORT} par chal raha hai!`);
});
