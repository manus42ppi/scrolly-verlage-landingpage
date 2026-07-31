// POST /lead — nimmt eine Terminanfrage entgegen und speichert sie in Workers KV.
// Honeypot-Feld "website": echte Besucher sehen/füllen es nie (siehe CSS im Formular),
// Bots die alle Felder ausfüllen tappen hinein — wir antworten dann trotzdem mit ok,
// damit Bots keinen Unterschied zwischen "abgelehnt" und "angenommen" lernen können.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "invalid_body" }, 400);
  }

  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot) {
    return jsonResponse({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }

  const record = {
    id: crypto.randomUUID(),
    email,
    company: typeof body.company === "string" ? body.company.trim().slice(0, 200) : "",
    slot: typeof body.slot === "string" ? body.slot.slice(0, 100) : "",
    source: typeof body.source === "string" ? body.source.slice(0, 64) : "unknown",
    createdAt: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") || "",
    referer: request.headers.get("referer") || "",
  };

  await env.LEADS_KV.put(`lead:${record.createdAt}:${record.id}`, JSON.stringify(record));

  return jsonResponse({ ok: true });
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json" },
  });
}
