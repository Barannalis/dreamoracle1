// Vercel Node.js sunucusuz fonksiyon
export const config = { runtime: 'nodejs' }; // <-- 'nodejs18.x' DEĞİL

// Google Apps Script Web App URL'in:
// Buraya kendi dağıtım URL’ini koy (https://script.google.com/macros/s/AKfyc.../exec)
const GAS_URL = process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfyc.../exec';

// CORS için kendi domainini tanımla
const ALLOWED_ORIGINS = [
  'https://dreamoracle.space',
  'https://www.dreamoracle.space',
  'https://dreamoracle1.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  setCors(res, allow);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!GAS_URL || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(GAS_URL)) {
      return res.status(500).json({ error: 'GAS URL missing or invalid' });
    }

    const { name, email, message, package: pkg, priority } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, message zorunludur.' });
    }

    const payload = { name, email, message, package: pkg, priority, ts: Date.now() };

    const f = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Apps Script bazen redirect atabilir; takip et
      redirect: 'follow'
    });

    const text = await f.text().catch(() => '');
    if (!f.ok) {
      return res.status(502).json({ error: 'GAS error', status: f.status, body: text });
    }

    // GAS bazen plain text döner; JSON’a çevirmeye çalışma
    return res.status(200).json({ ok: true, relay: 'gas', body: text });
  } catch (err) {
    return res.status(500).json({ error: 'server error', detail: String(err && err.message || err) });
  }
}
