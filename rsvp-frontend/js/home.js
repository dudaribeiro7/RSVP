// js/home.js

// Modal de fotos
function setupPhotoModal() {
  const modal = document.getElementById("photo-modal");
  const modalImg = document.getElementById("photo-modal-img");
  
  if (!modal || !modalImg) return;

  // Abrir modal ao clicar na foto
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("js-open-photo")) {
      const fullUrl = e.target.dataset.fullUrl || e.target.src;
      if (fullUrl) {
        modalImg.src = fullUrl;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
    }
  });

  // Fechar modal
  modal.addEventListener("click", (e) => {
    if (e.target.dataset.close || e.target === modal) {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      modalImg.src = "";
      document.body.style.overflow = "";
    }
  });

  // Fechar com ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      modalImg.src = "";
      document.body.style.overflow = "";
    }
  });
}

// Adicionar classe js-open-photo às imagens dos looks, menu e bar
document.addEventListener("DOMContentLoaded", () => {
  setupPhotoModal();
  
  // Imagens dos looks
  const lookImages = document.querySelectorAll(".dresscode-looks__item img");
  lookImages.forEach(img => {
    img.classList.add("js-open-photo");
    
    // Adicionar data-full-url baseado no src
    if (!img.hasAttribute("data-full-url")) {
      img.setAttribute("data-full-url", img.src);
    }
  });

  // Imagens de menu e bar (já têm a classe js-open-photo no HTML)
  const posterImages = document.querySelectorAll(".img-poster");
  posterImages.forEach(img => {
    if (!img.hasAttribute("data-full-url")) {
      img.setAttribute("data-full-url", img.src);
    }
  });
});