import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Envoi de la prospection Abracadeal depuis les boîtes OVH (Zimbra, SMTP SSL 465). 10/10/2026, v3 13/10/2026 (relance J+5 dans le même fil),
// v4 13/10/2026 : test A/B (A = mail avec lien, B = sans lien, on invite à répondre), variante stable par prospect.
// v5 17/10/2026 : suivi des clics — le lien pro-fondateur.html reçoit un code personnel ?r=xxxxxxxx (aucun pixel d'ouverture).
// Actions :
//   POST {action:"verify", mailbox}         admin connecté : teste l'identifiant SMTP sans rien envoyer
//   POST {action:"test", mailbox, category, followup?, variant?} admin connecté : envoie UN message de test à l'adresse de l'admin
//   POST {action:"run"}                     cron (clé interne) : envoie seulement si le « feu vert » est donné
//   POST {action:"unsubscribe", u, t}       page abracadeal.fr/desinscription.html
//   POST ?u=..&t=.. (List-Unsubscribe-Post) désinscription en un clic depuis la messagerie
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const enc = new TextEncoder();
const dec = new TextDecoder();

async function secret(name: string) {
  const { data } = await admin.from("integration_secrets").select("secret_value").eq("name", name).single();
  return data?.secret_value as string | undefined;
}
async function sign(id: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(await secret("prospect_unsub_hmac") || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(id)));
  return [...sig].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function b64(s: string | Uint8Array) {
  const bytes = typeof s === "string" ? enc.encode(s) : s;
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

type Creds = { email: string; display_name: string; host: string; port: number; password: string | null };
async function smtp(c: Creds, mail?: { to: string; data: string }) {
  if (!c.password) throw new Error("Mot de passe non enregistré");
  const conn = await Deno.connectTls({ hostname: c.host, port: c.port });
  let buf = "";
  const timer = setTimeout(() => { try { conn.close(); } catch { /* déjà fermé */ } }, 45000);
  const read = async () => {
    while (true) {
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) { buf = lines.slice(i + 1).join("\r\n"); return { code: +lines[i].slice(0, 3), text: lines.slice(0, i + 1).join(" | ") }; }
      }
      const chunk = new Uint8Array(8192); const n = await conn.read(chunk);
      if (n === null) throw new Error("Connexion SMTP fermée par le serveur");
      buf += dec.decode(chunk.subarray(0, n), { stream: true });
    }
  };
  const write = async (s: string) => { const d = enc.encode(s); let o = 0; while (o < d.length) o += await conn.write(d.subarray(o)); };
  const cmd = async (line: string | null, ok: number[]) => {
    if (line !== null) await write(line + "\r\n");
    const r = await read();
    if (!ok.includes(r.code)) throw new Error(`SMTP ${r.code} ${r.text}`.slice(0, 400));
    return r;
  };
  try {
    await cmd(null, [220]);
    await cmd("EHLO " + c.email.split("@")[1], [250]);
    await cmd("AUTH LOGIN", [334]);
    await cmd(b64(c.email), [334]);
    await cmd(b64(c.password), [235]);
    if (mail) {
      await cmd(`MAIL FROM:<${c.email}>`, [250]);
      await cmd(`RCPT TO:<${mail.to}>`, [250, 251]);
      await cmd("DATA", [354]);
      await cmd(mail.data + "\r\n.", [250]);
    }
    await cmd("QUIT", [221]).catch(() => {});
  } finally { clearTimeout(timer); try { conn.close(); } catch { /* déjà fermé */ } }
}

function encHeader(s: string) { return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`; }
function fill(t: string, company: string, from: string) {
  return t.replaceAll("{{societe}}", company || "votre entreprise").replaceAll("{{expediteur}}", from);
}
// Ajoute le code de suivi personnel au lien de l'offre Fondateurs. En cas d'échec, le mail part avec le lien normal.
const FOUNDER_LINK = /https:\/\/abracadeal\.fr\/pro-fondateur\.html(?![?#\w-]|\.\w)/g;
async function withTracking(body: string, prospectId: string) {
  if (!FOUNDER_LINK.test(body)) return body;
  FOUNDER_LINK.lastIndex = 0;
  try {
    const { data: code, error } = await admin.rpc("prospect_ref_code", { p_id: prospectId });
    if (error || typeof code !== "string" || !/^[a-z0-9]{8}$/.test(code)) return body;
    return body.replace(FOUNDER_LINK, `https://abracadeal.fr/pro-fondateur.html?r=${code}`);
  } catch { return body; }
}
type Tpl = { subject: string; body: string };
async function templates(category: string, followup: boolean, variant: string): Promise<Tpl> {
  const { data: first } = await admin.rpc("prospect_mailer_template_for_variant", { p_category: category || "", p_variant: variant });
  if (!followup) return first as Tpl;
  const { data: rel } = await admin.rpc("prospect_mailer_template_for_variant", { p_category: "relance", p_variant: variant });
  // la relance part dans le même fil que le 1er mail : même objet précédé de « Re: »
  return { subject: "Re: " + (first as Tpl).subject, body: (rel as Tpl).body };
}
async function variantOf(id: string, stored?: string | null) {
  if (stored === "A" || stored === "B") return stored;
  const { data } = await admin.rpc("prospect_ab_variant", { p_id: id });
  return data === "B" ? "B" : "A";
}
async function buildMail(c: Creds, to: string, company: string, prospectId: string | null, tpl: Tpl, inReplyTo?: string | null) {
  const from = c.email;
  let body = fill(tpl.body, company, from);
  let unsubHeader = "";
  if (prospectId) {
    body = await withTracking(body, prospectId);
    const t = await sign(prospectId);
    const page = `https://abracadeal.fr/desinscription.html?u=${prospectId}&t=${t}`;
    const oneClick = `${SUPABASE_URL}/functions/v1/prospect-mailer?u=${prospectId}&t=${t}`;
    body += `\n\n--\nVous recevez ce message car ${company || "votre entreprise"} est référencée publiquement comme professionnel. ` +
      `Pour ne plus recevoir nos e-mails : ${page}\nAbracadeal — iDream Lab SASU`;
    unsubHeader = `List-Unsubscribe: <${oneClick}>, <mailto:${from}?subject=STOP>\r\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n`;
  }
  const thread = inReplyTo && /^<[^<>\s]+>$/.test(inReplyTo) ? `In-Reply-To: ${inReplyTo}\r\nReferences: ${inReplyTo}\r\n` : "";
  const msgId = `<${crypto.randomUUID()}@${from.split("@")[1]}>`;
  const b = b64(body.replace(/\r?\n/g, "\r\n")).replace(/.{1,76}/g, "$&\r\n").trimEnd();
  const data =
    `From: ${encHeader(c.display_name)} <${from}>\r\nTo: <${to}>\r\nReply-To: <${from}>\r\n` +
    `Subject: ${encHeader(fill(tpl.subject, company, from).replace(/[\r\n]/g, " "))}\r\nDate: ${new Date().toUTCString().replace("GMT", "+0000")}\r\n` +
    `Message-ID: ${msgId}\r\n${thread}MIME-Version: 1.0\r\n${unsubHeader}` +
    `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b}`;
  return { data, msgId };
}
// v6 22/10/2026 : avant un 1er mail, on vérifie que le domaine du destinataire existe (MX, ou A à défaut).
// Domaine inexistant → pas d'envoi (évite les retours « Host not found » qui abîment la réputation des boîtes).
// Panne DNS passagère (autre erreur) → on envoie quand même.
async function domainReceivesMail(email: string) {
  const domain = email.split("@")[1] || "";
  if (!domain) return false;
  const missing = (e: unknown) => e instanceof Deno.errors.NotFound || /no record|nxdomain|not found/i.test(String((e as Error)?.message || e));
  let notFound = 0;
  for (const type of ["MX", "A"] as const) {
    try { if ((await Deno.resolveDns(domain, type)).length) return true; notFound++; }
    catch (e) { if (missing(e)) notFound++; else return true; }
  }
  return notFound < 2;
}
async function creds(mailbox: string): Promise<Creds> {
  const { data, error } = await admin.rpc("prospect_mailer_creds", { p_email: mailbox });
  if (error || !data) throw new Error("Adresse d'envoi inconnue");
  return data as Creds;
}
async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser();
  const { data: isAdmin } = await user.rpc("is_admin");
  return u?.user && isAdmin === true ? u.user : null;
}
async function unsubscribe(u: string, t: string) {
  if (!/^[0-9a-f-]{36}$/.test(u) || !t || t !== await sign(u)) return false;
  const { data } = await admin.rpc("prospect_unsubscribe", { p_id: u });
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const url = new URL(req.url);
  if (url.searchParams.get("u")) {
    const ok = await unsubscribe(url.searchParams.get("u")!, url.searchParams.get("t") || "");
    return json({ ok }, ok ? 200 : 400);
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "unsubscribe") {
    const ok = await unsubscribe(String(body.u || ""), String(body.t || ""));
    return json({ ok }, ok ? 200 : 400);
  }

  if (action === "verify" || action === "test") {
    const user = await requireAdmin(req);
    if (!user) return json({ error: "Accès réservé à l'administrateur" }, 401);
    const mailbox = String(body.mailbox || "");
    try {
      const c = await creds(mailbox);
      if (action === "verify") {
        await smtp(c);
        await admin.rpc("prospect_mailer_verified", { p_email: c.email, p_ok: true, p_error: null });
        return json({ ok: true, message: "Connexion réussie : identifiant et mot de passe acceptés par OVH. Aucun e-mail envoyé." });
      }
      const tpl = await templates(String(body.category || "Garage / concession auto"), !!body.followup, body.variant === "B" ? "B" : "A");
      const to = String(user.email || "");
      const { data } = await buildMail(c, to, "Votre société (TEST)", null, tpl, null);
      await smtp(c, { to, data });
      return json({ ok: true, message: `Message de test envoyé à ${to} depuis ${c.email}.` });
    } catch (e) {
      const msg = String((e as Error).message || e);
      if (action === "verify") await admin.rpc("prospect_mailer_verified", { p_email: mailbox, p_ok: false, p_error: msg });
      return json({ ok: false, error: msg }, 200);
    }
  }

  if (action === "run") {
    if (!req.headers.get("x-internal-key") || req.headers.get("x-internal-key") !== await secret("prospect_crawler_internal")) return json({ error: "Non autorisé" }, 401);
    const { data: jobs, error } = await admin.rpc("prospect_mailer_claim");
    if (error) return json({ error: error.message }, 500);
    const list = (jobs || []) as { id: string; email: string; company: string; mailbox: string; category: string | null; kind?: string; in_reply_to?: string | null }[];
    if (!list.length) return json({ ok: true, sent: 0 });
    const res: Record<string, string> = {};
    for (const j of list) {
      const followup = j.kind === "followup";
      try {
        const { data: row } = await admin.from("prospection_prospects").select("ab_variant").eq("id", j.id).single();
        const variant = await variantOf(j.id, row?.ab_variant);
        if (!followup && !(await domainReceivesMail(j.email))) throw new Error("Domaine inexistant (aucun MX ni A) : non envoyé");
        const c = await creds(j.mailbox);
        const tpl = await templates(j.category || "", followup, variant);
        const { data, msgId } = await buildMail(c, j.email, j.company, j.id, tpl, followup ? j.in_reply_to : null);
        await smtp(c, { to: j.email, data });
        if (followup) await admin.rpc("prospect_mailer_followup_done", { p_id: j.id, p_ok: true, p_error: null });
        else {
          await admin.rpc("prospect_mailer_done", { p_id: j.id, p_ok: true, p_error: null, p_message_id: msgId });
          await admin.from("prospection_prospects").update({ ab_variant: variant }).eq("id", j.id);
        }
        res[j.mailbox] = (followup ? "relance envoyée" : "envoyé") + " (" + variant + ")";
      } catch (e) {
        const msg = String((e as Error).message || e);
        if (followup) await admin.rpc("prospect_mailer_followup_done", { p_id: j.id, p_ok: false, p_error: msg });
        else await admin.rpc("prospect_mailer_done", { p_id: j.id, p_ok: false, p_error: msg, p_message_id: null });
        if (/SMTP 5(35|34)|authentication|auth/i.test(msg)) await admin.rpc("prospect_mailer_verified", { p_email: j.mailbox, p_ok: false, p_error: msg });
        res[j.mailbox] = "erreur : " + msg.slice(0, 120);
      }
    }
    return json({ ok: true, results: res });
  }
  return json({ error: "Action inconnue" }, 400);
});
