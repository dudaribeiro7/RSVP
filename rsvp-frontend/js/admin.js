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
  
  // Atualizar botões das tabs
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Atualizar conteúdos das tabs
  tabContents.forEach(content => {
    if (content.id === `tab-${tabName}`) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });
  
  // Pegar todos os elementos de controle
  const guestsOnlyElements = document.querySelectorAll('.guests-only');
  const photosOnlyElements = document.querySelectorAll('.photos-only');
  const tablesOnlyElements = document.querySelectorAll('.tables-only');
  
  // Resetar todas as classes de visibilidade primeiro
  guestsOnlyElements.forEach(el => {
    el.classList.remove('hidden-in-photos', 'hidden-in-tables');
  });
  photosOnlyElements.forEach(el => {
    el.classList.remove('hidden-in-guests', 'hidden-in-tables');
  });
  tablesOnlyElements.forEach(el => {
    el.classList.remove('hidden-in-guests', 'hidden-in-photos');
  });
  
  // Aplicar classes específicas para cada aba
  if (tabName === 'guests') {
    guestsFilters?.classList.remove('hidden');
    photosFilters?.classList.add('hidden');
    tablesFilters?.classList.add('hidden');
    
    // Esconder elementos de outras abas
    photosOnlyElements.forEach(el => {
      el.classList.add('hidden-in-guests');
    });
    tablesOnlyElements.forEach(el => {
      el.classList.add('hidden-in-guests');
    });
    
  } else if (tabName === 'photos') {
    guestsFilters?.classList.add('hidden');
    photosFilters?.classList.remove('hidden');
    tablesFilters?.classList.add('hidden');
    
    // Esconder elementos de outras abas
    guestsOnlyElements.forEach(el => {
      el.classList.add('hidden-in-photos');
    });
    tablesOnlyElements.forEach(el => {
      el.classList.add('hidden-in-photos');
    });
    
    setStatus('');
    loadPhotos();
    
  } else if (tabName === 'tables') {
    guestsFilters?.classList.add('hidden');
    photosFilters?.classList.add('hidden');
    tablesFilters?.classList.remove('hidden');
    
    // Esconder elementos de outras abas
    guestsOnlyElements.forEach(el => {
      el.classList.add('hidden-in-tables');
    });
    photosOnlyElements.forEach(el => {
      el.classList.add('hidden-in-tables');
    });
    
    setStatus('');
    
    // Carregar dados de mesas
    if (allPeople.length === 0) {
      loadPeople()
        .then(() => loadTablesArrangement())
        .catch(error => {
          console.error('Erro ao carregar:', error);
          if (error.message.includes('404')) {
            setStatus('⚠️ Faça deploy do backend com os novos arquivos de mesas primeiro!', 'error');
          }
        });
    } else {
      loadTablesArrangement();
    }
  }
}

// Carregar fotos
async function loadPhotos() {
  if (!photosGallery) return;
  
  try {
    photosLoading?.classList.remove('hidden');
    photosEmpty?.classList.add('hidden');
    photosGallery.innerHTML = '';
    
    const response = await fetch(`${API_BASE_URL}/photos/`);
    
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
    
    const token = getToken();
    if (!token) {
      setStatus('Erro: Token de autenticação não encontrado', 'error');
      return;
    }
    
    try {
      console.log('Deletando foto ID:', photoToDelete);
      console.log('URL:', `${API_BASE_URL}/photos/${photoToDelete}`);
      
      const response = await fetch(`${API_BASE_URL}/photos/${photoToDelete}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-Admin-Token': token
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        clearToken();
        openLogin("PIN inválido.");
        throw new Error("Não autorizado");
      }
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro do servidor:', errorData);
        throw new Error(`Erro ${response.status}: ${errorData}`);
      }
      
      setStatus('Foto excluída com sucesso', 'success');
      closeDeleteModal();
      
      // Recarregar galeria
      setTimeout(() => {
        loadPhotos();
        setStatus('');
      }, 1500);
      
    } catch (error) {
      console.error('Erro completo:', error);
      setStatus(`Erro ao excluir foto: ${error.message}`, 'error');
      closeDeleteModal();
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

/* ============================= */
/*  DOWNLOAD DE TODAS AS FOTOS   */
/* ============================= */

const btnDownloadPhotos = document.getElementById('btn-download-photos');

if (btnDownloadPhotos) {
  btnDownloadPhotos.addEventListener('click', async () => {
    if (allPhotos.length === 0) {
      setStatus('Nenhuma foto para baixar', 'error');
      return;
    }
    
    try {
      // Desabilitar botão e mostrar progresso
      btnDownloadPhotos.disabled = true;
      btnDownloadPhotos.textContent = 'Preparando download...';
      setStatus('Baixando fotos...', 'info');
      
      const zip = new JSZip();
      const folder = zip.folder('fotos-festa-duda');
      
      // Baixar todas as fotos
      let downloadedCount = 0;
      
      for (const photo of allPhotos) {
        try {
          btnDownloadPhotos.textContent = `Baixando ${downloadedCount + 1}/${allPhotos.length}...`;
          
          // Fetch da imagem
          const response = await fetch(photo.photo_url);
          const blob = await response.blob();
          
          // Nome do arquivo
          const date = new Date(photo.uploaded_at);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
          
          // Extensão da imagem
          const extension = photo.photo_url.split('.').pop().split('?')[0] || 'jpg';
          
          // Nome: data_hora_nome.ext ou data_hora.ext
          let filename;
          if (photo.sender_name) {
            const safeName = photo.sender_name.replace(/[^a-zA-Z0-9]/g, '_');
            filename = `${dateStr}_${timeStr}_${safeName}.${extension}`;
          } else {
            filename = `${dateStr}_${timeStr}.${extension}`;
          }
          
          // Adicionar ao ZIP
          folder.file(filename, blob);
          downloadedCount++;
          
        } catch (error) {
          console.error(`Erro ao baixar foto ${photo.id}:`, error);
        }
      }
      
      if (downloadedCount === 0) {
        throw new Error('Nenhuma foto foi baixada com sucesso');
      }
      
      // Gerar ZIP
      setStatus('Gerando arquivo ZIP...', 'info');
      btnDownloadPhotos.textContent = 'Gerando ZIP...';
      
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Download do ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fotos-festa-duda-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus(`${downloadedCount} fotos baixadas com sucesso!`, 'success');
      
      setTimeout(() => {
        setStatus('');
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao baixar fotos:', error);
      setStatus(`Erro ao baixar fotos: ${error.message}`, 'error');
    } finally {
      // Reabilitar botão
      btnDownloadPhotos.disabled = false;
      btnDownloadPhotos.textContent = '⬇️ Baixar todas as fotos';
    }
  });
}

/* ============================= */
/*  ORGANIZAÇÃO DE MESAS         */
/* ============================= */

let allPeople = [];
let tablesData = {};
let tablesSeats = {}; // Armazena número de lugares por mesa
let assignedPeople = new Set();

// Elementos
const tablesFilters = document.getElementById('tables-filters');
const tablesContainer = document.getElementById('tables-container');
const numTablesInput = document.getElementById('num-tables');
const btnGenerateTables = document.getElementById('btn-generate-tables');
const btnSaveTables = document.getElementById('btn-save-tables');
const btnClearTables = document.getElementById('btn-clear-tables');

// Carregar pessoas disponíveis
async function loadPeople() {
  try {
    console.log('Carregando pessoas...');
    
    const response = await fetch(`${API_BASE_URL}/tables/people`, {
      headers: authedHeaders()
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      clearToken();
      openLogin("PIN inválido.");
      throw new Error("Não autorizado");
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro do servidor:', errorText);
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }
    
    allPeople = await response.json();
    console.log('Pessoas carregadas:', allPeople.length);
    
  } catch (error) {
    console.error('Erro completo ao carregar pessoas:', error);
    setStatus(`Erro ao carregar lista de convidados: ${error.message}`, 'error');
    throw error;
  }
}

// Carregar arranjo de mesas salvo
async function loadTablesArrangement() {
  try {
    const response = await fetch(`${API_BASE_URL}/tables/arrangements`, {
      headers: authedHeaders()
    });
    
    if (response.status === 401) {
      clearToken();
      openLogin("PIN inválido.");
      throw new Error("Não autorizado");
    }
    
    if (!response.ok) throw new Error('Erro ao carregar arranjo de mesas');
    
    const savedTables = await response.json();
    
    // Se tem mesas salvas, gerar interface com elas
    if (Object.keys(savedTables).length > 0) {
      const maxTable = Math.max(...Object.keys(savedTables).map(Number));
      numTablesInput.value = maxTable;
      tablesData = savedTables;
      renderTables();
    }
    
  } catch (error) {
    console.error('Erro ao carregar arranjo:', error);
  }
}

// Gerar mesas
if (btnGenerateTables) {
  btnGenerateTables.addEventListener('click', () => {
    const numTables = parseInt(numTablesInput.value) || 10;
    
    if (numTables < 1 || numTables > 50) {
      setStatus('Número de mesas deve estar entre 1 e 50', 'error');
      return;
    }
    
    // Manter dados das mesas existentes
    const newTablesData = {};
    const newTablesSeats = {};
    
    for (let i = 1; i <= numTables; i++) {
      newTablesData[i] = tablesData[i] || [];
      newTablesSeats[i] = tablesSeats[i] || 8; // Padrão 8 lugares
    }
    
    tablesData = newTablesData;
    tablesSeats = newTablesSeats;
    renderTables();
    setStatus('');
  });
}

// Renderizar mesas
function renderTables() {
  if (!tablesContainer) return;
  
  const tableNumbers = Object.keys(tablesData).sort((a, b) => Number(a) - Number(b));
  
  if (tableNumbers.length === 0) {
    tablesContainer.innerHTML = '<p class="tables-empty">Defina o número de mesas acima e clique em "Gerar mesas"</p>';
    return;
  }
  
  // Recalcular pessoas já atribuídas
  assignedPeople.clear();
  for (const people of Object.values(tablesData)) {
    people.forEach(personId => {
      if (personId) assignedPeople.add(personId);
    });
  }
  
  tablesContainer.innerHTML = tableNumbers.map((tableNum, index) => {
    const people = tablesData[tableNum] || [];
    const numSeats = tablesSeats[tableNum] || 8;
    const occupiedSeats = people.filter(p => p).length;
    const isFirst = index === 0;
    const isLast = index === tableNumbers.length - 1;
    
    return `
      <div class="table-card" data-table="${tableNum}">
        <div class="table-card__header">
          <div class="table-card__controls">
            <div class="table-card__order-buttons">
              <button 
                class="order-btn" 
                data-table="${tableNum}" 
                data-action="up"
                ${isFirst ? 'disabled' : ''}
                title="Mover para cima"
              >
                ▲
              </button>
              <button 
                class="order-btn" 
                data-table="${tableNum}" 
                data-action="down"
                ${isLast ? 'disabled' : ''}
                title="Mover para baixo"
              >
                ▼
              </button>
            </div>
            <h3 class="table-card__title">Mesa ${tableNum}</h3>
          </div>
          
          <div class="table-card__controls">
            <div class="seats-control">
              <span class="seats-control__label">Lugares:</span>
              <button 
                class="seats-control__btn" 
                data-table="${tableNum}" 
                data-action="decrease"
                ${numSeats <= 4 ? 'disabled' : ''}
              >
                −
              </button>
              <input 
                type="number" 
                class="seats-control__input" 
                data-table="${tableNum}"
                value="${numSeats}" 
                min="4" 
                max="20"
              />
              <button 
                class="seats-control__btn" 
                data-table="${tableNum}" 
                data-action="increase"
                ${numSeats >= 20 ? 'disabled' : ''}
              >
                +
              </button>
            </div>
            <span class="table-card__count">${occupiedSeats}/${numSeats}</span>
          </div>
        </div>
        
        <div class="table-card__seats">
          ${Array.from({length: numSeats}, (_, i) => i).map(seatNum => `
            <div class="table-seat" data-table="${tableNum}" data-seat="${seatNum}">
              <div class="table-seat__number">${seatNum + 1}</div>
              <select 
                class="table-seat__select" 
                data-table="${tableNum}" 
                data-seat="${seatNum}"
              >
                <option value="">-- Vazio --</option>
                ${renderPeopleOptions(people[seatNum])}
              </select>
              ${people[seatNum] ? `
                <button 
                  class="table-seat__remove" 
                  data-table="${tableNum}" 
                  data-seat="${seatNum}"
                  title="Remover pessoa"
                >
                  ×
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners para selects
  tablesContainer.querySelectorAll('.table-seat__select').forEach(select => {
    select.addEventListener('change', handleSeatChange);
  });
  
  // Event listeners para botões de remover
  tablesContainer.querySelectorAll('.table-seat__remove').forEach(btn => {
    btn.addEventListener('click', handleRemovePerson);
  });
  
  // Event listeners para botões de ordenação
  tablesContainer.querySelectorAll('.order-btn').forEach(btn => {
    btn.addEventListener('click', handleTableOrder);
  });
  
  // Event listeners para controle de lugares
  tablesContainer.querySelectorAll('.seats-control__btn').forEach(btn => {
    btn.addEventListener('click', handleSeatsControl);
  });
  
  tablesContainer.querySelectorAll('.seats-control__input').forEach(input => {
    input.addEventListener('change', handleSeatsInputChange);
  });
}

// Renderizar opções de pessoas no dropdown
function renderPeopleOptions(currentPersonId) {
  return allPeople.map(person => {
    const isAssigned = assignedPeople.has(person.id) && person.id !== currentPersonId;
    const isSelected = person.id === currentPersonId;
    
    return `
      <option 
        value="${person.id}" 
        ${isSelected ? 'selected' : ''}
        ${isAssigned ? 'disabled' : ''}
        data-type="${person.type}"
      >
        ${person.name}${isAssigned ? ' (já alocado)' : ''}
      </option>
    `;
  }).join('');
}

// Tratar mudança de assento
function handleSeatChange(e) {
  const select = e.target;
  const tableNum = select.dataset.table;
  const seatIndex = parseInt(select.dataset.seat);
  const personId = select.value;
  
  // Remover pessoa antiga do set de atribuídas
  const oldPersonId = tablesData[tableNum][seatIndex];
  if (oldPersonId) {
    assignedPeople.delete(oldPersonId);
  }
  
  // Atualizar dados
  tablesData[tableNum][seatIndex] = personId || null;
  
  // Adicionar nova pessoa ao set
  if (personId) {
    assignedPeople.add(personId);
  }
  
  // Re-renderizar
  renderTables();
}

// Remover pessoa de um assento
function handleRemovePerson(e) {
  const btn = e.target;
  const tableNum = btn.dataset.table;
  const seatIndex = parseInt(btn.dataset.seat);
  
  const personId = tablesData[tableNum][seatIndex];
  if (personId) {
    assignedPeople.delete(personId);
  }
  
  tablesData[tableNum][seatIndex] = null;
  renderTables();
}

// Salvar mesas
if (btnSaveTables) {
  btnSaveTables.addEventListener('click', async () => {
    try {
      btnSaveTables.disabled = true;
      btnSaveTables.textContent = 'Salvando...';
      
      const response = await fetch(`${API_BASE_URL}/tables/arrangements`, {
        method: 'POST',
        headers: {
          ...authedHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tablesData)
      });
      
      if (response.status === 401) {
        clearToken();
        openLogin("PIN inválido.");
        throw new Error("Não autorizado");
      }
      
      if (!response.ok) throw new Error('Erro ao salvar mesas');
      
      setStatus('Mesas salvas com sucesso!', 'success');
      
      setTimeout(() => setStatus(''), 2000);
      
    } catch (error) {
      console.error('Erro ao salvar mesas:', error);
      setStatus('Erro ao salvar mesas', 'error');
    } finally {
      btnSaveTables.disabled = false;
      btnSaveTables.textContent = '💾 Salvar mesas';
    }
  });
}

// Limpar todas as mesas
if (btnClearTables) {
  btnClearTables.addEventListener('click', async () => {
    if (!confirm('Tem certeza que deseja limpar TODA a organização de mesas? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      btnClearTables.disabled = true;
      
      const response = await fetch(`${API_BASE_URL}/tables/arrangements`, {
        method: 'DELETE',
        headers: authedHeaders()
      });
      
      if (response.status === 401) {
        clearToken();
        openLogin("PIN inválido.");
        throw new Error("Não autorizado");
      }
      
      if (!response.ok) throw new Error('Erro ao limpar mesas');
      
      // Limpar dados locais
      for (const tableNum in tablesData) {
        tablesData[tableNum] = [];
      }
      assignedPeople.clear();
      
      renderTables();
      setStatus('Mesas limpas com sucesso', 'success');
      
      setTimeout(() => setStatus(''), 2000);
      
    } catch (error) {
      console.error('Erro ao limpar mesas:', error);
      setStatus('Erro ao limpar mesas', 'error');
    } finally {
      btnClearTables.disabled = false;
    }
  });
}

/* ============================= */
/*  DRAG AND DROP - MESAS        */
/* ============================= */

let draggedTableNumber = null;

function setupTableDragAndDrop() {
  const tableCards = tablesContainer.querySelectorAll('.table-card');
  
  tableCards.forEach(card => {
    card.addEventListener('dragstart', handleTableDragStart);
    card.addEventListener('dragend', handleTableDragEnd);
    card.addEventListener('dragover', handleTableDragOver);
    card.addEventListener('drop', handleTableDrop);
  });
}

function handleTableDragStart(e) {
  // Só permitir arrastar pelo header
  if (!e.target.classList.contains('table-card__header') && 
      !e.target.closest('.table-card__header')) {
    e.preventDefault();
    return;
  }
}

/* ============================= */
/*  ORDENAÇÃO DE MESAS           */
/* ============================= */

function handleTableOrder(e) {
  const btn = e.currentTarget;
  const tableNum = btn.dataset.table;
  const action = btn.dataset.action;
  
  const tableNumbers = Object.keys(tablesData).sort((a, b) => Number(a) - Number(b));
  const currentIndex = tableNumbers.indexOf(tableNum);
  
  if (action === 'up' && currentIndex > 0) {
    // Trocar com a mesa anterior
    const prevTableNum = tableNumbers[currentIndex - 1];
    swapTables(tableNum, prevTableNum);
  } else if (action === 'down' && currentIndex < tableNumbers.length - 1) {
    // Trocar com a próxima mesa
    const nextTableNum = tableNumbers[currentIndex + 1];
    swapTables(tableNum, nextTableNum);
  }
}

function swapTables(tableNum1, tableNum2) {
  // Trocar dados
  const tempData = tablesData[tableNum1];
  tablesData[tableNum1] = tablesData[tableNum2];
  tablesData[tableNum2] = tempData;
  
  // Trocar número de lugares
  const tempSeats = tablesSeats[tableNum1];
  tablesSeats[tableNum1] = tablesSeats[tableNum2];
  tablesSeats[tableNum2] = tempSeats;
  
  renderTables();
}

/* ============================= */
/*  CONTROLE DE LUGARES          */
/* ============================= */

function handleSeatsControl(e) {
  const btn = e.currentTarget;
  const tableNum = btn.dataset.table;
  const action = btn.dataset.action;
  
  let currentSeats = tablesSeats[tableNum] || 8;
  
  if (action === 'increase' && currentSeats < 20) {
    currentSeats++;
  } else if (action === 'decrease' && currentSeats > 4) {
    // Verificar se não há pessoas nos lugares que serão removidos
    const people = tablesData[tableNum] || [];
    const hasPersonInLastSeat = people[currentSeats - 1];
    
    if (hasPersonInLastSeat) {
      setStatus('Remova a pessoa do último lugar antes de diminuir', 'error');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    
    currentSeats--;
    // Remover o último lugar vazio
    tablesData[tableNum] = people.slice(0, currentSeats);
  }
  
  tablesSeats[tableNum] = currentSeats;
  renderTables();
}

function handleSeatsInputChange(e) {
  const input = e.currentTarget;
  const tableNum = input.dataset.table;
  let newSeats = parseInt(input.value);
  
  // Validar
  if (isNaN(newSeats) || newSeats < 4) {
    newSeats = 4;
  } else if (newSeats > 20) {
    newSeats = 20;
  }
  
  const currentSeats = tablesSeats[tableNum] || 8;
  
  if (newSeats < currentSeats) {
    // Verificar se não há pessoas nos lugares que serão removidos
    const people = tablesData[tableNum] || [];
    const hasPersonInRemovedSeats = people.slice(newSeats).some(p => p);
    
    if (hasPersonInRemovedSeats) {
      setStatus('Remova as pessoas dos últimos lugares antes de diminuir', 'error');
      setTimeout(() => setStatus(''), 2000);
      input.value = currentSeats;
      return;
    }
    
    // Remover lugares vazios extras
    tablesData[tableNum] = people.slice(0, newSeats);
  }
  
  tablesSeats[tableNum] = newSeats;
  renderTables();
}