document.addEventListener("DOMContentLoaded", () => {
  if (!window.CONSOLE_CONFIG) {
    console.error("CONSOLE_CONFIG no definido");
    return;
  }

  /* =============================
    TEMA + TÍTULOS
    ============================== */

  document.title = `Catálogo de juegos ${CONSOLE_CONFIG.fullName} | GameTechSolutions`;

  document.querySelectorAll(".consoleFull").forEach((el) => {
    el.textContent = CONSOLE_CONFIG.fullName;
  });

  const themeLink = document.getElementById("themeStylesheet");
  if (themeLink && CONSOLE_CONFIG.brand) {
    themeLink.href = `/styles/theme-${CONSOLE_CONFIG.brand}.css`;
  }

  /* =============================
    TOP GAMES (DINÁMICOS)
    ============================= */

  function renderTopGames() {
    if (!CONSOLE_CONFIG.topGamesJson) return;

    const section = document.getElementById("topGamesSection");
    const row = document.getElementById("topGamesRow");

    if (!section || !row) return;

    fetch(CONSOLE_CONFIG.topGamesJson)
      .then((r) => r.json())
      .then((games) => {
        if (!games.length) return;

        section.style.display = "block";
        row.innerHTML = "";

        games.forEach((game) => {
          const card = document.createElement("div");
          card.className = "netflix-card cover-card";

          card.innerHTML = `
          <img src="${game.image}" alt="${game.name}">
          <h3>${game.name}</h3>
        `;

          row.appendChild(card);
        });
      })
      .catch((err) => {
        console.warn("Top games no cargados:", err);
      });
  }

  renderTopGames();

  /* =============================
    VALIDACIÓN DE CONTEXTO
    ============================== */

  const ctx = window.GTSContext.load();

  const hasGameService = ctx.services?.some((id) =>
    ["games_only", "storage_with_games"].includes(id),
  );

  if (!hasGameService || !ctx.storage) {
    alert(
      "El catálogo solo está disponible cuando seleccionas un servicio con juegos y almacenamiento.",
    );
    window.location.href = CONSOLE_CONFIG.catalogPath.replace(
      "/catalogo.html",
      "/",
    );
    return;
  }

  /* =============================
    CONTEXTO VISUAL
    ============================== */

  const storageDisplay = document.getElementById("storageDisplay");
  if (storageDisplay && ctx.storage) {
    storageDisplay.innerHTML = `
    <div class="disk-option selected" style="flex-direction: column; align-items: flex-start; gap: 6px;">
      <span>Espacio total: <strong>${ctx.storage.label}</strong></span>
      <span>Espacio usable: <strong>${ctx.storage.usableGB} GB</strong></span>
    </div>
  `;
  }
});
