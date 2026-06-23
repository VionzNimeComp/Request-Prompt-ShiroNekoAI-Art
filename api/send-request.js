const multer = require('multer');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const TELEGRAM_CONFIG = {
  botToken: '8727885486:AAE1cjgW03D49rWTqNDM0kWgR1ZI0JhRYmM',
  chatId: '-1003700985529',
  ownerId: '2056834184', // Ganti dengan ID Anda
  apiUrl: 'https://api.telegram.org/bot'
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
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
        const { message, requestId } = req.body;

        if (!message) {
          return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Kirim pesan teks
        const textUrl = `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendMessage`;
        const textResponse = await fetch(textUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CONFIG.chatId,
            text: message,
            parse_mode: 'HTML'
          })
        });

        const textData = await textResponse.json();

        // Kirim foto jika ada
        if (req.file) {
          try {
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CONFIG.chatId);
            formData.append('photo', new Blob([req.file.buffer]), req.file.originalname || 'photo.jpg');
            formData.append('caption', `🖼 Gambar untuk ID: ${requestId || 'N/A'}`);

            await fetch(
              `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendPhoto`,
              { method: 'POST', body: formData }
            );
          } catch (photoError) {
            console.warn('⚠️ Gagal kirim foto:', photoError.message);
          }
        }

        if (textData.ok) {
          res.json({ success: true, data: textData });
        } else {
          res.status(500).json({ success: false, error: textData.description });
        }
      } catch (error) {
        console.error('Send request error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
      resolve();
    });
  });
    }
