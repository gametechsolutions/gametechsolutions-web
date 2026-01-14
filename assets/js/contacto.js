document.addEventListener('DOMContentLoaded', () => {

  // ====== DATOS PREVIOS (si existen) ======
  const data = {
    console: localStorage.getItem('consoleName'),
    model: localStorage.getItem('consoleModel'),
    package: localStorage.getItem('servicePackage'),
    games: localStorage.getItem('selectedGamesHuman'),
    selectionId: localStorage.getItem('selectionID')
  };

  const resumeSection = document.getElementById('resumeSection');

  if (data.console || data.selectionId) {
    resumeSection.style.display = 'block';

    document.getElementById('rConsole').textContent =
      data.console || '—';

    document.getElementById('rModel').textContent =
      data.model || 'No especificado';

    document.getElementById('rPackage').textContent =
      data.package || 'No especificado';

    document.getElementById('rGames').textContent =
      data.games ? 'Selección guardada' : 'Sin selección';
  }

  // ====== WHATSAPP ======
  const sendBtn = document.getElementById('sendWhatsapp');

  sendBtn.addEventListener('click', () => {

    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const extra = document.getElementById('clientMessage').value.trim();

    if (!name || !phone) {
      alert('Por favor ingresa tu nombre y WhatsApp.');
      return;
    }

    let message = `📌 *Solicitud de servicio*\n\n`;
    message += `👤 Cliente: ${name}\n`;
    message += `📱 WhatsApp: ${phone}\n\n`;

    if (data.console) message += `🎮 Consola: ${data.console}\n`;
    if (data.model) message += `🧩 Modelo: ${data.model}\n`;
    if (data.package) message += `⚙️ Servicio: ${data.package}\n`;
    if (data.selectionId) message += `🆔 Selección: ${data.selectionId}\n`;

    if (extra) {
      message += `\n💬 Mensaje:\n${extra}`;
    }

    const url = `https://wa.me/52TU_NUMERO?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  });

});
