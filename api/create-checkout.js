const { BASE, PLAN_AMOUNT_XOF, send, signedInUser, admin } = require("../server/payments");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Méthode non autorisée." });
  try {
    const user = await signedInUser(req);
    if (!user) return send(res, 401, { error: "Connecte-toi de nouveau." });
    const provider = req.body?.provider;
    if (!["wave", "cinetpay"].includes(provider)) return send(res, 400, { error: "Moyen de paiement inconnu." });
    if (!Number.isSafeInteger(PLAN_AMOUNT_XOF) || PLAN_AMOUNT_XOF <= 0 || PLAN_AMOUNT_XOF % 5 !== 0) return send(res, 503, { error: "Le prix mensuel doit être confirmé et configuré." });
    const appUrl = process.env.APP_URL;
    if (!appUrl || !appUrl.startsWith("https://")) return send(res, 503, { error: "L’adresse HTTPS du site n’est pas configurée." });
    const profiles = await fetch(`${BASE}/rest/v1/profiles?select=country&id=eq.${encodeURIComponent(user.id)}&limit=1`, {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: req.headers.authorization }
    }).then(r => r.ok ? r.json() : []);
    if (profiles[0]?.country !== "Burkina Faso") return send(res, 400, { error: "Ce paiement est configuré pour le Burkina Faso." });
    if (provider === "wave" && !process.env.WAVE_API_KEY) return send(res, 503, { error: "Le compte marchand Wave n’est pas encore relié." });
    if (provider === "cinetpay" && (!process.env.CINETPAY_API_KEY || !process.env.CINETPAY_SITE_ID)) return send(res, 503, { error: "Le compte marchand CinetPay n’est pas encore relié." });

    const reference = `kori${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    const pending = { user_id: user.id, provider, provider_reference: reference, amount_xof: PLAN_AMOUNT_XOF, status: "pending" };
    await admin("payments", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(pending) });
    let paymentUrl;
    if (provider === "wave") {
      const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WAVE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: String(PLAN_AMOUNT_XOF), currency: "XOF", client_reference: reference, error_url: `${appUrl}/?payment=error`, success_url: `${appUrl}/?payment=return&ref=${encodeURIComponent(reference)}` })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.wave_launch_url) throw new Error(data.error_message || "Wave n’a pas créé le paiement.");
      paymentUrl = data.wave_launch_url;
    } else {
      const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: process.env.CINETPAY_API_KEY, site_id: process.env.CINETPAY_SITE_ID, transaction_id: reference, amount: PLAN_AMOUNT_XOF, currency: "XOF", description: "Kori Plus abonnement mensuel", notify_url: `${appUrl}/api/payment-webhook`, return_url: `${appUrl}/?payment=return&ref=${encodeURIComponent(reference)}`, channels: "MOBILE_MONEY", customer_id: user.id, metadata: JSON.stringify({ user_id: user.id, plan: "plus" }), lang: "fr" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.code !== "201" || !data.data?.payment_url) throw new Error(data.description || "CinetPay n’a pas créé le paiement.");
      paymentUrl = data.data.payment_url;
    }
    return send(res, 200, { payment_url: paymentUrl, reference });
  } catch (error) {
    return send(res, 502, { error: error.message || "Impossible de préparer le paiement." });
  }
};
