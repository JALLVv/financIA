# 💰 Finanzas

App de finanzas personales estilo iOS: listas independientes, categorías con color automático según el emoji, transacciones recurrentes, gráfico por categoría, buscador con filtros y modo sin conexión (PWA).

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

Todo se guarda **localmente en tu dispositivo** (localStorage). Nada se envía a ningún servidor. Si borras los datos de Safari para ese sitio, se pierden los registros; la app instalada en la pantalla de inicio mantiene su propio almacenamiento.

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
manifest.webmanifest  manifiesto de la PWA
sw.js                 service worker (modo sin conexión)
icons/                íconos de la app
src/                  código fuente
```
