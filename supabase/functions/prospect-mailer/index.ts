import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Envoi de la prospection Abracadeal depuis les boîtes OVH (Zimbra, SMTP SSL 465). 10/10/2026, v3 13/10/2026 (relance J+5 dans le même fil),
// v4 13/10/2026 : test A/B (A = mail avec lien, B = sans lien, on invite à répondre), variante stable par prospect.
// v7 29/10/2026 : le 1er mail ne part qu'aux prospects dont le site a été lu par le robot ({{annonces}} = nombre trouvé).
// v5 17/10/2026 : suivi des clics — le lien pro-fondateur.html reçoit un code personnel ?r=xxxxxxxx (aucun pixel d'ouverture).
// Actions :
//   POST {action:"verify", mailbox}         admin connecté : teste l'identifiant SMTP sans rien envoyer
//   POST {action:"test", mailbox, category, followup?, variant?} admin connecté : envoie UN message de test à l'adresse de l'admin
//   POST {action:"run"}                     cron (clé interne) : envoie seulement si le « feu vert » est donné
//   POST {action:"bounces", dry?, days?}    cron ou admin : lit les rebonds (IMAP) et passe les adresses mortes en « error » (v12, 30/10/2026)
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
// v7 29/10/2026 : {{annonces}} = résultat du test du site du prospect (« vos 52 biens peuvent être », « votre véhicule peut être »).
function stockPhrase(category: string, n: number | null | undefined) {
  const k = Math.max(0, Number(n || 0));
  const noun = category === "Agence immobilière" ? ["bien", "biens"] : category === "Concession moto" ? ["moto", "motos"] : ["véhicule", "véhicules"];
  if (k === 0) return `vos ${noun[1]} peuvent être`;
  if (k === 1) return `votre ${noun[0]} peut être`;
  return `vos ${k} ${noun[1]} peuvent être`;
}
// {{vos_annonces}} : « vos véhicules » / « vos motos » / « vos biens » (mail « publiez vous-même », pros qui vendent sur Leboncoin).
function vosAnnonces(category: string) {
  return category === "Agence immobilière" ? "vos biens" : category === "Concession moto" ? "vos motos" : "vos véhicules";
}
let CURRENT_CATEGORY = "";
function fill(t: string, company: string, from: string, annonces = "vos annonces peuvent être") {
  return t.replaceAll("{{societe}}", company || "votre entreprise").replaceAll("{{expediteur}}", from).replaceAll("{{annonces}}", annonces).replaceAll("{{vos_annonces}}", vosAnnonces(CURRENT_CATEGORY));
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
// kind : "" (site lu), "manuel" (vend sur Leboncoin), "normal" (site qui bloque les robots).
async function templates(category: string, followup: boolean, variant: string, kind: boolean | string = ""): Promise<Tpl> {
  CURRENT_CATEGORY = category || "";
  const k = kind === true ? "manuel" : (kind || "");
  const { data: first } = await admin.rpc("prospect_mailer_template_for_variant", { p_category: k || (category || ""), p_variant: variant });
  if (!followup) return first as Tpl;
  const { data: rel } = await admin.rpc("prospect_mailer_template_for_variant", { p_category: k ? "relance_" + k : "relance", p_variant: variant });
  // la relance part dans le même fil que le 1er mail : même objet précédé de « Re: »
  return { subject: "Re: " + (first as Tpl).subject, body: (rel as Tpl).body };
}
async function variantOf(id: string, stored?: string | null) {
  if (stored === "A" || stored === "B") return stored;
  const { data } = await admin.rpc("prospect_ab_variant", { p_id: id });
  return data === "B" ? "B" : "A";
}
async function buildMail(c: Creds, to: string, company: string, prospectId: string | null, tpl: Tpl, inReplyTo?: string | null, annonces?: string) {
  const from = c.email;
  let body = fill(tpl.body, company, from, annonces);
  let unsubHeader = "";
  if (prospectId) {
    body = await withTracking(body, prospectId);
    const t = await sign(prospectId);
    const page = `https://abracadeal.fr/desinscription.html?u=${prospectId}&t=${t}`;
    const oneClick = `${SUPABASE_URL}/functions/v1/prospect-mailer?u=${prospectId}&t=${t}`;
    body += `\n\n--\nVous recevez ce message car votre entreprise est référencée publiquement comme professionnel. ` +
      `Pour ne plus recevoir nos e-mails : ${page}`;
    unsubHeader = `List-Unsubscribe: <${oneClick}>, <mailto:${from}?subject=STOP>\r\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n`;
  }
  const thread = inReplyTo && /^<[^<>\s]+>$/.test(inReplyTo) ? `In-Reply-To: ${inReplyTo}\r\nReferences: ${inReplyTo}\r\n` : "";
  const msgId = `<${crypto.randomUUID()}@${from.split("@")[1]}>`;
  const b = b64(body.replace(/\r?\n/g, "\r\n")).replace(/.{1,76}/g, "$&\r\n").trimEnd();
  const data =
    `From: ${encHeader(c.display_name)} <${from}>\r\nTo: <${to}>\r\nReply-To: <${from}>\r\n` +
    `Subject: ${encHeader(fill(tpl.subject, company, from, annonces).replace(/[\r\n]/g, " "))}\r\nDate: ${new Date().toUTCString().replace("GMT", "+0000")}\r\n` +
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
// v12 30/10/2026 : lecture des retours d'erreur (rebonds) dans les boîtes OVH par IMAP.
// Un rebond définitif (« Action: failed ») passe la fiche du prospect en « error » : plus de relance ni de nouvel envoi.
const IMAP_HOSTS = ["imap.mail.ovh.net", "ssl0.ovh.net"];
type Bounce = { email: string; status: string; diag: string; date: string };
async function imapBounces(c: Creds, sinceDays: number): Promise<{ host: string; bounces: Bounce[]; scanned: number }> {
  if (!c.password) throw new Error("Mot de passe non enregistré");
  let lastErr: unknown = null;
  for (const host of IMAP_HOSTS) {
    let conn: Deno.TlsConn;
    try { conn = await Deno.connectTls({ hostname: host, port: 993 }); } catch (e) { lastErr = e; continue; }
    const timer = setTimeout(() => { try { conn.close(); } catch { /* déjà fermé */ } }, 50000);
    let raw = new Uint8Array(0);
    let n = 0;
    const more = async () => {
      const chunk = new Uint8Array(65536); const k = await conn.read(chunk);
      if (k === null) throw new Error("Connexion IMAP fermée par le serveur");
      const t = new Uint8Array(raw.length + k); t.set(raw); t.set(chunk.subarray(0, k), raw.length); raw = t;
    };
    // renvoie tout le texte jusqu'à la ligne « tag OK/NO/BAD »
    const cmd = async (line: string) => {
      const tag = "a" + (++n);
      const d = enc.encode(`${tag} ${line}\r\n`); let o = 0; while (o < d.length) o += await conn.write(d.subarray(o));
      while (true) {
        const txt = dec.decode(raw);
        const m = new RegExp(`(^|\\r\\n)${tag} (OK|NO|BAD)[^\\r\\n]*\\r\\n`).exec(txt);
        if (m) {
          raw = enc.encode(txt.slice(m.index + m[0].length));
          if (m[2] !== "OK") throw new Error(`IMAP ${m[0].trim()}`.slice(0, 300));
          return txt.slice(0, m.index + m[0].length);
        }
        await more();
      }
    };
    try {
      while (!/\r\n/.test(dec.decode(raw))) await more(); raw = new Uint8Array(0); // salutation
      const q = (s: string) => `"${s.replace(/["\\]/g, "\\$&")}"`;
      await cmd(`LOGIN ${q(c.email)} ${q(c.password)}`);
      await cmd("EXAMINE INBOX"); // lecture seule : rien n'est modifié dans la boîte
      const since = new Date(Date.now() - sinceDays * 86400000);
      const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][since.getUTCMonth()];
      const s = await cmd(`UID SEARCH SINCE ${since.getUTCDate()}-${mon}-${since.getUTCFullYear()} OR FROM "mailer-daemon" FROM "postmaster"`);
      const uids = (/\* SEARCH([\d ]*)/i.exec(s)?.[1] || "").trim().split(/\s+/).filter(Boolean).slice(-200);
      const bounces: Bounce[] = [];
      for (const uid of uids) {
        const body = await cmd(`UID FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (DATE)] BODY.PEEK[TEXT]<0.30000>)`);
        bounces.push(...parseBounce(body));
      }
      await cmd("LOGOUT").catch(() => {});
      return { host, bounces, scanned: uids.length };
    } catch (e) { lastErr = e; if (/LOGIN|AUTHENTICATIONFAILED|credentials/i.test(String(e))) break; }
    finally { clearTimeout(timer); try { conn.close(); } catch { /* déjà fermé */ } }
  }
  throw new Error("Lecture IMAP impossible : " + String((lastErr as Error)?.message || lastErr).slice(0, 200));
}
// Rapports de non-remise (RFC 3464) : un bloc par destinataire avec Final-Recipient / Action / Status / Diagnostic-Code.
function parseBounce(raw: string): Bounce[] {
  const txt = raw.replace(/\r\n[ \t]+/g, " ");
  const date = /^Date:\s*(.+)$/mi.exec(txt)?.[1]?.trim() || "";
  const out: Bounce[] = [];
  const re = /Final-Recipient:\s*rfc822;\s*<?([^\s<>;]+@[^\s<>;]+)>?([\s\S]*?)(?=Final-Recipient:|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt))) {
    const block = m[2];
    const action = /Action:\s*(\w+)/i.exec(block)?.[1]?.toLowerCase() || "";
    if (action !== "failed") continue; // « delayed » = nouvel essai en cours, pas un échec définitif
    out.push({
      email: m[1].toLowerCase(),
      status: /Status:\s*([\d.]+)/i.exec(block)?.[1] || "",
      diag: (/Diagnostic-Code:\s*(?:smtp|x-postfix);?\s*([^\r\n]+)/i.exec(block)?.[1] || "").trim().slice(0, 160),
      date,
    });
  }
  return out;
}
async function processBounces(dry: boolean, sinceDays: number) {
  const { data: boxes } = await admin.rpc("prospect_mailer_mailbox_list");
  const report: Record<string, unknown> = {};
  const marked: string[] = [];
  for (const email of ((boxes || []) as string[])) {
    try {
      const c = await creds(email);
      const r = await imapBounces(c, sinceDays);
      const seen = new Map<string, Bounce>();
      for (const b of r.bounces) seen.set(b.email, b);
      const done: string[] = [];
      for (const b of seen.values()) {
        const { data: rows } = await admin.from("prospection_prospects").select("id,company,status").ilike("email", b.email);
        for (const p of (rows || []) as { id: string; company: string; status: string }[]) {
          if (p.status === "error" || p.status === "opted_out") continue;
          done.push(`${p.company} <${b.email}>`);
          if (dry) continue;
          const err = `Rebond ${b.date ? new Date(b.date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : ""} : ${b.status} ${b.diag}`.replace(/\s+/g, " ").trim() + " — ne plus écrire";
          await admin.from("prospection_prospects").update({ status: "error", last_error: err.slice(0, 300), updated_at: new Date().toISOString() }).eq("id", p.id);
          await admin.from("prospection_logs").insert({ prospect_id: p.id, action: "bounce", detail: `Rebond détecté automatiquement (${email}) : ${b.status}` });
        }
      }
      marked.push(...done);
      report[email] = { host: r.host, scanned: r.scanned, rebonds: seen.size, marques: done };
    } catch (e) { report[email] = { erreur: String((e as Error).message || e).slice(0, 200) }; }
  }
  return { ok: true, dry, report, marked: marked.length };
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
      const tpl = await templates(String(body.category || "Garage / concession auto"), !!body.followup, body.variant === "B" ? "B" : "A", body.manual ? "manuel" : (body.normal ? "normal" : ""));
      const to = String(user.email || "");
      const cat = String(body.category || "Garage / concession auto");
      const { data } = await buildMail(c, to, "Votre société (TEST)", null, tpl, null, stockPhrase(cat, 24));
      await smtp(c, { to, data });
      return json({ ok: true, message: `Message de test envoyé à ${to} depuis ${c.email}.` });
    } catch (e) {
      const msg = String((e as Error).message || e);
      if (action === "verify") await admin.rpc("prospect_mailer_verified", { p_email: mailbox, p_ok: false, p_error: msg });
      return json({ ok: false, error: msg }, 200);
    }
  }

  // v12 : rebonds. Cron (clé interne) ou admin connecté ; {dry:true} = rapport sans rien modifier.
  if (action === "bounces") {
    const cron = !!req.headers.get("x-internal-key") && req.headers.get("x-internal-key") === await secret("prospect_crawler_internal");
    if (!cron && !(await requireAdmin(req))) return json({ error: "Non autorisé" }, 401);
    const days = Math.min(30, Math.max(1, Number(body.days || 10)));
    return json(await processBounces(!!body.dry, days));
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
        const { data: row } = await admin.from("prospection_prospects").select("ab_variant,site_check_count,site_check_status").eq("id", j.id).single();
        const variant = await variantOf(j.id, row?.ab_variant);
        if (!followup && !(await domainReceivesMail(j.email))) throw new Error("Domaine inexistant (aucun MX ni A) : non envoyé");
        const c = await creds(j.mailbox);
        // 29/10/2026 (Anthony) : le mail « nous avons testé votre site » (et sa relance) seulement si le site a vraiment été lu
        // avec au moins une annonce ; sinon mail « normal » (jamais de nombre ni de « tout est prêt » inventés).
        const tested = row?.site_check_status === "ok" && Number(row?.site_check_count || 0) > 0;
        const tpl = await templates(j.category || "", followup, variant, tested ? "" : row?.site_check_status === "manual" ? "manuel" : "normal");
        const { data, msgId } = await buildMail(c, j.email, j.company, j.id, tpl, followup ? j.in_reply_to : null, stockPhrase(j.category || "", row?.site_check_count));
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
