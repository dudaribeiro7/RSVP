// js/rsvp.js

// Troque depois pelo endereço do backend no Render
const API_BASE_URL = "http://127.0.0.1:8000";

const form = document.getElementById("rsvp-form");
const addCompanionBtn = document.getElementById("add-companion");
const companionsContainer = document.getElementById("companions-container");
const statusMessage = document.getElementById("status-message");
const submitBtn = document.getElementById("submit-btn");

/* ===========================
   Função de status geral
=========================== */
function setStatus(message, type = null) {
  statusMessage.textContent = message || "";
  statusMessage.classList.remove("status-message--error", "status-message--success");
  if (type === "error") {
    statusMessage.classList.add("status-message--error");
  }
  if (type === "success") {
    statusMessage.classList.add("status-message--success");
  }
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
  input.required = true;
  input.autocomplete = "additional-name";

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

  // Montagem final
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

  // Valida inputs principais (nome e telefone)
  const requiredInputs = form.querySelectorAll("input[required]:not(.companion-input)");
  requiredInputs.forEach((input) => {
    if (!validateField(input)) valid = false;
  });

  // Validação dos acompanhantes
  const companionInputs = companionsContainer.querySelectorAll(".companion-input");

  if (companionInputs.length > 0) {
    // Se tiver acompanhantes, todos se tornam obrigatórios
    companionInputs.forEach((input) => {
      if (!validateField(input)) valid = false;
    });
  } else {
    // Sem acompanhantes → ok
    companionInputs.forEach((input) => {
      input.classList.remove("invalid");
      input.nextElementSibling.style.display = "none";
    });
  }

  return valid;
}

/* ===========================
   Envio do formulário
=========================== */
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    
    if (!validateForm()) {
      setStatus("Preencha os campos obrigatórios.", "error");
      return;
    }
    
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    
    // Coleta dos acompanhantes válidos
    const companions = [];
    const companionInputs = companionsContainer.querySelectorAll(".companion-input");
    companionInputs.forEach((input) => {
      const value = input.value.trim();
      if (value) companions.push({ name: value });
    });
    
    const payload = {
      name,
      phone,
      email: email || null,
      companions
    };
    console.log("Payload:", payload);
    
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const response = await fetch(`${API_BASE_URL}/guests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("Status da resposta:", response.status);
      const text = await response.text();
      console.log("Corpo da resposta:", text);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro ao enviar RSVP", errorData);
        throw new Error("Erro ao enviar sua confirmação. Tente novamente em alguns instantes.");
      }

      setStatus("");
      console.log("Redirecionando para success.html...");
      window.location.href = "success.html";

    } catch (err) {
      console.error(err);
      setStatus(err.message || "Não foi possível confirmar agora. Tente mais tarde.", "error");

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmar presença";
    }
  });
}

/* ===========================
   Máscara de telefone
=========================== */

const phoneInput = document.getElementById("phone");

if (phoneInput) {
  phoneInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, ""); // remove tudo que não é número

    // celular 11 dígitos
    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    }
    // fixo 10 dígitos
    else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    }
    // até 6 dígitos
    else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    }
    // até 2 dígitos
    else {
      value = value.replace(/^(\d*)/, "($1");
    }

    e.target.value = value;
  });
}

