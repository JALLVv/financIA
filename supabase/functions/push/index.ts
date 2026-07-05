/* Edge Function "push": envía notificaciones Web Push cuando se inserta
   una fila en public.notifications (conectar mediante un Database Webhook).

   Despliegue:
     supabase functions deploy push --no-verify-jwt
   Secrets necesarios (supabase secrets set ...):
     VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, (opcional) VAPID_CONTACT
   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase. */
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  "mailto:" + (Deno.env.get("VAPID_CONTACT") ?? "admin@example.com"),
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

type Payload = Record<string, any>;

const messageFor = (kind: string, p: Payload) => {
  const name = (obj: Payload | undefined) => (obj && obj.name) || "Alguien";
  switch (kind) {
    case "movement": {
      const tipo = p.type === "income" ? "ingreso" : "gasto";
      return {
        title: "Finanzas",
        body: `${name(p.author)} agregó un ${tipo} a ${p.list_name || "una lista compartida"}`,
      };
    }
    case "friend_request":
      return { title: "Finanzas", body: `${name(p.from)} quiere añadirte como amigo` };
    case "list_invite":
      return { title: "Finanzas", body: `${name(p.from)} quiere añadirte a una lista compartida` };
    default:
      return null;
  }
};

Deno.serve(async (req) => {
  let body: any;
  try { body = await req.json(); } catch { return new Response("bad request", { status: 400 }); }

  const record = body?.record;
  if (!record?.user_id || !record?.kind) return new Response("skip", { status: 200 });

  const msg = messageFor(record.kind, record.payload ?? {});
  if (!msg) return new Response("skip", { status: 200 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", record.user_id);

  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(msg),
      );
    } catch (e: any) {
      // suscripción caducada → limpiarla
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }));

  return new Response("ok", { status: 200 });
});
