/* =========================================
   CONTACTO.JS — GameTechSolutions
   Rol: Orquestador de contacto
========================================= */

/* ========= CONTEXTO GLOBAL ========= */

function getContext() {
  try {
    return JSON.parse(localStorage.getItem('GTS_CONTEXT')) || {};
  } catch {
    return {};
  }
}

function lockFinalizedState() {
  // Deshabilitar botón WhatsApp
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Selección enviada ✔';
  }
   const nameInput = document.getElementById('clientName');
   if (nameInput) {
     nameInput.disabled = true;
   }

  // Mostrar mensaje visual
  const notice = document.createElement('div');
  notice.className = 'alert success';
  notice.textContent =
    '✅ Esta selección ya fue enviada. Puedes iniciar una nueva selección cuando lo desees.';

  const summary = document.getElementById('summaryCard');
  if (summary) {
    summary.prepend(notice);
  }
}

/* ========= VALIDACIÓN ========= */

function validateContext(ctx) {
  if (!ctx.console || !ctx.console.code) {
    return 'No se detectó la consola seleccionada.';
  }

  if (!ctx.games || !ctx.games.selectionID) {
    return 'No se encontró una selección de juegos.';
  }

  if (!ctx.storage || typeof ctx.storage.usableGB !== 'number') {
    return 'No se detectó el almacenamiento.';
  }
   /*if (!ctx.package) {
     return 'No se ha seleccionado un paquete.';
   }*/

  return null;
}

/* ========= UTILIDAD ========= */

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ========= RENDER RESUMEN ========= */

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

  // 🆕 Paquete (opcional)
  const pkgEl = document.getElementById('summary-package');
  if (pkgEl) {
    if (ctx.package) {
      pkgEl.textContent = `${ctx.package.name} — $${ctx.package.price}`;
    } else {
      pkgEl.textContent = 'No seleccionado';
    }
  }
}

/* ========= MENSAJE WHATSAPP ========= */

function buildWhatsAppMessage(ctx, client) {
  return `
Hola, quiero información para un servicio.

Cliente:
${client.name}

Consola:
${ctx.console.name}

Modelo:
${ctx.model?.description || 'No especificado'}

Almacenamiento:
${ctx.storage.label}

Selección:
${ctx.games.count} juegos
${ctx.games.totalSizeGB.toFixed(2)} GB usados

ID:
${ctx.games.selectionID}

Juegos:
${ctx.games.humanList || 'No listados'}

Paquete:
${ctx.package.name} - $${ctx.package.price} MXN

Gracias 🙌
`.trim();
}

/* ========= WHATSAPP ========= */

function sendToWhatsApp(message) {
  const phone = '5215543613500'; // <-- TU NÚMERO
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

/* ========= INIT ========= */

document.addEventListener('DOMContentLoaded', () => {
  const ctx = getContext();

  const error = validateContext(ctx);
  if (error) {
    alert(`⚠️ ${error}`);
    return;
  }

   renderSummary(ctx);

   if(ctx.status === 'finalized'){
      lockFinalizedState();
   }

   const newSelectionBtn = document.getElementById('newSelectionBtn');

   if (newSelectionBtn) {
     newSelectionBtn.addEventListener('click', () => {
       // 1️⃣ Limpiar contexto global
       localStorage.removeItem('GTS_CONTEXT');
   
       // 2️⃣ Redirigir al inicio o catálogo
       // Puedes cambiar esta ruta si lo deseas
       window.location.href = '/';
     });
   }

  const sendBtn = document.getElementById('sendBtn');
  if (!sendBtn) return;

   if (ctx.status === 'finalized') {
     return; // no permitir enviar de nuevo
   }

  sendBtn.addEventListener('click', async () => {
    const nameInput = document.getElementById('clientName');
    const clientName = nameInput?.value.trim();

    if (!clientName) {
      alert('Ingresa tu nombre.');
      return;
    }

    const client = { name: clientName };

    const message = buildWhatsAppMessage(ctx, client);
    sendToWhatsApp(message);
     ctx.status = 'finalized';
      localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));


    try {
      await saveToAirtable(ctx, client);
    } catch (err) {
      console.warn('Airtable no respondió:', err);
    }
  });
});
