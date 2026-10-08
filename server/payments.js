const BASE = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PLAN_AMOUNT_XOF = Number(process.env.KORI_PLUS_PRICE_XOF || 0);

function send(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").send(JSON.stringify(data));
}
async function signedInUser(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token || !BASE || !PUBLISHABLE) return null;
  const response = await fetch(`${BASE}/auth/v1/user`, { headers: { apikey: PUBLISHABLE, Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return response.json();
}
async function admin(path, options = {}) {
  if (!SERVICE) throw new Error("Supabase server key is not configured.");
  const response = await fetch(`${BASE}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Database request failed.");
  return data;
}
async function activateSubscription(payment) {
  if (payment.status !== "pending") return false;
  return admin("rpc/activate_kori_payment", {
    method: "POST", body: JSON.stringify({ p_reference: payment.provider_reference })
  });
}
async function pendingPayment(reference) {
  const rows = await admin(`payments?select=user_id,provider,provider_reference,amount_xof,status&provider_reference=eq.${encodeURIComponent(reference)}&limit=1`);
  return rows?.[0] || null;
}
module.exports = { BASE, PUBLISHABLE, SERVICE, PLAN_AMOUNT_XOF, send, signedInUser, admin, activateSubscription, pendingPayment };
