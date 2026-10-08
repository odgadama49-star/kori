const { send, signedInUser, admin, pendingPayment, activateSubscription, PLAN_AMOUNT_XOF } = require("../server/payments");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Méthode non autorisée." });
  try {
    const user = await signedInUser(req);
    if (!user) return send(res, 401, { error: "Connecte-toi de nouveau." });
    const reference = String(req.body?.reference || "");
    if (!/^kori[a-zA-Z0-9]+$/.test(reference)) return send(res, 400, { error: "Référence invalide." });
    const payment = await pendingPayment(reference);
    if (!payment || payment.user_id !== user.id || Number(payment.amount_xof) !== PLAN_AMOUNT_XOF) return send(res, 404, { error: "Paiement introuvable." });
    if (payment.status === "paid") {
      const subscription = (await admin(`subscriptions?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`))[0] || null;
      return send(res, 200, { paid: true, subscription });
    }
    let confirmed = false;
    if (payment.provider === "wave") {
      if (!process.env.WAVE_API_KEY) return send(res, 503, { error: "La vérification Wave n’est pas configurée." });
      const url = `https://api.wave.com/v1/checkout/sessions/search?client_reference=${encodeURIComponent(reference)}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.WAVE_API_KEY}` } });
      const data = await response.json().catch(() => ({}));
      const session = data.result?.find(row => row.client_reference === reference);
      confirmed = response.ok && session?.payment_status === "succeeded" && session.currency === "XOF" && Number(session.amount) === PLAN_AMOUNT_XOF;
    } else {
      if (!process.env.CINETPAY_API_KEY || !process.env.CINETPAY_SITE_ID) return send(res, 503, { error: "La vérification CinetPay n’est pas configurée." });
      const response = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: process.env.CINETPAY_API_KEY, site_id: process.env.CINETPAY_SITE_ID, transaction_id: reference })
      });
      const data = await response.json().catch(() => ({}));
      confirmed = response.ok && data.data?.status === "ACCEPTED" && data.data?.currency === "XOF" && Number(data.data?.amount) === PLAN_AMOUNT_XOF;
    }
    if (!confirmed) return send(res, 200, { paid: false });
    await activateSubscription(payment);
    const subscription = (await admin(`subscriptions?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`))[0] || null;
    return send(res, 200, { paid: true, subscription });
  } catch (error) {
    return send(res, 502, { error: error.message || "Vérification de paiement impossible." });
  }
};
