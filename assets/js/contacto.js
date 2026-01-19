/* =========================================
   CONTACTO.JS — GameTechSolutions
   Pricing automático por servicios (FINAL)
========================================= */

const CONTEXT_KEY = 'GTS_CONTEXT';

let servicesCatalog = {};

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
    if (!ctx.games || !ctx.games.selectionID)
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

    // Precio fijo
    if (typeof svc.price === 'number') {
      total += svc.price;
      breakdown.push(`• ${svc.name}: $${svc.price}`);
    }

    // Carga de juegos (cliente)
    if (id === 'games_only' && ctx.storage) {
      const disk = String(parseInt(ctx.storage.label, 10));
      const price = svc.priceByStorage?.[disk];
      if (price) {
        total += price;
        breakdown.push(`• Carga de juegos (${disk} GB): $${price}`);
      }
    }

    // Disco con juegos
    if (id === 'storage_with_games' && ctx.storage) {
      const disk = String(parseInt(ctx.storage.label, 10));
      const opt = consoleData.storageOptions.provided.sizes[disk];
      if (opt?.price) {
        total += opt.price;
        breakdown.push(`• Disco ${disk} GB con juegos: $${opt.price}`);
      }
    }
  });

  return {
    total: Number(total) || 0,
    breakdown,
    calculatedAt: new Date().toISOString()
  };
}

function renderPricingBreakdown(lines) {
  const el = document.getElementById('pricingBreakdown');
  if (!el) return;

  if (!lines?.length) {
    el.innerHTML = `
      <div class="pricing-lines">
        <div class="pricing-line muted">
          <span class="name">Sin cargos adicionales</span>
          <span class="price"></span>
        </div>
      </div>
    `;
    return;
  }

  const parsed = lines.map(line => {
    const cleaned = String(line).replace(/^•\s*/, '').trim();
    const match = cleaned.match(/^(.*?):\s*\$?([\d,]+(?:\.\d+)?)$/);
    return match
      ? { name: match[1].trim(), price: match[2] }
      : { name: cleaned, price: '' };
  });

  el.innerHTML = `
    <div class="pricing-lines">
      ${parsed.map(item => `
        <div class="pricing-line">
          <span class="name">• ${item.name}</span>
          <span class="price">${item.price}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* =============================
   RESUMEN
============================= */

function renderSummary(ctx, servicesCatalog, pricing) {
  setText('summary-console', ctx.console.name);
  setText('summary-model', ctx.model.description);

  setText(
    'summary-storage',
    ctx.storage?.label || 'No aplica'
  );

  setText(
    'summary-games',
    ctx.games?.count
      ? `${ctx.games.count} juegos (${ctx.games.totalSizeGB?.toFixed(2) || 0} GB)`
      : 'No aplica'
  );

  setText('summary-id', ctx.games?.selectionID || '—');

  setText(
    'summary-services',
    ctx.services
      .map(id => servicesCatalog[id]?.name)
      .filter(Boolean)
      .join(', ')
  );

  setText('pricingTotal', `$${pricing.total} MXN`);
  renderPricingBreakdown(pricing.breakdown);
}

/* =============================
   ID SERVICIO SIN JUEGOS
============================= */

function generateServiceOnlyId(consoleCode) {
  const year = new Date().getFullYear();
  const key = `selectionCounter_${consoleCode}_SVC_${year}`;

  let counter = Number(localStorage.getItem(key)) || 0;
  counter += 1;

  localStorage.setItem(key, counter);
  return `${consoleCode}-SVC-${year}-${String(counter).padStart(3, '0')}`;
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
Servicios: ${ctx.services
  .map(id => servicesCatalog[id]?.name || id)
  .join(', ')}
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
    services: ctx.services
        .map(id => servicesCatalog[id]?.name || id)
        .join(', '),
      
      servicesRaw: JSON.stringify(
        ctx.services.map(id => ({
          id,
          name: servicesCatalog[id]?.name || id
        }))
      ),
    diskSize: parseInt(ctx.storage?.label || 0, 10),
    diskLimit: ctx.storage?.usableGB || 0,
    CantidadJuegos: ctx.games?.count || 0,
    totalSize: ctx.games?.totalSizeGB || 0,
    totalPrice: ctx.pricing.total,
    priceBreakdown: ctx.pricing.breakdown.join('\n'),
    pricingJSON: JSON.stringify(ctx.pricing),
    selectedGames: ctx.games?.humanList || '',
    jsonGames: JSON.stringify(ctx.games?.list || [])
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

  let ctx = loadContext();

  // 🆔 Asegurar ID incluso sin juegos
  if (!ctx.games?.selectionID) {
    ctx.games = ctx.games || {};
    ctx.games.selectionID = generateServiceOnlyId(ctx.console.code);
    saveContext(ctx);
    ctx = loadContext();
  }

  const error = validateContext(ctx);
  if (error) {
    alert(`⚠️ ${error}`);
    window.location.href = '/';
    return;
  }

  const servicesData = await fetch('/assets/data/services.json').then(r => r.json());
  const consoleData = servicesData[ctx.console.code];

   servicesCatalog = {};
   consoleData.services.forEach(s => {
     servicesCatalog[s.id] = s; // objeto completo
   });

  const pricing = calculatePricing(ctx, consoleData);
  ctx.pricing = pricing;
  saveContext(ctx);

  renderSummary(ctx, servicesCatalog, pricing);

  document.getElementById('sendBtn').onclick = async () => {
    const name = document.getElementById('clientName').value.trim();
    if (!name) {
      alert('Ingresa tu nombre.');
      return;
    }

    ctx.clientName = name;
    saveContext(ctx);

    sendToWhatsApp(buildWhatsAppMessage(ctx, pricing, { name }));

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
