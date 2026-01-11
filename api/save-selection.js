export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      selectionId,
      Cliente,
      Consola,
      diskSize,
      totalSize,
      games
    } = req.body;

    if (!selectionId || !clientName || !games?.length) {
      return res.status(400).json({ error: 'Datos incompletos' });
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
            SelectionID: selectionId,
            ClientName: clientName,
            Console: console,
            DiskSize: diskSize,
            TotalSizeGB: totalSize,
            Games: games.join('\n')
          }
        })
      }
    );

    const data = await airtableRes.json();

    if (!airtableRes.ok) {
      return res.status(500).json({ error: data });
    }

    res.status(200).json({ success: true, recordId: data.id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
