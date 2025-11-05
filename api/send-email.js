// api/send-email.js
// Not: Vercel Node Functions için dosya içinden "nodejs" demeliyiz (sürüm yok).
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // Basit CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { name, email, message, paket, kategori, priority } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({
        ok: false,
        error: 'Ad, e-posta ve rüya alanları zorunludur.'
      });
    }

    const relayUrl = process.env.GAS_RELAY_URL; // Vercel → Env Vars
    if (!relayUrl) {
      return res.status(500).json({
        ok: false,
        error: 'GAS_RELAY_URL ortam değişkeni tanımlı değil.'
      });
    }

    const payload = {
      name,
      email,
      message,
      paket: paket || 'standart',
      kategori: kategori || 'ruya',
      priority: priority || 'genel',
      site: 'dreamoracle.space',
      ts: Date.now()
    };

    const r = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok || data?.ok === false) {
      return res.status(502).json({
        ok: false,
        error: data?.error || `Relay HTTP ${r.status}`,
        relay: data
      });
    }

    return res.status(200).json({ ok: true, relay: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
