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

  function createFaqItem(item, sectionKey, groupIndex, itemIndex) {
    const faqItem = document.createElement("article");
    faqItem.className = "faq-item";

    const answerId = `faq-answer-${sectionKey}-${groupIndex}-${itemIndex}`;

    function renderVideoButton(video) {
      if (!video || video.type !== "youtube" || !video.id) return "";

      return `
    <div class="faq-video-shell" data-video-id="${escapeHTML(video.id)}">
      <button
        class="faq-video-button"
        type="button"
        data-video-title="${escapeHTML(video.title || "Video explicativo")}"
      >
        ▶ Ver video explicativo
      </button>
    </div>
  `;
    }

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
        ${renderVideoButton(item.video)}
      </div>
    `;

    const button = faqItem.querySelector(".faq-question");
    const answer = faqItem.querySelector(".faq-answer");

    const videoButton = faqItem.querySelector(".faq-video-button");

    if (videoButton) {
      videoButton.addEventListener("click", () => {
        const shell = videoButton.closest(".faq-video-shell");
        const videoId = shell?.dataset.videoId;
        const title = videoButton.dataset.videoTitle || "Video explicativo";

        if (!shell || !videoId) return;

        shell.innerHTML = `
      <div class="faq-video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${escapeHTML(videoId)}"
          title="${escapeHTML(title)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    `;
      });
    }

    button.addEventListener("click", () => {
      const isOpen = faqItem.classList.contains("open");

      closeOtherItems(faqItem);

      faqItem.classList.toggle("open", !isOpen);
      button.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      answer.hidden = isOpen;
    });

    return faqItem;
  }

  function isGroupedSection(items) {
    return Array.isArray(items) && items.some((entry) => Array.isArray(entry.items));
  }

  function renderFlatSection(items, sectionKey) {
    const section = document.createElement("div");
    section.className = "faq-accordion";

    items.forEach((item, index) => {
      section.appendChild(createFaqItem(item, sectionKey, 0, index));
    });

    container.appendChild(section);
  }

  function renderGroupedSection(groups, sectionKey) {
    const wrapper = document.createElement("div");
    wrapper.className = "faq-groups";

    groups.forEach((group, groupIndex) => {
      const items = Array.isArray(group.items) ? group.items : [];

      if (!items.length) return;

      const groupSection = document.createElement("section");
      groupSection.className = "faq-group";

      groupSection.innerHTML = `
        <div class="faq-group-heading">
          <h3>${escapeHTML(group.group || "Sección")}</h3>
          ${group.description
          ? `<p>${escapeHTML(group.description)}</p>`
          : ""
        }
        </div>
      `;

      const accordion = document.createElement("div");
      accordion.className = "faq-accordion";

      items.forEach((item, itemIndex) => {
        accordion.appendChild(
          createFaqItem(item, sectionKey, groupIndex, itemIndex),
        );
      });

      groupSection.appendChild(accordion);
      wrapper.appendChild(groupSection);
    });

    container.appendChild(wrapper);
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

    if (isGroupedSection(items)) {
      renderGroupedSection(items, sectionKey);
      return;
    }

    renderFlatSection(items, sectionKey);
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