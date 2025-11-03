// api/send-email.js
export const config = { runtime: 'nodejs18.x' };

// ---- Basit IP rate limit (volatile) ----
const WINDOW_MS = 10 * 60 * 1000; // 10 dk
const MAX_REQ   = 5;              // 10 dk'da 5 istek
const buckets = new Map();        // { ip: [timestamps...] }

function tooMany(ip) {
  const now = Date.now();
  const list = (buckets.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (list.length >= MAX_REQ) return true;
  list.push(now);
  buckets.set(ip, list);
  return false;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
    if (tooMany(ip)) {
      return res.status(429).json({ error: 'Çok sık istek. Bir süre sonra tekrar dene.' });
    }

    const {
      name = '',
      email = '',
      message = '',
      priority = '',
      pkg = '',
      _honey = '',
      cfToken = ''
    } = req.body || {};

    // Honeypot
    if (_honey && _honey.trim() !== '') {
      return res.status(200).json({ ok: true, note: 'honeypot bypass' });
    }

    // Basit alan doğrulaması
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Zorunlu alanlar eksik.' });
    }

    // Turnstile doğrulama
    const SECRET = process.env.TURNSTILE_SECRET_KEY || '';
    if (!SECRET) {
      return res.status(500).json({ error: 'Turnstile yapılandırması eksik.' });
    }

    const verifyResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: SECRET,
        response: cfToken || ''
      })
    });
    const verifyData = await verifyResp.json().catch(() => ({}));
    if (!verifyData.success) {
      return res.status(400).json({ error: 'Bot doğrulaması başarısız.' });
    }

    // GAS webhook
    const GAS_URL = process.env.GAS_WEBAPP_URL;
    if (!GAS_URL) {
      return res.status(500).json({ error: 'GAS_WEBAPP_URL tanımlı değil.' });
    }

    const payload = {
      name, email, message, priority, pkg,
      ip,
      ts: new Date().toISOString(),
      // autoresponder & sheet log için GAS tarafında kullanılacak bayraklar
      meta: { autorespond: true, saveToSheet: true }
    };

    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Apps Script doPost JSON’u Body içinde bekliyor:
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(async () => {
      // bazı GAS dağıtımları text döndürür
      const t = await r.text();
      return { text: t };
    });

    if (!r.ok) {
      return res.status(500).json({ error: data?.error || 'E-posta gönderilemedi.' });
    }

    return res.status(200).json({ ok: true, data });

  } catch (e) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
}
