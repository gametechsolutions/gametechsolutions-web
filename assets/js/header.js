function initSubmenus() {
  const navMenu = document.querySelector('.nav-menu');
  if (!navMenu) return;

  const parents = navMenu.querySelectorAll('.menu-parent');
  if (!parents.length) return;

  parents.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // En móvil/desktop: evitar navegación del botón padre
      e.preventDefault();
      e.stopPropagation();

      const li = btn.closest('li');
      if (!li) return;

      // Cierra otros submenús abiertos
      parents.forEach(otherBtn => {
        const otherLi = otherBtn.closest('li');
        if (otherLi && otherLi !== li) otherLi.classList.remove('active');
      });

      // Toggle del actual
      li.classList.toggle('active');
    });
  });

  // Click afuera: cerrar submenús
  document.addEventListener('click', () => {
    parents.forEach(btn => {
      const li = btn.closest('li');
      if (li) li.classList.remove('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('header-container');
  if (!container) return;

  const res = await fetch('/partials/header.html');
  container.innerHTML = await res.text();

  // Inicializa submenús DESPUÉS de inyectar el header
  initSubmenus();

  const title = document.getElementById('header-title');
  const subtitle = document.getElementById('header-subtitle');

  if (window.CONSOLE_CONFIG) {
    // 🟢 MODO CONSOLA
    title.textContent = `${CONSOLE_CONFIG.name}`;
    subtitle.innerHTML = `Servicios profesionales para <strong>${CONSOLE_CONFIG.name}</strong>`;

    document.body.dataset.brand = CONSOLE_CONFIG.brand;
  } else {
    // 🔵 MODO GLOBAL
    title.textContent = 'GameTechSolutions';
    subtitle.textContent = 'Modificación y mantenimiento profesional de consolas';

    document.body.removeAttribute('data-brand');
  }
});
