/* Home Care Solutions — new hire onboarding portal */
(() => {
  const C = window.HCS_CONFIG, D = window.HCS_DOCS;
  const form = document.getElementById("ob-form");
  const steps = [...form.querySelectorAll(".app-step")];
  const DRAFT = "hcs-onboarding-draft-v1";
  const SKIP_SAVE = new Set(["botcheck", "signature", "sigDate", "esignConsent"]);
  let step = 0, pdfUrl = null;

  const $ = s => document.querySelector(s);
  const els = n => [...form.querySelectorAll(`[name="${n}"]`)];
  function val(n) {
    const list = els(n); if (!list.length) return "";
    const e = list[0];
    if (e.type === "radio") { const c = list.find(x => x.checked); return c ? c.value : ""; }
    if (e.type === "checkbox") return e.checked;
    return e.value.trim();
  }
  const digits = s => String(s || "").replace(/\D/g, "");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mdY = iso => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${m}/${d}/${y}`; };
  const today = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`; };
  const money = n => Number(n || 0).toLocaleString("en-US");
  const fullName = () => [val("first"), val("middle"), val("last")].filter(Boolean).join(" ");
  const fmtSSN = s => { const d = digits(s); return d.length === 9 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : s; };
  const mask = s => { const d = digits(s); return d ? "•••• " + d.slice(-4) : ""; };

  /* ---------- document rendering ---------- */
  function blocksToHtml(blocks) {
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list.tag}>`; list = null; } };
    for (const [kind, text] of blocks) {
      if (kind === "title" || kind === "initials" || kind === "choice") continue;
      if (kind === "ol" || kind === "ul" || kind === "ul2") {
        const tag = kind === "ol" ? "ol" : "ul", cls = kind === "ul2" ? ' class="sub"' : "";
        if (!list || list.kind !== kind) { close(); html += `<${tag}${cls}>`; list = { kind, tag }; }
        html += `<li>${text}</li>`; continue;
      }
      close();
      if (kind === "h") html += `<h4>${text}</h4>`;
      else if (kind === "attest") html += `<p class="attest">${text}</p>`;
      else html += `<p>${text}</p>`;
    }
    close(); return html;
  }

  const AGREEMENTS = [
    ["coe", "Condition of Employment", "PRN assignments and employment conditions"],
    ["jd", "Job Description — PCA / CNA", "Duties and responsibilities"],
    ["ethics", "Personnel Code of Ethics", "17 standards of conduct"],
    ["rights", "Clients Rights and Responsibilities", "What every client is entitled to"],
    ["protection", "Client Protection Assurances", "Abuse prevention and reporting"],
    ["infection", "Infection Control", "Universal precautions; TB & Hepatitis B reporting"],
    ["abuse", "Abuse Statement", "Attestation of no history of abuse"],
  ];
  function renderAgreements() {
    const box = $("#docs-list");
    box.innerHTML = AGREEMENTS.map(([k, t, sub], i) => {
      const note = k === "abuse" ? `<div class="doc-note">The witness and notary portion of this statement is completed with the office at orientation.</div>` : "";
      return `<div class="doc" data-doc="${k}">
        <div class="doc-head" role="button" tabindex="0" aria-expanded="false"><span class="doc-num">${i + 1}</span><span class="doc-title">${t}<small>${sub}</small></span><span class="doc-chev">&#9660;</span></div>
        <div class="doc-body"><div class="doc-text">${blocksToHtml(D[k])}</div>${note}
          <div class="doc-foot"><input type="checkbox" id="agree-${k}" name="agree_${k}" value="1" required disabled/><label for="agree-${k}">I have read and agree to the <b>${t}</b>.</label></div></div></div>`;
    }).join("");
    $("#agree-total").textContent = AGREEMENTS.length;
    box.querySelectorAll(".doc").forEach(d => {
      const head = d.querySelector(".doc-head");
      const toggle = () => { d.classList.toggle("open"); head.setAttribute("aria-expanded", d.classList.contains("open")); d.querySelector("input").disabled = false; };
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
    $("#expand-next").addEventListener("click", () => {
      const next = [...box.querySelectorAll(".doc")].find(d => !d.querySelector("input").checked);
      if (!next) return;
      box.querySelectorAll(".doc.open").forEach(d => d.classList.remove("open"));
      next.classList.add("open"); next.querySelector("input").disabled = false;
      next.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    updateAgreeCount();
  }
  function updateAgreeCount() {
    let n = 0;
    document.querySelectorAll("#docs-list .doc").forEach(d => { const on = d.querySelector("input").checked; d.classList.toggle("agreed", on); if (on) n++; });
    $("#agree-count").textContent = n;
  }

  let POLICIES = [];
  function renderPolicies() {
    const b = D.policies; let i = 0; const intro = [];
    while (i < b.length && b[i][0] !== "h") { if (b[i][0] === "p") intro.push(b[i][1]); else if (b[i][0] === "ol") intro.push(b[i][1]); i++; }
    $("#policies-intro").innerHTML = esc(intro[0] || "") + " " + intro.slice(1).map((t, j) => `${j + 1}) ${esc(t)}`).join(" ");
    POLICIES = [];
    for (; i < b.length; i++) {
      if (b[i][0] === "h") POLICIES.push({ title: b[i][1], paras: [], choice: false });
      else if (b[i][0] === "p" && POLICIES.length) POLICIES[POLICIES.length - 1].paras.push(b[i][1]);
      else if (b[i][0] === "choice") POLICIES[POLICIES.length - 1].choice = true;
      else if (b[i][0] === "initials") POLICIES[POLICIES.length - 1].field = b[i][1];
      else if (b[i][0] === "attest") break;
    }
    POLICIES = POLICIES.filter(p => p.field);
    $("#policies-list").innerHTML = POLICIES.map((p, n) => {
      const choice = p.choice ? `<div class="chip-set" style="margin:0.25rem 0 0.75rem;"><label><input type="radio" name="fpDeduction" value="One payment" required/><span>$53.00 (one payment)</span></label><label><input type="radio" name="fpDeduction" value="Two payments"/><span>$26.50 (two equal payments)</span></label></div>` : "";
      return `<div class="policy" data-pol="${n}"><h4>${esc(p.title)}</h4>${p.paras.map(t => `<p>${t}</p>`).join("")}${choice}
        <label class="policy-agree"><input type="checkbox" name="pol_${n}" value="1" required/><span>I agree &mdash; initialed</span><span class="initial-chip">&nbsp;</span></label></div>`;
    }).join("");
    updatePolicies();
  }
  function updatePolicies() {
    const ini = val("initials").toUpperCase();
    document.querySelectorAll("#policies-list .policy").forEach(p => {
      const on = p.querySelector('input[type="checkbox"]').checked;
      p.classList.toggle("agreed", on);
      p.querySelector(".initial-chip").textContent = on && ini ? ini : " ";
    });
  }

  function renderDDAuth() {
    const b = D.dd; const h = b.findIndex(x => x[0] === "h");
    const p = b.slice(h + 1).find(x => x[0] === "p");
    $("#dd-auth-text").innerHTML = p ? `<p>${p[1]}</p>` : "";
  }

  /* ---------- packet type dependent UI ---------- */
  function applyPacket() {
    const t = val("packet");
    const w4 = t !== "contractor";
    $("#tax-w4").style.display = w4 ? "" : "none";
    $("#tax-w9").style.display = w4 ? "none" : "";
    $("#tax-title").textContent = w4 ? "Form W-4 — Employee’s Withholding Certificate" : "Form W-9 — Request for Taxpayer Identification Number";
    $("#tax-sub").textContent = w4 ? "Tells us how much federal income tax to withhold from your pay." : "Provides your taxpayer ID so we can report contractor payments to the IRS.";
    const dch1 = form.dch1;
    if (!dch1.dataset.touched && t) dch1.value = t === "contractor" ? "Contractor" : "Applicant Employee";
    if (t === "contractor" && !form.w9Name.dataset.touched) form.w9Name.value = fullName();
    applyW9();
  }
  function applyW9() {
    const c = val("w9Class");
    $("#rv-w9-llc").classList.toggle("show", c === "LLC");
    $("#rv-w9-other").classList.toggle("show", c === "Other");
    $("#rv-w9-3b").classList.toggle("show", ["Partnership", "Trust Estate", "LLC"].includes(c));
    const ein = val("w9TinType") === "EIN";
    $("#rv-w9-ein").classList.toggle("show", ein);
    $("#w9-ssn-note").style.display = ein ? "none" : "";
  }
  function updateW4Calc() {
    const a = (+val("w4Kids") || 0) * 2200, b = (+val("w4Deps") || 0) * 500, o = +val("w4OtherCredits") || 0;
    $("#w4-3a").textContent = `× $2,200 = $${money(a)}`;
    $("#w4-3b").textContent = `× $500 = $${money(b)}`;
    $("#w4-3").textContent = `Step 3 total: $${money(a + b + o)}`;
  }
  function toggleReveals() {
    form.querySelectorAll("input[data-reveal]").forEach(r => {
      const box = document.getElementById(r.dataset.reveal);
      box.classList.toggle("show", val(r.name) === box.dataset.when);
    });
  }

  /* ---------- validation ---------- */
  function abaValid(r) {
    const d = digits(r); if (d.length !== 9) return false;
    const w = [3, 7, 1]; let s = 0; for (let i = 0; i < 9; i++) s += +d[i] * w[i % 3];
    return s % 10 === 0;
  }
  function setErr(id, on) { const e = document.getElementById(id); if (e) e.classList.toggle("show", on); return !on; }
  function validateStep(n) {
    const s = steps[n];
    const packet = val("packet");
    const fields = [...s.querySelectorAll("input,select,textarea")].filter(el => {
      if (el.name === "botcheck") return false;
      if (el.closest(".reveal:not(.show)")) return false;
      if (el.closest("#tax-w4") && packet === "contractor") return false;
      if (el.closest("#tax-w9") && packet !== "contractor") return false;
      return true;
    });
    // conditional requirements
    fields.forEach(el => {
      if (el.hasAttribute("data-required-when-shown")) el.required = true;
      if (el.dataset.reqTax) el.required = true;
    });
    if (n === 6 && packet === "contractor") {
      form.w9LlcCode.required = val("w9Class") === "LLC";
      form.w9Other.required = val("w9Class") === "Other";
      form.w9Ein.required = val("w9TinType") === "EIN";
    }
    for (const f of fields) {
      if (f.disabled && f.required && f.type === "checkbox") {
        const doc = f.closest(".doc"); if (doc) { doc.classList.add("open"); f.disabled = false; doc.scrollIntoView({ behavior: "smooth", block: "start" }); }
        return false;
      }
      if (!f.checkValidity()) {
        const doc = f.closest(".doc"); if (doc && !doc.classList.contains("open")) doc.classList.add("open");
        f.reportValidity(); f.focus({ preventScroll: false }); return false;
      }
    }
    if (n === 4) {
      if (!setErr("err-routing", !abaValid(val("routing")))) { form.routing.focus(); return false; }
      if (!setErr("err-account2", digits(val("account")) !== digits(val("account2")))) { form.account2.focus(); return false; }
    }
    if (n === 7) {
      const norm = s => s.toLowerCase().replace(/[^a-z]/g, "");
      const sig = norm(val("signature"));
      const ok = sig && (sig === norm(fullName()) || sig === norm(val("first") + val("last")));
      if (!setErr("err-sig", !ok)) { form.signature.focus(); return false; }
    }
    return true;
  }

  /* ---------- navigation ---------- */
  function go(n, scroll = true) {
    if (n < 0 || n >= steps.length) return;
    step = n;
    steps.forEach((s, i) => s.classList.toggle("active", i === n));
    document.querySelectorAll("#ob-stepper li").forEach((li, i) => { li.classList.toggle("current", i === n); li.classList.toggle("done", i < n); });
    $("#ob-back").style.visibility = n === 0 ? "hidden" : "visible";
    $("#ob-next").innerHTML = n === steps.length - 1 ? "Sign &amp; Submit" : (n === steps.length - 2 ? "Review &rarr;" : "Continue &rarr;");
    if (n === 6) applyPacket();
    if (n === steps.length - 1) { buildReview(); form.sigDate.value = today(); }
    saveDraft();
    if (scroll) $("#app-shell").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#ob-back").addEventListener("click", () => go(step - 1));
  $("#ob-next").addEventListener("click", () => {
    if (!validateStep(step)) return;
    if (step === steps.length - 1) submit(); else go(step + 1);
  });

  /* ---------- review ---------- */
  function buildReview() {
    const t = val("packet") === "contractor";
    const status = { single: "Single or Married filing separately", mfj: "Married filing jointly", hoh: "Head of household" }[val("w4Status")] || "";
    const blocks = [
      ["You", 0, [["Packet", t ? "Independent Contractor (W-9)" : "Employee (W-4)"], ["Legal name", fullName()], ["Date of birth", mdY(val("dob"))], ["Position", val("position")]]],
      ["Contact", 1, [["Address", `${val("street")}, ${val("city")}, ${val("state").toUpperCase()} ${val("zip")}`], ["Phone", val("phone")], ["Email", val("email")], ["Emergency contact", `${val("ecName")} (${val("ecRel")}) · ${val("ecPhone")}`]]],
      ["Agreements", 2, [["Documents", `${AGREEMENTS.filter(([k]) => val("agree_" + k)).length} of ${AGREEMENTS.length} agreed`]]],
      ["Company Policies", 3, [["Policies", `${POLICIES.filter((_, i) => val("pol_" + i)).length} of ${POLICIES.length} initialed (${val("initials").toUpperCase()})`], ["Fingerprint fee", val("fpDeduction") === "One payment" ? "$53.00 — one payment" : "$26.50 — two payments"]]],
      ["Direct Deposit", 4, [["Account", `${val("ddType")} at ${val("bankName")}`], ["Routing", mask(val("routing"))], ["Account #", mask(val("account"))], ["SSN", mask(val("ssn"))], ["Account holder", val("ddHolder") === "Yes" ? "You" : val("holderName")]]],
      ["Background Check", 5, [["Section I", form.dch1.selectedOptions[0]?.text || ""], ["Caregiver Portal", val("dch2Portal") === "Agree" ? "Results may be shared with family employers" : "Licensed healthcare employers only"]]],
      t ? ["Form W-9", 6, [["Name", val("w9Name")], ["Classification", form.w9Class.selectedOptions[0].text + (val("w9Class") === "LLC" ? ` (${val("w9LlcCode")})` : "")], ["TIN", val("w9TinType") === "EIN" ? "EIN " + mask(val("w9Ein")) : "SSN " + mask(val("ssn"))]]]
        : ["Form W-4", 6, [["Filing status", status], ["Step 3 credits", "$" + money((+val("w4Kids") || 0) * 2200 + (+val("w4Deps") || 0) * 500 + (+val("w4OtherCredits") || 0))], ["Exempt", val("w4Exempt") ? "Yes" : "No"]]],
    ];
    $("#ob-review").innerHTML = blocks.map(([title, s, rows]) => `<div class="review-block"><div class="review-block-head">${title}<button type="button" data-go="${s}">Edit</button></div><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || "—")}</dd>`).join("")}</dl></div>`).join("");
    $("#ob-review").querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(+b.dataset.go)));
    const docs = ["Condition of Employment", "Job Description", "Code of Ethics", "Clients Rights", "Client Protection Assurances", "Infection Control", "Abuse Statement", "Company Policies", "Direct Deposit Authorization", "GA DCH Background Check Consent", t ? "Form W-9" : "Form W-4"];
    $("#sign-attest").innerHTML = `Your signature will be applied to: ${docs.join(" · ")}.` + (t ? " Under penalties of perjury, you certify the W-9 statements shown on the previous step." : " Under penalties of perjury, you declare that your W-4 is true, correct, and complete.");
  }

  /* ---------- draft ---------- */
  function saveDraft() {
    try {
      const data = { __step: step };
      form.querySelectorAll("[name]").forEach(f => {
        if (SKIP_SAVE.has(f.name) || f.hasAttribute("data-sensitive")) return;
        if (f.type === "radio") { if (f.checked) data[f.name] = f.value; }
        else if (f.type === "checkbox") { if (f.checked) data[f.name] = true; }
        else if (f.value) data[f.name] = f.value;
      });
      localStorage.setItem(DRAFT, JSON.stringify(data));
      const n = $("#ob-save-note"); n.textContent = "Progress saved"; clearTimeout(n._t); n._t = setTimeout(() => n.textContent = "", 1500);
    } catch (e) { }
  }
  function loadDraft() {
    let d; try { d = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (e) { }
    if (!d) return 0;
    form.querySelectorAll("[name]").forEach(f => {
      if (!(f.name in d) || f.hasAttribute("data-sensitive")) return;
      if (f.type === "radio") f.checked = f.value === d[f.name];
      else if (f.type === "checkbox") { f.checked = !!d[f.name]; if (f.checked) f.disabled = false; }
      else f.value = d[f.name];
    });
    ["dch1", "w9Name"].forEach(n => { if (d[n]) form[n].dataset.touched = "1"; });
    return Math.min(+d.__step || 0, 4);   // sensitive fields are not saved, so never resume past Direct Deposit
  }

  /* ---------- PDF ---------- */
  async function buildPdf() {
    const { PDFDocument, StandardFonts, PDFTextField, rgb } = window.PDFLib;
    const t = val("packet") === "contractor" ? "contractor" : "employee";
    const res = await fetch(`templates/packet-${t}.pdf`, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load the packet template.");
    const pdf = await PDFDocument.load(await res.arrayBuffer());
    const f = pdf.getForm();
    const T = (n, v) => { if (v === undefined || v === null || v === "" || v === false) return; try { const fld = f.getTextField(n); const ml = fld.getMaxLength(); fld.setText(ml ? String(v).slice(0, ml) : String(v)); } catch (e) { console.warn("missing field", n); } };
    const X = n => { try { f.getCheckBox(n).check(); } catch (e) { console.warn("missing checkbox", n); } };
    const name = fullName(), sig = val("signature"), date = today(), dob = mdY(val("dob"));
    const st = val("state").toUpperCase(), cityLine = `${val("city")}, ${st} ${val("zip")}`;

    T("Cover Employee Name", name);
    for (const p of ["COE", "JD", "Ethics", "Rights", "Protection", "Policies"]) { T(`${p} Employee Name`, name); T(`${p} Employee Signature`, sig); T(`${p} Employee Date`, date); }
    T("Infection Employee Signature", sig); T("Infection Employee Date", date);
    T("Abuse Employee Name", name); T("Abuse Employee Signature", sig); T("Abuse Employee Date", date);
    const ini = val("initials").toUpperCase();
    POLICIES.forEach((p, i) => { if (val("pol_" + i)) T(p.field, ini); });
    X(`Policy Fingerprint Deduction ${val("fpDeduction")}`);

    T("Emergency Employee Name", name); T("Emergency Employee Address", val("street")); T("Emergency Employee City", val("city"));
    T("Emergency Employee State", st); T("Emergency Employee ZIP", val("zip")); T("Emergency Employee Phone", val("phone"));
    T("Emergency Contact Name", val("ecName")); T("Emergency Contact Relationship", val("ecRel")); T("Emergency Contact Phone", val("ecPhone"));

    X(`DD Account Type ${val("ddType")}`);
    T("DD Bank Name", val("bankName")); T("DD Bank Address", val("bankAddr"));
    T("DD Routing Number", digits(val("routing"))); T("DD Account Number", digits(val("account")));
    X(`DD Account Holder ${val("ddHolder")}`);
    if (val("ddHolder") === "No") { T("DD Account Holder Name", val("holderName")); T("DD Third Party Agreement Signature", sig); }
    T("DD Print Name", name); T("DD SSN", fmtSSN(val("ssn"))); T("DD Date of Birth", dob);
    T("DD Paystub Email", val("paystubEmail") || val("email")); T("DD Signature", sig); T("DD Date", date);

    const dchMap = { "Owner": "Owner", "Applicant Employee": "Applicant Employee", "Non-Employee": "Non-Employee", "Contractor": "Contractor" };
    if (val("dch1")) X(`DCH Sec1 ${dchMap[val("dch1")]}`);
    T("DCH Last Name", val("last")); T("DCH First Name", val("first")); T("DCH Middle Name", val("middle")); T("DCH Date of Birth", dob);
    T("DCH Street", val("street")); T("DCH City", val("city")); T("DCH State", st); T("DCH ZIP", val("zip"));
    T("DCH Email", val("email")); T("DCH Telephone", val("phone"));
    T("DCH Sec1 Signature", sig); T("DCH Sec1 Date", date);
    if (val("dch2")) X(`DCH Sec2 ${dchMap[val("dch2")]}`);
    X(val("dch2Portal") === "Agree" ? "DCH Sec2 Agree Portal" : "DCH Sec2 Licensed Only");
    T("DCH Sec2 Signature", sig); T("DCH Sec2 Date", date);

    if (t === "employee") {
      T("W4 First Name and MI", val("first") + (val("middle") ? " " + val("middle")[0].toUpperCase() + "." : ""));
      T("W4 Last Name", val("last")); T("W4 SSN", fmtSSN(val("ssn")));
      T("W4 Address", val("street")); T("W4 City State ZIP", cityLine);
      X({ single: "W4 Single or MFS", mfj: "W4 MFJ or QSS", hoh: "W4 Head of Household" }[val("w4Status")]);
      if (val("w4TwoJobs")) X("W4 Step 2c Two Jobs");
      const a = (+val("w4Kids") || 0) * 2200, b = (+val("w4Deps") || 0) * 500, o = +val("w4OtherCredits") || 0;
      if (a) T("W4 Step 3a", money(a)); if (b) T("W4 Step 3b", money(b)); if (a + b + o) T("W4 Step 3 Total", money(a + b + o));
      if (+val("w4OtherIncome")) T("W4 Step 4a", money(val("w4OtherIncome")));
      if (+val("w4Deductions")) T("W4 Step 4b", money(val("w4Deductions")));
      if (+val("w4Extra")) T("W4 Step 4c", money(val("w4Extra")));
      if (val("w4Exempt")) X("W4 Exempt");
      T("W4 Employee Signature", sig); T("W4 Date", date);
    } else {
      T("W9 Line 1 Name", val("w9Name")); T("W9 Line 2 Business Name", val("w9Business"));
      const cls = { "Individual": "W9 3a Individual", "C Corp": "W9 3a C Corp", "S Corp": "W9 3a S Corp", "Partnership": "W9 3a Partnership", "Trust Estate": "W9 3a Trust Estate", "LLC": "W9 3a LLC", "Other": "W9 3a Other" }[val("w9Class")];
      X(cls);
      if (val("w9Class") === "LLC") T("W9 3a LLC Code", val("w9LlcCode"));
      if (val("w9Class") === "Other") T("W9 3a Other Text", val("w9Other"));
      if (val("w9Foreign") && ["Partnership", "Trust Estate", "LLC"].includes(val("w9Class"))) X("W9 3b Foreign Partners");
      T("W9 Exempt Payee Code", val("w9ExemptPayee")); T("W9 FATCA Code", val("w9Fatca"));
      T("W9 Line 5 Address", val("street")); T("W9 Line 6 City State ZIP", cityLine);
      if (val("w9TinType") === "EIN") { const e = digits(val("w9Ein")); T("W9 EIN 1", e.slice(0, 2)); T("W9 EIN 2", e.slice(2)); }
      else { const s = digits(val("ssn")); T("W9 SSN 1", s.slice(0, 3)); T("W9 SSN 2", s.slice(3, 5)); T("W9 SSN 3", s.slice(5)); }
      T("W9 Signature", sig); T("W9 Date", date);
    }

    const helv = await pdf.embedFont(StandardFonts.Helvetica), ital = await pdf.embedFont(StandardFonts.TimesRomanItalic), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    f.getFields().forEach(fld => { if (fld instanceof PDFTextField) fld.updateAppearances(/Signature/.test(fld.getName()) ? ital : helv); });
    f.flatten();

    // Electronic signature record
    const pg = pdf.addPage([612, 792]); let y = 720;
    const line = (txt, font = helv, size = 10, color = rgb(0.1, 0.1, 0.1)) => {
      const words = String(txt).split(/\s+/); let cur = "";
      const flush = () => { pg.drawText(cur, { x: 54, y, size, font, color }); y -= size + 4; cur = ""; };
      for (const w of words) { const t = cur ? cur + " " + w : w; if (font.widthOfTextAtSize(t, size) > 504 && cur) { flush(); cur = w; } else cur = t; }
      if (cur) flush(); y -= 4;
    };
    pg.drawRectangle({ x: 54, y: 742, width: 504, height: 2, color: rgb(0.66, 0.21, 0.23) });
    line("Electronic Signature Record", bold, 16); y -= 6;
    const now = new Date();
    [["Signer", name], ["Typed signature", sig], ["Signed", `${date} ${now.toLocaleTimeString("en-US")} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`],
     ["Timestamp (UTC)", now.toISOString()], ["Packet", t === "contractor" ? "Independent Contractor (Form W-9)" : "Employee (Form W-4)"],
     ["Method", "Completed online at hcsga.org/onboarding; encrypted in the signer's browser before upload."],
     ["Consent", "Signer agreed to sign electronically and that the typed name is their legal signature, applied to each form in this packet requiring a signature."],
     ["Policies initialed", `${POLICIES.filter((_, i) => val("pol_" + i)).length} of ${POLICIES.length} with initials "${ini}"`],
     ["Documents agreed", AGREEMENTS.map(a => a[1]).join("; ")],
     ["Browser", navigator.userAgent.slice(0, 160)]].forEach(([k, v]) => { line(k.toUpperCase(), bold, 7.5, rgb(0.48, 0.13, 0.15)); y += 3; line(v, helv, 9.5); y -= 2; });
    y -= 10; line("Office use: witnesses and notary for the Abuse Statement, the Condition of Employment administrator signature, and W-4/W-9 employer fields are completed at orientation.", helv, 8.5, rgb(0.35, 0.35, 0.35));
    pdf.setTitle(`HCS Onboarding — ${name}`); pdf.setAuthor(name); pdf.setSubject("Home Care Solutions onboarding packet");
    return await pdf.save();
  }

  /* ---------- submit ---------- */
  function setStatus(s, state) {
    const box = $("#submit-status"); box.classList.add("show"); box.classList.remove("error");
    const order = ["prep", "encrypt", "upload", "notify"]; const idx = order.indexOf(s);
    box.querySelectorAll("li").forEach((li, i) => { li.classList.toggle("done", i < idx || (i === idx && state === "done")); li.classList.toggle("active", i === idx && state !== "done"); });
  }
  function fail(msg) {
    const box = $("#submit-status"); box.classList.add("show", "error");
    box.innerHTML = `<b>We couldn’t submit your packet.</b><br/>${esc(msg)}<br/>Your answers are still here — please try again, or call ${esc(C.officePhone)}.`;
    const btn = $("#ob-next"); btn.disabled = false; btn.textContent = "Try Again";
  }
  async function submit() {
    const btn = $("#ob-next"); btn.disabled = true; btn.textContent = "Submitting…";
    $("#submit-status").innerHTML = `<ol><li data-s="prep">Preparing your forms</li><li data-s="encrypt">Encrypting on this device</li><li data-s="upload">Uploading securely</li><li data-s="notify">Notifying the office</li></ol>`;
    if (form.botcheck.checked) { showDone("—", null); return; }
    let sb;
    try {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
      setStatus("prep");
      const { data: keyRow, error: keyErr } = await sb.from("onboarding_keys").select("public_key").eq("id", 1).maybeSingle();
      if (keyErr) throw new Error("The secure upload service is unavailable right now.");
      if (!keyRow) throw new Error("Online onboarding hasn’t been activated by the office yet.");
      const pdfBytes = await buildPdf();
      setStatus("encrypt");
      const env = await window.HCSCrypto.encryptForAdmin(keyRow.public_key, pdfBytes);
      setStatus("upload");
      const id = crypto.randomUUID(), path = `${id}.bin`;
      const up = await sb.storage.from(C.bucket).upload(path, new Blob([env], { type: "application/octet-stream" }), { contentType: "application/octet-stream", upsert: false });
      if (up.error) throw new Error("Upload failed (" + (up.error.message || "storage error") + ").");
      const ins = await sb.from("onboarding_submissions").insert({ employee_name: fullName().slice(0, 120), packet_type: val("packet"), object_path: path });
      if (ins.error) throw new Error("Upload saved but could not be recorded (" + ins.error.message + ").");
      setStatus("notify");
      const ref = id.slice(0, 8).toUpperCase();
      try {
        const fd = new FormData();
        fd.append("access_key", C.web3formsKey);
        fd.append("subject", `Onboarding packet received — ${fullName()}`);
        fd.append("from_name", "HCS Onboarding");
        fd.append("Employee", fullName());
        fd.append("Packet", val("packet") === "contractor" ? "Independent Contractor (W-9)" : "Employee (W-4)");
        fd.append("Position", val("position"));
        fd.append("Reference", ref);
        fd.append("Submitted", new Date().toLocaleString("en-US"));
        fd.append("Open in admin", C.adminUrl);
        fd.append("Note", "The packet is encrypted. Sign in to the admin page and enter your passphrase to download it.");
        await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
      } catch (e) { /* notification is best-effort; the packet is already stored */ }
      setStatus("notify", "done");
      showDone(ref, pdfBytes);
    } catch (e) {
      console.error(e); fail(e.message || "Unexpected error.");
    }
  }
  function showDone(ref, bytes) {
    try { localStorage.removeItem(DRAFT); } catch (e) { }
    form.querySelectorAll("[data-sensitive]").forEach(f => f.value = "");
    form.style.display = "none"; $(".app-head").style.display = "none";
    $("#done-ref").textContent = ref;
    const a = $("#done-download");
    if (bytes) { pdfUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); a.href = pdfUrl; a.download = `HCS-Onboarding-${fullName().replace(/\s+/g, "-")}.pdf`; }
    else a.style.display = "none";
    $("#ob-done").classList.add("show");
    $("#app-shell").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- wiring ---------- */
  form.addEventListener("input", e => {
    const n = e.target.name;
    if (n === "initials") updatePolicies();
    if (n === "ssn") { const d = digits(e.target.value).slice(0, 9); e.target.value = d.length > 5 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d; }
    if (n === "w9Ein") { const d = digits(e.target.value).slice(0, 9); e.target.value = d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d; }
    if (n === "routing" || n === "account" || n === "account2") e.target.value = digits(e.target.value);
    if (n === "state") e.target.value = e.target.value.toUpperCase();
    if (n.startsWith("w4")) updateW4Calc();
    if (n === "dch1" || n === "w9Name") e.target.dataset.touched = "1";
    if (n === "routing") setErr("err-routing", false);
    if (n === "account2") setErr("err-account2", false);
    if (n === "signature") setErr("err-sig", false);
    saveDraft();
  });
  form.addEventListener("change", e => {
    const n = e.target.name;
    if (n.startsWith("agree_")) updateAgreeCount();
    if (n.startsWith("pol_")) updatePolicies();
    if (n === "packet") applyPacket();
    if (n === "w9Class" || n === "w9TinType") applyW9();
    if (n === "dch1") e.target.dataset.touched = "1";
    if (e.target.dataset.reveal) toggleReveals();
    saveDraft();
  });

  renderAgreements(); renderPolicies(); renderDDAuth();
  const resume = loadDraft();
  updateAgreeCount(); updatePolicies(); toggleReveals(); applyPacket(); updateW4Calc();
  go(resume, false);
})();
