# 💰 Finanzas

App de finanzas personales estilo iOS: listas independientes, categorías con color automático según el emoji, transacciones recurrentes, gráfico por categoría, buscador con filtros y modo sin conexión (PWA). Opcionalmente, con un proyecto gratuito de Supabase se activan **amigos, listas compartidas en tiempo real y notificaciones** (en la app y push).

## 🚀 Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `finanzas`). Puede ser público o privado (Pages en repos privados requiere plan de pago).
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio. Desde la web: *Add file → Upload files*, arrastra todo y confirma. O por terminal:
   ```bash
   git init
   git add .
   git commit -m "Finanzas app"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/finanzas.git
   git push -u origin main
   ```
3. En el repositorio ve a **Settings → Pages**.
4. En *Build and deployment*, elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y guarda.
5. Espera 1–2 minutos. Tu app quedará en:
   `https://TU_USUARIO.github.io/finanzas/`

## 📱 Instalarla en tu iPhone

1. Abre la URL anterior en **Safari**.
2. Toca el botón **Compartir** (cuadrado con flecha).
3. Elige **"Añadir a pantalla de inicio"**.
4. Se instalará con su propio ícono y se abrirá a pantalla completa, sin barra del navegador, como una app más. Funciona incluso sin conexión.

## 🔒 Tus datos

Las listas personales se guardan **localmente en tu dispositivo** (localStorage). Si configuras el modo compartido, únicamente las listas compartidas, tu perfil y tus amistades se sincronizan a través de tu propio proyecto de Supabase. Si borras los datos de Safari para ese sitio, se pierden los registros locales; la app instalada en la pantalla de inicio mantiene su propio almacenamiento.

## 👥 Amigos y listas compartidas (Supabase)

Con esto puedes agregar amigos (con nombre y foto), crear listas compartidas para manejar un presupuesto en pareja o en grupo, ver los movimientos de los demás **en tiempo real** y recibir notificaciones ("(Nombre) agregó un movimiento", solicitudes de amistad e invitaciones a listas).

### 1. Crear el proyecto

1. Entra en [supabase.com](https://supabase.com), crea una cuenta y un proyecto nuevo (plan gratuito).
2. En el panel del proyecto abre **SQL Editor**, pega el contenido completo de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo una sola vez.
3. (Recomendado) En **Authentication → Sign In / Up → Email** desactiva **"Confirm email"** para que tus amigos puedan crear cuenta y entrar directamente.

### 2. Conectar la app

1. En **Settings → API** copia la **Project URL** y la clave **anon public**.
2. Pégalas en el archivo [`config.js`](config.js) del repositorio:
   ```js
   window.FINANZAS_CONFIG = {
     supabaseUrl: "https://TU-PROYECTO.supabase.co",
     supabaseAnonKey: "eyJ...",
     vapidPublicKey: "", // se llena en el paso 3 (opcional)
   };
   ```
3. Sube el cambio al repositorio. Al recargar la app aparecerá la sección **Perfil → Amigos y listas compartidas** para crear tu cuenta.

### 3. Notificaciones push (opcional)

Las notificaciones dentro de la app (campana 🔔) funcionan sin este paso; esto añade las notificaciones push del sistema.

1. Genera un par de claves VAPID: `npx web-push generate-vapid-keys`
2. Con la [CLI de Supabase](https://supabase.com/docs/guides/functions):
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_CONTACT="tu@correo.com"
   supabase functions deploy push --no-verify-jwt
   ```
3. En el panel: **Database → Webhooks → Create a new hook**: tabla `notifications`, evento `INSERT`, tipo **Supabase Edge Function** → función `push`.
4. Pega la clave **pública** VAPID en `config.js` (`vapidPublicKey`).
5. En la app, cada persona toca **Perfil → Amigos → Activar notificaciones push** y acepta el permiso. En iPhone, la app debe estar **instalada en la pantalla de inicio** (iOS 16.4+).

### Cómo se usa

- **Agregar un amigo**: Perfil → Amigos → escribe su correo → *Agregar*. Le llegará la notificación "(Nombre) quiere añadirte como amigo" con botones **Aceptar / Rechazar**. Al aceptar, ambos se ven en su lista de amigos (nombre y foto). Al eliminar a un amigo, desaparece de las dos listas.
- **Lista compartida**: créala desde el selector de listas ("Nueva lista compartida") o desde Perfil → Amigos. Luego, en Perfil → Editar listas, toca el ícono 👤+ para invitar a un amigo: recibirá "(Nombre) quiere añadirte a una lista compartida". Si acepta, la lista aparece entre sus listas automáticamente.
- **Movimientos**: cualquier miembro agrega movimientos en la lista compartida; los demás los ven al instante y reciben "(Nombre) agregó un movimiento".

## 🛠️ Modificar la app

El código fuente está en `src/finanzas.jsx` (la app completa) y `src/main.jsx` (arranque y almacenamiento). Tras editar, regenera `app.js`:

```bash
npm install
npm run build
```

y vuelve a subir `app.js` al repositorio.

## Estructura

```
index.html            página principal (PWA)
app.js                aplicación compilada (React incluido)
config.js             credenciales de Supabase (modo compartido, opcional)
manifest.webmanifest  manifiesto de la PWA
sw.js                 service worker (sin conexión + push)
icons/                íconos de la app
src/                  código fuente (finanzas.jsx, cloud.js, main.jsx)
supabase/             esquema SQL y función Edge para push
```
