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

  try {
    const {
      selectionID, // se ignora, el backend genera el definitivo
      clientName,
      consoleCode,
      console,
      model,
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
    } = req.body;

    const parsedGames = JSON.parse(jsonGames || "[]");
    const hasGames =
      Number(CantidadJuegos || 0) > 0 || parsedGames.length > 0;

    const finalSelectionID = generateUniqueSelectionID(
      consoleCode,
      hasGames,
    );

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
            clientName,
            consoleCode,
            console,
            model,
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
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}