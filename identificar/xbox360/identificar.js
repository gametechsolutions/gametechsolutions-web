document.addEventListener('DOMContentLoaded', () => {

  function saveModelToContext(model) {
    const ctx = JSON.parse(
      localStorage.getItem('GTS_CONTEXT') || '{}'
    );
  
    ctx.console = {
      code: 'X360',
      name: 'Xbox 360',
      brand: 'microsoft'
    };
  
    ctx.model = {
      code: model.code,
      description: model.name
    };
  
    localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));
  }

  const container = document.getElementById('modelsContainer');
  const titleEl = document.getElementById('pageTitle');
  const descEl = document.getElementById('pageDescription');

  fetch('./identificar-data.json')
    .then(res => res.json())
    .then(data => {
      const config = data[window.IDENTIFY_CONFIG.console];

      if (!config) {
        container.innerHTML = '<p>Error cargando información.</p>';
        return;
      }

      titleEl.textContent = config.title;
      descEl.textContent = config.description;

      renderModels(config.models);
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = '<p>Error cargando modelos.</p>';
    });

  function renderModels(models) {
      container.innerHTML = '';

    models.forEach(model => {
      const card = document.createElement('div');
      card.className = 'card';
    
      card.innerHTML = `
        <h3>${model.name}</h3>
        <img src="${model.image}" alt="${model.name}" style="width:100%; border-radius:6px; margin:10px 0;">
        <p>${model.notes}</p>
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
        <button class="btn-small" style="margin-top:10px">
          Seleccionar este modelo
        </button>
      `;
    
      card.querySelector('button').addEventListener('click', () => {
        saveModelSelection(model);
      });
    
      container.appendChild(card);
    });    
    }

  function saveModelSelection(model) {
    let ctx = {};
  
    try {
      ctx = JSON.parse(localStorage.getItem('GTS_CONTEXT')) || {};
    } catch {
      ctx = {};
    }
  
    ctx.model = {
      code: model.code || model.name,
      description: model.name
    };
  
    localStorage.setItem('GTS_CONTEXT', JSON.stringify(ctx));
  
    alert(`🧩 Modelo seleccionado: ${model.name}`);
  }  
});
