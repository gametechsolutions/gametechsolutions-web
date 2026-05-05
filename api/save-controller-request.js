function generateControllerRequestID() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `CTRL-${year}${month}${day}-${random}`;
}

function cleanText(value, maxLength = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function normalizeControllerRequestID(value) {
  const clean = cleanText(value, 80).toUpperCase();

  if (/^CTRL-\d{8}-[A-Z0-9]{5}$/.test(clean)) {
    return clean;
  }

  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido. Usa POST.",
    });
  }

  try {
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME =
      process.env.AIRTABLE_CONTROLLER_REQUESTS_TABLE || "ControllerRequests";

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return res.status(500).json({
        ok: false,
        error:
          "Faltan variables de entorno: AIRTABLE_TOKEN y/o AIRTABLE_BASE_ID.",
      });
    }

    const body = req.body || {};

    const clientName = cleanText(body.clientName, 120);
    const serviceId = cleanText(body.serviceId, 120);
    const serviceName = cleanText(body.serviceName, 160);
    const serviceValue = cleanText(body.serviceValue, 160);
    const priceLabel = cleanText(body.priceLabel, 80);
    const source = cleanText(body.source || "Web - Controles", 120);
    const pageUrl = cleanText(body.pageUrl, 500);
    const notes = cleanText(body.notes, 1000);
    const controllerConsole = cleanText(body.controllerConsole, 160);
    const controllerModel = cleanText(body.controllerModel, 160);
    const controllerIssue = cleanText(body.controllerIssue, 1000);

    const price =
      typeof body.price === "number" && Number.isFinite(body.price)
        ? body.price
        : null;

    if (!clientName) {
      return res.status(400).json({
        ok: false,
        error: "Falta clientName.",
      });
    }

    if (!serviceId && !serviceName && !serviceValue) {
      return res.status(400).json({
        ok: false,
        error: "Falta información del servicio.",
      });
    }

    const requestID =
      normalizeControllerRequestID(body.requestID) || generateControllerRequestID();

    const fields = {
      requestID,
      createdAt: new Date().toISOString(),
      clientName,
      serviceId,
      serviceName,
      serviceValue,
      priceLabel,
      status: "Nuevo",
      source,
      pageUrl,
      notes,
      controllerConsole,
      controllerModel,
      controllerIssue,
    };

    if (price !== null) {
      fields.price = price;
    }

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      AIRTABLE_TABLE_NAME,
    )}`;

    const airtableRes = await fetch(airtableUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [
          {
            fields,
          },
        ],
      }),
    });

    const raw = await airtableRes.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    if (!airtableRes.ok) {
      console.error("Airtable controller request error:", data);

      return res.status(airtableRes.status).json({
        ok: false,
        error: "Airtable rechazó la solicitud.",
        details: data,
      });
    }

    return res.status(200).json({
      ok: true,
      requestID,
      airtable: data,
    });
  } catch (error) {
    console.error("save-controller-request error:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno.",
    });
  }
}