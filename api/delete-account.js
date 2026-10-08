const { BASE, SERVICE, send, signedInUser } = require("../server/payments");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Méthode non autorisée." });
  try {
    const user = await signedInUser(req);
    if (!user) return send(res, 401, { error: "Connecte-toi de nouveau." });
    if (!SERVICE) return send(res, 503, { error: "Suppression indisponible." });
    const response = await fetch(`${BASE}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: "DELETE",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` }
    });
    if (!response.ok) return send(res, 502, { error: "Le compte n’a pas pu être supprimé." });
    return send(res, 200, { deleted: true });
  } catch {
    return send(res, 502, { error: "Le compte n’a pas pu être supprimé." });
  }
};
