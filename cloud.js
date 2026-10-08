(() => {
  const config = window.KORI_CONFIG || {};
  const base = (config.supabaseUrl || "").replace(/\/$/, "");
  const anon = config.supabasePublishableKey || "";
  let privilegedKey = anon.startsWith("sb_secret_");
  try { privilegedKey ||= JSON.parse(atob(anon.split(".")[1])).role === "service_role"; } catch {}
  const ready = /^https:\/\//.test(base) && anon.length > 20 && !privilegedKey;
  let session = null;

  function saveSession(next) {
    session = next;
    if (next) localStorage.setItem("kori_session", JSON.stringify(next));
    else localStorage.removeItem("kori_session");
  }
  function getSession() {
    if (!session) {
      try { session = JSON.parse(localStorage.getItem("kori_session") || "null"); }
      catch { session = null; }
    }
    return session;
  }
  async function auth(path, body) {
    const response = await fetch(`${base}/auth/v1/${path}`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Connexion impossible.");
    if (data.access_token) saveSession(data);
    return data;
  }
  async function refresh() {
    const current = getSession();
    if (!current?.refresh_token) return null;
    try { return await auth("token?grant_type=refresh_token", { refresh_token: current.refresh_token }); }
    catch { saveSession(null); return null; }
  }
  async function request(path, options = {}, retried = false) {
    const current = getSession();
    if (!current?.access_token) throw new Error("Connecte-toi pour continuer.");
    const headers = {
      apikey: anon,
      Authorization: `Bearer ${current.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers });
    if (response.status === 401 && !retried && await refresh()) return request(path, options, true);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error_description || "Enregistrement impossible.");
    }
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  }
  async function insert(table, values) {
    return request(`${table}?select=*`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(values) });
  }
  async function update(table, query, values) {
    return request(`${table}?${query}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(values) });
  }
  async function list(table, query = "select=*") { return request(`${table}?${query}`); }
  async function remove(table, query) { return request(`${table}?${query}`, { method: "DELETE" }); }

  window.KoriCloud = {
    ready, config, getSession, saveSession, auth, refresh, request, insert, update, list, remove,
    currentUser: async () => {
      const current = getSession();
      if (!current?.access_token) return null;
      const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${current.access_token}` } });
      if (!response.ok) return null;
      return response.json();
    },
    signUp: (email, password, displayName) => auth("signup", { email, password, data: { display_name: displayName } }),
    signIn: (email, password) => auth("token?grant_type=password", { email, password }),
    signOut: async () => { const current = getSession(); if (current?.access_token) await fetch(`${base}/auth/v1/logout`, { method: "POST", headers: { apikey: anon, Authorization: `Bearer ${current.access_token}` } }).catch(() => {}); saveSession(null); }
  };
})();
