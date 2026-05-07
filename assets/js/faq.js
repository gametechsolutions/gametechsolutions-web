document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("faq-container");
  const tabs = document.querySelectorAll(".faq-tab");

  if (!container) {
    console.error("[FAQ] No existe #faq-container");
    return;
  }

  if (!tabs.length) {
    console.error("[FAQ] No existen .faq-tab");
    container.innerHTML = `
      <div class="faq-empty">
        <h3>No se encontraron categorías</h3>
        <p>Revisa que existan botones con la clase .faq-tab.</p>
      </div>
    `;
    return;
  }

  let faqData = {};

  try {
    const res = await fetch("/assets/data/faq-data.json", {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`No se pudo cargar faq-data.json. Status: ${res.status}`);
    }

    faqData = await res.json();
  } catch (error) {
    console.error("[FAQ] Error cargando faq-data.json:", error);

    container.innerHTML = `
      <div class="faq-empty">
        <h3>No se pudieron cargar las preguntas frecuentes</h3>
        <p>Revisa que el archivo /assets/data/faq-data.json exista y tenga JSON válido.</p>
      </div>
    `;

    return;
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setActiveTab(sectionKey) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.target === sectionKey;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function closeOtherItems(currentItem) {
    container.querySelectorAll(".faq-item.open").forEach((item) => {
      if (item === currentItem) return;

      item.classList.remove("open");

      const button = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");

      if (button) button.setAttribute("aria-expanded", "false");
      if (answer) answer.hidden = true;
    });
  }

  function renderSection(sectionKey) {
    container.innerHTML = "";

    const items = faqData[sectionKey];

    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = `
        <div class="faq-empty">
          <h3>No hay preguntas en esta sección</h3>
          <p>La categoría "${escapeHTML(sectionKey)}" no tiene preguntas configuradas todavía.</p>
        </div>
      `;
      return;
    }

    const section = document.createElement("div");
    section.className = "faq-accordion";

    items.forEach((item, index) => {
      const faqItem = document.createElement("article");
      faqItem.className = "faq-item";

      const answerId = `faq-answer-${sectionKey}-${index}`;

      faqItem.innerHTML = `
        <button
          class="faq-question"
          type="button"
          aria-expanded="false"
          aria-controls="${answerId}"
        >
          <span>${escapeHTML(item.question)}</span>
          <span class="faq-icon" aria-hidden="true">+</span>
        </button>

        <div class="faq-answer" id="${answerId}" hidden>
          <p>${escapeHTML(item.answer)}</p>
        </div>
      `;

      const button = faqItem.querySelector(".faq-question");
      const answer = faqItem.querySelector(".faq-answer");

      button.addEventListener("click", () => {
        const isOpen = faqItem.classList.contains("open");

        closeOtherItems(faqItem);

        faqItem.classList.toggle("open", !isOpen);
        button.setAttribute("aria-expanded", !isOpen ? "true" : "false");
        answer.hidden = isOpen;
      });

      section.appendChild(faqItem);
    });

    container.appendChild(section);
  }

  function activateSection(sectionKey) {
    setActiveTab(sectionKey);
    renderSection(sectionKey);
  }

  activateSection("general");

  tabs.forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.setAttribute(
      "aria-selected",
      tab.classList.contains("active") ? "true" : "false",
    );

    tab.addEventListener("click", () => {
      activateSection(tab.dataset.target);
    });
  });
});