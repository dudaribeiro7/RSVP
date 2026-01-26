// js/photos.js

const API_BASE_URL = "https://rsvp-api-o8zt.onrender.com";
const MAX_PHOTOS_PER_UPLOAD = 30;

// Estado da galeria
let allPhotos = [];
let isLoadingPhotos = false;
let selectedFiles = [];

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadPhotos();
  setupPhotoUpload();
  setupPhotoModal();
});

// ========== CARREGAR FOTOS ==========
async function loadPhotos() {
  if (isLoadingPhotos) return;
  
  isLoadingPhotos = true;
  const container = document.getElementById("photos-gallery");
  const loadingEl = document.getElementById("photos-loading");
  const emptyEl = document.getElementById("photos-empty");
  const countEl = document.getElementById("photos-count");

  try {
    loadingEl?.classList.remove("hidden");
    emptyEl?.classList.add("hidden");

    const response = await fetch(`${API_BASE_URL}/photos/`);
    
    if (!response.ok) {
      throw new Error("Erro ao carregar fotos");
    }

    allPhotos = await response.json();

    // Atualizar contador
    if (countEl) {
      countEl.textContent = allPhotos.length;
    }

    // Renderizar galeria
    if (container) {
      if (allPhotos.length === 0) {
        container.innerHTML = "";
        emptyEl?.classList.remove("hidden");
      } else {
        renderGallery(allPhotos, container);
      }
    }

  } catch (error) {
    console.error("Erro ao carregar fotos:", error);
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          Não foi possível carregar as fotos. 
          <button onclick="loadPhotos()" class="btn-secondary" style="margin-top: 0.5rem;">
            Tentar novamente
          </button>
        </div>
      `;
    }
  } finally {
    loadingEl?.classList.add("hidden");
    isLoadingPhotos = false;
  }
}

// ========== RENDERIZAR GALERIA ==========
function renderGallery(photos, container) {
  container.innerHTML = photos
    .map(
      (photo) => `
      <div class="photo-item" data-photo-id="${photo.id}">
        <img 
          src="${photo.photo_url}" 
          alt="Foto da festa" 
          class="photo-img js-open-photo"
          loading="lazy"
          data-full-url="${photo.photo_url}"
        />
        ${
          photo.sender_name
            ? `<div class="photo-sender">${escapeHtml(photo.sender_name)}</div>`
            : ""
        }
      </div>
    `
    )
    .join("");
}

// ========== UPLOAD DE FOTOS ==========
function setupPhotoUpload() {
  const form = document.getElementById("photo-upload-form");
  const fileInput = document.getElementById("photo-file");
  const previewContainer = document.getElementById("photo-preview-container");
  const previewGrid = document.getElementById("photo-preview-grid");
  const submitBtn = document.getElementById("photo-submit-btn");
  const statusMsg = document.getElementById("photo-status-message");
  const selectedCount = document.getElementById("selected-photos-count");

  if (!form || !fileInput) return;

  // Seleção de múltiplas imagens
  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) {
      clearPreviews();
      return;
    }

    // Validar quantidade
    if (files.length > MAX_PHOTOS_PER_UPLOAD) {
      showPhotoStatus(`Máximo de ${MAX_PHOTOS_PER_UPLOAD} fotos por envio`, "error");
      fileInput.value = "";
      return;
    }

    // Validar tipos e tamanhos
    const validFiles = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        showPhotoStatus(`Arquivo ${file.name} não é uma imagem`, "error");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        showPhotoStatus(`${file.name} muito grande (máx 10MB)`, "error");
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      fileInput.value = "";
      return;
    }

    // Atualizar arquivos selecionados
    selectedFiles = validFiles;
    
    // Atualizar contador
    if (selectedCount) {
      selectedCount.textContent = `${validFiles.length} foto${validFiles.length > 1 ? 's' : ''} selecionada${validFiles.length > 1 ? 's' : ''}`;
    }

    // Mostrar previews
    showPreviews(validFiles);
  });

  // Submit do formulário
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      showPhotoStatus("Selecione pelo menos uma foto para enviar", "error");
      return;
    }

    const senderName = document.getElementById("photo-sender-name")?.value.trim();

    // Criar FormData
    const formData = new FormData();
    
    // Adicionar todas as fotos
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
    
    // Adicionar nome (opcional)
    if (senderName) {
      formData.append("sender_name", senderName);
    }

    // Desabilitar botão
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = `Enviando ${selectedFiles.length} foto${selectedFiles.length > 1 ? 's' : ''}...`;
    showPhotoStatus("", "");

    try {
      const response = await fetch(`${API_BASE_URL}/photos/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Erro ao enviar fotos");
      }

      const uploadedPhotos = await response.json();

      // Sucesso!
      showPhotoStatus(
        `${uploadedPhotos.length} foto${uploadedPhotos.length > 1 ? 's' : ''} enviada${uploadedPhotos.length > 1 ? 's' : ''} com sucesso! 🎉`, 
        "success"
      );
      
      // Limpar formulário
      form.reset();
      clearPreviews();

      // Recarregar galeria
      setTimeout(() => {
        loadPhotos();
        showPhotoStatus("", "");
      }, 2000);

    } catch (error) {
      console.error("Erro no upload:", error);
      showPhotoStatus(error.message || "Erro ao enviar fotos", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// ========== PREVIEWS ==========
function showPreviews(files) {
  const previewContainer = document.getElementById("photo-preview-container");
  const previewGrid = document.getElementById("photo-preview-grid");
  
  if (!previewGrid) return;

  // Limpar previews anteriores
  previewGrid.innerHTML = "";

  // Criar preview para cada arquivo
  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewItem = document.createElement("div");
      previewItem.className = "preview-item";
      previewItem.innerHTML = `
        <img src="${e.target.result}" alt="Preview ${index + 1}">
        <button type="button" class="remove-preview" data-index="${index}">×</button>
      `;
      previewGrid.appendChild(previewItem);
    };
    reader.readAsDataURL(file);
  });

  // Mostrar container
  previewContainer?.classList.remove("hidden");

  // Event listener para remover fotos individuais
  previewGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-preview")) {
      const index = parseInt(e.target.dataset.index);
      removePhoto(index);
    }
  });
}

function removePhoto(index) {
  selectedFiles.splice(index, 1);
  
  const fileInput = document.getElementById("photo-file");
  const selectedCount = document.getElementById("selected-photos-count");
  
  if (selectedFiles.length === 0) {
    clearPreviews();
    fileInput.value = "";
  } else {
    // Atualizar contador
    if (selectedCount) {
      selectedCount.textContent = `${selectedFiles.length} foto${selectedFiles.length > 1 ? 's' : ''} selecionada${selectedFiles.length > 1 ? 's' : ''}`;
    }
    showPreviews(selectedFiles);
  }
}

function clearPreviews() {
  const previewContainer = document.getElementById("photo-preview-container");
  const previewGrid = document.getElementById("photo-preview-grid");
  const selectedCount = document.getElementById("selected-photos-count");
  
  if (previewGrid) previewGrid.innerHTML = "";
  if (selectedCount) selectedCount.textContent = "";
  previewContainer?.classList.add("hidden");
  selectedFiles = [];
}

// ========== MODAL DE FOTO ==========
function setupPhotoModal() {
  const modal = document.getElementById("photo-modal");
  const modalImg = document.getElementById("photo-modal-img");
  
  if (!modal || !modalImg) return;

  // Abrir modal ao clicar na foto
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("js-open-photo")) {
      const fullUrl = e.target.dataset.fullUrl;
      if (fullUrl) {
        modalImg.src = fullUrl;
        modal.classList.add("is-open");
        document.body.style.overflow = "hidden";
      }
    }
  });

  // Fechar modal
  modal.addEventListener("click", (e) => {
    if (e.target.dataset.close || e.target === modal) {
      modal.classList.remove("is-open");
      modalImg.src = "";
      document.body.style.overflow = "";
    }
  });
}

// ========== HELPERS ==========
function showPhotoStatus(message, type) {
  const statusMsg = document.getElementById("photo-status-message");
  if (!statusMsg) return;

  statusMsg.textContent = message;
  statusMsg.className = "status-message";
  
  if (type === "error") {
    statusMsg.classList.add("status-message--error");
  } else if (type === "success") {
    statusMsg.classList.add("status-message--success");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}