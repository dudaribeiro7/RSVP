// js/admin.js
const API_BASE_URL = "https://rsvp-api-o8zt.onrender.com";
const STORAGE_KEY = "ADMIN_TOKEN";

const els = {
  status: document.getElementById("status"),

  btnRefresh: document.getElementById("btn-refresh"),
  btnExportDocx: document.getElementById("btn-export-docx"),
  btnExportPdf: document.getElementById("btn-export-pdf"),
  btnLogout: document.getElementById("btn-logout"),

  search: document.getElementById("search"),
  hideEmptyNotes: document.getElementById("toggle-empty-notes"),
  hideNoCompanions: document.getElementById("toggle-no-companions"),

  summary: document.getElementById("summary"),

  countYes: document.getElementById("count-yes"),
  countNo: document.getElementById("count-no"),
  countMaybe: document.getElementById("count-maybe"),

  tbodyYes: document.querySelector("#table-yes tbody"),
  tbodyNo: document.querySelector("#table-no tbody"),
  tbodyMaybe: document.querySelector("#table-maybe tbody"),

  loginOverlay: document.getElementById("admin-login"),
  loginForm: document.getElementById("login-form"),
  loginToken: document.getElementById("login-token"),
  loginError: document.getElementById("login-error"),
};

let allGuests = [];

function setStatus(msg, kind = "info") {
  if (!els.status) return;
  els.status.textContent = msg || "";
  els.status.style.color =
    kind === "error" ? "#b71c1c" :
    kind === "success" ? "#1b5e20" :
    "#6e5a6c";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ===== Auth helpers ===== */
function getToken() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function setToken(token) {
  localStorage.setItem(STORAGE_KEY, token);
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

function openLogin(msg = "") {
  els.loginError.textContent = msg || "";
  els.loginOverlay.classList.add("is-open");
  els.loginOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => els.loginToken?.focus(), 50);
}

function closeLogin() {
  els.loginOverlay.classList.remove("is-open");
  els.loginOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  els.loginToken.value = "";
  els.loginError.textContent = "";
}

function authedHeaders(extra = {}) {
  return {
    Accept: "application/json",
    "X-Admin-Token": getToken(),
    ...extra,
  };
}

/* ===== Filters ===== */
function getCompanionsText(g) {
  const comps = Array.isArray(g.companions) ? g.companions : [];
  return comps.map(c => c?.name).filter(Boolean).join(", ");
}

function matchesFilters(g) {
  const q = normalize(els.search?.value || "");
  const hideEmptyNotes = !!els.hideEmptyNotes?.checked;
  const hideNoComp = !!els.hideNoCompanions?.checked;

  const note = (g.note || "").trim();
  const compsTxt = getCompanionsText(g);

  if (hideEmptyNotes && !note) return false;
  if (hideNoComp && (!g.companions || g.companions.length === 0)) return false;

  if (!q) return true;

  const hay =
    normalize(g.name) + " " +
    normalize(g.phone) + " " +
    normalize(note) + " " +
    normalize(compsTxt);

  return hay.includes(q);
}

/* ===== Render ===== */
function renderCompanionsCell(g) {
  const comps = Array.isArray(g.companions) ? g.companions : [];
  if (!comps.length) return `<span class="companion-empty">—</span>`;

  return `
    <div class="companions">
      ${comps.map(c => `<span class="companion-pill">${escapeHtml(c.name)}</span>`).join("")}
    </div>
  `;
}

function renderNoteCell(g) {
  const note = (g.note || "").trim();
  if (!note) return `<span class="note empty">—</span>`;
  return `<span class="note">${escapeHtml(note)}</span>`;
}

function renderRow(g) {
  const responded = formatDate(g.responded_at);
  const companionsCount = (g.companions || []).length;

  return `
    <tr>
      <td class="name-cell">
        ${escapeHtml(g.name)}
        <div class="meta-badge">ID ${escapeHtml(g.id)} • ${companionsCount} acomp.</div>
      </td>
      <td>${escapeHtml(g.phone || "")}</td>
      <td>${escapeHtml(responded)}</td>
      <td>${renderNoteCell(g)}</td>
      <td>${renderCompanionsCell(g)}</td>
    </tr>
  `;
}

function renderTable(tbody, guests) {
  tbody.innerHTML = guests.map(renderRow).join("");
}

function groupGuests(guests) {
  const groups = { YES: [], NO: [], MAYBE: [] };
  for (const g of guests) {
    const s = (g.rsvp_status || "").toUpperCase();
    if (s === "YES") groups.YES.push(g);
    else if (s === "NO") groups.NO.push(g);
    else groups.MAYBE.push(g);
  }

  const sorter = (a, b) => new Date(b.responded_at) - new Date(a.responded_at);
  groups.YES.sort(sorter);
  groups.NO.sort(sorter);
  groups.MAYBE.sort(sorter);

  return groups;
}

function renderSummary(groups) {
  const yes = groups.YES.length;
  const no = groups.NO.length;
  const maybe = groups.MAYBE.length;
  const total = yes + no + maybe;

  const companionsYes = groups.YES.reduce((acc, g) => acc + ((g.companions || []).length), 0);
  const peopleYes = yes + companionsYes;

  const last = [...allGuests]
    .filter(g => g.responded_at)
    .sort((a,b) => new Date(b.responded_at) - new Date(a.responded_at))[0];

  const lastName = last ? last.name : "—";
  const lastDate = last ? formatDate(last.responded_at) : "";

  els.summary.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Respostas</div>
        <div class="summary-value">${total}</div>
      </div>

      <div class="summary-card">
        <div class="summary-label">Presentes (YES + acomp.)</div>
        <div class="summary-value">${peopleYes}</div>
      </div>

      <div class="summary-card">
        <div class="summary-label">Última resposta</div>
        <div class="summary-value summary-value--name">${escapeHtml(lastName)}</div>
        <div class="summary-subvalue">${escapeHtml(lastDate)}</div>
      </div>
    </div>
  `;

  els.countYes.textContent = String(yes);
  els.countNo.textContent = String(no);
  els.countMaybe.textContent = String(maybe);
}

function applyAndRender() {
  const filtered = allGuests.filter(matchesFilters);
  const groups = groupGuests(filtered);

  renderSummary(groupGuests(allGuests));
  renderTable(els.tbodyYes, groups.YES);
  renderTable(els.tbodyNo, groups.NO);
  renderTable(els.tbodyMaybe, groups.MAYBE);

  setStatus(`Carregado: ${allGuests.length} respostas. Mostrando: ${filtered.length}.`, "success");
}

/* ===== Data ===== */
async function loadGuests() {
  setStatus("Carregando...", "info");

  const res = await fetch(`${API_BASE_URL}/guests/`, {
    headers: authedHeaders(),
  });

  if (res.status === 401) {
    clearToken();
    openLogin("PIN inválido.");
    throw new Error("Não autorizado.");
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Erro ao buscar /guests (HTTP ${res.status}). ${txt}`);
  }

  const data = await res.json();

  allGuests = (Array.isArray(data) ? data : []).map(g => ({
    id: g.id,
    name: g.name || "",
    phone: g.phone || "",
    rsvp_status: g.rsvp_status || "MAYBE",
    responded_at: g.responded_at || null,
    note: g.note || "",
    companions: Array.isArray(g.companions) ? g.companions : [],
  }));
}

async function init() {
  try {
    await loadGuests();
    applyAndRender();
  } catch (err) {
    console.error(err);
    if (String(err.message || "").includes("Não autorizado")) return;
    setStatus(err.message || "Erro desconhecido.", "error");
  }
}

/* ===== Docs ===== */
function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportConfirmed(kind) {
  const ext = kind === "pdf" ? "pdf" : "docx";
  const url = `${API_BASE_URL}/guests/export/confirmed.${ext}`;

  setStatus("Gerando exportação...", "info");

  const res = await fetch(url, { headers: authedHeaders() });

  if (res.status === 401) {
    clearToken();
    openLogin("PIN inválido.");
    throw new Error("Não autorizado.");
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Erro ao exportar (HTTP ${res.status}). ${t}`);
  }

  const blob = await res.blob();
  const ts = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  downloadBlob(`confirmados-${ts}.${ext}`, blob);

  setStatus("Exportação concluída ✅", "ok");
}

/* ===== Events ===== */
els.btnRefresh?.addEventListener("click", init);
els.search?.addEventListener("input", () => applyAndRender());
els.hideEmptyNotes?.addEventListener("change", () => applyAndRender());
els.hideNoCompanions?.addEventListener("change", () => applyAndRender());
els.btnExportDocx?.addEventListener("click", () => exportConfirmed("docx"));
els.btnExportPdf?.addEventListener("click", () => exportConfirmed("pdf"));

els.btnLogout?.addEventListener("click", () => {
  clearToken();
  openLogin("Você saiu.");
});

els.loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = (els.loginToken.value || "").trim();
  if (!token) {
    els.loginError.textContent = "Digite o PIN.";
    return;
  }
  setToken(token);

  // testa carregando
  try {
    await init();
    closeLogin();
  } catch {
    // init já abre login se 401
  }
});

/* ===== Boot ===== */
if (!getToken()) {
  openLogin();
} else {
  init();
}


/* ============================= */
/*  TABS & PHOTOS MANAGEMENT     */
/* ============================= */

let allPhotos = [];
let currentTab = 'guests';
let photoToDelete = null;

// Elementos das tabs
const tabButtons = document.querySelectorAll('.admin-tab');
const tabContents = document.querySelectorAll('.tab-content');
const guestsFilters = document.getElementById('guests-filters');
const photosFilters = document.getElementById('photos-filters');
const photosGallery = document.getElementById('photos-admin-gallery');
const photosLoading = document.getElementById('photos-loading');
const photosEmpty = document.getElementById('photos-empty');
const photosTotalCount = document.getElementById('photos-total-count');
const photosSearch = document.getElementById('photos-search');

// Modal de exclusão
const deleteModal = document.getElementById('delete-modal');
const deleteModalPreview = document.getElementById('delete-modal-preview');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');

// Trocar tabs
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  currentTab = tabName;
  
  // Atualizar botões
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Atualizar conteúdos
  tabContents.forEach(content => {
    if (content.id === `tab-${tabName}`) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });
  
  // Controlar visibilidade de elementos específicos de guests
  const guestsOnlyElements = document.querySelectorAll('.guests-only');
  
  if (tabName === 'guests') {
    guestsFilters?.classList.remove('hidden');
    photosFilters?.classList.add('hidden');
    
    // Mostrar elementos de guests
    guestsOnlyElements.forEach(el => {
      el.classList.remove('hidden-in-photos');
    });
    
  } else if (tabName === 'photos') {
    guestsFilters?.classList.add('hidden');
    photosFilters?.classList.remove('hidden');
    
    // Esconder elementos de guests
    guestsOnlyElements.forEach(el => {
      el.classList.add('hidden-in-photos');
    });
    
    // Limpar status ao entrar na aba de fotos
    setStatus('');
    
    loadPhotos();
  }
}

// Carregar fotos
async function loadPhotos() {
  if (!photosGallery) return;
  
  try {
    photosLoading?.classList.remove('hidden');
    photosEmpty?.classList.add('hidden');
    photosGallery.innerHTML = '';
    
    const response = await fetch(`${API_BASE_URL}/photos/`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar fotos');
    
    allPhotos = await response.json();
    
    // Atualizar contador
    if (photosTotalCount) {
      photosTotalCount.textContent = allPhotos.length;
    }
    
    // Renderizar galeria
    if (allPhotos.length === 0) {
      photosEmpty?.classList.remove('hidden');
    } else {
      renderPhotosGallery(allPhotos);
    }
    
  } catch (error) {
    console.error('Erro ao carregar fotos:', error);
    setStatus('Erro ao carregar fotos', 'error');
  } finally {
    photosLoading?.classList.add('hidden');
  }
}

// Renderizar galeria de fotos
function renderPhotosGallery(photos) {
  if (!photosGallery) return;
  
  photosGallery.innerHTML = photos.map(photo => {
    const date = new Date(photo.uploaded_at);
    const dateStr = date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `
      <div class="photo-admin-item" data-photo-id="${photo.id}">
        <img 
          src="${escapeHtml(photo.photo_url)}" 
          alt="Foto" 
          class="photo-admin-img"
          loading="lazy"
        />
        <div class="photo-admin-overlay">
          ${photo.sender_name ? `
            <div class="photo-admin-sender">${escapeHtml(photo.sender_name)}</div>
          ` : ''}
          <div class="photo-admin-date">${dateStr}</div>
        </div>
        <div class="photo-admin-actions">
          <button 
            class="photo-admin-btn photo-admin-btn--delete" 
            data-photo-id="${photo.id}"
            data-photo-url="${escapeHtml(photo.photo_url)}"
            title="Excluir foto"
          >
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Adicionar event listeners para botões de deletar
  photosGallery.querySelectorAll('.photo-admin-btn--delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const photoId = parseInt(btn.dataset.photoId);
      const photoUrl = btn.dataset.photoUrl;
      openDeleteModal(photoId, photoUrl);
    });
  });
}

// Buscar fotos
if (photosSearch) {
  photosSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      renderPhotosGallery(allPhotos);
      return;
    }
    
    const filtered = allPhotos.filter(photo => {
      return photo.sender_name && photo.sender_name.toLowerCase().includes(query);
    });
    
    renderPhotosGallery(filtered);
  });
}

// Modal de exclusão
function openDeleteModal(photoId, photoUrl) {
  photoToDelete = photoId;
  if (deleteModalPreview) {
    deleteModalPreview.src = photoUrl;
  }
  deleteModal?.classList.add('is-open');
}

function closeDeleteModal() {
  photoToDelete = null;
  if (deleteModalPreview) {
    deleteModalPreview.src = '';
  }
  deleteModal?.classList.remove('is-open');
}

if (deleteCancel) {
  deleteCancel.addEventListener('click', closeDeleteModal);
}

if (deleteModal) {
  deleteModal.querySelector('.delete-modal__backdrop')?.addEventListener('click', closeDeleteModal);
}

if (deleteConfirm) {
  deleteConfirm.addEventListener('click', async () => {
    if (!photoToDelete) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/photos/${photoToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (!response.ok) throw new Error('Erro ao excluir foto');
      
      setStatus('Foto excluída com sucesso', 'success');
      closeDeleteModal();
      
      // Recarregar galeria
      setTimeout(() => {
        loadPhotos();
      }, 500);
      
    } catch (error) {
      console.error('Erro ao excluir foto:', error);
      setStatus('Erro ao excluir foto', 'error');
    }
  });
}

// Atualizar botão de refresh para recarregar fotos também
const originalRefresh = els.btnRefresh?.onclick;
if (els.btnRefresh) {
  els.btnRefresh.onclick = async () => {
    if (currentTab === 'photos') {
      await loadPhotos();
    } else if (originalRefresh) {
      await originalRefresh();
    } else {
      await init();
    }
  };
}