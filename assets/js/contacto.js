/* =========================================
CONTACTO.JS — GameTechSolutions
Pricing automático por servicios (FINAL)
========================================= */

const CONTEXT_KEY = "GTS_CONTEXT";

let servicesCatalog = {};

const CONTROLLER_SERVICES_URL = "/assets/data/controller-services.json";

function getContactMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tipo") === "control" ? "control" : "console";
}

function getRequestedControllerServiceId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("servicio") || "";
}

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
  if (!ctx.console?.code) return "No se detectó la consola.";
  if (!ctx.model) return "No se detectó el modelo.";
  if (!ctx.services?.length) return "No se seleccionaron servicios.";

  const needsGames = ctx.services.some((id) =>
    ["games_only", "storage_with_games"].includes(id),
  );

  if (needsGames) {
    if (!ctx.storage) return "No se detectó el almacenamiento.";
    if (!ctx.games || !ctx.games.count || !ctx.games.list?.length)
      return "No se detectó la selección de juegos.";
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

function normalizeDiskLabel(value) {
  let raw = String(value ?? "").trim();
  if (!raw) return "";

  raw = raw
    .replace(/\s+/g, " ")
    .replace(/\b(GB|TB|MB)\b(?:\s+\1\b)+/gi, "$1")
    .trim();

  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(TB|GB|MB)?$/i);
  if (!match) return raw;

  const amount = match[1];
  const unit = (match[2] || "GB").toUpperCase();

  return `${amount} ${unit}`;
}

function getRequestFlags(ctx) {
  const selectedIds = Array.isArray(ctx.services) ? ctx.services.filter(Boolean) : [];
  const gameServiceIds = new Set(["games_only", "storage_with_games"]);

  const hasGameService = selectedIds.some((id) => gameServiceIds.has(id));
  const hasNonGameService = selectedIds.some((id) => !gameServiceIds.has(id));

  const requestType = hasGameService && hasNonGameService
    ? "MIXED"
    : hasGameService
      ? "GAMES"
      : "SVC";

  return {
    hasGameService,
    hasNonGameService,
    requestType,
  };
}

function generateControllerRequestID() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `CTRL-${year}${month}${day}-${random}`;
}

function getControllerFormData() {
  return {
    controllerConsole: document.getElementById("controllerConsole")?.value.trim() || "",
    controllerModel: document.getElementById("controllerModel")?.value.trim() || "",
    controllerIssue: document.getElementById("controllerIssue")?.value.trim() || "",
  };
}

/* =============================
PRICING
============================= */

function calculatePricing(ctx, consoleData) {
  const servicesMap = {};
  consoleData.services.forEach((s) => (servicesMap[s.id] = s));

  let total = 0;
  const breakdown = [];

  ctx.services.forEach((id) => {
    const svc = servicesMap[id];
    if (!svc) return;

    // Precio fijo
    if (typeof svc.price === "number") {
      total += svc.price;
      breakdown.push(`${svc.name}: $${svc.price}`);
    }

    // Precio por modelo (Nintendo Switch, etc.)
    if (svc.priceByModel && ctx.model?.id) {
      const modelId = ctx.model.id;
      const price = svc.priceByModel[modelId];

      if (typeof price === "number") {
        total += price;
        breakdown.push(`• ${svc.name} (${ctx.model.description}): $${price}`);
      }
    }

    // Carga de juegos (cliente)
    if (id === "games_only" && ctx.storage) {
      const disk = String(parseInt(ctx.storage.label, 10));
      const price = svc.priceByStorage?.[disk];
      if (price) {
        total += price;
        breakdown.push(`• Carga de juegos (${disk} GB): $${price}`);
      }
    }

    // Disco con juegos
    if (id === "storage_with_games" && ctx.storage) {
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
    calculatedAt: new Date().toISOString(),
  };
}

function renderPricingBreakdown(lines) {
  const el = document.getElementById("pricingBreakdown");
  if (!el) return;

  // Sin cargos: render limpio
  if (!lines?.length) {
    el.innerHTML = `
      <div class="pricing-breakdown">
        <div class="pricing-row">
          <span class="p-name">Sin cargos adicionales</span>
          <span class="p-price">$0</span>
        </div>
      </div>
    `;
    return;
  }

  // Parse lines tipo: "• Instalación RGH: $400"
  const parsed = lines.map((line) => {
    const cleaned = String(line).replace(/^•\s*/, "").trim();
    const match = cleaned.match(/^(.*?):\s*\$?([\d,]+(?:\.\d+)?)$/);

    return match
      ? { name: match[1].trim(), price: match[2].trim() }
      : { name: cleaned, price: "" };
  });

  el.innerHTML = `
    <div class="pricing-breakdown">
      ${parsed
      .map(
        (item) => `
          <div class="pricing-row">
            <span class="p-name">${item.name}</span>
            <span class="p-price">${item.price ? `$${item.price}` : ""}</span>
          </div>
        `,
      )
      .join("")}
    </div>
  `;
}

/* =============================
RESUMEN
============================= */

function renderSummary(ctx, servicesCatalog, pricing) {
  setText("summary-console", ctx.console.name);
  setText("summary-model", ctx.model.description);

  setText("summary-storage", ctx.storage?.label || "No aplica");

  setText(
    "summary-games",
    ctx.games?.count
      ? `${ctx.games.count} juegos (${ctx.games.totalSizeGB?.toFixed(2) || 0} GB)`
      : "No aplica",
  );

  setText("summary-id", ctx.games?.selectionID || "—");

  setText(
    "summary-services",
    ctx.services
      .map((id) => servicesCatalog[id]?.name)
      .filter(Boolean)
      .join(", "),
  );

  setText("pricingTotal", `$${pricing.total} MXN`);
  renderPricingBreakdown(pricing.breakdown);
}

async function loadControllerServicesConfig() {
  const res = await fetch(CONTROLLER_SERVICES_URL, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("No se pudo cargar controller-services.json.");
  }

  return res.json();
}

function findControllerService(data, requestedValue) {
  const services = Array.isArray(data.services) ? data.services : [];

  return (
    services.find((service) => service.contactServiceValue === requestedValue) ||
    services.find((service) => service.id === requestedValue) ||
    services[0] ||
    null
  );
}

function getControllerOptions(data) {
  return Array.isArray(data.controllerOptions) ? data.controllerOptions : [];
}

function resetControllerModelSelect(message = "Primero selecciona una consola") {
  const modelSelect = document.getElementById("controllerModel");
  if (!modelSelect) return;

  modelSelect.innerHTML = "";
  modelSelect.add(new Option(message, ""));
  modelSelect.disabled = true;
}

function populateControllerConsoleSelect(data) {
  const consoleSelect = document.getElementById("controllerConsole");
  if (!consoleSelect) return;

  const options = getControllerOptions(data);

  consoleSelect.innerHTML = "";
  consoleSelect.add(new Option("Selecciona una consola", ""));

  options.forEach((group) => {
    consoleSelect.add(new Option(group.consoleLabel, group.consoleId));
  });
}

function populateControllerModelSelect(data, consoleId) {
  const modelSelect = document.getElementById("controllerModel");
  if (!modelSelect) return;

  const options = getControllerOptions(data);
  const selectedGroup = options.find((group) => group.consoleId === consoleId);

  modelSelect.innerHTML = "";

  if (!selectedGroup) {
    resetControllerModelSelect("Primero selecciona una consola");
    return;
  }

  modelSelect.disabled = false;
  modelSelect.add(new Option("Selecciona el modelo del control", ""));

  const models = Array.isArray(selectedGroup.models) ? selectedGroup.models : [];

  models.forEach((model) => {
    modelSelect.add(new Option(model.modelLabel, model.modelId));
  });
}

function getSelectedOptionText(selectId) {
  const select = document.getElementById(selectId);
  if (!select || !select.value) return "";

  return select.options[select.selectedIndex]?.textContent?.trim() || "";
}

function updateControllerSummaryFromForm() {
  const controllerConsole = getSelectedOptionText("controllerConsole");
  const controllerModel = getSelectedOptionText("controllerModel");

  setText("summary-console", controllerConsole || "Selecciona una consola");
  setText("summary-model", controllerModel || "Selecciona un modelo");
}

function initControllerDropdowns(data) {
  const consoleSelect = document.getElementById("controllerConsole");
  const modelSelect = document.getElementById("controllerModel");

  if (!consoleSelect || !modelSelect) return;

  populateControllerConsoleSelect(data);
  resetControllerModelSelect();

  consoleSelect.addEventListener("change", () => {
    populateControllerModelSelect(data, consoleSelect.value);
    updateControllerSummaryFromForm();
  });

  modelSelect.addEventListener("change", () => {
    updateControllerSummaryFromForm();
  });
}

function getControllerFormData() {
  return {
    controllerConsoleId: document.getElementById("controllerConsole")?.value || "",
    controllerConsole: getSelectedOptionText("controllerConsole"),

    controllerModelId: document.getElementById("controllerModel")?.value || "",
    controllerModel: getSelectedOptionText("controllerModel"),

    controllerIssue: document.getElementById("controllerIssue")?.value.trim() || "",
  };
}

function validateControllerRequest(client, controllerData) {
  if (!client.name) {
    return "Ingresa tu nombre.";
  }

  if (!controllerData.controllerConsoleId) {
    return "Selecciona la consola a la que pertenece el control.";
  }

  if (!controllerData.controllerModelId) {
    return "Selecciona el modelo del control.";
  }

  if (!controllerData.controllerIssue) {
    return "Describe la falla o detalle del control.";
  }

  if (controllerData.controllerIssue.length < 8) {
    return "Describe la falla con un poco más de detalle.";
  }

  return null;
}

function renderControllerContactSummary(service, requestID) {
  setText("summary-console", "Selecciona una consola");
  setText("summary-model", "Selecciona un modelo");
  setText("summary-storage", "No aplica");
  setText("summary-games", "No aplica");
  setText("summary-services", service?.name || "Servicio para control");
  setText("summary-id", requestID || "—");

  const priceLabel = service?.priceLabel || (
    typeof service?.price === "number"
      ? `$${service.price} MXN`
      : "Precio por definir"
  );

  setText("pricingTotal", priceLabel);

  renderPricingBreakdown([
    `${service?.name || "Servicio para control"}: ${priceLabel}`,
  ]);
}

function buildControllerWhatsAppMessage(service, client, requestID, controllerData) {
  const priceLabel = service?.priceLabel || (
    typeof service?.price === "number"
      ? `$${service.price} MXN`
      : "Precio por definir"
  );

  return `
Hola, quiero solicitar servicio para un control.

ID de solicitud: ${requestID}
Cliente: ${client.name}
Servicio solicitado: ${service?.name || "Servicio para control"}
Precio mostrado en página: ${priceLabel}

Consola del control: ${controllerData.controllerConsole}
Modelo del control: ${controllerData.controllerModel}
Falla o detalle: ${controllerData.controllerIssue}
`.trim();
}

async function initControllerContactMode() {
  const requestedService = getRequestedControllerServiceId();
  const data = await loadControllerServicesConfig();
  const service = findControllerService(data, requestedService);
  const requestID = generateControllerRequestID();

  renderControllerContactSummary(service, requestID);

  document.getElementById("controllerDetailsCard")?.classList.remove("hidden");
  initControllerDropdowns(data);
  updateControllerSummaryFromForm();

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.onclick = async () => {
      const name = document.getElementById("clientName").value.trim();

      const client = { name };
      const controllerData = getControllerFormData();

      const validationError = validateControllerRequest(client, controllerData);
      if (validationError) {
        alert(validationError);
        return;
      }

      sendToWhatsApp(
        buildControllerWhatsAppMessage(service, client, requestID, controllerData),
      );

      try {
        const result = await saveControllerRequest(
          service,
          client,
          requestID,
          controllerData,
        );

        console.log("Solicitud de control guardada:", result);
      } catch (error) {
        console.warn("Error guardando solicitud de control:", error);

        alert(
          "El mensaje de WhatsApp ya se abrió, pero no se pudo guardar la solicitud en el sistema.",
        );
      }
    };
  }

  const newSelectionBtn = document.getElementById("newSelectionBtn");
  if (newSelectionBtn) {
    newSelectionBtn.onclick = () => {
      window.location.href = "/controles/";
    };
  }
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
      .map((id) => servicesCatalog[id]?.name || id)
      .join(", ")}
Almacenamiento: ${ctx.storage?.label || "No aplica"}
Juegos: ${ctx.games?.count || 0}

💰 Total estimado: $${pricing.total} MXN
`.trim();
}

function sendToWhatsApp(message) {
  const phone = "5215543613500";
  window.open(
    "https://wa.me/" + phone + "?text=" + encodeURIComponent(message),
    "_blank",
  );
}

/* =============================
AIRTABLE
============================= */

async function saveControllerRequest(service, client, requestID, controllerData) {
  const priceLabel = service?.priceLabel || (
    typeof service?.price === "number"
      ? `$${service.price} MXN`
      : "Precio por definir"
  );

  const payload = {
    requestID,
    clientName: client.name,
    serviceId: service?.id || "",
    serviceName: service?.name || "Servicio para control",
    serviceValue: service?.contactServiceValue || "",
    price: typeof service?.price === "number" ? service.price : null,
    priceLabel,
    status: "Nuevo",
    source: "Web - Controles",
    pageUrl: window.location.href,
    notes: `Solicitud iniciada desde la página de controles. ID: ${requestID}`,
    controllerConsole: controllerData.controllerConsole,
    controllerModel: controllerData.controllerModel,
    controllerIssue: controllerData.controllerIssue,
  };

  const res = await fetch("/api/save-controller-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  if (!res.ok) {
    console.error("save-controller-request error full:", data);

    const details =
      typeof data === "string"
        ? data
        : JSON.stringify(data, null, 2);

    throw new Error(details);
  }

  return data;
}

async function saveToAirtable(ctx) {
  const { hasGameService, hasNonGameService, requestType } = getRequestFlags(ctx);

  const gamesList = hasGameService ? (ctx.games?.list || []) : [];
  const emulatorBases = hasGameService ? (ctx.games?.emulatorBases || []) : [];
  const librarySummary = hasGameService ? (ctx.games?.librarySummary || []) : [];

  const gamesCount = hasGameService ? (ctx.games?.count || 0) : 0;
  const gamesTotalSize = hasGameService ? (ctx.games?.totalSizeGB || 0) : 0;
  const selectedGamesSizeGB = hasGameService
    ? (ctx.games?.selectedGamesSizeGB || 0)
    : 0;
  const emulatorBaseSizeGB = hasGameService
    ? (ctx.games?.emulatorBaseSizeGB || 0)
    : 0;

  const gamesHumanList = hasGameService ? (ctx.games?.humanList || "") : "";

  const emulatorBasesHumanList = emulatorBases
    .map((base) => {
      const size = Number(base.sizeGB || 0);
      return `${base.libraryLabel || base.libraryId || "Emulador"}: ${base.name || "Emulador base"} (${size.toFixed(3)} GB)`;
    })
    .join("\n");

  const librarySummaryHumanList = librarySummary
    .map((item) => {
      const gamesSize = Number(item.gamesSizeGB || 0);
      const emulatorSize = Number(item.emulatorBaseSizeGB || 0);
      const total = Number(item.totalSizeGB || 0);

      return `${item.libraryLabel || item.libraryId}: ${item.gamesCount || 0} juego(s), juegos ${gamesSize.toFixed(3)} GB, emulador ${emulatorSize.toFixed(3)} GB, total ${total.toFixed(3)} GB`;
    })
    .join("\n");

  const payload = {
    selectionID: ctx.games?.selectionID || "",
    clientName: ctx.clientName || "",
    clientPhone: ctx.clientPhone || "",
    clientEmail: ctx.clientEmail || "",
    consoleCode: ctx.console?.code || "",
    console: ctx.console?.name || "",
    model: ctx.model?.description || "",
    Serial: ctx.serial || "",
    source: "Web",
    notes: ctx.notes || "",

    services: ctx.services
      .map((id) => servicesCatalog[id]?.name || id)
      .join(", "),

    servicesRaw: JSON.stringify(
      ctx.services.map((id) => ({
        id,
        name: servicesCatalog[id]?.name || id,
      })),
    ),

    requestType,
    hasGames: hasGameService,
    hasService: hasNonGameService,

    CantidadJuegos: gamesCount,
    totalSize: gamesTotalSize,

    selectedGamesSizeGB,
    emulatorBaseSizeGB,

    totalPrice: ctx.pricing?.total || 0,
    priceBreakdown: (ctx.pricing?.breakdown || []).join("\n"),
    pricingJSON: JSON.stringify(ctx.pricing || {}),

    selectedGames: gamesHumanList,
    jsonGames: JSON.stringify(gamesList),

    emulatorBases: emulatorBasesHumanList,
    emulatorBasesJSON: JSON.stringify(emulatorBases),
    librarySummary: librarySummaryHumanList,
    librarySummaryJSON: JSON.stringify(librarySummary),

    gameTitleIds: gamesList
      .map((g) => {
        const library = g.libraryLabel || g.libraryId || "Catálogo";
        const titleId = g.titleId ? ` [${g.titleId}]` : "";

        return `[${library}] ${g.name}${titleId}`;
      })
      .join("\n"),
  };

  const rawDiskValue =
    ctx.storage?.label ??
    ctx.storage?.sizeLabel ??
    ctx.storage?.size ??
    ctx.storage?.value ??
    "";

  const normalizedDiskLabel = hasGameService
    ? normalizeDiskLabel(rawDiskValue)
    : "";

  if (normalizedDiskLabel) {
    payload.diskSize = normalizedDiskLabel;

    const usable = Number(ctx.storage?.usableGB);
    if (Number.isFinite(usable) && usable > 0) {
      payload.diskLimit = usable;
    }
  }

  const res = await fetch("/api/save-selection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  if (!res.ok) {
    console.error("save-selection error:", data);
    throw new Error(
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
  }

  return data;
}

/* =============================
INIT
============================= */

document.addEventListener("DOMContentLoaded", async () => {
  const contactMode = getContactMode();

  if (contactMode === "control") {
    try {
      await initControllerContactMode();
    } catch (error) {
      console.error("Controller contact error:", error);
      alert("⚠️ No se pudo cargar la información del servicio para controles.");
      window.location.href = "/controles/";
    }

    return;
  }
  let ctx = loadContext();

  // El selectionID definitivo ahora lo genera el backend
  ctx.games = ctx.games || {};
  ctx.games.selectionID = ctx.games.selectionID || null;
  saveContext(ctx);
  ctx = loadContext();

  const error = validateContext(ctx);
  if (error) {
    alert(`⚠️ ${error}`);
    window.location.href = "/";
    return;
  }

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
  const consoleData = servicesData[ctx.console.code];

  servicesCatalog = {};
  consoleData.services.forEach((s) => {
    servicesCatalog[s.id] = s; // objeto completo
  });

  const pricing = calculatePricing(ctx, consoleData);
  ctx.pricing = pricing;
  saveContext(ctx);

  renderSummary(ctx, servicesCatalog, pricing);

  document.getElementById("sendBtn").onclick = async () => {
    const name = document.getElementById("clientName").value.trim();
    if (!name) {
      alert("Ingresa tu nombre.");
      return;
    }

    ctx.clientName = name;
    saveContext(ctx);

    sendToWhatsApp(
      buildWhatsAppMessage(ctx, pricing, {
        name,
      }),
    );

    try {
      const result = await saveToAirtable(ctx);

      if (result?.selectionID) {
        ctx.games = ctx.games || {};
        ctx.games.selectionID = result.selectionID;
      }
    } catch (e) {
      console.warn("Airtable error:", e);
      alert(`Error al guardar en Airtable:\n${e.message}`);
    }

    ctx.status = "finalized";
    saveContext(ctx);
  };

  document.getElementById("newSelectionBtn").onclick = () => {
    if (confirm("¿Iniciar nueva selección?")) {
      localStorage.removeItem(CONTEXT_KEY);
      window.location.href = "/";
    }
  };
});