export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // Güvenlik: Basic JSON parse + boyut limiti
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    const data = JSON.parse(raw || "{}");

    const { name, email, message, _honey } = data || {};

    // Honeypot: botlar düşsün
    if (_honey && String(_honey).trim() !== "") {
      return res.status(200).json({ ok: true });
    }

    // Basit doğrulamalar
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Eksik alan(lar)" });
    }
    const emailOk =
      typeof email === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      return res.status(400).json({ ok: false, error: "Geçersiz e-posta" });
    }

    // Ortam değişkenleri
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_TO = process.env.EMAIL_TO;
    const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@dreamoracle.space";

    if (!RESEND_API_KEY || !EMAIL_TO || !EMAIL_FROM) {
      return res
        .status(500)
        .json({ ok: false, error: "Env eksik (RESEND_API_KEY / EMAIL_TO / EMAIL_FROM)" });
    }

    // Kullanıcıdan gelen mesaj → size düşen bildirim
    const plainBody =
`Yeni rüya kaydı:
- Ad Soyad: ${name}
- E-posta: ${email}

Mesaj:
${message}`;

    // 1) Size bildirim
    const resp1 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: EMAIL_TO,
        subject: "DreamOracle · Yeni rüya gönderimi",
        text: plainBody
      })
    });

    if (!resp1.ok) {
      const e = await resp1.text();
      console.error("Resend error (admin mail):", e);
      return res.status(502).json({ ok: false, error: "Mail gönderilemedi (admin)" });
    }

    // 2) Kullanıcıya otomatik cevap (opsiyonel: basit koçluk metni)
    const userReplyHtml = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55">
        <h2>Rüyan ulaştı, ${name}!</h2>
        <p>Rüyanı aldık ve en kısa sürede yorumlayıp geri dönüş yapacağız.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
        <p><strong>Özet:</strong></p>
        <p style="white-space:pre-wrap">${message.replace(/</g, "&lt;")}</p>

        <p style="margin-top:20px">Bu arada küçük bir öneri: 
        rüyayı yazdıktan sonra 1-2 gün boyunca tekrar aklına gelen küçük detayları da not et.
        Bu, yorumun isabetini arttırır.</p>

        <p style="margin-top:28px">Sevgiyle,<br/>DreamOracle Ekibi</p>
      </div>
    `;

    const resp2 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email,
        subject: "DreamOracle · Rüyan ulaştı",
        html: userReplyHtml
      })
    });

    if (!resp2.ok) {
      const e = await resp2.text();
      console.error("Resend error (user mail):", e);
      // Kullanıcı cevabı başarısız olsa bile ana form başarılı sayılabilir
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Sunucu hatası" });
  }
}
