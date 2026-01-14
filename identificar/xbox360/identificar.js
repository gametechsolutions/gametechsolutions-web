document.addEventListener('DOMContentLoaded', () => {

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
      `;

      container.appendChild(card);
    });
  }

});
