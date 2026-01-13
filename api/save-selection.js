export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      selectionID,
      clientName,
      console,
      diskSize,
      diskLimit,
      totalSize,
      CantidadJuegos,
      selectedGames,
      jsonGames
    } = req.body;

    // 🔒 Validaciones críticas
    if (
      typeof totalSize !== 'number' ||
      typeof diskLimit !== 'number' ||
      Number.isNaN(totalSize) ||
      Number.isNaN(diskLimit)
    ) {
      return res.status(400).json({
        error: 'Invalid disk size values',
        details: { totalSize, diskLimit }
      });
    }

    if (totalSize > diskLimit) {
      return res.status(400).json({
        error: 'Disk limit exceeded',
        details: { totalSize, diskLimit }
      });
    }

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Selections`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            selectionID,
            clientName,
            console: console.trim(),
            diskSize,
            diskLimit,
            totalSize,
            CantidadJuegos,
            selectedGames,
            jsonGames,
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
