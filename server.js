const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ============================================
// KONFIGURASI
// ============================================

const TELEGRAM_CONFIG = {
    botToken: '8727885486:AAE1cjgW03D49rWTqNDM0kWgR1ZI0JhRYmM',
    chatId: '-1003700985529',
    ownerId: '2056834184', // Ganti dengan ID Anda
    apiUrl: 'https://api.telegram.org/bot'
};

// ============================================
// ENDPOINT: UPLOAD KE TELEGRAM
// ============================================

app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CONFIG.chatId);
        formData.append('photo', fs.createReadStream(req.file.path));
        formData.append('caption', req.body.caption || '📸 Foto dari website');
        
        const response = await axios.post(
            `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendPhoto`,
            formData,
            { headers: formData.getHeaders() }
        );
        
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Upload Error:', error.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data || null
        });
    }
});

// ============================================
// ENDPOINT: SEND ERROR LOG KE OWNER
// ============================================

app.post('/send-error-log', async (req, res) => {
    try {
        const { errorType, errorMessage, errorDetails = {} } = req.body;

        if (!TELEGRAM_CONFIG.ownerId || TELEGRAM_CONFIG.ownerId === 'YOUR_OWNER_ID_HERE') {
            return res.json({ success: false, error: 'Owner ID not configured' });
        }

        const now = new Date();
        const timeStr = now.toLocaleString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        let msg = `❌ ERROR LOG • ShiroNekoAI Request\n\n`;
        msg += `⏰ Time: ${timeStr} WIB\n`;
        msg += `📌 Type: ${errorType}\n\n`;
        msg += `📝 Message:\n"${errorMessage}"\n\n`;
        
        msg += `📋 Details:\n`;
        if (errorDetails.requestId) msg += `🆔 Request ID: ${errorDetails.requestId}\n`;
        if (errorDetails.fileName) msg += `📁 File: ${errorDetails.fileName}\n`;
        if (errorDetails.fileSize) msg += `📏 Size: ${(errorDetails.fileSize/1024/1024).toFixed(2)} MB\n`;
        if (errorDetails.ip) msg += `🌐 IP: ${errorDetails.ip}\n`;
        if (errorDetails.userAgent) msg += `🌐 User-Agent:\n${errorDetails.userAgent.substring(0, 200)}...\n`;
        
        if (errorDetails.errorStack) {
            const stack = errorDetails.errorStack.substring(0, 500);
            msg += `\n📄 Stack Trace:\n${stack}...\n`;
        }

        const url = `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CONFIG.ownerId,
            text: msg,
            parse_mode: 'HTML'
        });

        res.json({ success: true, data: response.data });

    } catch (error) {
        console.error('❌ Send Error Log Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// ENDPOINT: SEND REQUEST KE TELEGRAM
// ============================================

app.post('/send-request', upload.single('photo'), async (req, res) => {
    try {
        const { message, requestId } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Kirim pesan teks
        const textUrl = `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMessage`;
        const textResponse = await axios.post(textUrl, {
            chat_id: TELEGRAM_CONFIG.chatId,
            text: message,
            parse_mode: 'HTML'
        });

        // Kirim foto jika ada
        if (req.file) {
            try {
                const formData = new FormData();
                formData.append('chat_id', TELEGRAM_CONFIG.chatId);
                formData.append('photo', fs.createReadStream(req.file.path));
                formData.append('caption', `🖼 Gambar untuk ID: ${requestId || 'N/A'}`);
                
                await axios.post(
                    `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendPhoto`,
                    formData,
                    { headers: formData.getHeaders() }
                );
                
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            } catch (photoError) {
                console.warn('⚠️ Gagal kirim foto:', photoError.message);
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            }
        }

        res.json({ success: true, data: textResponse.data });

    } catch (error) {
        console.error('❌ Send Request Error:', error.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data || null
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        endpoints: {
            upload: 'POST /upload',
            sendErrorLog: 'POST /send-error-log',
            sendRequest: 'POST /send-request (multipart/form-data)'
        }
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   POST /upload - Upload ke Telegram`);
    console.log(`   POST /send-error-log - Kirim error log ke Owner`);
    console.log(`   POST /send-request - Kirim request + foto ke Telegram`);
    console.log(`   GET /health - Health check`);
});