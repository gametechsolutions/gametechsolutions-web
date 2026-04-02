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

  try {
    const {
      selectionID, // se ignora, el backend genera el definitivo
      clientName,
      consoleCode,
      clientPhone,
      clientEmail,
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
      Number(CantidadJuegos || 0) > 0 || parsedGames.length > 0;

    const hasService = normalizedServices.length > 0;

    const requestType = hasGames && hasService
      ? "MIXED"
      : hasGames
      ? "GAMES"
      : "SVC";

    // Se mantiene esta lógica por compatibilidad con la transfer tool actual
    const finalSelectionID = generateUniqueSelectionID(consoleCode, hasGames);

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Selections`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            selectionID: finalSelectionID,
            source: source || "Web",

            clientName: clientName || "",
            clientPhone: clientPhone || "",
            clientEmail: clientEmail || "",
            consoleCode,
            console,
            model: model || "",
            Serial: Serial || "",
            services: services || "",
            servicesRaw:
              typeof servicesRaw === "string"
                ? servicesRaw
                : JSON.stringify(servicesRaw || []),

            diskSize: diskSize || "",
            diskLimit: Number(diskLimit || 0),
            totalSize: Number(totalSize || 0),
            CantidadJuegos: Number(CantidadJuegos || 0),
            totalPrice: Number(totalPrice || 0),

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

            // Se deja por compatibilidad con el flujo actual de transferencias.
            // Más adelante, si separas totalmente GAMES y SVC, aquí podrás poner
            // "No aplica" para SVC y MIXED sin tocar la tool antigua.
            status: "Pendiente",
          },
        }),
      },
    );

    const data = await airtableRes.json();

    if (!airtableRes.ok) {
      return res.status(500).json({ error: data });
    }

    return res.status(200).json({
      ok: true,
      selectionID: finalSelectionID,
      requestType,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}