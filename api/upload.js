const multer = require('multer');
const { createReadStream } = require('fs');
const { unlinkSync } = require('fs');
const { Readable } = require('stream');

// Konfigurasi multer untuk Vercel (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Konfigurasi Telegram
const TELEGRAM_CONFIG = {
  botToken: '8727885486:AAE1cjgW03D49rWTqNDM0kWgR1ZI0JhRYmM',
  chatId: '-1003700985529',
  apiUrl: 'https://api.telegram.org/bot'
};

// Disable body parser untuk multer
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Hanya accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return new Promise((resolve, reject) => {
    upload.single('photo')(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, error: err.message });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Kirim ke Telegram menggunakan buffer
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CONFIG.chatId);
        formData.append('photo', new Blob([req.file.buffer]), req.file.originalname || 'photo.jpg');
        formData.append('caption', req.body.caption || '📸 Foto dari website');

        const response = await fetch(
          `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendPhoto`,
          {
            method: 'POST',
            body: formData
          }
        );

        const data = await response.json();

        if (data.ok) {
          res.json({ success: true, data: data });
        } else {
          res.status(500).json({ success: false, error: data.description });
        }
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
      resolve();
    });
  });
                           }
