// api/send-email.js
// DreamOracle → Vercel → Google Apps Script mail relay
// ÖNEMLİ: Bu sürüm HEP 200 döner ve sana Google'ın ne dediğini gösterir.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", method: req.method });
  }

  // Senin son dağıttığın URL
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxuwUidlLLCbYgm1vmhdr-tS2gQ19U-yS6VKbHljrYFPBJiw23zAqQ0lGCdHFeDrILq5Vg/exec";

  const {
    name,
    email,
    paket,
    oncelik,
    mesaj,
    source = "dreamoracle.space",
  } = req.body || {};

  // Minimum kontrol
  if (!email) {
    return res.status(200).json({
      ok: false,
      reason: "email_not_provided",
      message: "email gerekli",
    });
  }

  let fetchError = null;
  let gsRes = null;
  let rawText = null;
  let parsed = null;

  try {
    gsRes = await fetch(SCRIPT_URL, {
      method: "POST", // <-- Script POST kabul etmezse burada göreceğiz
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name || "",
        email: email || "",
        paket: paket || "",
        oncelik: oncelik || "",
        mesaj: mesaj || "",
        source,
        distId:
          "AKfycbxuwUidlLLCbYgm1vmhdr-tS2gQ19U-yS6VKbHljrYFPBJiw23zAqQ0lGCdHFeDrILq5Vg",
      }),
    });

    rawText = await gsRes.text();

    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      parsed = { raw: rawText };
    }
  } catch (err) {
    fetchError = err.toString();
  }

  // BURADAN SONRA HİÇ 500 DÖNMEYECEĞİZ
  return res.status(200).json({
    ok: gsRes?.ok === true,
    note: "Bu endpoint debugging modunda, o yüzden hep 200.",
    requestBody: {
      name,
      email,
      paket,
      oncelik,
      mesaj,
    },
    fetchError, // Vercel → Google hiç gidemedi mi?
    scriptStatus: gsRes ? gsRes.status : null,
    scriptUrl: SCRIPT_URL,
    scriptResponse: parsed,
  });
}
