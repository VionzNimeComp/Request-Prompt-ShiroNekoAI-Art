const TELEGRAM_CONFIG = {
  botToken: '8727885486:AAE1cjgW03D49rWTqNDM0kWgR1ZI0JhRYmM',
  ownerId: '2056834184',
  apiUrl: 'https://api.telegram.org/bot'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CONFIG.ownerId,
        text: msg,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (data.ok) {
      res.json({ success: true, data: data });
    } else {
      res.status(500).json({ success: false, error: data.description });
    }
  } catch (error) {
    console.error('Send error log error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
        }
