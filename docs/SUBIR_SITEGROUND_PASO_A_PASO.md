# Subir la app a SiteGround — Paso a paso

Sigue estos pasos en orden. Si tu plan no tiene Node.js, ver el final (alternativa).

---

## Antes de empezar

En tu PC ya debes tener la carpeta **`.next\standalone`** lista (si no, en la raíz del proyecto ejecuta: `npm run build:siteground`).

---

## Parte 1: Entrar a SiteGround

1. Entra en **https://www.siteground.com** e inicia sesión (o en **https://my.siteground.com**).
2. En el panel, abre el **sitio** donde quieres instalar la app (ej. fernandodejesuss2.sg-host.com).
3. Entra en **Site Tools** (Herramientas del sitio).

---

## Parte 2: ¿Tienes Node.js?

4. En el menú izquierdo de Site Tools busca:
   - **Devs** (o **Developers**) → **Node.js** o **Setup Node.js App**,  
   - **o** en la búsqueda escribe **Node**.

5. **Si ves “Setup Node.js App” o “Node.js”:**
   - Sigue con la **Parte 3** (crear la app y subir archivos).

6. **Si NO ves Node.js:**
   - Los planes compartidos de SiteGround a veces no incluyen Node.js.
   - Ve directo a la **Parte 5 (Alternativa)** para usar Vercel y conectar tu dominio.

---

## Parte 3: Crear la aplicación Node.js

7. Haz clic en **Setup Node.js App** (o el enlace que lleve a crear una app Node).
8. Pulsa **Create Application** (Crear aplicación).
9. Rellena:
   - **Node.js version:** 18 o 20.
   - **Application root:** una carpeta solo para esta app, ej. `panatickets` (no uses `public_html`).
   - **Application URL:** tu dominio, ej. `fernandodejesuss2.sg-host.com` (o un subdominio si lo prefieres).
   - **Application startup file:** `server.js`.
10. Guarda / crea la aplicación. Anota la **ruta completa** que te muestre (ej. `/home/usuario/panatickets`). Esa es la carpeta donde vas a subir los archivos.

---

## Parte 4: Subir los archivos

11. En Site Tools, ve a **Site** → **File Manager** (Gestor de archivos).
12. En el árbol de carpetas de la izquierda, entra en la **carpeta de la aplicación** que creaste (ej. `panatickets`).  
    Si no la ves en la raíz, suele estar dentro de tu usuario (ej. `home` → tu usuario → `panatickets`).
13. Dentro de esa carpeta **borra** todo lo que haya por defecto (ej. un `app.js` de ejemplo), para dejar la carpeta vacía.
14. En tu PC, abre la carpeta **`.next\standalone`** del proyecto. Dentro verás:
    - `server.js`
    - carpeta `.next`
    - carpeta `node_modules`
    - carpeta `prisma`
    - `package.json`
15. **Opción A — Subir carpeta (recomendado):**  
    En File Manager, clic en **Folder Upload** (Subir carpeta). Elige la carpeta **standalone** de tu PC (la que contiene `server.js`, `.next`, etc.). Espera a que termine (puede tardar varios minutos).
16. **Opción B — Subir ZIP:**  
    - En tu PC: comprime **todo el contenido** de la carpeta `.next\standalone` en un archivo **panatickets.zip** (no comprimas la carpeta “standalone”, sino lo que hay dentro: server.js, .next, node_modules, prisma, package.json). Puedes usar el script: `.\scripts\crear-zip-para-siteground.ps1` (puede tardar).
    - En File Manager, clic en **File Upload** (Subir archivo), sube **panatickets.zip**.
    - Luego clic derecho sobre **panatickets.zip** → **Extract** / **Extraer**. Borra el .zip después si quieres.
17. Comprueba que dentro de la carpeta de la app (ej. `panatickets`) veas **server.js** y las carpetas **.next**, **node_modules**, **prisma**.
18. Permisos: clic derecho en la carpeta **prisma** → **Change Permissions** (Cambiar permisos). Pon **755** (o **775** si el panel lo ofrece) y aplica a subcarpetas si te lo pregunta.

---

## Parte 5: Variables de entorno

19. Vuelve a **Setup Node.js App** (o Devs → Node.js) y abre **tu aplicación** (ej. panatickets).
20. Busca **Environment variables** / **Variables de entorno** y añade **dos** variables:

    | Nombre           | Valor |
    |------------------|-------|
    | `WEBHOOK_SECRET` | `c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47` |
    | `DATABASE_URL`   | `file:./prisma/dev.db` |

21. Guarda los cambios.

---

## Parte 6: Iniciar la app

22. En la misma pantalla de la aplicación Node, busca **Run NPM Install** (opcional; si subiste el standalone completo, normalmente no hace falta).  
23. Pulsa **Start Application** (Iniciar aplicación) o **Restart** si ya estaba creada.
24. Abre en el navegador la **Application URL** que configuraste (ej. https://fernandodejesuss2.sg-host.com/). Deberías ver la cola de impresión.
25. Prueba el webhook:  
    `https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47`  
    (con un POST de prueba; si responde 201 o 200, está bien).

---

## Parte 7: Si algo falla

- **La app no arranca:** Revisa los **logs** en Setup Node.js App (Application log / Error log). Ahí suele decir si falta `server.js`, variable de entorno o permiso.
- **Error de base de datos:** Comprueba que la carpeta **prisma** tenga permisos 755/775 y que `DATABASE_URL` sea exactamente `file:./prisma/dev.db`.
- **404 o página en blanco:** Confirma que subiste el **contenido** de `.next\standalone` (server.js, .next, node_modules, prisma) dentro de la carpeta de la app, no una carpeta “standalone” dentro de otra.

---

## Parte 8: Si tu plan NO tiene Node.js (alternativa)

26. SiteGround en planes compartidos a veces no ofrece Node.js. Entonces:
    - Despliega la app en **Vercel** (gratis): conecta tu repo de GitHub y despliega; Vercel detecta Next.js y la sube sola.
    - En Vercel, en **Settings → Domains**, añade tu dominio (ej. fernandodejesuss2.sg-host.com).
    - En **SiteGround**, en **Site Tools → Domain → DNS Zone**, crea un registro **CNAME** para tu dominio (o subdominio) apuntando a la URL que te da Vercel (ej. `cname.vercel-dns.com`).
    - Las variables `WEBHOOK_SECRET` y `DATABASE_URL` las configuras en Vercel (Settings → Environment Variables). En Vercel no uses SQLite local; usa su base o una externa (p. ej. Vercel Postgres o un SQLite en la nube). Para solo pruebas, puedes usar solo `WEBHOOK_SECRET` y una DB que Vercel o un addon ofrezcan.

---

## Resumen rápido

| Paso | Dónde | Qué hacer |
|------|--------|-----------|
| 1–3 | Site Tools | Entrar y buscar Node.js |
| 4–6 | Node.js | Crear app, anotar carpeta, startup: `server.js` |
| 7–10 | File Manager | Ir a la carpeta de la app, subir contenido de `.next\standalone` (o ZIP y extraer), permisos 755 en `prisma` |
| 11–12 | Node.js app | Añadir `WEBHOOK_SECRET` y `DATABASE_URL` |
| 13–14 | Node.js app | Start / Restart, probar URL y webhook |

Si en algún paso no ves las mismas opciones (por ejemplo tu panel dice “cPanel” en vez de “Site Tools”), busca **Setup Node.js App** o **Node.js** en el menú y adapta los nombres; los pasos son los mismos: crear app → subir archivos a la carpeta de la app → variables de entorno → iniciar.
