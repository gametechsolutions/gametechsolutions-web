/* =========================================
CONTACTO.JS — GameTechSolutions
Pricing automático por servicios (FINAL)
========================================= */

const CONTEXT_KEY = "GTS_CONTEXT";

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

async function saveToAirtable(ctx) {
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

    CantidadJuegos: ctx.games?.count || 0,
    totalSize: ctx.games?.totalSizeGB || 0,
    totalPrice: ctx.pricing?.total || 0,
    priceBreakdown: (ctx.pricing?.breakdown || []).join("\n"),
    pricingJSON: JSON.stringify(ctx.pricing || {}),
    selectedGames: ctx.games?.humanList || "",
    jsonGames: JSON.stringify(ctx.games?.list || []),
    gameTitleIds: (ctx.games?.list || [])
      .map((g) => `${g.name} [${g.titleId ?? "SIN_TITLE_ID"}]`)
      .join("\n"),
  };

  const rawDiskValue =
    ctx.storage?.label ??
    ctx.storage?.sizeLabel ??
    ctx.storage?.size ??
    ctx.storage?.value ??
    "";

  const normalizedDiskLabel = normalizeDiskLabel(rawDiskValue);

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

  const servicesData = await fetch("/assets/data/services.json").then((r) =>
    r.json(),
  );
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