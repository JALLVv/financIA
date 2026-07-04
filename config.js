/* ============================================================
   Configuración de la nube (Supabase) — amigos, listas compartidas,
   notificaciones y push. Sin esto la app funciona 100% local.

   Pasos (detallados en el README):
   1. Crea un proyecto gratis en https://supabase.com
   2. En el SQL Editor ejecuta el archivo supabase/schema.sql
   3. En Settings → API copia la URL y la "anon public" key aquí abajo
   4. (Opcional, para push) despliega supabase/functions/push y pega
      aquí la clave pública VAPID
   ============================================================ */
window.FINANZAS_CONFIG = {
  supabaseUrl: "https://tpizpezfyzpzewjfanom.supabase.co",     // p. ej. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaXpwZXpmeXpwemV3amZhbm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjg4MDcsImV4cCI6MjA5ODc0NDgwN30.KL4hOuQDPEiYSj9uUCOFf9gfWRpO86NWhKFgyBjtG1I", // la clave "anon public" del proyecto
  vapidPublicKey: "",  // clave pública VAPID para notificaciones push
};
