/* =========================================
   CONTACTO.JS — GameTechSolutions
   Pricing automático por servicios
========================================= */

const CONTEXT_KEY = 'GTS_CONTEXT';

/* =============================
   CONTEXTO
============================= */

function loadContext() {
  try {
    return JSON.parse(localStorage.getItem(CONTEXT_KEY)) || {};
  } catch {
    return {};
  }
}

function saveContext(ctx) {
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
}

/* =============================
   VALIDACIÓN
============================= */

function validateContext(ctx) {
  if (!ctx.console?.code) return 'No se detectó la consola.';
  if (!ctx.model) return 'No se detectó el modelo.';
  if (!ctx.services?.length) return 'No se seleccionaron servicios.';

  const needsGames = ctx.services.some(id =>
    ['games_only', 'storage_with_games'].includes(id)
  );

  if (needsGames) {
    if (!ctx.storage) return 'No se detectó el almacenamiento.';
    if (!ctx.games?.selectionID)
      return 'No se detectó la selección de juegos.';
  }

  return null;
}

/* =============================
   UTIL
============================= */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* =============================
   PRICING
============================= */

function calculatePricing(ctx, consoleData) {
  const servicesMap = {};
  consoleData.services.forEach(s => (servicesMap[s.id] = s));

  let total = 0;
  const breakdown = [];

  ctx.services.forEach(id => {
    const svc = servicesMap[id];
    if (!svc) return;

    if (typeof svc.price === 'number') {
      total += svc.price;
      breakdown.push(`• ${svc.name}: $${svc.price}`);
    }

    if (id === 'games_only') {
      const disk = String(parseInt(ctx.storage.label, 10));
      const price = svc.priceByStorage?.[disk];
      if (price) {
        total += price;
        breakdown.push(`• Carga de juegos (${disk} GB): $${price}`);
      }
    }

    if (id === 'storage_with_games') {
      const disk = String(parseInt(ctx.storage.label, 10));
      const opt = consoleData.storageOptions.provided.sizes[disk];
      if (opt?.price) {
        total += opt.price;
        breakdown.push(`• Disco ${disk} GB con juegos: $${opt.price}`);
      }
    }
  });

  return {
    total,
    breakdown,
    calculatedAt: new Date().toISOString()
  };
}

/* =============================
   RESUMEN
============================= */

function renderSummary(ctx, servicesCatalog, pricing) {
  setText('summary-console', ctx.console.name);
  setText('summary-model', ctx.model.description);
  setText('summary-storage', ctx.storage?.label || 'No aplica');

  setText(
    'summary-games',
    ctx.games
      ? `${ctx.games.count} juegos (${ctx.games.totalSizeGB.toFixed(2)} GB)`
      : 'No aplica'
  );

  setText('summary-id', ctx.games?.selectionID || '—');

  setText(
    'summary-services',
    ctx.services.map(id => servicesCatalog[id]?.name).join(', ')
  );

  setText('pricingTotal', `$${pricing.total} MXN`);
  setText('pricingBreakdown', pricing.breakdown.join('\n'));
}

/* =============================
   WHATSAPP
============================= */

function buildWhatsAppMessage(ctx, pricing, client) {
  return `
Hola, quiero información para un servicio.

Cliente: ${client.name}
Consola: ${ctx.console.name}
Modelo: ${ctx.model.description}
Servicios: ${ctx.services.join(', ')}
Almacenamiento: ${ctx.storage?.label || 'No aplica'}
Juegos: ${ctx.games?.count || 0}

💰 Total estimado: $${pricing.total} MXN

Gracias.
`.trim();
}

function sendToWhatsApp(message) {
  const phone = '5215543613500';
  window.open(
    'https://wa.me/' + phone + '?text=' + encodeURIComponent(message),
    '_blank'
  );
}

/* =============================
   AIRTABLE
============================= */

async function saveToAirtable(ctx) {
  const payload = {
    selectionID: ctx.games?.selectionID || '',
    clientName: ctx.clientName || '',
    console: ctx.console.name,
    model: ctx.model.description,
    services: ctx.services.join(', '),
    servicesRaw: JSON.stringify(ctx.services),
    diskSize: parseInt(ctx.storage?.label || 0, 10),
    diskLimit: ctx.storage?.usableGB || 0,
    CantidadJuegos: ctx.games?.count || 0,
    totalSize: ctx.games?.totalSizeGB || 0,
    totalPrice: ctx.pricing.total,
    priceBreakdown: ctx.pricing.breakdown.join('\n'),
    pricingJSON: JSON.stringify(ctx.pricing),
    selectedGames: ctx.games?.humanList || '',
    jsonGames: JSON.stringify(ctx.games || {})
  };

  await fetch('/api/save-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

/* =============================
   INIT
============================= */

document.addEventListener('DOMContentLoaded', async () => {
  const ctx = loadContext();

  const error = validateContext(ctx);
  if (error) {
    alert(`⚠️ ${error}`);
    window.location.href = '/';
    return;
  }

  const servicesData = await fetch('/assets/data/services.json').then(r =>
    r.json()
  );

  const consoleData = servicesData[ctx.console.code];
  const servicesCatalog = {};
  consoleData.services.forEach(s => (servicesCatalog[s.id] = s));

  const pricing = calculatePricing(ctx, consoleData);
  ctx.pricing = pricing;

  renderSummary(ctx, servicesCatalog, pricing);
  saveContext(ctx);

  document.getElementById('sendBtn').onclick = async () => {
    const name = document.getElementById('clientName').value.trim();
    if (!name) {
      alert('Ingresa tu nombre.');
      return;
    }

    ctx.clientName = name;
    saveContext(ctx);

    const msg = buildWhatsAppMessage(ctx, pricing, { name });
    sendToWhatsApp(msg);

    try {
      await saveToAirtable(ctx);
    } catch (e) {
      console.warn('Airtable error:', e);
    }

    ctx.status = 'finalized';
    saveContext(ctx);
  };

  document.getElementById('newSelectionBtn').onclick = () => {
    if (confirm('¿Iniciar nueva selección?')) {
      localStorage.removeItem(CONTEXT_KEY);
      window.location.href = '/';
    }
  };
});
