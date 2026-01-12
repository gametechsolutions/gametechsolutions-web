document.addEventListener('DOMContentLoaded', async () => {
  const headerContainer = document.getElementById('header-container');
  if (!headerContainer) return;

  const res = await fetch('/partials/header.html');
  const html = await res.text();

  headerContainer.innerHTML = html;

  // Aplica nombre de consola desde config global
  if (window.CONSOLE_CONFIG) {
    document.querySelectorAll('.console-name').forEach(el => {
      el.textContent = CONSOLE_CONFIG.name;
    });

    document.title = `${CONSOLE_CONFIG.name} | GameTechSolutions`;
  }
});
