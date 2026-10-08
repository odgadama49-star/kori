(() => {
  const cloud = window.KoriCloud;
  const root = document.getElementById("root");
  const demoOpenApp = window.openApp;
  const demoShowPage = window.showPage;
  let live = false;
  let displayName = "";
  let userBudgets = [];
  let userGoals = [];
  let subscription = null;
  let authMode = "login";
  const iconFor = { Alimentation:"🛒", Transport:"🚌", Maison:"🏠", Factures:"📱", "Sant\u00e9":"💊", Revenus:"💼", Autre:"✳" };
  const safe = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; };
  const currentMonth = () => new Date().toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
  const icon = category => iconFor[category] || "✳";

  function authScreen(mode = "login", notice = "") {
    authMode = mode;
    root.innerHTML = `<style>.auth-page{min-height:100vh;display:grid;grid-template-columns:1fr 440px;background:var(--bg)}.auth-aside{background:radial-gradient(circle at 90% 10%,#6f9f6b,#163b2b 60%);color:#fff;padding:10vh 8vw;display:flex;flex-direction:column;justify-content:space-between}.auth-aside h1{font:800 clamp(36px,4vw,55px)/1.08 Manrope;letter-spacing:-2px;max-width:520px}.auth-aside p{color:#d0e1d1;line-height:1.8;font-size:13px;max-width:420px}.auth-panel{background:#fff;margin:auto 7%;padding:32px;border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);width:86%;max-width:400px}.auth-panel h2{font:700 23px Manrope;margin:0 0 7px}.auth-panel>p{font-size:11px;color:var(--muted);line-height:1.6;margin:0 0 18px}.auth-panel .field input{height:44px;font-size:12px}.auth-error{background:#fff0ee;color:#b35b50;padding:10px;border-radius:8px;font-size:10px;margin:10px 0}.auth-switch{border:0;background:none;color:var(--green);font-size:10px;font-weight:700;padding:12px 0}.auth-logo{font:800 22px Manrope}.auth-foot{font-size:9px;color:#cfddd1}@media(max-width:800px){.auth-page{display:flex;flex-direction:column;min-height:100dvh}.auth-aside{padding:22px 22px 25px;min-height:225px}.auth-aside h1{font-size:32px;margin:30px 0 8px}.auth-aside p{font-size:11px;margin:0}.auth-foot{display:none}.auth-panel{margin:-14px auto 24px;position:relative;width:calc(100% - 28px);padding:23px;border-radius:18px}}</style><div class="auth-page"><section class="auth-aside"><div>${logo()}</div><div><h1>Ton budget, en clair.</h1><p>Un petit geste pour noter. Un grand pas pour mieux savoir où tu en es.</p></div><div class="auth-foot">Tes opérations restent privées.</div></section><section class="auth-panel"><button class="seeall" onclick="window.location.reload()">← Retour à l’accueil</button><h2>${authMode === "signup" ? "Créer mon espace" : authMode === "reset" ? "Réinitialiser le mot de passe" : authMode === "update" ? "Choisir un nouveau mot de passe" : "Content de te revoir"}</h2><p>${authMode === "signup" ? "Quelques informations et tu peux commencer." : authMode === "reset" ? "Nous enverrons un lien de réinitialisation à ton adresse." : authMode === "update" ? "Choisis un nouveau mot de passe pour ton compte." : "Connecte-toi pour retrouver ton budget."}</p>${notice ? `<div class="auth-error" style="background:#eff7ee;color:#397c59">${safe(notice)}</div>` : ""}<form id="authForm">${authMode === "signup" ? `<div class="field"><label>Ton prénom</label><input id="authName" autocomplete="given-name" required placeholder="Ex. Awa"></div>` : ""}${authMode !== "update" ? `<div class="field"><label>Adresse e-mail</label><input id="authEmail" type="email" autocomplete="email" required placeholder="awa@exemple.com"></div>` : ""}${authMode !== "reset" ? `<div class="field"><label>${authMode === "update" ? "Nouveau mot de passe" : "Mot de passe"}</label><input id="authPassword" type="password" autocomplete="${authMode === "signup" || authMode === "update" ? "new-password" : "current-password"}" minlength="8" required placeholder="8 caractères minimum"></div>` : ""}<div id="authError"></div><button class="btn primary" id="authSubmit" style="width:100%;min-height:43px;margin-top:7px">${authMode === "signup" ? "Créer mon compte" : authMode === "reset" ? "Envoyer le lien" : authMode === "update" ? "Enregistrer le mot de passe" : "Se connecter"} →</button></form><button class="auth-switch" id="authToggle">${authMode === "signup" ? "J’ai déjà un compte · Se connecter" : authMode === "reset" || authMode === "update" ? "Retour à la connexion" : "Créer un compte gratuit"}</button>${authMode === "login" ? `<button class="auth-switch" style="display:block;padding-top:0" id="resetToggle">Mot de passe oublié ?</button>` : ""}<div style="border-top:1px solid var(--line);padding-top:12px;color:#9aa39c;font-size:9px;line-height:1.6">Ton e-mail, ton pays et les op&#233;rations saisies seront enregistr&#233;s dans ton compte. Kori ne se connecte pas &#224; ta banque.</div></section></div>`;
    document.getElementById("authToggle").onclick = () => authScreen(authMode === "signup" || authMode === "reset" || authMode === "update" ? "login" : "signup");
    document.getElementById("resetToggle")?.addEventListener("click", () => authScreen("reset"));
    document.getElementById("authForm").onsubmit = submitAuth;
  }
  async function submitAuth(event) {
    event.preventDefault();
    const button = document.getElementById("authSubmit");
    const error = document.getElementById("authError");
    button.disabled = true; button.textContent = "Un instant…"; error.innerHTML = "";
    const email = document.getElementById("authEmail")?.value.trim() || "";
    try {
      if (authMode === "reset") {
        const redirect=cloud.config.appUrl||location.origin;
        const response = await fetch(`${cloud.config.supabaseUrl.replace(/\/$/,"")}/auth/v1/recover?redirect_to=${encodeURIComponent(`${redirect}/?mode=update`)}`, { method:"POST", headers:{apikey:cloud.config.supabasePublishableKey,"Content-Type":"application/json"}, body:JSON.stringify({email}) });
        if (!response.ok) throw new Error("Impossible d’envoyer le lien pour le moment.");
        authScreen("login", "Si cette adresse est inscrite, un lien de réinitialisation va être envoyé."); return;
      }
      if (authMode === "update") {
        const current=cloud.getSession();
        const response=await fetch(`${cloud.config.supabaseUrl.replace(/\/$/,"")}/auth/v1/user`,{method:"PUT",headers:{apikey:cloud.config.supabasePublishableKey,Authorization:`Bearer ${current?.access_token||""}`,"Content-Type":"application/json"},body:JSON.stringify({password:document.getElementById("authPassword").value})});
        if(!response.ok)throw new Error("Le mot de passe n’a pas pu être modifié. Demande un nouveau lien.");
        await cloud.signOut();authScreen("login","Mot de passe modifié. Connecte-toi avec ton nouveau mot de passe.");return;
      }
      const data = authMode === "signup"
        ? await cloud.signUp(email, document.getElementById("authPassword").value, document.getElementById("authName").value.trim())
        : await cloud.signIn(email, document.getElementById("authPassword").value);
      if (!data.access_token) { authScreen("login", "Compte créé. Vérifie ton e-mail puis connecte-toi."); return; }
      await enterAccount(data.user);
    } catch (err) {
      error.innerHTML = `<div class="auth-error">${safe(err.message)}</div>`;
      button.disabled = false; button.textContent = authMode === "signup" ? "Créer mon compte" : "Se connecter";
    }
  }
  async function ensureProfile(user) {
    const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "";
    await cloud.request("profiles?on_conflict=id", { method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify({ id:user.id, display_name:name, country }) });
    const rows = await cloud.list(`profiles?select=id,display_name,country&id=eq.${encodeURIComponent(user.id)}&limit=1`);
    return rows?.[0] || { display_name:name, country:"Burkina Faso" };
  }
  function mapTransaction(row) {
    const date = new Date(row.occurred_at);
    const today = new Date().toDateString() === date.toDateString();
    return { id:row.id, icon:icon(row.category), name:row.label, cat:row.category, date:today ? `Aujourd’hui · ${date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}` : date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}), amount:row.entry_type === "income" ? Number(row.amount_xof) : -Number(row.amount_xof), occurred_at:row.occurred_at };
  }
  async function enterAccount(user) {
    displayName = (user.user_metadata?.display_name || user.email?.split("@")[0] || "").split(/[ ._-]/)[0];
    const profile = await ensureProfile(user);
    country = profile.country || "Burkina Faso";
    const [tx, budgets, goals, plans] = await Promise.all([
      cloud.list("transactions?select=*&order=occurred_at.desc&limit=500"),
      cloud.list(`monthly_budgets?select=*&month_start=eq.${monthStart()}&order=category.asc`),
      cloud.list("savings_goals?select=*&order=created_at.desc"),
      cloud.list("subscriptions?select=*&limit=1")
    ]);
    transactions = (tx || []).map(mapTransaction);
    userBudgets = budgets || []; userGoals = goals || []; subscription = plans?.[0] || null; live = true;
    demoOpenApp();
    document.querySelector(".demo-label").textContent = safe(user.email || "Mon espace");
    document.querySelector(".demo-label").className = "demo-label live-label";
    document.querySelector(".adbar")?.remove(); document.querySelector(".ad-mini")?.remove();
    showPage("home");
  }
  async function launchLive() {
    try {
      let user = await cloud.currentUser();
      if (!user && await cloud.refresh()) user = await cloud.currentUser();
      if (!user) { authScreen("login", "Ta session a expiré. Connecte-toi de nouveau."); return; }
      await enterAccount(user);
    } catch (err) { cloud.saveSession(null); authScreen("login", `Impossible de charger le compte : ${err.message}`); }
  }
  window.openApp = () => {
    if (!cloud.ready) {
      try { const saved=JSON.parse(localStorage.getItem("kori_demo_transactions")||"null"); if(saved) transactions=saved; } catch {}
      live=false; demoOpenApp(); return;
    }
    if (cloud.getSession()) { launchLive(); return; }
    authScreen("login");
  };

  function monthTransactions() {
    const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
    return transactions.filter(t => new Date(t.occurred_at || Date.now()) >= start);
  }
  function spentIn(category) { return monthTransactions().filter(t => t.amount < 0 && (!category || t.cat === category)).reduce((sum,t)=>sum+Math.abs(t.amount),0); }
  function renderLiveHome() {
    const budgetTotal = userBudgets.reduce((n,b)=>n+Number(b.limit_xof),0);
    const spent = spentIn();
    const recent = transactions.slice(0,5);
    const categories = userBudgets.map(b => {
      const used=spentIn(b.category), limit=Number(b.limit_xof), pct=Math.min(100,Math.round(used/limit*100));
      return budgetRow(icon(b.category),safe(b.category),fmt(used),fmt(limit),pct,pct>=100?"red":pct>=80?"orange":"");
    }).join("");
    const goal = userGoals[0];
    return `<div class="welcome"><div><div class="eyebrow">${safe(country.toUpperCase())} · ${safe(currentMonth())}</div><h1>Bonjour${displayName?`, ${safe(displayName)}`:""} !</h1><p>Une dépense à noter ? Ça prend quelques secondes.</p></div><button class="btn primary" onclick="addModal()">＋ &nbsp;Ajouter une dépense</button></div><div class="grid-top"><div class="balance-card"><div class="muted">${budgetTotal ? "IL TE RESTE POUR CE MOIS" : "DÉPENSES NOTÉES CE MOIS"}</div><div class="balance">${fmt(budgetTotal ? Math.max(budgetTotal-spent,0) : spent)} <span>FCFA</span></div><div class="monthdelta">${budgetTotal?`Sur ton budget de ${fmt(budgetTotal)} · ${fmt(spent)} déjà utilisés`:`${transactions.length} opérations enregistrées`}</div><div class="bal-actions"><button class="btn outline" onclick="showPage('budgets')">${budgetTotal?"Voir mes budgets":"Créer mon premier budget"}</button><button class="btn lime" onclick="showPage('goals')">＋ Épargne</button></div></div><div class="stats-small"><div class="statbox"><small>DÉPENSES CE MOIS</small><b>${fmt(spent)}</b><span>${transactions.filter(t=>t.amount<0).length} dépenses notées</span></div><div class="statbox"><small>ENTRÉES D’ARGENT</small><b>${fmt(monthTransactions().filter(t=>t.amount>0).reduce((n,t)=>n+t.amount,0))}</b><span>Ajoute aussi tes revenus</span></div><div class="statbox"><small>BUDGETS CRÉÉS</small><b>${userBudgets.length}</b><span>${budgetTotal?`${fmt(budgetTotal)} au total`:`Commence par une catégorie`}</span></div><div class="statbox"><small>OBJECTIF EN COURS</small><b>${goal?`${Math.min(100,Math.round(goal.saved_xof/goal.target_xof*100))}%`:"—"}</b><span>${goal?safe(goal.name):"Crée ton premier projet"}</span></div></div></div><div class="two-col"><div class="panel"><div class="panel-head"><div><h2>Mes budgets</h2><p>Ce mois-ci · ${safe(currentMonth())}</p></div><button class="seeall" onclick="showPage('budgets')">Tout voir →</button></div><div class="budgets">${categories||`<div class="empty">Aucun budget pour le moment.<br><button class="btn primary" style="margin-top:10px" onclick="budgetModal()">Créer un budget</button></div>`}</div></div><div class="panel"><div class="panel-head"><div><h2>Mon épargne</h2><p>Un objectif à la fois</p></div><button class="seeall" onclick="showPage('goals')">Tout voir →</button></div>${goal?`<div style="padding:19px 3px"><div style="font-size:24px">🎯</div><h3 style="font:700 14px Manrope">${safe(goal.name)}</h3><div class="track" style="height:8px;margin:14px 0 8px"><i style="width:${Math.min(100,goal.saved_xof/goal.target_xof*100)}%"></i></div><div style="font-size:10px">${fmt(goal.saved_xof)} <span style="color:var(--muted)">sur ${fmt(goal.target_xof)}</span></div><button class="btn outline" style="margin-top:12px" onclick="contributeGoal('${goal.id}')">＋ Ajouter à l’objectif</button></div>`:`<div class="empty">Un projet en tête ?<br><button class="btn outline" style="margin-top:10px" onclick="goalModal()">Créer un objectif</button></div>`}</div></div><div class="panel transaction-panel"><div class="panel-head"><div><h2>Dernières opérations</h2><p>Les mouvements de ton compte</p></div><button class="seeall" onclick="showPage('transactions')">Tout voir →</button></div>${recent.length?liveTransactionTable(recent):`<div class="empty">Pas encore d’opération. Note ta première dépense avec le bouton +.</div>`}</div>${adSlot()}`;
  }
  function liveTransactionTable(rows) {
    return `<div class="scroll"><table class="transactions"><thead><tr><th>OPÉRATION</th><th>CATÉGORIE</th><th>DATE</th><th style="text-align:right">MONTANT</th><th></th></tr></thead><tbody>${rows.map(t=>`<tr><td><div class="what"><span class="tx-icon">${icon(t.cat)}</span>${safe(t.name)}</div></td><td>${safe(t.cat)}</td><td>${safe(t.date)}</td><td style="text-align:right" class="${t.amount>0?"pos":"neg"}">${t.amount>0?"+":"−"} ${fmt(t.amount)}</td><td><button class="seeall" aria-label="Supprimer" onclick="deleteTransaction('${t.id}')">×</button></td></tr>`).join("")}</tbody></table></div>`;
  }
  function renderLiveTransactions() {
    return `<div class="page-head"><div><div class="eyebrow">${safe(country.toUpperCase())}</div><h1>Mes opérations</h1><p>Tout ce qui entre et sort, réuni au même endroit.</p></div><button class="btn primary" onclick="addModal()">＋ Ajouter</button></div><div class="toolrow"><input class="search" id="liveSearch" placeholder="Rechercher..."><select class="select" id="liveFilter"><option value="">Toutes les catégories</option>${[...new Set(transactions.map(t=>t.cat))].map(c=>`<option>${safe(c)}</option>`).join("")}</select></div><div class="txlist" id="liveRows">${transactions.length?liveTransactionTable(transactions):`<div class="empty">Tu n’as pas encore ajouté d’opération.</div>`}</div>`;
  }
  function renderLiveBudgets() {
    return `<div class="page-head"><div><div class="eyebrow">${safe(currentMonth())}</div><h1>Mes budgets</h1><p>Choisis combien tu veux consacrer à chaque catégorie.</p></div><button class="btn primary" onclick="budgetModal()">＋ Créer un budget</button></div><div class="panel"><div class="panel-head"><div><h2>Ce mois-ci</h2><p>${fmt(userBudgets.reduce((n,b)=>n+Number(b.limit_xof),0))} prévus · ${fmt(spentIn())} dépensés</p></div></div><div class="budgets">${userBudgets.map(b=>{let used=spentIn(b.category),lim=Number(b.limit_xof),pct=Math.min(100,Math.round(used/lim*100));return `<div class="budget"><div class="budget-line"><span><i class="emoji">${icon(b.category)}</i>${safe(b.category)}</span><span><b>${fmt(used)}</b> <small>/ ${fmt(lim)}</small> <button class="seeall" onclick="editBudget('${b.id}')">Modifier</button></span></div><div class="track"><i class="${pct>=100?"red":pct>=80?"orange":""}" style="width:${pct}%"></i></div><div class="budget-foot">${pct}% utilisé · <button class="seeall" onclick="deleteBudget('${b.id}')">Supprimer</button></div></div>`;}).join("")||`<div class="empty">Définis une limite pour commencer à suivre ton budget.</div>`}</div></div>`;
  }
  function renderLiveGoals() {
    return `<div class="page-head"><div><div class="eyebrow">PETIT À PETIT</div><h1>Mes projets d’épargne</h1><p>Fixe un objectif et suis tes progrès, sans pression.</p></div><button class="btn primary" onclick="goalModal()">＋ Nouvel objectif</button></div><div class="two-col">${userGoals.map(g=>{let pct=Math.min(100,Math.round(Number(g.saved_xof)/Number(g.target_xof)*100));return `<div class="panel"><div style="font-size:25px">🎯</div><h2 style="font:700 15px Manrope">${safe(g.name)}</h2><p style="font-size:10px;color:var(--muted)">Objectif : ${fmt(g.target_xof)}${g.due_date?` · Pour le ${safe(new Date(g.due_date+"T12:00:00").toLocaleDateString("fr-FR"))}`:""}</p><div class="track" style="height:8px;margin:15px 0 8px"><i style="width:${pct}%"></i></div><div style="font-size:10px"><b>${fmt(g.saved_xof)}</b> <span style="color:var(--muted)">économisés · ${pct}%</span></div><button class="btn outline" style="margin-top:14px" onclick="contributeGoal('${g.id}')">＋ Ajouter une somme</button><button class="seeall" style="float:right;margin-top:25px" onclick="deleteGoal('${g.id}')">Supprimer</button></div>`;}).join("")||`<div class="panel empty">Quel est ton prochain projet ?<br><button class="btn primary" style="margin-top:12px" onclick="goalModal()">Créer mon premier objectif</button></div>`}<div class="panel" style="background:#eff5e9"><div class="eyebrow">UN PAS À LA FOIS</div><h2 style="font:700 16px Manrope">L’épargne commence par une idée.</h2><p style="font-size:10px;color:var(--muted);line-height:1.7">Choisis un projet et ajoute une somme quand tu le peux.</p></div></div>`;
  }
  function adSlot() {
    const client=cloud.config.adsenseClient, slot=cloud.config.adsenseSlot;
    if (!client || !slot) return "";
    return `<div class="adbar"><span class="adlabel">PUB</span><ins class="adsbygoogle" style="display:block" data-ad-client="${safe(client)}" data-ad-slot="${safe(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
  }
  function renderPlans() {
    const active=subscription?.status==="active" && new Date(subscription.ends_at)>new Date();
    const price=Number(cloud.config.plusPriceXof)||0;
    const priceLabel=price?fmt(price):"Tarif à définir";
    return `<div class="page-head"><div><div class="eyebrow">SIMPLE ET TRANSPARENT</div><h1>Kori Plus</h1><p>La version gratuite suffit pour commencer. Passe à Plus si tu veux une expérience sans publicité.</p></div></div><div class="two-col"><div class="panel"><div class="eyebrow">GRATUIT</div><h2 style="font:700 24px Manrope">0 FCFA</h2><p style="font-size:10px;color:var(--muted);line-height:1.7">Transactions, budgets et objectifs d’épargne. Les publicités peuvent aider à financer la version gratuite.</p><span class="statuspill">${active?"Inclus":"Formule actuelle"}</span></div><div class="panel" style="border-color:#90ae79"><div class="eyebrow">KORI PLUS</div><h2 style="font:700 24px Manrope">${priceLabel} ${price?`<small style="font:500 10px 'DM Sans'">/ mois</small>`:""}</h2><p style="font-size:10px;color:var(--muted);line-height:1.7">Sans publicité et avec toutes tes opérations conservées dans ton compte.</p>${active?`<span class="statuspill">Actif jusqu’au ${safe(new Date(subscription.ends_at).toLocaleDateString("fr-FR"))}</span>`:price?`<button class="btn primary" onclick="payModal()">Payer avec Mobile Money →</button>`:`<span class="statuspill">Prix à confirmer avant lancement</span>`}<p style="font-size:9px;color:#9aa39b;margin-top:12px">Renouvellement manuel. Paiement confirmé côté serveur.</p></div></div>`;
  }
  function updateNavigation(id) {
    document.querySelectorAll(".mobile-nav [data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  }
  window.showPage = function(id) {
    if (!live) { demoShowPage(id); updateNavigation(id); return; }
    activePage=id; updateNavigation(id);
    const labels={home:"Vue d’ensemble",transactions:"Opérations",budgets:"Mes budgets",goals:"Projets",settings:"Préférences",plans:"Kori Plus"};
    document.getElementById("bread").textContent=labels[id]||labels.home;
    const view=document.getElementById("view");
    view.innerHTML=id==="home"?renderLiveHome():id==="transactions"?renderLiveTransactions():id==="budgets"?renderLiveBudgets():id==="goals"?renderLiveGoals():id==="plans"?renderPlans():id==="settings"?renderSettings():renderLiveHome();
    if(id==="transactions") {
      const q=document.getElementById("liveSearch"), f=document.getElementById("liveFilter");
      const filter=()=>{const rows=transactions.filter(t=>(t.name+t.cat).toLowerCase().includes(q.value.toLowerCase())&&(!f.value||f.value===t.cat));document.getElementById("liveRows").innerHTML=rows.length?liveTransactionTable(rows):`<div class="empty">Aucun résultat.</div>`;};
      q.oninput=filter; f.onchange=filter;
    }
    document.querySelector(".side")?.classList.remove("open"); document.getElementById("overlay")?.classList.remove("show");
    if(cloud.config.adsenseClient&&cloud.config.adsenseSlot){document.querySelectorAll(".adsbygoogle").forEach(()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch{}});}
  };
  function renderSettings() {
    return `<div class="page-head"><div><div class="eyebrow">MON COMPTE</div><h1>Préférences</h1><p>Tu peux changer ton pays à tout moment.</p></div><button class="btn outline" onclick="cloudSignOut()">Se déconnecter</button></div><div class="panel" style="max-width:620px"><h2 style="font:700 13px Manrope">Mon pays</h2><p style="font-size:10px;color:var(--muted)">Les montants de Kori sont affichés en franc CFA (XOF).</p><button class="country" style="max-width:300px" onclick="countryModal()"><span class="flag">${countries.find(c=>c[1]===country)?.[0]}</span><span><b>${safe(country)}</b><small>UEMOA · FCFA (XOF)</small></span><span class="down">Changer ⌄</span></button><div style="border-top:1px solid var(--line);padding-top:14px"><h2 style="font:700 13px Manrope">Mon compte</h2><p style="font-size:10px;color:var(--muted)">${safe(cloud.getSession()?.user?.email||"")}</p><button class="btn outline" onclick="cloudSignOut()">Se déconnecter</button></div><div style="border-top:1px solid var(--line);padding-top:14px;margin-top:14px"><h2 style="font:700 13px Manrope">Supprimer le compte</h2><p style="font-size:10px;color:var(--muted);line-height:1.6">La suppression efface aussi les budgets, opérations et objectifs de ce compte. Cette action ne peut pas être annulée.</p><button class="btn outline" style="color:#b24e45" onclick="deleteKoriAccount()">Supprimer définitivement mon compte</button></div></div>`;
  }
  window.countryModal = function() {
    const opts=countries.map(c=>`<option ${c[1]===country?"selected":""}>${safe(c[1])}</option>`).join("");
    modal(`<h2>Choisir ton pays</h2><p>Ta devise reste le franc CFA (XOF).</p><div class="field"><label>Pays</label><select id="countryChoice">${opts}</select></div><div class="modal-actions"><button class="btn outline" onclick="document.querySelector('.modalback').remove()">Annuler</button><button class="btn primary" onclick="saveCountry()">Enregistrer</button></div>`);
  };
  window.saveCountry = async function() {
    const next=document.getElementById("countryChoice").value; country=next;
    try { await cloud.update("profiles",`id=eq.${cloud.getSession().user.id}`,{country:next}); }
    catch(err){ toast(`Pays modifié sur cet écran. ${err.message}`); }
    document.querySelector(".modalback")?.remove(); showPage(activePage); toast("Pays mis à jour.");
  };
  window.cloudSignOut = async function() { await cloud.signOut(); live=false; location.search=""; root.innerHTML=landing(); toast("Tu es déconnecté."); };
  window.deleteKoriAccount = async function() {
    if(!confirm("Supprimer définitivement le compte et toutes les données Kori ?"))return;
    if(prompt('Pour confirmer, écris SUPPRIMER')!=="SUPPRIMER")return;
    try{const response=await fetch("/api/delete-account",{method:"POST",headers:{Authorization:`Bearer ${cloud.getSession().access_token}`}});const data=await response.json();if(!response.ok)throw new Error(data.error||"Suppression impossible.");await cloud.signOut();live=false;root.innerHTML=landing();toast("Compte et données supprimés.");}catch(err){toast(err.message);}
  };
  window.saveTx = async function() {
    const amount=Number(document.getElementById("txamount")?.value);
    if(!amount||amount<1){toast("Indique un montant supérieur à zéro.");return;}
    const type=txType||"expense";
    const category=document.getElementById("txcat").value;
    const labels={Alimentation:"Courses",Transport:"Transport",Maison:"Maison",Factures:"Facture","Sant\u00e9":"Santé",Revenus:"Revenu",Autre:"Autre dépense"};
    const label=document.getElementById("txname").value.trim()||labels[category]||category;
    const row={label,category,entry_type:type,amount_xof:Math.round(amount),occurred_at:new Date().toISOString()};
    try {
      let saved;
      if(live) saved=(await cloud.insert("transactions",row))[0];
      else saved={...row,id:crypto.randomUUID()};
      transactions.unshift(mapTransaction(saved));
      document.querySelector(".modalback")?.remove();
      if(!live)localStorage.setItem("kori_demo_transactions",JSON.stringify(transactions));
      showPage(activePage); toast("Opération enregistrée.");
    } catch(err) { toast(`Enregistrement impossible : ${err.message}`); }
  };
  window.deleteTransaction = async function(id) {
    if(!confirm("Supprimer cette opération ?"))return;
    try { if(live)await cloud.remove("transactions",`id=eq.${encodeURIComponent(id)}`); transactions=transactions.filter(t=>t.id!==id);showPage(activePage);toast("Opération supprimée."); }
    catch(err){toast(`Suppression impossible : ${err.message}`);}
  };
  window.budgetModal = function(id="") {
    const existing=userBudgets.find(b=>b.id===id);
    const cats=["Alimentation","Transport","Maison","Factures","Santé","Autre"];
    modal(`<h2>${existing?"Modifier":"Créer"} un budget</h2><p>Choisis une catégorie et une limite pour ${safe(currentMonth())}.</p><div class="field"><label>Catégorie</label><select id="budgetCategory" ${existing?"disabled":""}>${cats.map(c=>`<option ${existing?.category===c?"selected":""}>${safe(c)}</option>`).join("")}</select></div><div class="field"><label>Limite mensuelle (FCFA)</label><input id="budgetAmount" type="number" min="1" value="${existing?Number(existing.limit_xof):""}" placeholder="Ex. 40 000"></div><div class="modal-actions"><button class="btn outline" onclick="document.querySelector('.modalback').remove()">Annuler</button><button class="btn primary" onclick="saveBudget('${id}')">Enregistrer</button></div>`);
  };
  window.editBudget = id => budgetModal(id);
  window.saveBudget = async function(id="") {
    const category=document.getElementById("budgetCategory").value, amount=Number(document.getElementById("budgetAmount").value);
    if(amount<1){toast("Entre une limite supérieure à zéro.");return;}
    const month=monthStart();
    try {
      if(id) await cloud.update("monthly_budgets",`id=eq.${encodeURIComponent(id)}`,{limit_xof:Math.round(amount)});
      else await cloud.insert("monthly_budgets",{category,month_start:month,limit_xof:Math.round(amount)});
      const rows=await cloud.list(`monthly_budgets?select=*&month_start=eq.${month}&order=category.asc`);userBudgets=rows||[];
      document.querySelector(".modalback")?.remove();showPage("budgets");toast("Budget enregistré.");
    } catch(err){toast(`Budget non enregistré : ${err.message}`);}
  };
  window.deleteBudget = async function(id) {
    if(!confirm("Supprimer ce budget ?"))return;
    try{await cloud.remove("monthly_budgets",`id=eq.${encodeURIComponent(id)}`);userBudgets=userBudgets.filter(b=>b.id!==id);showPage("budgets");toast("Budget supprimé.");}catch(err){toast(`Suppression impossible : ${err.message}`);}
  };
  window.goalModal = function() {
    modal(`<h2>Créer un objectif</h2><p>Un projet qui te motive, un montant à viser.</p><div class="field"><label>Nom de mon projet</label><input id="goalName" maxlength="100" placeholder="Ex. Rentrée scolaire"></div><div class="field"><label>Montant à atteindre (FCFA)</label><input id="goalAmount" type="number" min="1" placeholder="Ex. 75 000"></div><div class="field"><label>Date visée (facultatif)</label><input id="goalDate" type="date"></div><div class="modal-actions"><button class="btn outline" onclick="document.querySelector('.modalback').remove()">Annuler</button><button class="btn primary" onclick="saveGoal()">Créer mon objectif</button></div>`);
  };
  window.saveGoal = async function() {
    const name=document.getElementById("goalName").value.trim(), amount=Number(document.getElementById("goalAmount").value), due=document.getElementById("goalDate").value||null;
    if(!name||amount<1){toast("Ajoute un nom et un montant valide.");return;}
    try{await cloud.insert("savings_goals",{name,target_xof:Math.round(amount),saved_xof:0,due_date:due});userGoals=await cloud.list("savings_goals?select=*&order=created_at.desc")||[];document.querySelector(".modalback")?.remove();showPage("goals");toast("Objectif créé.");}catch(err){toast(`Objectif non enregistré : ${err.message}`);}
  };
  window.deleteGoal = async function(id) {
    if(!confirm("Supprimer cet objectif ?"))return;
    try{await cloud.remove("savings_goals",`id=eq.${encodeURIComponent(id)}`);userGoals=userGoals.filter(g=>g.id!==id);showPage("goals");toast("Objectif supprimé.");}catch(err){toast(`Suppression impossible : ${err.message}`);}
  };
  window.contributeGoal = function(id) {
    const goal=userGoals.find(g=>g.id===id); if(!goal)return;
    modal(`<h2>Ajouter à ton projet</h2><p>${safe(goal.name)} · ${fmt(goal.saved_xof)} économisés sur ${fmt(goal.target_xof)}.</p><div class="field"><label>Somme à ajouter (FCFA)</label><input id="contributionAmount" type="number" min="1" placeholder="Ex. 2 000"></div><div class="modal-actions"><button class="btn outline" onclick="document.querySelector('.modalback').remove()">Annuler</button><button class="btn primary" onclick="saveContribution('${id}')">Ajouter</button></div>`);
  };
  window.saveContribution = async function(id) {
    const amount=Number(document.getElementById("contributionAmount").value),goal=userGoals.find(g=>g.id===id);if(amount<1||!goal){toast("Entre une somme valide.");return;}
    try{const updated=(await cloud.update("savings_goals",`id=eq.${encodeURIComponent(id)}`,{saved_xof:Number(goal.saved_xof)+Math.round(amount)}))[0];userGoals=userGoals.map(g=>g.id===id?updated:g);document.querySelector(".modalback")?.remove();showPage("goals");toast("Progression mise à jour.");}catch(err){toast(`Mise à jour impossible : ${err.message}`);}
  };
  window.payModal = function() {
    const price=Number(cloud.config.plusPriceXof)||0;
    if(!price){modal(`<h2>Prix Kori Plus à définir</h2><p>Les paiements sont désactivés tant que le tarif mensuel n’est pas fixé.</p><div class="modal-actions"><button class="btn primary" onclick="document.querySelector('.modalback').remove()">Compris</button></div>`);return;}
    if(country!=="Burkina Faso"){modal(`<h2>Paiement dans ${safe(country)}</h2><p>Le moyen de paiement local doit encore être relié à Kori. Tu peux utiliser gratuitement les fonctions principales en attendant.</p><div class="modal-actions"><button class="btn primary" onclick="document.querySelector('.modalback').remove()">Compris</button></div>`);return;}
    modal(`<h2>Passer à Kori Plus</h2><p>${fmt(price)} pour un mois · renouvellement manuel. Choisis un moyen de paiement.</p><div class="radio-row"><button class="radio-option selected" data-provider="wave" onclick="selectProvider(this)">Wave</button><button class="radio-option" data-provider="cinetpay" onclick="selectProvider(this)">Orange Money · CinetPay</button></div><p style="font-size:9px;color:var(--muted);margin-top:10px">Tu seras redirigé vers le paiement sécurisé du prestataire.</p><div class="modal-actions"><button class="btn outline" onclick="document.querySelector('.modalback').remove()">Annuler</button><button class="btn primary" id="payContinue" onclick="startCheckout()">Continuer · ${fmt(price)}</button></div>`);
  };
  window.selectProvider = button => {document.querySelectorAll("[data-provider]").forEach(x=>x.classList.remove("selected"));button.classList.add("selected");};
  window.startCheckout = async function() {
    const provider=document.querySelector("[data-provider].selected")?.dataset.provider||"wave", button=document.getElementById("payContinue");
    button.disabled=true;button.textContent="Préparation du paiement…";
    try {const response=await fetch("/api/create-checkout",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${cloud.getSession().access_token}`},body:JSON.stringify({provider})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Paiement indisponible.");location.href=data.payment_url;}
    catch(err){button.disabled=false;button.textContent="Réessayer";toast(err.message);}
  };
  async function verifyReturn() {
    const params=new URLSearchParams(location.search), ref=params.get("ref");
    if(!ref||!cloud.getSession()?.access_token)return;
    try {const response=await fetch("/api/verify-checkout",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${cloud.getSession().access_token}`},body:JSON.stringify({reference:ref})});const data=await response.json();if(response.ok&&data.paid){subscription=data.subscription;toast("Kori Plus est activé.");}history.replaceState({},"",location.pathname);}
    catch { history.replaceState({},"",location.pathname); }
  }
  window.openApp = () => {
    if(!cloud.ready){live=false;demoOpenApp();return;}
    if(cloud.getSession())launchLive();else authScreen("login");
  };
  window.addEventListener("DOMContentLoaded",async()=>{
    if(!cloud.ready){
      try{const saved=JSON.parse(localStorage.getItem("kori_demo_transactions")||"null");if(saved)transactions=saved;}catch{}
      const demoSave=window.saveTx;
      window.saveTx=function(){const previous=transactions.length;demoSave();if(transactions.length>previous)localStorage.setItem("kori_demo_transactions",JSON.stringify(transactions));};
      return;
    }
    document.querySelectorAll(".adbar,.ad-mini").forEach(el=>el.remove());
    if(cloud.config.adsenseClient&&cloud.config.adsenseSlot){const script=document.createElement("script");script.async=true;script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cloud.config.adsenseClient)}`;script.crossOrigin="anonymous";document.head.append(script);}
    const recovery=new URLSearchParams(location.hash.slice(1));
    if(recovery.get("type")==="recovery"&&recovery.get("access_token")){
      cloud.saveSession({access_token:recovery.get("access_token"),refresh_token:recovery.get("refresh_token"),token_type:"bearer",user:null});
      history.replaceState({},"",`${location.pathname}?mode=update`);authScreen("update");return;
    }
    if(cloud.getSession())await launchLive();
    if(new URLSearchParams(location.search).has("ref"))await verifyReturn();
  });
})();
