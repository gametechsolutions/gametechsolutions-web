/* =========================================
   CONTACTO.JS — GameTechSolutions
   Orquestador final de contacto
========================================= */

/* ========= CONTEXTO ========= */

function getContext() {
  try {
    return JSON.parse(localStorage.getItem('GTS_CONTEXT')) || {};
  } catch {
    return {};
  }
}

/* ========= VALIDACIÓN ========= */

function validateContext(ctx) {
  if (!ctx.console?.code) {
    return 'No se detectó la consola.';
  }

  if (!ctx.games?.selectionID) {
    return 'No se encontró una selección válida.';
  }

  if (!ctx.storage?.label) {
    return 'No se detectó el almacenamiento.';
  }

  return null;
}

/* ========= UTIL ========= */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ========= RESUMEN ========= */

function renderSummary(ctx) {
  setText('summary-console', ctx.console.name);
  setText(
    'summary-model',
    ctx.model?.description || 'No especificado'
  );
  setText('summary-storage', ctx.storage.label);
  setText(
    'summary-games',
    `${ctx.games.count} juegos (${ctx.games.totalSizeGB.toFixed(2)} GB)`
  );
  setText('summary-id', ctx.games.selectionID);

  const pkgEl = document.getElementById('summary-package');
  if (pkgEl) {
    if (ctx.package) {
      pkgEl.textContent = `${ctx.package.name} — $${ctx.package.price}`;
    } else {
      pkgEl.textContent = 'No seleccionado';
    }
  }
}

/* ========= PAQUETES ========= */

async function loadPackages(ctx) {
  const container = document.getElementById('packagesContainer');
  if (!container) return;

  try {
    const res = await fetch('/assets/data/packages.json');
    const data = await res.json();

    const packages = data[ctx.console.code] || [];
    if (!packages.length) {
      container.innerHTML =
        '<p class="selector-note">No hay paquetes disponibles.</p>';
      return;
    }

    container.innerHTML = '';

    packages.forEach(pkg => {
      const card = document.createElement('div');
      card.className = 'card';

      card.innerHTML = `
        <h3>${pkg.name}</h3>
        <p><strong>$${pkg.price} MXN</strong></p>
        <ul>
          ${pkg.includes.map(i => `<li>✔ ${i}</li>`).join('')}
        </ul>
        <button class="btn-small">Seleccionar paquete</button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        selectPackage(pkg);
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Error cargando paquetes:', err);
    container.innerHTML =
      '<p class="selector-note">Error cargando paquetes.</p>';
  }
}

function selectPackage(pkg) {
  const ctx = getContext();

  ctx.package = {
    id: pkg.id,
    name: pkg.name,
    price: pkg.price
  };

  localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));
  renderSummary(ctx);

  alert(`📦 Paquete "${pkg.name}" seleccionado`);
}

/* ========= WHATSAPP ========= */

function buildWhatsAppMessage(ctx, client) {
  return `
Hola, quiero información para un servicio.

👤 Cliente:
${client.name}

🎮 Consola:
${ctx.console.name}

🧩 Modelo:
${ctx.model?.description || 'No especificado'}

💾 Almacenamiento:
${ctx.storage.label}

🎯 Juegos:
${ctx.games.count} juegos
${ctx.games.totalSizeGB.toFixed(2)} GB

🆔 ID:
${ctx.games.selectionID}

📦 Paquete:
${ctx.package?.name || 'No seleccionado'} - $${ctx.package?.price || '—'} MXN

📋 Juegos:
${ctx.games.humanList || 'No listados'}

Gracias 🙌
`.trim();
}

function sendToWhatsApp(message) {
  const phone = '5215543613500'; // TU NÚMERO
  const url =
    'https://wa.me/' +
    phone +
    '?text=' +
    encodeURIComponent(message);

  window.open(url, '_blank');
}

/* ========= AIRTABLE ========= */

async function saveToAirtable(ctx, client) {
  const payload = {
    ...ctx,
    clientName: client.name,
    source: 'contacto'
  };

  const res = await fetch('/api/save-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('Error guardando en Airtable');
  }
}

/* ========= ESTADO FINAL ========= */

function lockFinalizedState() {
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Selección enviada ✔';
  }

  const nameInput = document.getElementById('clientName');
  if (nameInput) nameInput.disabled = true;
}

/* ========= INIT ========= */

document.addEventListener('DOMContentLoaded', async () => {
  const ctx = getContext();

  const error = validateContext(ctx);
  if (error) {
    alert(`⚠️ ${error}`);
    return;
  }

  renderSummary(ctx);
  await loadPackages(ctx);

  if (ctx.status === 'finalized') {
    lockFinalizedState();
    return;
  }

  const sendBtn = document.getElementById('sendBtn');
  if (!sendBtn) return;

  sendBtn.addEventListener('click', async () => {
    const nameInput = document.getElementById('clientName');
    const clientName = nameInput?.value.trim();

    if (!clientName) {
      alert('Ingresa tu nombre.');
      return;
    }

    if (!ctx.package) {
      alert('Selecciona un paquete antes de continuar.');
      return;
    }

    const client = { name: clientName };
    const message = buildWhatsAppMessage(ctx, client);

    sendToWhatsApp(message);

    ctx.status = 'finalized';
    localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));

    lockFinalizedState();

    try {
      await saveToAirtable(ctx, client);
    } catch (err) {
      console.warn('Airtable no respondió:', err);
    }
  });
});