# Desplegar en SiteGround

Guía para subir la app (Next.js + Prisma + SQLite) a SiteGround usando Node.js.

---

## Requisitos en SiteGround

- Plan con **Node.js** (Setup Node.js App en cPanel).
- **SSH** activado (opcional pero recomendado para build en servidor).

---

## Opción A: Build en tu PC y subir (recomendado si no tienes Node en el servidor)

### 1. Build local (standalone)

En tu PC, en la raíz del proyecto:

```bash
npm install
npx prisma generate
npx prisma db push
npm run build:siteground
```

Eso hace `next build` y luego copia `.next/static`, `public` (si existe) y `prisma` dentro de `.next/standalone`. Todo lo que debes subir está en **`.next/standalone`**.

### 2. Subir a SiteGround

1. Entra en **File Manager** (o FTP) y ve al directorio de la aplicación Node (ej. `~/nodeapp/panatickets` o el que hayas elegido en Setup Node.js App).
2. Sube **todo el contenido** de la carpeta `.next/standalone` (no la carpeta `standalone`, sino lo que hay dentro: `server.js`, `.next/`, `node_modules/`, `prisma/`, `public/` si existe).
3. Asegúrate de que la carpeta `prisma` tenga permisos de escritura (la app creará ahí `dev.db`).

### 3. En SiteGround (cPanel)

1. **Setup Node.js App** → Crear aplicación.
2. **Application root:** la ruta donde subiste los archivos (ej. `panatickets`).
3. **Application URL:** tu dominio o subdominio (ej. `fernandodejesuss2.sg-host.com`).
4. **Application startup file:** `server.js` (Next standalone genera este archivo en la raíz).
5. **Variables de entorno:** añade:
   - `WEBHOOK_SECRET` = `c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47`
   - `DATABASE_URL` = `file:./prisma/dev.db` (la app corre desde la raíz donde está `server.js`; la DB se crea en `prisma/dev.db`).
   Si SiteGround pide PORT, suele ser `3000` o el que asigne el panel.
6. **Node version:** 18.x o 20.x.
7. Guardar y **Start** / **Restart** la app. No hace falta "Run NPM Install" si subiste el contenido de standalone (ya incluye node_modules mínimo).

### 4. Base de datos SQLite

La app escribe `prisma/dev.db` en la carpeta `prisma/`. Asegúrate de que la ruta de la aplicación en SiteGround tenga la carpeta `prisma` con permisos de escritura (chmod 755 o 775 para la carpeta). La primera petición al webhook creará la DB si no existe.

---

## Opción B: Build en el servidor (SSH)

Si tienes SSH y Node en el servidor:

1. Sube el código fuente (sin `node_modules`, sin `.next`) por Git o FTP.
2. Por SSH:
   ```bash
   cd ~/panatickets   # o tu ruta
   npm install
   npx prisma generate
   npx prisma db push
   npm run build
   ```
3. En **Setup Node.js App**, apunta la aplicación al mismo directorio.
4. **Application startup file:** `node_modules/next/dist/bin/next` con argumento `start`, o bien en package.json el script `start` es `next start`; cPanel suele ejecutar `npm start` si el startup file es el por defecto. Comprueba en la documentación de SiteGround si el startup debe ser `npm start` o `node node_modules/next/dist/bin/next start`.
5. Añade la variable de entorno `WEBHOOK_SECRET`.
6. Inicia / reinicia la aplicación.

---

## Variable de entorno en SiteGround

En **Setup Node.js App** → tu aplicación → **Environment variables** (o "Variables"):

| Name            | Value                                                                 |
|-----------------|-----------------------------------------------------------------------|
| WEBHOOK_SECRET  | c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47     |
| DATABASE_URL    | file:./prisma/dev.db                                                 |

---

## URLs una vez desplegado

- **Webapp:** https://fernandodejesuss2.sg-host.com/
- **Webhook CodeREADr:**  
  `https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47`

---

## Si SiteGround no tiene Node.js

Algunos planes compartidos no incluyen Node.js. En ese caso:

1. **Vercel/Netlify:** despliega ahí y apunta el dominio (fernandodejesuss2.sg-host.com) desde SiteGround con un CNAME, o
2. **SiteGround Cloud/VPS:** si tienes un plan superior con Node, usa la opción B.

---

## Nota sobre `output: "standalone"`

En `next.config.js` está `output: "standalone"`. Eso hace que `next build` genere en `.next/standalone` un árbol mínimo con el servidor y dependencias necesarias, sin todo `node_modules`. Es lo adecuado para subir solo lo imprescindible a SiteGround.
