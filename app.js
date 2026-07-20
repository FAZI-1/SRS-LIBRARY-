const STORAGE_KEY = "srsvault-data-v1";
const ADMIN_KEY = "srsvault-admin-password-v1";
let adminAuthenticated = false;
let currentViewId = null;
let editingAuthorizedByAdmin = false;

const categories = [
  "Loading Dose",
  "Dose Error",
  "Renal Dose Adjustment",
  "Hepatic Dose Adjustment",
  "Drug Interaction",
  "Contraindication",
  "Duplicate Therapy",
  "Allergy",
  "Monitoring",
  "Medication Reconciliation",
  "Administration Error",
  "Other"
];

const demoTemplate = {
  id: crypto.randomUUID(),
  title: "Omitted Posaconazole Loading Dose",
  medication: "Posaconazole",
  category: "Loading Dose",
  stage: "Before Reaching Patient",
  medicalError: "Posaconazole was prescribed without the recommended loading dose, which may delay achievement of therapeutic plasma concentrations.",
  scenario: "During prescription verification, the pharmacist identified that the prescribed regimen included maintenance dosing only. The order was reviewed before medication preparation and administration.",
  intervention: "The pharmacist contacted the prescribing physician, clarified the recommended loading regimen, and requested correction of the prescription before dispensing.",
  harm: "Potential delayed attainment of therapeutic exposure, suboptimal antifungal treatment, treatment failure, and progression of invasive fungal infection were avoided.",
  recommendation: "Implement prescribing guidance and electronic decision support for medications that require loading doses. Reinforce pharmacist verification of loading-dose requirements during order review.",
  contributor: "SRSVault Team",
  pin: "0000",
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { templates: [demoTemplate], auditLog: [] };
  try {
    const parsed = JSON.parse(saved);
    return {
      templates: (parsed.templates || []).map(t => ({ ...t, active: t.active !== false })),
      auditLog: parsed.auditLog || []
    };
  } catch {
    return { templates: [demoTemplate], auditLog: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

const el = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[char]));

function populateCategories() {
  el("category").innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  el("categoryFilter").innerHTML = `<option value="">All Categories</option>` + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function filteredTemplates() {
  const q = el("searchInput").value.trim().toLowerCase();
  const category = el("categoryFilter").value;
  const stage = el("stageFilter").value;

  return state.templates
    .filter(t => t.active !== false)
    .filter(t => !category || t.category === category)
    .filter(t => !stage || t.stage === stage)
    .filter(t => {
      const haystack = [t.title, t.medication, t.category, t.medicalError, t.scenario, t.intervention, t.harm, t.recommendation, t.contributor].join(" ").toLowerCase();
      return !q || haystack.includes(q);
    })
    .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderTemplates() {
  const grid = el("templateGrid");
  const templates = filteredTemplates();
  grid.innerHTML = "";

  templates.forEach(t => {
    const card = document.createElement("article");
    card.className = "template-card";
    card.innerHTML = `
      <span class="badge">${escapeHtml(t.category)}</span>
      <h3>${escapeHtml(t.title)}</h3>
      <div class="med">${escapeHtml(t.medication)}</div>
      <div class="stage">${escapeHtml(t.stage)}</div>
      <div class="meta">
        <span>Contributor: ${escapeHtml(t.contributor)}</span>
        <span>${new Date(t.updatedAt).toLocaleDateString()}</span>
      </div>
      <button class="primary-btn" data-open="${t.id}">Open Template</button>
    `;
    grid.appendChild(card);
  });

  el("emptyState").classList.toggle("hidden", templates.length > 0);
}

function renderStats() {
  const active = state.templates.filter(t => t.active !== false);
  el("templateCount").textContent = active.length;
  el("contributorCount").textContent = new Set(active.map(t => t.contributor.trim().toLowerCase())).size;
  el("categoryCount").textContent = new Set(active.map(t => t.category)).size;
}

function renderAdmin() {
  const body = el("adminTableBody");
  body.innerHTML = "";
  state.templates
    .slice()
    .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.medication)}</td>
        <td>${escapeHtml(t.contributor)}</td>
        <td>${t.active === false ? "Archived" : "Active"}</td>
        <td>${new Date(t.updatedAt).toLocaleDateString()}</td>
        <td><div class="row-actions">
          <button class="secondary-btn" data-admin-edit="${t.id}">Edit</button>
          <button class="secondary-btn" data-admin-toggle="${t.id}">${t.active === false ? "Restore" : "Archive"}</button>
          <button class="danger-btn" data-admin-delete="${t.id}">Delete</button>
        </div></td>`;
      body.appendChild(tr);
    });
}

function renderAll() {
  renderTemplates();
  renderStats();
  renderAdmin();
}

function buildReportText(t) {
  return `CASE TITLE
${t.title}

MEDICATION
${t.medication}

CATEGORY
${t.category}

ERROR STAGE
${t.stage}

MEDICAL ERROR IDENTIFIED
${t.medicalError}

SCENARIO
${t.scenario}

PHARMACIST INTERVENTION
${t.intervention}

HARM AVOIDED / EXPECTED HARM
${t.harm}

PREVENTION RECOMMENDATION
${t.recommendation}

CONTRIBUTED BY
${t.contributor}`;
}

function openView(id) {
  const t = state.templates.find(x => x.id === id);
  if (!t) return;
  currentViewId = id;
  el("viewCategory").textContent = t.category;
  el("viewTitle").textContent = t.title;
  el("viewMeta").textContent = `${t.medication} · ${t.stage} · Contributed by ${t.contributor}`;
  const sections = [
    ["Medical Error Identified", t.medicalError],
    ["Scenario", t.scenario],
    ["Pharmacist Intervention", t.intervention],
    ["Harm Avoided / Expected Harm", t.harm],
    ["Prevention Recommendation", t.recommendation]
  ];
  el("viewContent").innerHTML = sections.map(([h,p]) => `<section class="report-section"><h3>${escapeHtml(h)}</h3><p>${escapeHtml(p)}</p></section>`).join("");
  el("viewDialog").showModal();
}

function resetTemplateForm() {
  el("templateForm").reset();
  el("templateId").value = "";
  el("templateDialogTitle").textContent = "Add New Template";
  editingAuthorizedByAdmin = false;
}

function fillTemplateForm(t, byAdmin=false) {
  el("templateId").value = t.id;
  el("caseTitle").value = t.title;
  el("medication").value = t.medication;
  el("category").value = t.category;
  el("errorStage").value = t.stage;
  el("medicalError").value = t.medicalError;
  el("scenario").value = t.scenario;
  el("intervention").value = t.intervention;
  el("harm").value = t.harm;
  el("recommendation").value = t.recommendation;
  el("contributor").value = t.contributor;
  el("authorPin").value = t.pin;
  el("confirmNoPatientData").checked = true;
  el("templateDialogTitle").textContent = "Edit Template";
  editingAuthorizedByAdmin = byAdmin;
  el("templateDialog").showModal();
}

el("templateGrid").addEventListener("click", e => {
  const id = e.target.dataset.open;
  if (id) openView(id);
});

["searchInput","categoryFilter","stageFilter"].forEach(id => el(id).addEventListener("input", renderTemplates));

el("addTemplateBtn").addEventListener("click", () => {
  resetTemplateForm();
  el("templateDialog").showModal();
});

el("closeTemplateBtn").addEventListener("click", () => el("templateDialog").close());
el("cancelTemplateBtn").addEventListener("click", () => el("templateDialog").close());
el("closeViewBtn").addEventListener("click", () => el("viewDialog").close());

el("copyReportBtn").addEventListener("click", async () => {
  const t = state.templates.find(x => x.id === currentViewId);
  if (!t) return;
  await navigator.clipboard.writeText(buildReportText(t));
  const button = el("copyReportBtn");
  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => button.textContent = original, 1400);
});

el("editOwnTemplateBtn").addEventListener("click", () => {
  if (!currentViewId) return;
  el("viewDialog").close();
  el("pinTemplateId").value = currentViewId;
  el("editPinInput").value = "";
  el("pinDialog").showModal();
});

el("cancelPinBtn").addEventListener("click", () => el("pinDialog").close());
el("pinForm").addEventListener("submit", e => {
  e.preventDefault();
  const t = state.templates.find(x => x.id === el("pinTemplateId").value);
  if (!t) return;
  if (el("editPinInput").value !== t.pin) return alert("Incorrect personal edit PIN.");
  el("pinDialog").close();
  fillTemplateForm(t, false);
});

el("templateForm").addEventListener("submit", e => {
  e.preventDefault();

  const id = el("templateId").value;
  const existing = state.templates.find(t => t.id === id);
  if (existing && !editingAuthorizedByAdmin && el("authorPin").value !== existing.pin) {
    return alert("The personal edit PIN cannot be changed without administrator access.");
  }

  const now = new Date().toISOString();
  const data = {
    id: id || crypto.randomUUID(),
    title: el("caseTitle").value.trim(),
    medication: el("medication").value.trim(),
    category: el("category").value,
    stage: el("errorStage").value,
    medicalError: el("medicalError").value.trim(),
    scenario: el("scenario").value.trim(),
    intervention: el("intervention").value.trim(),
    harm: el("harm").value.trim(),
    recommendation: el("recommendation").value.trim(),
    contributor: el("contributor").value.trim(),
    pin: el("authorPin").value,
    active: existing ? existing.active !== false : true,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  if (existing) {
    Object.assign(existing, data);
    state.auditLog.push({ id: crypto.randomUUID(), type: "edit_template", templateId: id, by: editingAuthorizedByAdmin ? "Administrator" : data.contributor, timestamp: now });
  } else {
    state.templates.push(data);
    state.auditLog.push({ id: crypto.randomUUID(), type: "add_template", templateId: data.id, by: data.contributor, timestamp: now });
  }

  saveState();
  el("templateDialog").close();
  alert(existing ? "Template updated." : "Template added to the shared library on this browser.");
});

el("adminBtn").addEventListener("click", () => {
  if (adminAuthenticated) {
    el("adminPanel").classList.remove("hidden");
    el("adminPanel").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const hasPassword = Boolean(localStorage.getItem(ADMIN_KEY));
  el("adminLoginTitle").textContent = hasPassword ? "Administrator Login" : "Create Administrator Password";
  el("adminLoginHelp").textContent = hasPassword ? "Enter the administrator password." : "First-time setup for this browser.";
  el("adminConfirmWrap").classList.toggle("hidden", hasPassword);
  el("adminPassword").value = "";
  el("adminPasswordConfirm").value = "";
  el("adminLoginDialog").showModal();
});

el("cancelAdminBtn").addEventListener("click", () => el("adminLoginDialog").close());
el("adminLoginForm").addEventListener("submit", e => {
  e.preventDefault();
  const entered = el("adminPassword").value;
  const stored = localStorage.getItem(ADMIN_KEY);
  if (!stored) {
    if (entered.length < 6) return alert("Use at least 6 characters.");
    if (entered !== el("adminPasswordConfirm").value) return alert("Passwords do not match.");
    localStorage.setItem(ADMIN_KEY, entered);
  } else if (entered !== stored) {
    return alert("Incorrect administrator password.");
  }
  adminAuthenticated = true;
  el("adminLoginDialog").close();
  el("adminPanel").classList.remove("hidden");
  el("adminPanel").scrollIntoView({ behavior: "smooth" });
});

el("adminLogoutBtn").addEventListener("click", () => {
  adminAuthenticated = false;
  el("adminPanel").classList.add("hidden");
});

el("adminTableBody").addEventListener("click", e => {
  if (!adminAuthenticated) return;
  const editId = e.target.dataset.adminEdit;
  const toggleId = e.target.dataset.adminToggle;
  const deleteId = e.target.dataset.adminDelete;

  if (editId) {
    const t = state.templates.find(x => x.id === editId);
    if (t) fillTemplateForm(t, true);
  }

  if (toggleId) {
    const t = state.templates.find(x => x.id === toggleId);
    if (!t) return;
    t.active = t.active === false;
    t.updatedAt = new Date().toISOString();
    state.auditLog.push({ id: crypto.randomUUID(), type: t.active ? "restore_template" : "archive_template", templateId: t.id, by: "Administrator", timestamp: t.updatedAt });
    saveState();
  }

  if (deleteId) {
    const t = state.templates.find(x => x.id === deleteId);
    if (!t || !confirm(`Permanently delete "${t.title}"?`)) return;
    state.templates = state.templates.filter(x => x.id !== deleteId);
    state.auditLog.push({ id: crypto.randomUUID(), type: "delete_template", templateId: deleteId, by: "Administrator", timestamp: new Date().toISOString() });
    saveState();
  }
});

el("exportBackupBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, `SRSVault_Backup_${new Date().toISOString().slice(0,10)}.json`);
});

el("restoreBackupInput").addEventListener("change", async e => {
  if (!adminAuthenticated) return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.templates)) throw new Error();
    state = { templates: parsed.templates, auditLog: parsed.auditLog || [] };
    saveState();
    alert("Backup restored.");
  } catch {
    alert("Invalid backup file.");
  }
  e.target.value = "";
});

el("exportCsvBtn").addEventListener("click", () => {
  const headers = ["Title","Medication","Category","Stage","Medical Error","Scenario","Intervention","Harm","Recommendation","Contributor","Status","Updated"];
  const rows = state.templates.map(t => [t.title,t.medication,t.category,t.stage,t.medicalError,t.scenario,t.intervention,t.harm,t.recommendation,t.contributor,t.active === false ? "Archived":"Active",t.updatedAt]);
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `SRSVault_Templates_${new Date().toISOString().slice(0,10)}.csv`);
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

populateCategories();
renderAll();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
