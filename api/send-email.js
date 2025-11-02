// api/send-email.js

export default async function handler(req, res) {
  // sadece POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, message } = req.body || {};

    if (!email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SENİN Apps Script URL'in
    const webhookUrl =
      'https://script.google.com/macros/s/AKfycbyRvs6oBpNo6jJGunSokN_0pi4gROdelaSjtln2Chenlk5p_C4nhLIt75UJ3CWb8hqY2Q/exec';

    const gsRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || 'Ziyaretçi',
        email,
        message,
        source: 'dreamoracle.space',
        time: new Date().toISOString(),
      }),
    });

    if (!gsRes.ok) {
      const text = await gsRes.text();
      return res.status(500).json({ error: 'Script error', detail: text });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('API error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
