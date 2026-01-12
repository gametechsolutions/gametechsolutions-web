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

    if (Number(totalSize) > Number(diskLimit)) {
      return res.status(400).json({
        error: 'Disk limit exceeded',
        details: {
          totalSize,
          diskLimit
        }
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
            selectionID: selectionID,
            clientName: clientName,
            console: console,
            diskSize: diskSize,
            diskLimit: diskLimit,
            totalSize: totalSize,
            CantidadJuegos: CantidadJuegos,
            selectedGames: selectedGames,
            jsonGames: jsonGames,
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
