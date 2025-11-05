// /api/send-email.js
export const config = { runtime: 'nodejs18.x' }; // Vercel Node 18

// !!! Buraya kendi Apps Script Web App URL'ini koy:
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyRvs6oBpNo6jJGunSokN_0pi4gROdelaSjtln2Chenlk5p_C4nhLIt75UJ3CWb8hqY2Q/exec';
// İstersen Vercel env ile kullan: process.env.APPS_SCRIPT_URL

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const body = req.body || {};
    const { name, email, message, paket, kategori, priority } = body;

    // Basit doğrulama
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Eksik alanlar' });
    }

    const payload = {
      name,
      email,
      message,
      paket: (paket || 'standart').toLowerCase(),
      kategori: kategori || '',
      priority: priority || 'genel',
      sentAt: new Date().toISOString(),
      ua: req.headers['user-agent'] || '',
      referer: req.headers.referer || '',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
    };

    // 1) JSON POST
    let r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      // 2) x-www-form-urlencoded POST
      const form = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) => form.append(k, String(v ?? '')));

      r = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });

      if (!r.ok) {
        // 3) GET fallback (bazı Apps Script kurulumları sadece doGet ile çalışır)
        const qs = new URLSearchParams();
        Object.entries(payload).forEach(([k, v]) => qs.append(k, String(v ?? '')));
        const url = `${APPS_SCRIPT_URL}?${qs.toString()}`;
        r = await fetch(url, { method: 'GET' });
      }
    }

    // Yanıtı güvenle oku (text -> JSON fallback)
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      console.error('Relay failed:', r.status, data);
      return res
        .status(502)
        .json({ ok: false, error: 'Relay failed', status: r.status, detail: data });
    }

    // Başarılı
    return res.status(200).json({ ok: true, relay: data });
  } catch (err) {
    console.error('API send-email error:', err);
    return res.status(500).json({ ok: false, error: 'Server error', detail: String(err?.message || err) });
  }
}
