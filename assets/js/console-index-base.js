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
  const ctx = ctxAPI.load();

  function showModelWarning(model) {
    const box = document.getElementById("modelWarningGlobal");
    if (!box) return;

    if (model?.warning) {
      const warningText = String(model.warning).replace(/^⚠️\s*/, "");

      box.innerHTML = `
      <div class="gw-inner">
        <span class="gw-icon">⚠️</span>
        <div class="gw-text">
          <strong>Importante:</strong> ${warningText}
          <div class="gw-sub">
            Si tu consola no es compatible, se revisa antes de continuar.
          </div>
        </div>
      </div>
    `;

      box.style.display = "block";
    } else {
      box.style.display = "none";
      box.innerHTML = "";
    }
  }

  modelsData.models.forEach((model) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
  <h3>${model.name}</h3>
  <p>${model.notes || ""}</p>
  ${model.image ? `<img src="${model.image}" class="identify-img">` : ""}
  <button class="btn btn-outline">Seleccionar</button>
`;

    const btn = card.querySelector("button");

    // 🔁 Restaurar selección previa
    if (ctx.model?.id === model.id) {
      card.classList.add("selected");
      btn.textContent = "Seleccionado";
      selectedModelCard = card;

      showModelWarning(model);
    }

    btn.onclick = () => {
      if (selectedModelCard) {
        selectedModelCard.classList.remove("selected");
        const oldBtn = selectedModelCard.querySelector("button");
        if (oldBtn) oldBtn.textContent = "Seleccionar";
      }

      card.classList.add("selected");
      btn.textContent = "Seleccionado";
      selectedModelCard = card;

      ctxAPI.save({
        console: CONSOLE_CONFIG,
        model: {
          id: model.id,
          description: model.code,
          notes: model.notes || null,
        },
      });

      showModelWarning(model);
      updateStorageUI();
    };

    modelsContainer.appendChild(card);
  });

  /* =============================
      SERVICIOS
      ============================== */

  const servicesData = await fetch("/assets/data/services.json").then((r) =>
    r.json(),
  );

  const consoleServices = servicesData[CONSOLE_CONFIG.code];
  if (!consoleServices) {
    console.error(`No hay servicios para ${CONSOLE_CONFIG.code}`);
    return;
  }

  const services = consoleServices.services;

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

  const EXCLUSIVE_STORAGE_SERVICES = ["games_only", "storage_with_games"];

  services.forEach((service) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${service.name}</h3>
      <p>${service.description}</p>
      <button class="btn btn-outline" data-id="${service.id}">
        ${selectedServices.has(service.id) ? "Quitar" : "Agregar"}
      </button>
    `;

    const btn = card.querySelector("button");

    btn.onclick = () => {
      const prevCtx = ctxAPI.load();

      if (!prevCtx.model) {
        alert("Primero selecciona el modelo de tu consola.");
        return;
      }

      if (selectedServices.has(service.id)) {
        selectedServices.delete(service.id);
        btn.textContent = "Agregar";
      } else {
        // 🔒 Validar exclusión por grupo (softmod / chip)
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

        // 🔒 Validar dependencias del servicio (PS3)
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
              if (otherBtn) otherBtn.textContent = "Agregar";
            }
          });
        }

        selectedServices.add(service.id);
        btn.textContent = "Quitar";
      }

      const nextServices = Array.from(selectedServices);
      const prevMode = getStorageMode(prevCtx.services || []);
      const nextMode = getStorageMode(nextServices);

      ctxAPI.save({
        services: nextServices,
        storage: prevMode !== nextMode ? null : prevCtx.storage,
      });

      updateStorageUI();
    };

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

    storageSection.style.display = "block";

    storageHelp.textContent =
      storageConfig.label ||
      (mode === "client"
        ? "Selecciona el almacenamiento del cliente."
        : "Selecciona el almacenamiento a instalar.");

    Object.entries(storageConfig.sizes).forEach(([size, data]) => {
      const usable = typeof data === "object" ? data.usableGB : data;

      const label = document.createElement("label");
      label.className = "disk-option";

      label.innerHTML = `
        <input type="radio" name="diskSize">
        <strong>${size} GB</strong>
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
      : "/contacto/";
  };
});
