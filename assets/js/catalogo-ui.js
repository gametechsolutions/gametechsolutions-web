document.addEventListener('DOMContentLoaded', () => {

  if (!window.CONSOLE_CONFIG) {
    console.error('CONSOLE_CONFIG no definido');
    return;
  }

  /* =============================
     TEMA + TÍTULOS
  ============================== */

  document.title =
    `Catálogo de juegos ${CONSOLE_CONFIG.fullName} | GameTechSolutions`;

  document.querySelectorAll('.consoleFull').forEach(el => {
    el.textContent = CONSOLE_CONFIG.fullName;
  });

  const themeLink = document.getElementById('themeStylesheet');
  if (themeLink && CONSOLE_CONFIG.brand) {
    themeLink.href = `/styles/theme-${CONSOLE_CONFIG.brand}.css`;
  }

  /* =============================
     VALIDACIÓN DE CONTEXTO
  ============================== */

  const ctx = window.GTSContext.load();

  const hasGameService = ctx.services?.some(id =>
    ['games_only', 'storage_with_games'].includes(id)
  );

  if (!hasGameService || !ctx.storage) {
    alert(
      'El catálogo solo está disponible cuando seleccionas un servicio con juegos y almacenamiento.'
    );
    window.location.href =
      CONSOLE_CONFIG.catalogPath.replace('/catalogo.html', '/');
    return;
  }

  /* =============================
     CONTEXTO VISUAL
  ============================== */

  const ctxEl = document.getElementById('catalogContext');
  if (ctxEl) {
    const mode =
      ctx.services.includes('games_only')
        ? 'usando tu almacenamiento'
        : 'con almacenamiento incluido';

    ctxEl.textContent =
      `Estás seleccionando juegos ${mode} (${ctx.storage.label}).`;
  }

  const storageDisplay = document.getElementById('storageDisplay');
  if (storageDisplay && ctx.storage) {
    storageDisplay.innerHTML = `
      <div class="disk-option selected">
        <strong>${ctx.storage.label}</strong>
        <span>Espacio usable: ${ctx.storage.usableGB} GB</span>
      </div>
    `;
  }
});
