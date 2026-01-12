document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('header-container');
  if (!container) return;

  const res = await fetch('/partials/header.html');
  container.innerHTML = await res.text();

  const title = document.getElementById('header-title');
  const subtitle = document.getElementById('header-subtitle');

  if (window.CONSOLE_CONFIG) {
    // 🟢 MODO CONSOLA
    title.textContent = `Catálogo ${CONSOLE_CONFIG.short}`;
    subtitle.innerHTML = `
      Servicios profesionales para <strong>${CONSOLE_CONFIG.name}</strong>
    `;

    document.body.dataset.brand = CONSOLE_CONFIG.brand;
  } else {
    // 🔵 MODO GLOBAL
    title.textContent = 'GameTechSolutions';
    subtitle.textContent =
      'Modificación y mantenimiento profesional de consolas';

    document.body.removeAttribute('data-brand');
  }
});
