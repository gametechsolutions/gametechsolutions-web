export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  function generateUniqueSelectionID(consoleCode, hasGames) {
    const year = new Date().getFullYear();
    const type = hasGames ? "GAMES" : "SVC";

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";

    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${consoleCode}-${type}-${year}-${randomPart}`;
  }

  function safeParseJsonArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);

    if (typeof value !== "string") return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function normalizeServiceList(services, servicesRaw) {
    if (Array.isArray(services)) {
      return services.filter(Boolean);
    }

    if (typeof services === "string" && services.trim()) {
      return [services.trim()];
    }

    const parsedRaw = safeParseJsonArray(servicesRaw);
    if (parsedRaw.length > 0) {
      return parsedRaw;
    }

    if (typeof servicesRaw === "string" && servicesRaw.trim()) {
      return [servicesRaw.trim()];
    }

    return [];
  }

  function numberOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function hasMeaningfulValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function normalizeDiskSizeLabel(value) {
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

  try {
    const {
      selectionID, // se ignora, el backend genera el definitivo
      clientName,
      clientPhone,
      clientEmail,
      consoleCode,
      console,
      model,
      Serial,
      services,
      servicesRaw,
      diskSize,
      diskLimit,
      totalSize,
      CantidadJuegos,
      totalPrice,
      priceBreakdown,
      selectedGames,
      jsonGames,
      gameTitleIds,
      pricingJSON,
      notes,
      source,
    } = req.body;

    const parsedGames = safeParseJsonArray(jsonGames);
    const normalizedServices = normalizeServiceList(services, servicesRaw);

    const hasGames =
      numberOrZero(CantidadJuegos) > 0 || parsedGames.length > 0;

    const hasService = normalizedServices.length > 0;

    const requestType = hasGames && hasService
      ? "MIXED"
      : hasGames
        ? "GAMES"
        : "SVC";

    // Se mantiene esta lógica por compatibilidad con la transfer tool actual
    const finalSelectionID = generateUniqueSelectionID(consoleCode, hasGames);

    const fields = {
      selectionID: finalSelectionID,
      source: source || "Web",
      clientName: clientName || "",
      consoleCode: consoleCode || "",
      console: console || "",
      services: typeof services === "string" ? services : "",
      servicesRaw:
        typeof servicesRaw === "string"
          ? servicesRaw
          : JSON.stringify(servicesRaw || []),

      CantidadJuegos: numberOrZero(CantidadJuegos),
      totalSize: numberOrZero(totalSize),
      totalPrice: numberOrZero(totalPrice),

      priceBreakdown:
        typeof priceBreakdown === "string"
          ? priceBreakdown
          : JSON.stringify(priceBreakdown || {}),

      pricingJSON:
        typeof pricingJSON === "string"
          ? pricingJSON
          : JSON.stringify(pricingJSON || {}),

      selectedGames:
        typeof selectedGames === "string"
          ? selectedGames
          : JSON.stringify(selectedGames || []),

      jsonGames: JSON.stringify(parsedGames),

      gameTitleIds:
        typeof gameTitleIds === "string"
          ? gameTitleIds
          : JSON.stringify(gameTitleIds || []),

      notes: notes || "",
      requestType,
      hasGames,
      hasService,
      leadStatus: "Nuevo",

      // Compatibilidad con tu flujo actual de transferencias
      status: "Pendiente",
    };

    if (hasMeaningfulValue(clientPhone)) {
      fields.clientPhone = String(clientPhone).trim();
    }

    if (hasMeaningfulValue(clientEmail)) {
      fields.clientEmail = String(clientEmail).trim();
    }

    if (hasMeaningfulValue(model)) {
      fields.model = String(model).trim();
    }

    if (hasMeaningfulValue(Serial)) {
      fields.Serial = String(Serial).trim();
    }

    const normalizedDiskSize = normalizeDiskSizeLabel(diskSize);

    if (normalizedDiskSize) {
      fields.diskSize = normalizedDiskSize;

      if (hasMeaningfulValue(diskLimit)) {
        fields.diskLimit = numberOrZero(diskLimit);
      }
    }

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Selections`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      },
    );

    const data = await airtableRes.json();

    if (!airtableRes.ok) {
      return res.status(500).json({
        error: "Airtable insert failed",
        airtableStatus: airtableRes.status,
        airtableBody: data,
      });
    }

    return res.status(200).json({
      ok: true,
      selectionID: finalSelectionID,
      requestType,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Unhandled server error",
      message: err.message,
    });
  }
}