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
  if (!ctx.model) return 'No se detectó el modelo de la consola.';
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
   RESUMEN
============================= */

function renderSummary(ctx, servicesCatalog) {
  setText('summary-console', ctx.console.name);
  setText('summary-model', ctx.model.description);

  // Servicios
  const serviceNames = ctx.services
    .map(id => servicesCatalog[id]?.name)
    .filter(Boolean)
    .join(', ');

  setText('summary-services', serviceNames || '—');

  // Storage
  setText(
    'summary-storage',
    ctx.storage ? ctx.storage.label : 'No aplica'
  );

  // Juegos
  setText(
    'summary-games',
    ctx.games
      ? `${ctx.games.count} juegos (${ctx.games.totalSizeGB.toFixed(2)} GB)`
      : 'No aplica'
  );

  setText('summary-id', ctx.games?.selectionID || '—');
}

/* =============================
   PRICING AUTOMÁTICO
============================= */

function calculatePricing(ctx, servicesData) {
  const servicesCatalog = {};
  servicesData.services.forEach(s => (servicesCatalog[s.id] = s));

  let total = 0;
  const breakdown = [];

  ctx.services.forEach(serviceId => {
    const service = servicesCatalog[serviceId];
    if (!service) return;

    // Servicios con precio fijo
    if (typeof service.price === 'number') {
      total += service.price;
      breakdown.push(`• ${service.name}: $${service.price}`);
    }

    // Carga de juegos (cliente)
    if (service.id === 'games_only') {
      const disk = ctx.storage.label.replace(' GB', '');
      const price = service.priceByStorage?.[disk];
      if (price) {
        total += price;
        breakdown.push(
          `• Carga de juegos (${disk} GB): $${price}`
        );
      }
    }

    // Disco duro con juegos
    if (service.id === 'storage_with_games') {
      const disk = ctx.storage.label.replace(' GB', '');
      const opt =
        servicesData.storageOptions.provided.sizes[disk];
      if (opt?.price) {
        total += opt.price;
        breakdown.push(
          `• Disco duro ${disk} GB con juegos: $${opt.price}`
        );
      }
    }
  });

  return { total, breakdown };
}

/* =============================
   WHATSAPP
============================= */

function buildWhatsAppMessage(ctx, pricing, clientName) {
  return `
Hola, quiero información para un servicio.

Cliente: ${clientName}
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

  const consoleServices = servicesData[ctx.console.code];

  const servicesCatalog = {};
  consoleServices.services.forEach(s => (servicesCatalog[s.id] = s));

  renderSummary(ctx, servicesCatalog);

  const pricing = calculatePricing(ctx, consoleServices);

  setText(
    'pricingBreakdown',
    pricing.breakdown.join('\n') || '—'
  );
  setText('pricingTotal', `$${pricing.total} MXN`);

  ctx.pricing = pricing;
  saveContext(ctx);

  document.getElementById('sendBtn').onclick = () => {
    const name = document
      .getElementById('clientName')
      .value.trim();

    if (!name) {
      alert('Ingresa tu nombre.');
      return;
    }

    const msg = buildWhatsAppMessage(ctx, pricing, name);
    sendToWhatsApp(msg);

    ctx.status = 'finalized';
    saveContext(ctx);
  };

  document.getElementById('newSelectionBtn').onclick = () => {
    if (confirm('¿Deseas iniciar una nueva selección?')) {
      localStorage.removeItem(CONTEXT_KEY);
      window.location.href = '/';
    }
  };
});