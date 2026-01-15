/* =========================================
   IDENTIFICAR-BASE.JS — GameTechSolutions
   Motor único de identificación de consolas
========================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ⛔ Seguridad: debe existir configuración
  if (!window.IDENTIFY_CONFIG || !window.IDENTIFY_CONFIG.console) {
    console.error('IDENTIFY_CONFIG no definido');
    return;
  }

  const { console: consoleKey } = window.IDENTIFY_CONFIG;

  const container = document.getElementById('modelsContainer');
  const titleEl = document.getElementById('pageTitle');
  const descEl = document.getElementById('pageDescription');

  if (!container || !titleEl || !descEl) {
    console.error('Faltan elementos HTML requeridos');
    return;
  }

  /* =============================
     CARGA DE DATA
  ============================== */

  fetch('/assets/data/identificar/' + consoleKey + '.json')
    .then(res => {
      if (!res.ok) throw new Error('No se pudo cargar JSON de identificación');
      return res.json();
    })
    .then(config => {
      titleEl.textContent = config.title;
      descEl.textContent = config.description;

      renderModels(config.models);
    })
    .catch(err => {
      console.error(err);
      container.innerHTML =
        '<p>Error cargando información de identificación.</p>';
    });

  /* =============================
     RENDER MODELOS
  ============================== */

  function renderModels(models) {
    container.innerHTML = '';

    models.forEach(model => {
      const card = document.createElement('div');
      card.className = 'card';

      card.innerHTML = `
        <h3>${model.name}</h3>

        ${model.image ? `
          <img
            src="${model.image}"
            alt="${model.name}"
            style="width:100%; border-radius:6px; margin:10px 0;">
        ` : ''}

        <p>${model.notes || ''}</p>

        ${model.video ? `
          <div style="margin-top:10px">
            <iframe
              width="100%"
              height="215"
              src="${model.video}"
              frameborder="0"
              allowfullscreen>
            </iframe>
          </div>
        ` : ''}

        <button class="btn-small" data-model='${JSON.stringify(model)}'>
          Seleccionar este modelo
        </button>
      `;

      card
        .querySelector('button')
        .addEventListener('click', () => {
          saveModelSelection(model);
        });

      container.appendChild(card);
    });
  }

  /* =============================
     GUARDAR MODELO SELECCIONADO
  ============================== */

  function saveModelSelection(model) {
    const ctx =
      JSON.parse(localStorage.getItem('GTS_CONTEXT')) || {};

    ctx.model = {
      id: model.id || model.name,
      description: model.name,
      notes: model.notes || ''
    };

    localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));

    alert(`✅ Modelo "${model.name}" seleccionado`);
  }

});