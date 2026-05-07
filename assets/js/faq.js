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
      <div class="faq-item">
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
      <div class="faq-item">
        <h3>No se pudieron cargar las preguntas frecuentes</h3>
        <p>Revisa que el archivo /assets/data/faq-data.json exista y tenga JSON válido.</p>
      </div>
    `;

    return;
  }

  function renderSection(sectionKey) {
    container.innerHTML = "";

    const items = faqData[sectionKey];

    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = `
        <div class="faq-item">
          <h3>No hay preguntas en esta sección</h3>
          <p>La categoría "${sectionKey}" no tiene preguntas configuradas todavía.</p>
        </div>
      `;
      return;
    }

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "faq-item";

      div.innerHTML = `
        <h3>${item.question}</h3>
        <p>${item.answer}</p>
      `;

      container.appendChild(div);
    });
  }

  renderSection("general");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");

      renderSection(tab.dataset.target);
    });
  });
});