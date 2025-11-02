// api/send-email.js

export default async function handler(req, res) {
  // 1) Sadece POST kabul et
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 2) Gelen veriyi al
  const { name, email, paket, oncelik, mesaj } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "E-posta gerekli" });
  }

  // 3) Google Apps Script endpoint'in
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyRvs6oBpNo6jJGunSokN_0pi4gROdelaSjtln2Chenlk5p_C4nhLIt75UJ3CWb8hqY2Q/exec";

  try {
    // 4) Script'e POST at
    const gsRes = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Google Script'e gidecek body
      body: JSON.stringify({
        name,
        email,
        paket,
        oncelik,
        mesaj,
        source: "dreamoracle.site",
      }),
    });

    // Google Script çoğu zaman text döner, JSON değil
    const text = await gsRes.text();

    if (!gsRes.ok) {
      return res
        .status(500)
        .json({ error: "Script yanıt vermedi", detail: text });
    }

    // 5) Frontend'e success dön
    return res.status(200).json({
      ok: true,
      message: "Mail kuyruğa alındı",
      scriptResponse: text,
    });
  } catch (err) {
    console.error("send-email error:", err);
    return res.status(500).json({ error: "Sunucu hatası", detail: String(err) });
  }
}
