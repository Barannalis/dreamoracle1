// api/send-email.js
// DreamOracle → Vercel → Google Apps Script → Gmail
// Bu endpoint sadece POST kabul eder.

export default async function handler(req, res) {
  // 1) Sadece POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 2) Senin ekran görüntüsünden aldığım URL
  // Versiyon: "Version 3 on 2 Nov 2025, 14:11"
  // Distribution ID: AKfycbxuwUidlLLCbYgm1vmhdr-tS2gQ19U-yS6VKbHljrYFPBJiw23zAqQ0lGCdHFeDrILq5Vg
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxuwUidlLLCbYgm1vmhdr-tS2gQ19U-yS6VKbHljrYFPBJiw23zAqQ0lGCdHFeDrILq5Vg/exec";

  // 3) İstekten gelen verileri al
  const { name, email, paket, oncelik, mesaj, source } = req.body || {};

  try {
    // 4) Google Apps Script'e POST at
    const gsRes = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name || "",
        email: email || "",
        paket: paket || "",
        oncelik: oncelik || "",
        mesaj: mesaj || "",
        source: source || "dreamoracle.space",
        distId:
          "AKfycbxuwUidlLLCbYgm1vmhdr-tS2gQ19U-yS6VKbHljrYFPBJiw23zAqQ0lGCdHFeDrILq5Vg",
      }),
    });

    // 5) Script'in cevabını oku
    const data = await gsRes.json().catch(() => ({}));

    if (gsRes.ok) {
      // Google "ok" döndüyse biz de ok döneriz
      return res.status(200).json({
        ok: true,
        from: "vercel",
        relay: "google-script",
        gsOk: true,
        gsData: data,
      });
    } else {
      // Google hata dönerse
      return res.status(500).json({
        ok: false,
        message: "Google Apps Script hata döndürdü",
        status: gsRes.status,
        gsData: data,
      });
    }
  } catch (err) {
    // 6) Sunucu tarafı hata
    return res.status(500).json({
      ok: false,
      message: "Sunucu hatası veya Script'e ulaşılamadı",
      error: err.toString(),
    });
  }
}
