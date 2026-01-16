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
     window.__PACKAGES_DATA = data;

    const consoleData = data[ctx.console.code];

      if (!consoleData || !consoleData.packages) {
        container.innerHTML =
          '<p class="selector-note">No hay paquetes disponibles.</p>';
        return;
      }
      
      const packages = consoleData.packages;
     
    if (!packages.length) {
      container.innerHTML =
        '<p class="selector-note">No hay paquetes disponibles.</p>';
      return;
    }

    container.innerHTML = '';

    packages.forEach(pkg => {
      const card = document.createElement('div');
      card.className = 'card';

      const priceLabel =
        pkg.price
          ? `$${pkg.price} MXN`
          : 'Precio según almacenamiento';
      
      card.innerHTML = `
        <h3>${pkg.name}</h3>
        <p><strong>${priceLabel}</strong></p>
        <ul>
          ${(pkg.includes || []).map(i => `<li>✔ ${i}</li>`).join('')}
        </ul>
        <button class="btn btn-outline package-btn">
          Seleccionar paquete
        </button>
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
  const consoleData = window.__PACKAGES_DATA?.[ctx.console.code];

  if (!consoleData) {
    alert('No se pudo cargar la información del paquete.');
    return;
  }

  const diskSize = parseInt(ctx.storage.label, 10);

  // 🟡 CASO A: Paquete por almacenamiento (EXPANSIÓN o PS2)
  if (consoleData.pricing && consoleData.pricing[diskSize]?.[pkg.id]) {
    const tier = consoleData.pricing[diskSize][pkg.id];

    ctx.package = {
      id: pkg.id,
      name: pkg.name,
      price: tier.price,
      gamesIncluded: tier.games,
      calculatedBy: 'storage'
    };

    localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));
    renderSummary(ctx);

    alert(
      `📦 Paquete "${pkg.name}" seleccionado\n` +
      `💾 ${diskSize} GB\n` +
      `🎮 ${tier.games} juegos\n` +
      `💰 $${tier.price} MXN`
    );
    return;
  }

  // 🟢 CASO B: Paquete normal (precio fijo)
  if (typeof pkg.price === 'number') {
    ctx.package = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      calculatedBy: 'fixed'
    };

    localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));
    renderSummary(ctx);

    alert(`📦 Paquete "${pkg.name}" seleccionado\n💰 $${pkg.price} MXN`);
    return;
  }

  // 🔴 CASO C: No disponible para ese almacenamiento
  if (consoleData.pricing) {
    alert('Este paquete no está disponible para ese tamaño de almacenamiento.');
    return;
  }

  alert('Este paquete no tiene un precio definido.');
}

/* ========= WHATSAPP ========= */

function buildWhatsAppMessage(ctx, client) {
  return `
Hola, quiero información para un servicio.

Cliente: ${client.name}
Consola: ${ctx.console.name}
Modelo: ${ctx.model?.description || 'No especificado'}
Almacenamiento: ${ctx.storage.label}
Juegos: ${ctx.games.count} juegos 
Disco: ${ctx.games.totalSizeGB.toFixed(2)} GB
ID: ${ctx.games.selectionID}
Paquete: ${ctx.package?.name || 'No seleccionado'} - $${ctx.package?.price || '—'} MXN

Gracias
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
    selectionID: ctx.games.selectionID,
    clientName: client.name,

    // Single select en Airtable → STRING exacto
    console: ctx.console.name,

    // Number sin decimales
    diskSize: parseInt(ctx.storage.label, 10),

    // Numbers reales
    diskLimit: Number(ctx.storage.usableGB),
    totalSize: Number(ctx.games.totalSizeGB),

    CantidadJuegos: Number(ctx.games.count),

    // Texto plano
    selectedGames: ctx.games.humanList || '',

    // JSON string (por si luego lo usas)
    jsonGames: JSON.stringify({
      games: ctx.games.humanList?.split('\n') || [],
      package: ctx.package || null,
      model: ctx.model || null
    })
  };

  const res = await fetch('/api/save-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Error Airtable:', err);
    throw new Error('Error guardando en Airtable');
  }
}

/* ========= ESTADO FINAL ========= */

function lockFinalizedState() {
  // Botón WhatsApp
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Selección enviada ✔';
  }

  // Input nombre
  const nameInput = document.getElementById('clientName');
  if (nameInput) {
    nameInput.disabled = true;
  }

  // Mensaje visual dentro del resumen
  const summaryCard = document.getElementById('summaryCard');
  if (summaryCard && !document.getElementById('finalizedNotice')) {
    const notice = document.createElement('div');
    notice.id = 'finalizedNotice';
    notice.className = 'alert success';
    notice.textContent =
      '✅ Esta selección ya fue enviada. Puedes iniciar una nueva selección cuando lo desees.';
    
    summaryCard.prepend(notice);
  }
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
   const ctx = getContext();
    const nameInput = document.getElementById('clientName');
    const clientName = nameInput?.value.trim();

     if (!ctx.package) {
      alert('Selecciona un paquete antes de continuar.');
      return;
    }

    if (!clientName) {
      alert('Ingresa tu nombre.');
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
  /* ========= NUEVA SELECCIÓN ========= */

const newSelectionBtn = document.getElementById('newSelectionBtn');

if (newSelectionBtn) {
  newSelectionBtn.addEventListener('click', () => {
    const confirmReset = confirm(
      '¿Deseas iniciar una nueva selección?\n\n' +
      'Esto limpiará el resumen actual y podrás empezar de nuevo.'
    );

    if (!confirmReset) return;

    // 🔥 Limpiar contexto completo
    localStorage.removeItem('GTS_CONTEXT');

    // Redirigir al inicio (o cambia a un catálogo si prefieres)
    window.location.href = '/';
  });
}
});
