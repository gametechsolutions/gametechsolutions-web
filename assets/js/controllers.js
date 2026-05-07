'use strict';

const CONTROLLERS_DATA_URL = '/assets/data/controller-services.json';

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatPrice(service) {
  if (service.priceLabel) return service.priceLabel;

  if (typeof service.price === 'number') {
    return `$${service.price} MXN`;
  }

  return 'Precio por definir';
}

function buildContactUrl(service) {
  const params = new URLSearchParams({
    tipo: 'control',
    servicio: service.contactServiceValue || service.id || ''
  });

  return `/solicitud/?${params.toString()}`;
}

function renderPageInfo(data) {
  const title = document.getElementById('controllersTitle');
  const subtitle = document.getElementById('controllersSubtitle');
  const eyebrow = document.getElementById('controllersEyebrow');

  if (eyebrow) eyebrow.textContent = 'Servicio especializado';

  if (title && data.page?.title) {
    title.textContent = data.page.title;
  }

  if (subtitle && data.page?.subtitle) {
    subtitle.textContent = data.page.subtitle;
  }
}

function renderControllerPolicy(data) {
  const policySection = document.getElementById('controllersPolicy');
  if (!policySection) return;

  const policy = data.controllerPolicy || data.page?.controllerPolicy;

  if (!policy) {
    policySection.innerHTML = `
      <h2>Controles aceptados</h2>
      <p>Solo revisamos controles originales de Xbox, PlayStation y Nintendo.</p>
      <p>No revisamos controles genéricos, réplicas ni compatibles de terceros.</p>
    `;
    return;
  }

  const acceptedMessage =
    policy.acceptedOnlyMessage ||
    'Solo revisamos controles originales de Xbox, PlayStation y Nintendo.';

  const notAcceptedMessage =
    policy.notAcceptedMessage ||
    'No revisamos controles genéricos, réplicas ni compatibles de terceros.';

  policySection.innerHTML = `
    <h2>Controles aceptados</h2>

    <p>
      ${escapeHTML(acceptedMessage)}
    </p>

    <p>
      ${escapeHTML(notAcceptedMessage)}
    </p>
  `;
}

function renderServices(data) {
  const container = document.getElementById('controllersServices');
  if (!container) return;

  const services = Array.isArray(data.services)
    ? data.services.filter(service => service.status !== 'inactive')
    : [];

  if (!services.length) {
    container.innerHTML = `
      <article class="controllers-card">
        <h3>Servicios no disponibles</h3>
        <p>Por el momento no hay servicios de controles configurados.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = services.map(service => {
    const includes = Array.isArray(service.includes) ? service.includes : [];
    const commonIssues = Array.isArray(service.commonIssues) ? service.commonIssues : [];

    const listItems = includes.length ? includes : commonIssues;

    return `
      <article class="controllers-card" data-service-id="${escapeHTML(service.id)}">
        <div class="svc-top">
          <span class="svc-icon">${escapeHTML(service.icon || '🎮')}</span>
          <span class="svc-badge">${escapeHTML(service.badge || 'CTRL')}</span>
        </div>

        <h3>${escapeHTML(service.name)}</h3>

        <p>${escapeHTML(service.shortDescription || '')}</p>

        <p class="controllers-price">
          ${escapeHTML(formatPrice(service))}
        </p>

        <ul>
          ${listItems.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>

        <a class="controllers-card__link" href="${escapeHTML(buildContactUrl(service))}">
          ${escapeHTML(service.ctaLabel || 'Solicitar servicio')}
        </a>
      </article>
    `;
  }).join('');
}

function renderCompatibleControllers(data) {
  const container = document.getElementById('controllersCompatible');
  if (!container) return;

  const groups = Array.isArray(data.compatibleControllers)
    ? data.compatibleControllers
    : [];

  if (!groups.length) {
    container.innerHTML = `
      <article class="controllers-mini-card">
        <h3>Compatibilidad por confirmar</h3>
        <p>Escríbenos con el modelo exacto de tu control para revisar si podemos ayudarte.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = groups.map(group => {
    const models = Array.isArray(group.models) ? group.models : [];

    return `
      <article class="controllers-mini-card">
        <h3>${escapeHTML(group.brand || 'Marca')}</h3>
        <p>${escapeHTML(models.join(', '))}.</p>
      </article>
    `;
  }).join('');
}

function renderImportantNote(data) {
  const warning = document.getElementById('controllersWarning');
  if (!warning) return;

  const note = data.page?.importantNote;

  warning.innerHTML = `
    <h2>Importante antes de solicitar limpieza</h2>
    <p>
      ${escapeHTML(note || 'La limpieza completa no garantiza corregir fallas electrónicas o componentes dañados.')}
    </p>
  `;
}

function renderError(message) {
  const services = document.getElementById('controllersServices');

  if (!services) return;

  services.innerHTML = `
    <article class="controllers-card">
      <h3>No se pudo cargar la información</h3>
      <p>${escapeHTML(message)}</p>
    </article>
  `;
}

async function initControllersPage() {
  try {
    const response = await fetch(CONTROLLERS_DATA_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Error ${response.status} al cargar controller-services.json`);
    }

    const data = await response.json();

    renderPageInfo(data);
    renderControllerPolicy(data);
    renderServices(data);
    renderCompatibleControllers(data);
    renderImportantNote(data);
  } catch (error) {
    console.error('[controllers.js]', error);
    renderError('Revisa que /assets/data/controller-services.json exista y tenga JSON válido.');
  }
}

document.addEventListener('DOMContentLoaded', initControllersPage);