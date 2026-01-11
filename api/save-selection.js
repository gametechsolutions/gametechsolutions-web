export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      selectionId,
      clientName,
      console,
      diskSize,
      diskLimit,
      totalSize,
      selectedGames,
      jsonGames
    } = req.body;

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
            selectionID: selectionId,
            clientName: clientName,
            console: console,
            diskSize: diskSize,
            diskLimit: diskLimit,
            totalSize: totalSize,
            CantidadJuegos: selectedGames.length,
            selectedGames: selectedGames.join('\n'),
            jsonGames: JSON.stringify(jsonGames, null, 2),
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
