/* Home Care Solutions — onboarding admin */
(() => {
  const C = window.HCS_CONFIG, K = window.HCSCrypto;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey);
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let sealed = null, privKey = null, rows = [], lockTimer = null;
  const AUTO_LOCK_MS = 15 * 60 * 1000;

  function show(id) { document.querySelectorAll(".view").forEach(v => v.classList.toggle("show", v.id === id)); }
  function msg(id, text, kind = "err") { const m = $(id); m.className = `msg ${kind}` + (text ? " show" : ""); m.textContent = text || ""; }
  function busy(btn, on, label) { btn.disabled = on; if (label) btn.textContent = label; }

  /* ---------- auth ---------- */
  async function init() {
    const { data } = await sb.auth.getSession();
    if (data.session) await afterLogin(data.session); else show("v-login");
  }
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault(); msg("#l-msg", "");
    const btn = $("#l-btn"); busy(btn, true, "Signing in…");
    const { data, error } = await sb.auth.signInWithPassword({ email: $("#l-email").value.trim(), password: $("#l-pass").value });
    busy(btn, false, "Sign In");
    if (error) { msg("#l-msg", error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message); return; }
    $("#l-pass").value = "";
    await afterLogin(data.session);
  });
  document.querySelectorAll("[data-signout]").forEach(b => b.addEventListener("click", async () => {
    lock(); await sb.auth.signOut(); rows = []; show("v-login");
  }));
  async function afterLogin(session) {
    $("#who").textContent = session.user.email;
    const { data, error } = await sb.from("onboarding_keys").select("public_key, encrypted_private_key").eq("id", 1).maybeSingle();
    if (error) { show("v-main"); msg("#u-msg", "Could not load encryption settings: " + error.message); return; }
    if (!data) { show("v-setup"); return; }
    sealed = data.encrypted_private_key;
    show("v-main"); renderLock(); await loadRows();
  }

  /* ---------- setup ---------- */
  $("#setup-form").addEventListener("submit", async e => {
    e.preventDefault(); msg("#s-msg", "");
    const p1 = $("#s-pass").value, p2 = $("#s-pass2").value;
    if (p1.length < 12) return msg("#s-msg", "Use at least 12 characters.");
    if (p1 !== p2) return msg("#s-msg", "Passphrases don’t match.");
    const btn = $("#s-btn"); busy(btn, true, "Generating keys…");
    try {
      const { publicJwk, pkcs8 } = await K.generateKeyPair();
      const seal = await K.sealPrivateKey(pkcs8, p1);
      const { error } = await sb.from("onboarding_keys").insert({ id: 1, public_key: publicJwk, encrypted_private_key: seal });
      if (error) throw new Error(error.message);
      sealed = seal;
      privKey = (await K.openPrivateKey(sealed, p1)).key;
      $("#s-pass").value = $("#s-pass2").value = "";
      show("v-main"); renderLock(); armAutoLock(); await loadRows();
    } catch (err) { msg("#s-msg", "Activation failed: " + err.message); }
    busy(btn, false, "Activate");
  });

  /* ---------- lock / unlock ---------- */
  function renderLock() {
    const on = !!privKey, pill = $("#lock-pill");
    pill.className = "status-pill " + (on ? "unlocked" : "locked");
    pill.innerHTML = on ? "&#128275; Unlocked" : "&#128274; Locked";
    $("#unlock-form").classList.toggle("unlocked", on);
    $("#u-pass").style.display = on ? "none" : "";
    $("#u-btn").textContent = on ? "Lock" : "Unlock";
    document.querySelectorAll("[data-dl]").forEach(b => { b.disabled = !on; b.title = on ? "" : "Unlock with your passphrase first"; });
  }
  function lock() { privKey = null; clearTimeout(lockTimer); renderLock(); }
  function armAutoLock() { clearTimeout(lockTimer); lockTimer = setTimeout(lock, AUTO_LOCK_MS); }
  ["click", "keydown"].forEach(ev => document.addEventListener(ev, () => { if (privKey) armAutoLock(); }));
  $("#unlock-form").addEventListener("submit", async e => {
    e.preventDefault(); msg("#u-msg", "");
    if (privKey) { lock(); return; }
    const btn = $("#u-btn"); busy(btn, true, "Unlocking…");
    try { privKey = (await K.openPrivateKey(sealed, $("#u-pass").value)).key; $("#u-pass").value = ""; armAutoLock(); }
    catch (err) { msg("#u-msg", err.message === "Incorrect passphrase" ? "Incorrect passphrase." : err.message); }
    btn.disabled = false; renderLock();
  });

  /* ---------- list ---------- */
  async function loadRows() {
    const { data, error } = await sb.from("onboarding_submissions").select("id, created_at, employee_name, packet_type, object_path").order("created_at", { ascending: false });
    if (error) { msg("#u-msg", "Could not load submissions: " + error.message); return; }
    rows = data || [];
    $("#empty").style.display = rows.length ? "none" : "";
    $("#rows").innerHTML = rows.map((r, i) => {
      const d = new Date(r.created_at);
      const when = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const t = r.packet_type === "contractor" ? '<span class="type-tag contractor">Contractor · W-9</span>' : '<span class="type-tag">Employee · W-4</span>';
      return `<tr><td>${esc(when)}</td><td><b>${esc(r.employee_name)}</b></td><td>${t}</td><td class="ref">${esc(r.object_path.slice(0, 8).toUpperCase())}</td>
        <td class="actions"><button class="btn sm" data-dl="${i}">Download PDF</button><button class="btn quiet sm" data-del="${i}">Delete</button></td></tr>`;
    }).join("");
    $("#rows").querySelectorAll("[data-dl]").forEach(b => b.addEventListener("click", () => download(rows[+b.dataset.dl], b)));
    $("#rows").querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => remove(rows[+b.dataset.del])));
    renderLock();
  }
  $("#refresh").addEventListener("click", loadRows);

  async function download(r, btn) {
    if (!privKey) { msg("#u-msg", "Enter your passphrase and unlock first."); $("#u-pass").focus(); return; }
    msg("#u-msg", ""); const label = btn.textContent; busy(btn, true, "Decrypting…");
    try {
      const { data, error } = await sb.storage.from(C.bucket).download(r.object_path);
      if (error) throw new Error(error.message);
      const pdf = await K.decryptEnvelope(privKey, new Uint8Array(await data.arrayBuffer()));
      const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `HCS-Onboarding-${r.employee_name.replace(/[^\w-]+/g, "-")}-${r.created_at.slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { msg("#u-msg", "Could not open this packet: " + err.message); }
    busy(btn, false, label); renderLock();
  }

  function confirmDelete(name) {
    const dlg = $("#confirm-dlg");
    $("#confirm-text").textContent = `This permanently removes ${name}'s encrypted packet. Download it first if you need a copy.`;
    return new Promise(res => {
      const done = v => { dlg.close(); $("#confirm-yes").onclick = $("#confirm-no").onclick = null; res(v); };
      $("#confirm-yes").onclick = () => done(true);
      $("#confirm-no").onclick = () => done(false);
      dlg.addEventListener("cancel", () => res(false), { once: true });
      dlg.showModal();
    });
  }
  async function remove(r) {
    if (!(await confirmDelete(r.employee_name))) return;
    const st = await sb.storage.from(C.bucket).remove([r.object_path]);
    if (st.error) { msg("#u-msg", "Delete failed: " + st.error.message); return; }
    const { error } = await sb.from("onboarding_submissions").delete().eq("id", r.id);
    if (error) { msg("#u-msg", "File removed but the list entry could not be deleted: " + error.message); }
    await loadRows();
  }

  /* ---------- change passphrase ---------- */
  $("#change-form").addEventListener("submit", async e => {
    e.preventDefault(); msg("#c-msg", "");
    const oldP = $("#c-old").value, n1 = $("#c-new").value, n2 = $("#c-new2").value;
    if (n1.length < 12) return msg("#c-msg", "Use at least 12 characters.");
    if (n1 !== n2) return msg("#c-msg", "New passphrases don’t match.");
    const btn = $("#c-btn"); busy(btn, true, "Updating…");
    try {
      const { pkcs8 } = await K.openPrivateKey(sealed, oldP);
      const seal = await K.sealPrivateKey(pkcs8, n1);
      const { error } = await sb.from("onboarding_keys").update({ encrypted_private_key: seal, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) throw new Error(error.message);
      sealed = seal; e.target.reset();
      msg("#c-msg", "Passphrase updated. Use the new one from now on.", "ok");
    } catch (err) { msg("#c-msg", err.message === "Incorrect passphrase" ? "Current passphrase is incorrect." : "Update failed: " + err.message); }
    busy(btn, false, "Update passphrase");
  });

  init();
})();
