// js/rsvp.js

const API_BASE_URL = "https://rsvp-api-o8zt.onrender.com";

const form = document.getElementById("rsvp-form");
const statusMessage = document.getElementById("status-message");
const submitBtn = document.getElementById("submit-btn");

const companionsSection = document.getElementById("companions-section");
const addCompanionBtn = document.getElementById("add-companion");
const companionsContainer = document.getElementById("companions-container");

const rsvpStatusError = document.getElementById("rsvp-status-error");

/* ===========================
   Função de status geral
=========================== */
function setStatus(message, type = null) {
  statusMessage.textContent = message || "";
  statusMessage.classList.remove(
    "status-message--error",
    "status-message--success"
  );
  if (type === "error") statusMessage.classList.add("status-message--error");
  if (type === "success")
    statusMessage.classList.add("status-message--success");
}

/* ===========================
   RSVP Status helpers
=========================== */
function getSelectedRsvpStatus() {
  const el = form.querySelector("input[name='rsvp_status']:checked");
  return el ? el.value : null; // YES | NO | MAYBE | null
}

function setRsvpStatusError(message) {
  if (!rsvpStatusError) return;
  rsvpStatusError.textContent = message || "";
  rsvpStatusError.style.display = message ? "block" : "none";
}

function toggleCompanionsSection() {
  const status = getSelectedRsvpStatus();
  const shouldShow = status === "YES";

  if (!companionsSection) return;

  if (shouldShow) {
    companionsSection.classList.remove("hidden");
  } else {
    companionsSection.classList.add("hidden");
    // Se a pessoa não vai / talvez, limpa acompanhantes
    if (companionsContainer) companionsContainer.innerHTML = "";
  }
}

// Observa mudanças no status
if (form) {
  form.addEventListener("change", (e) => {
    if (e.target && e.target.name === "rsvp_status") {
      setRsvpStatusError("");
      toggleCompanionsSection();
    }
  });
}

/* ===========================
   Criar linha de acompanhante
=========================== */
function createCompanionRow() {
  const row = document.createElement("div");
  row.className = "companion-row";

  // Campo do acompanhante
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Nome completo do acompanhante";
  input.className = "companion-input";
  input.autocomplete = "additional-name";
  input.required = false; // validação é manual

  // Mensagem de erro customizada
  const errorSpan = document.createElement("span");
  errorSpan.className = "input-error";
  errorSpan.style.display = "none";
  errorSpan.textContent = "Campo obrigatório";

  // Botão remover
  const btnRemove = document.createElement("button");
  btnRemove.type = "button";
  btnRemove.className = "remove-companion";
  btnRemove.textContent = "×";
  btnRemove.addEventListener("click", () => {
    companionsContainer.removeChild(row);
  });

  row.appendChild(input);
  row.appendChild(errorSpan);
  row.appendChild(btnRemove);

  return row;
}

// Botão para adicionar acompanhantes
if (addCompanionBtn) {
  addCompanionBtn.addEventListener("click", () => {
    companionsContainer.appendChild(createCompanionRow());
  });
}

/* ===========================
   Validação customizada
=========================== */
function validateField(input) {
  const errorSpan = input.nextElementSibling;

  if (!input.value.trim()) {
    input.classList.add("invalid");
    if (errorSpan) {
      errorSpan.textContent = "Campo obrigatório";
      errorSpan.style.display = "block";
    }
    return false;
  }

  input.classList.remove("invalid");
  if (errorSpan) errorSpan.style.display = "none";
  return true;
}

function validateForm() {
  let valid = true;

  // Nome e telefone
  const requiredInputs = form.querySelectorAll(
    "input[required]:not(.companion-input)"
  );
  requiredInputs.forEach((input) => {
    if (!validateField(input)) valid = false;
  });

  // Status RSVP obrigatório
  const status = getSelectedRsvpStatus();
  if (!status) {
    setRsvpStatusError("Selecione uma opção.");
    valid = false;
  }

  // Acompanhantes só se status == YES
  if (status === "YES") {
    const companionInputs =
      companionsContainer.querySelectorAll(".companion-input");
    companionInputs.forEach((input) => {
      // se o campo existe (a pessoa clicou em adicionar), ele vira obrigatório
      if (!validateField(input)) valid = false;
    });
  }

  return valid;
}

/* ===========================
   Envio do formulário
=========================== */
if (form) {
  // Estado inicial
  toggleCompanionsSection();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    if (!validateForm()) {
      setStatus("Preencha os campos obrigatórios.", "error");
      return;
    }

    const name = form.elements["name"].value.trim();
    const phone = form.elements["phone"].value.trim();
    const note = (form.elements["note"]?.value || "").trim();

    const rsvp_status = getSelectedRsvpStatus(); // YES | NO | MAYBE

    // Coleta acompanhantes (só se YES)
    const companions = [];
    if (rsvp_status === "YES") {
      const companionInputs =
        companionsContainer.querySelectorAll(".companion-input");
      companionInputs.forEach((input) => {
        const value = input.value.trim();
        if (value) companions.push({ name: value });
      });
    }

    const payload = {
      name,
      phone,
      rsvp_status,
      note: note || null,
      companions,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const response = await fetch(`${API_BASE_URL}/guests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = JSON.parse(text);
        } catch {}
        console.error("Erro ao enviar RSVP", errorData);
        throw new Error("Erro ao enviar sua resposta. Tente novamente.");
      }

      window.location.href = `success.html?status=${encodeURIComponent(
        rsvp_status
      )}`;
    } catch (err) {
      console.error(err);
      setStatus(
        err.message || "Não foi possível enviar agora. Tente mais tarde.",
        "error"
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar resposta";
    }
  });
}

/* ===========================
   Máscara de telefone
=========================== */

const phoneInput = document.getElementById("phone");

if (phoneInput) {
  phoneInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    } else {
      value = value.replace(/^(\d*)/, "($1");
    }

    e.target.value = value;
  });
}

// ===== Modal Menu & Bar =====
// ===== Modal só no PC =====
const isDesktop = () => window.matchMedia("(min-width: 769px)").matches;

const modal = document.getElementById("img-modal");
const modalImg = document.getElementById("img-modal-img");
const modalTitle = document.getElementById("img-modal-title");

function openModal(src, title) {
  if (!isDesktop()) return; // mobile: não faz nada
  modalImg.src = src;
  modalImg.alt = title || "Imagem";
  modalTitle.textContent = title || "";
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalImg.src = "";
  document.body.style.overflow = "";
}

// Clique nas imagens (só funciona no PC)
document.querySelectorAll(".js-open-modal").forEach((img) => {
  img.addEventListener("click", () => {
    openModal(img.getAttribute("src"), img.dataset.title);
  });
});

// Fechar
modal?.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "1") closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
});

// Se a pessoa abrir no PC e redimensionar pra mobile, fecha
window.addEventListener("resize", () => {
  if (!isDesktop() && modal?.classList.contains("is-open")) closeModal();
});
