/* =========================================
CONSOLE-INDEX-BASE.JS — GameTechSolutions
Template base para index.html de consolas
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.CONSOLE_CONFIG) {
    console.error("CONSOLE_CONFIG no está definido");
    return;
  }

  /* =============================
      TEMA DINÁMICO POR CONSOLA
      ============================== */

  const themeLink = document.getElementById("themeStylesheet");
  if (themeLink && window.CONSOLE_CONFIG?.brand) {
    themeLink.href = `/styles/theme-${window.CONSOLE_CONFIG.brand}.css`;
  }

  const ctxAPI = window.GTSContext;

  /* =============================
      TÍTULO + TEXTOS
      ============================== */

  document.title = `${CONSOLE_CONFIG.name} | GameTechSolutions`;

  document.querySelectorAll(".console-name").forEach((el) => {
    el.textContent = CONSOLE_CONFIG.name;
  });

  /* =============================
      HELPERS
      ============================== */

  function getStorageMode(services = []) {
    if (services.includes("games_only")) return "client";
    if (services.includes("storage_with_games")) return "provided";
    return null;
  }

  function validateBeforeContinue() {
    const ctx = ctxAPI.load();

    if (!ctx.model) {
      alert("Debes seleccionar el modelo de tu consola.");
      return false;
    }

    if (ctx.model?.requiresVariant && !ctx.model?.variant) {
      alert("Debes seleccionar el modelo exacto de tu consola.");
      return false;
    }

    if (!ctx.services?.length) {
      alert("Debes seleccionar al menos un servicio.");
      return false;
    }

    if (needsCatalog(ctx) && !ctx.storage) {
      alert("Debes seleccionar el tamaño del almacenamiento.");
      return false;
    }

    return true;
  }

  /* =============================
      MODELOS
      ============================== */

  const modelsData = await fetch(CONSOLE_CONFIG.modelsJson).then((r) =>
    r.json(),
  );

  const modelsContainer = document.getElementById("modelsContainer");
  let selectedModelCard = null;
  let selectedBaseModel = null;

  const ctx = typeof ctxAPI.startConsoleFlow === "function"
    ? ctxAPI.startConsoleFlow(CONSOLE_CONFIG)
    : ctxAPI.load();

  function showModelWarning(model) {
    const box = document.getElementById("modelWarningGlobal");
    if (!box) return;

    if (model?.message) {
      const { type, title, text, note } = model.message;

      box.className = `global-warning gw-${type}`;

      box.innerHTML = `
      <div class="gw-inner">
        <span class="gw-icon">${type === "warning" ? "⚠️" : "ℹ️"}</span>
        <div class="gw-text">
          <strong>${title}:</strong> ${text}
          ${note ? `<div class="gw-sub">${note}</div>` : ""}
        </div>
      </div>
    `;

      box.style.display = "block";
    } else {
      box.style.display = "none";
      box.className = "global-warning";
      box.innerHTML = "";
    }
  }

  function getModelVariantSection() {
    let section = document.getElementById("modelVariantSection");

    if (!section) {
      section = document.createElement("div");
      section.id = "modelVariantSection";
      section.className = "model-variant-card card hidden";

      const warningBox = document.getElementById("modelWarningGlobal");
      warningBox?.insertAdjacentElement("afterend", section);
    }

    return section;
  }

  function hideModelVariantSection() {
    const section = document.getElementById("modelVariantSection");
    if (!section) return;

    section.classList.add("hidden");
    section.innerHTML = "";
  }

  function renderModelVariantSelector(model) {
    const section = getModelVariantSection();
    const variants = Array.isArray(model.variants) ? model.variants : [];

    if (!model.requiresVariant || !variants.length) {
      hideModelVariantSection();
      return;
    }

    section.classList.remove("hidden");

    section.innerHTML = `
    <label for="modelVariantSelect" class="form-label">
      ${model.variantLabel || "Modelo exacto"}
    </label>

    <select id="modelVariantSelect" class="form-input">
      <option value="">Selecciona una opción</option>
      ${variants
        .map(
          (variant) => `
            <option value="${variant.id}">
              ${variant.name}
            </option>
          `,
        )
        .join("")}
    </select>

    <p class="form-hint">
      ${model.variantHelp || "Selecciona el modelo exacto para validar compatibilidad."}
    </p>
  `;

    const select = section.querySelector("#modelVariantSelect");

    const currentCtx = ctxAPI.load();
    const savedVariantId = currentCtx.model?.variant?.id;

    if (savedVariantId && variants.some((variant) => variant.id === savedVariantId)) {
      select.value = savedVariantId;
    }

    select.onchange = () => {
      const selectedVariant = variants.find((variant) => variant.id === select.value);

      if (!selectedVariant) {
        ctxAPI.save({
          console: CONSOLE_CONFIG,
          model: {
            id: model.id,
            description: model.code,
            notes: model.notes || null,
            requiresVariant: true,
            variant: null,
            compatibility: null
          },
          compatibility: null,
          services: [],
          storage: null,
          games: null,
          pricing: null,
          status: "draft"
        });

        resetSelectedServicesUI();

        showModelWarning(model);
        updateStorageUI();
        return;
      }

      ctxAPI.save({
        console: CONSOLE_CONFIG,
        model: {
          id: model.id,
          description: selectedVariant.code,
          notes: selectedVariant.name || null,
          requiresVariant: true,
          variant: {
            id: selectedVariant.id,
            name: selectedVariant.name,
            code: selectedVariant.code
          },
          compatibility: selectedVariant.compatibility || null
        },
        compatibility: selectedVariant.compatibility || null,
        services: [],
        storage: null,
        games: null,
        pricing: null,
        status: "draft"
      });

      resetSelectedServicesUI();

      showModelWarning(selectedVariant.message ? selectedVariant : model);
      updateStorageUI();
    };
  }

  function clearSelectedModelCard() {
    if (!selectedModelCard) return;

    selectedModelCard.classList.remove("selected", "active");
    selectedModelCard.setAttribute("aria-pressed", "false");
  }

  function setSelectedModelCard(card, model) {
    clearSelectedModelCard();

    card.classList.add("selected", "active");
    card.setAttribute("aria-pressed", "true");

    selectedModelCard = card;
    selectedBaseModel = model;
  }

  function selectModel(model, card) {
    setSelectedModelCard(card, model);

    if (model.requiresVariant) {
      ctxAPI.save({
        console: CONSOLE_CONFIG,
        model: {
          id: model.id,
          description: model.code,
          notes: model.notes || null,
          requiresVariant: true,
          variant: null,
          compatibility: null
        },
        compatibility: null,
        services: [],
        storage: null,
        games: null,
        pricing: null,
        status: "draft"
      });

      resetSelectedServicesUI();

      showModelWarning(model);
      renderModelVariantSelector(model);
      updateStorageUI();
      return;
    }

    ctxAPI.save({
      console: CONSOLE_CONFIG,
      model: {
        id: model.id,
        description: model.code,
        notes: model.notes || null,
        requiresVariant: false,
        variant: null,
        compatibility: model.compatibility || null
      },
      compatibility: model.compatibility || null,
      services: [],
      storage: null,
      games: null,
      pricing: null,
      status: "draft"
    });

    resetSelectedServicesUI();

    hideModelVariantSection();
    showModelWarning(model);
    updateStorageUI();
  }

  modelsData.models.forEach((model) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card model-card model-choice";
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", `Seleccionar modelo ${model.name}`);

    card.innerHTML = `
    <div class="model-card-media">
      ${model.image ? `<img src="${model.image}" class="identify-img" alt="${model.name}">` : ""}
    </div>

    <div class="model-card-body">
      <h3>${model.name}</h3>
      ${model.notes ? `<p>${model.notes}</p>` : ""}
    </div>
  `;

    if (ctx.model?.id === model.id) {
      card.classList.add("selected", "active");
      card.setAttribute("aria-pressed", "true");

      selectedModelCard = card;
      selectedBaseModel = model;

      if (model.requiresVariant) {
        showModelWarning(model);
        renderModelVariantSelector(model);
      } else {
        showModelWarning(model);
      }
    }

    card.addEventListener("click", () => {
      selectModel(model, card);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      selectModel(model, card);
    });

    modelsContainer.appendChild(card);
  });

  /* =============================
      SERVICIOS
      ============================== */

  const localServicesUrl = "/assets/data/services.json";
  const remoteServicesUrl =
    window.GTS_REMOTE_CONFIG?.servicesJsonRemote || null;

  async function loadServicesConfig() {
    const candidates = [remoteServicesUrl, localServicesUrl].filter(Boolean);

    let lastError = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`No se pudo cargar services.json desde ${url}`);
        }

        const data = await res.json();
        console.log(`services.json cargado desde: ${url}`);
        return data;
      } catch (err) {
        console.warn(`Falló carga de services.json desde: ${url}`, err);
        lastError = err;
      }
    }

    throw lastError || new Error("No se pudo cargar services.json.");
  }

  const servicesData = await loadServicesConfig();

  const consoleServices = servicesData[CONSOLE_CONFIG.code];
  if (!consoleServices) {
    console.error(`No hay servicios para ${CONSOLE_CONFIG.code}`);
    return;
  }

  const services = consoleServices.services;

  function formatMXN(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return null;

    return `$${amount.toLocaleString("es-MX")} MXN`;
  }

  function getMinNumberFromObject(obj) {
    if (!obj || typeof obj !== "object") return null;

    const values = Object.values(obj)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return null;

    return Math.min(...values);
  }

  function getStoragePricesForMode(mode) {
    const sizes = consoleServices.storageOptions?.[mode]?.sizes;

    if (!sizes || typeof sizes !== "object") return [];

    return Object.values(sizes)
      .map((item) => {
        if (typeof item === "number") return null;
        return Number(item?.price);
      })
      .filter((price) => Number.isFinite(price));
  }

  function getServicePriceLabel(service) {
    if (typeof service.price === "number") {
      return {
        label: formatMXN(service.price),
        note: "Precio del servicio"
      };
    }

    if (service.priceByModel) {
      const minPrice = getMinNumberFromObject(service.priceByModel);

      if (minPrice !== null) {
        return {
          label: `Desde ${formatMXN(minPrice)}`,
          note: "Depende del modelo seleccionado"
        };
      }
    }

    if (service.priceByStorage) {
      const minPrice = getMinNumberFromObject(service.priceByStorage);

      if (minPrice !== null) {
        return {
          label: `Desde ${formatMXN(minPrice)}`,
          note: "Depende del almacenamiento"
        };
      }
    }

    if (service.storageMode === "provided") {
      const prices = getStoragePricesForMode("provided");

      if (prices.length) {
        const minPrice = Math.min(...prices);

        return {
          label: `Desde ${formatMXN(minPrice)}`,
          note: "Depende de la capacidad elegida"
        };
      }
    }

    if (service.requiresStorage || service.allowsGames) {
      return {
        label: "Precio según selección",
        note: "Se calcula con el almacenamiento"
      };
    }

    return {
      label: "Precio por confirmar",
      note: "Se confirma al revisar la solicitud"
    };
  }

  function renderServicePrice(service) {
    const price = getServicePriceLabel(service);

    return `
    <div class="service-price-box">
      <span class="service-price-label">${price.label}</span>
      <span class="service-price-note">${price.note}</span>
    </div>
  `;
  }

  /* =============================
      VALIDACIÓN DE DEPENDENCIAS
      ============================= */

  function hasRequiredCapabilities(service, selectedServices, allServices) {
    if (!service.requires?.length) return true;

    const provided = new Set();

    selectedServices.forEach((id) => {
      const svc = allServices.find((s) => s.id === id);
      svc?.provides?.forEach((p) => provided.add(p));
    });

    // Basta con que UNA dependencia esté satisfecha
    return service.requires.some((req) => provided.has(req));
  }

  function needsCatalog(ctx) {
    return ctx.services?.some(
      (id) => services.find((s) => s.id === id)?.allowsGames,
    );
  }

  const servicesContainer = document.getElementById("servicesContainer");
  const selectedServices = new Set(ctx.services || []);

  function resetSelectedServicesUI() {
    selectedServices.clear();

    document.querySelectorAll("#servicesContainer .service-row").forEach((row) => {
      row.classList.remove("selected", "active");
    });

    document.querySelectorAll("#servicesContainer .service-toggle-btn").forEach((btn) => {
      btn.textContent = "+";
      btn.setAttribute("aria-pressed", "false");

      const id = btn.dataset.id;
      const service = services.find((item) => item.id === id);

      if (service) {
        btn.setAttribute("aria-label", `Agregar ${service.name}`);
      }
    });
  }

  const EXCLUSIVE_STORAGE_SERVICES = ["games_only", "storage_with_games"];

  services.forEach((service) => {
    const card = document.createElement("div");
    card.className = "service-row";

    const isSelected = selectedServices.has(service.id);

    card.innerHTML = `
    <div class="service-row-main">
      <div class="service-row-copy">
        <div class="service-row-title">
          <h3>${service.name}</h3>
          ${service.description
        ? `<button class="service-info-btn" type="button" aria-expanded="false" aria-label="Ver información de ${service.name}">i</button>`
        : ""
      }
        </div>

        ${service.description
        ? `<p class="service-row-description" hidden>${service.description}</p>`
        : ""
      }
      </div>

      <div class="service-row-side">
        ${renderServicePrice(service)}

        <button class="service-toggle-btn" type="button" data-id="${service.id}" aria-pressed="${isSelected ? "true" : "false"}" aria-label="${isSelected ? `Quitar ${service.name}` : `Agregar ${service.name}`}">
          ${isSelected ? "✓" : "+"}
        </button>
      </div>
    </div>
  `;

    const btn = card.querySelector(".service-toggle-btn");
    const infoBtn = card.querySelector(".service-info-btn");
    const description = card.querySelector(".service-row-description");

    if (isSelected) {
      card.classList.add("selected", "active");
    }

    function setServiceUI(selected) {
      btn.textContent = selected ? "✓" : "+";
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        selected ? `Quitar ${service.name}` : `Agregar ${service.name}`
      );

      card.classList.toggle("selected", selected);
      card.classList.toggle("active", selected);
    }

    function toggleService() {
      const prevCtx = ctxAPI.load();

      if (!prevCtx.model) {
        alert("Primero selecciona el modelo de tu consola.");
        return;
      }

      if (selectedServices.has(service.id)) {
        selectedServices.delete(service.id);
        setServiceUI(false);
      } else {
        if (service.exclusiveGroup) {
          const conflict = Array.from(selectedServices).some((id) => {
            const s = services.find((x) => x.id === id);
            return s?.exclusiveGroup === service.exclusiveGroup;
          });

          if (conflict) {
            alert(
              '⚠️ El servicio "' +
              service.name +
              '" no puede combinarse con otro método de modificación.',
            );
            return;
          }
        }

        const ok = hasRequiredCapabilities(
          service,
          Array.from(selectedServices),
          services,
        );

        if (!ok) {
          const missing = service.requires;

          const requiredServiceNames = services
            .filter((s) => s.provides?.some((p) => missing.includes(p)))
            .map((s) => s.name);

          alert(
            `⚠️ El servicio "${service.name}" requiere instalar previamente:\n• ${requiredServiceNames.join("\n• ")}`,
          );
          return;
        }

        if (EXCLUSIVE_STORAGE_SERVICES.includes(service.id)) {
          EXCLUSIVE_STORAGE_SERVICES.forEach((id) => {
            if (selectedServices.has(id)) {
              selectedServices.delete(id);

              const otherBtn = document.querySelector(`[data-id="${id}"]`);

              if (otherBtn) {
                otherBtn.textContent = "+";
                otherBtn.setAttribute("aria-pressed", "false");
                otherBtn.closest(".service-row")?.classList.remove("selected", "active");
              }
            }
          });
        }

        selectedServices.add(service.id);
        setServiceUI(true);
      }

      const nextServices = Array.from(selectedServices);
      const prevMode = getStorageMode(prevCtx.services || []);
      const nextMode = getStorageMode(nextServices);

      ctxAPI.save({
        services: nextServices,
        storage: prevMode !== nextMode ? null : prevCtx.storage,
        games: null,
        pricing: null,
        status: "draft"
      });

      updateStorageUI();
    }

    btn.onclick = toggleService;

    card.addEventListener("click", (event) => {
      if (
        event.target.closest(".service-info-btn") ||
        event.target.closest(".service-toggle-btn")
      ) {
        return;
      }

      toggleService();
    });

    if (infoBtn && description) {
      infoBtn.onclick = (event) => {
        event.stopPropagation();

        const isOpen = !description.hidden;

        description.hidden = isOpen;
        infoBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
        card.classList.toggle("show-description", !isOpen);
      };
    }

    servicesContainer.appendChild(card);
  });

  /* =============================
          STORAGE
          ============================== */

  const storageSection = document.getElementById("storageSection");
  const storageOptions = document.getElementById("storageOptions");
  const storageHelp = document.getElementById("storageHelp");

  function updateStorageUI() {
    const ctx = ctxAPI.load();

    storageOptions.innerHTML = "";
    storageSection.style.display = "none";

    if (!needsCatalog(ctx)) return;

    const mode = getStorageMode(ctx.services);
    const storageConfig = consoleServices.storageOptions?.[mode];
    if (!storageConfig?.sizes) return;

    const selectedStorageService = services.find((service) => {
      return ctx.services?.includes(service.id) && service.storageMode === mode;
    });

    storageSection.style.display = "block";

    storageHelp.textContent =
      storageConfig.label ||
      (mode === "client"
        ? "Selecciona el almacenamiento del cliente."
        : "Selecciona el almacenamiento a instalar.");

    Object.entries(storageConfig.sizes).forEach(([size, data]) => {
      const usable = typeof data === "object" ? data.usableGB : data;

      const gamesInfo =
        typeof data === "object" && data.gamesIncluded
          ? `<span class="disk-games">≈ ${data.gamesIncluded} juegos</span>`
          : "";

      const storageProvidedPrice =
        typeof data === "object" && typeof data.price === "number"
          ? data.price
          : null;

      const storageClientPrice =
        selectedStorageService?.priceByStorage?.[size] ?? null;

      const storagePrice = storageProvidedPrice ?? storageClientPrice;

      const priceInfo =
        typeof storagePrice === "number"
          ? `<span class="disk-price">${formatMXN(storagePrice)}</span>`
          : "";

      const label = document.createElement("label");
      label.className = "disk-option";

      label.innerHTML = `
        <input type="radio" name="diskSize">
        <div class="disk-main">
          <div class="disk-main-row">
            <strong>${size} GB</strong>
            ${gamesInfo}
          </div>
          ${priceInfo}
        </div>
      `;

      const input = label.querySelector("input");

      if (ctx.storage?.label === `${size} GB`) {
        input.checked = true;
        label.classList.add("selected");
      }

      input.onchange = () => {
        // 🧹 Quitar selección visual previa
        document
          .querySelectorAll(".disk-option.selected")
          .forEach((el) => el.classList.remove("selected"));

        // ✅ Marcar visualmente el actual
        label.classList.add("selected");

        ctxAPI.save({
          storage: {
            label: `${size} GB`,
            usableGB: usable,
          },
          games: null,
          pricing: null,
          status: "draft"
        });
      };

      storageOptions.appendChild(label);
    });
  }

  updateStorageUI();

  /* =============================
          CONTINUAR
          ============================== */

  document.getElementById("continueBtn").onclick = () => {
    if (!validateBeforeContinue()) return;

    const ctx = ctxAPI.load();
    window.location.href = needsCatalog(ctx)
      ? CONSOLE_CONFIG.catalogPath
      : "/solicitud/";
  };
});