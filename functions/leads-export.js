// GET /leads-export — CSV-Export aller gespeicherten Leads.
// Geschützt per HTTP Basic Auth (Secrets LEADS_EXPORT_USER / LEADS_EXPORT_PASSWORD).
// Kein Admin-UI nötig: einfach die URL im Browser öffnen, Zugangsdaten eingeben,
// CSV wird heruntergeladen.

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request, env)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "www-authenticate": 'Basic realm="Scrolly Leads Export"' },
    });
  }

  const keys = await listAllLeadKeys(env.LEADS_KV);
  const rows = [["id", "email", "company", "slot", "source", "createdAt", "userAgent", "referer"]];

  for (const key of keys) {
    const raw = await env.LEADS_KV.get(key.name);
    if (!raw) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    rows.push([
      record.id,
      record.email,
      record.company,
      record.slot,
      record.source,
      record.createdAt,
      record.userAgent,
      record.referer,
    ]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="scrolly-leads.csv"',
    },
  });
}

function isAuthorized(request, env) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch (e) {
    return false;
  }
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;
  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);
  return user === env.LEADS_EXPORT_USER && pass === env.LEADS_EXPORT_PASSWORD;
}

async function listAllLeadKeys(kv) {
  const keys = [];
  let cursor;
  do {
    const result = await kv.list({ prefix: "lead:", cursor });
    keys.push(...result.keys);
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);
  return keys;
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
