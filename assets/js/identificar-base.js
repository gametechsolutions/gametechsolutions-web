/* =========================================
IDENTIFICAR-BASE.JS — GameTechSolutions
Motor único de identificación de consolas
========================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* =============================
    VALIDACIÓN DE CONFIG
    ============================== */

    if (
        !window.IDENTIFY_CONFIG ||
        !window.IDENTIFY_CONFIG.console ||
        !window.IDENTIFY_CONFIG.console.code) {
        console.error('IDENTIFY_CONFIG inválido o incompleto');
        return;
    }

    const consoleConfig = window.IDENTIFY_CONFIG.console;
    const consoleCode = consoleConfig.code.toLowerCase(); // xbox360, ps3, ps2, etc

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

    fetch(`/assets/data/identificar/${consoleCode}.json`)
    .then(res => {
        if (!res.ok) {
            throw new Error('No se pudo cargar JSON de identificación');
        }
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
    RENDER DE MODELOS
    ============================== */

    function renderModels(models) {
        container.innerHTML = '';

        models.forEach(model => {
            const card = document.createElement('div');
            card.className = 'card';

            card.innerHTML = `
        <h3>${model.name}</h3>
      
        ${model.image ? `
          <div class="model-image">
            <img src="${model.image}" alt="${model.name}">
          </div>
        ` : ''}
      
        <p class="model-notes">${model.notes || ''}</p>
      
        ${model.video ? `
          <div class="model-video">
            <iframe
              src="${model.video}"
              frameborder="0"
              allowfullscreen>
            </iframe>
          </div>
        ` : ''}
      
        <button class="btn btn-outline model-btn">
          Seleccionar este modelo
        </button>
      `;

            card.querySelector('button').addEventListener('click', () => {
                saveModelSelection(model);
            });

            container.appendChild(card);
        });
    }

    /* =============================
    GUARDAR MODELO EN CONTEXTO
    ============================== */

    function saveModelSelection(model) {
        const ctx =
            JSON.parse(localStorage.getItem('GTS_CONTEXT')) || {};

        // ✅ GUARDAR CONSOLA (clave que faltaba)
        ctx.console = {
            code: consoleConfig.code,
            name: consoleConfig.name,
            brand: consoleConfig.brand,
            catalogPath: consoleConfig.catalogPath
        };

        // ✅ GUARDAR MODELO
        ctx.model = {
            id: model.id || model.name,
            description: model.name,
            notes: model.notes || ''
        };

        localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));

        // 🚀 CONTINUAR FLUJO
        if (consoleConfig.catalogPath) {
            window.location.href = consoleConfig.catalogPath;
        } else {
            console.warn('catalogPath no definido para esta consola');
        }
    }

});
