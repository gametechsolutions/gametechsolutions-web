export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      selectionID,
      clientName,
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
      pricingJSON
    } = req.body;

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Selections`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            selectionID,
            clientName,
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
            pricingJSON,
            status: 'Pendiente'
          }
        })
      }
    );

    const data = await airtableRes.json();

    if (!airtableRes.ok) {
      return res.status(500).json({ error: data });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}