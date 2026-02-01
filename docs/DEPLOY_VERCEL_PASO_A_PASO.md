# Subir la app a Vercel (gratis) — Paso a paso

Como tu plan de SiteGround no permite crear aplicaciones Node.js, puedes usar **Vercel** (gratis) y luego conectar tu dominio de SiteGround a Vercel. La app queda en Vercel y el dominio sigue siendo el tuyo.

---

## 1. Crear cuenta en Vercel

1. Entra en **https://vercel.com**.
2. Haz clic en **Sign Up** (Registrarse).
3. Regístrate con **GitHub**, **GitLab** o **Email** (con GitHub es más fácil para desplegar).

---

## 2. Subir el proyecto a GitHub (si no lo tienes)

1. Crea una cuenta en **https://github.com** si no tienes.
2. Crea un **repositorio nuevo** (New repository), por ejemplo `panatickets-badges`.
3. En tu PC, en la carpeta del proyecto, abre una terminal y ejecuta:

```bash
cd c:\EasyDevs\panatickets-badges
git init
git add .
git commit -m "Primer commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/panatickets-badges.git
git push -u origin main
```

(Sustituye `TU_USUARIO` por tu usuario de GitHub. Si te pide usuario/contraseña, en GitHub usa un **Personal Access Token** en lugar de la contraseña.)

**Si no quieres usar Git:** más abajo tienes la opción de subir con **Vercel CLI** sin GitHub.

---

## 3. Crear el proyecto en Vercel

1. En **https://vercel.com**, haz clic en **Add New** → **Project**.
2. Si conectaste GitHub, verás la lista de repos. Elige **panatickets-badges** (o **Import** si no aparece).
3. Si no usas GitHub: haz clic en **Import Third-Party Git Repository** o en **Deploy without Git** y sigue las instrucciones para subir con la CLI (ver sección 7).
4. En la pantalla de configuración del proyecto:
   - **Framework Preset:** Next.js (debería detectarlo solo).
   - **Root Directory:** deja en blanco.
   - **Build Command:** `npm run build` (por defecto).
   - No marques **Output Directory** (Next.js no usa eso).
5. **No hagas clic en Deploy todavía.** Primero añadimos la base de datos y las variables.

---

## 4. Crear la base de datos (Vercel Postgres)

1. En el mismo proyecto en Vercel, ve a la pestaña **Storage** (Almacenamiento).
2. Haz clic en **Create Database** (Crear base de datos).
3. Elige **Postgres** (Vercel Postgres).
4. Ponle nombre (ej. `panatickets-db`) y elige la región que prefieras.
5. Haz clic en **Create**.
6. Cuando se cree, haz clic en **Connect** (Conectar) para enlazarla a **este proyecto**.  
   Vercel añadirá automáticamente la variable **`DATABASE_URL`** al proyecto.

---

## 5. Añadir la variable del webhook

1. En el proyecto, ve a **Settings** → **Environment Variables** (Variables de entorno).
2. Añade una variable:
   - **Name:** `WEBHOOK_SECRET`
   - **Value:** `c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47`
   - **Environment:** marca **Production**, **Preview** y **Development**.
3. Guarda (**Save**).  
   (La variable **`DATABASE_URL`** ya debería estar si conectaste la base en el paso 4.)

---

## 6. Desplegar

1. Ve a la pestaña **Deployments** (Despliegues).
2. Si ya habías hecho un deploy antes de añadir la DB, haz clic en los **tres puntos** del último deploy → **Redeploy**.
3. Si es la primera vez, ve a **Code** o al inicio del proyecto y haz clic en **Deploy** (o haz un nuevo commit y push a GitHub para que se despliegue solo).
4. Espera a que termine (1–2 minutos). Cuando veas **Ready**, haz clic en **Visit** para abrir la URL de Vercel (ej. `panatickets-badges-xxx.vercel.app`).
5. **Crear tablas en la base de datos (solo la primera vez):** En tu PC, en la carpeta del proyecto, ejecuta `npx vercel env pull .env.local` (tras hacer `vercel link` si hace falta). Luego ejecuta `npx prisma db push`. Eso crea la tabla `print_jobs` en la base de Vercel. No hace falta volver a hacerlo.
6. Comprueba que la webapp carga y que el webhook responde (por ejemplo con un POST de prueba a `/api/webhook/codereadr?token=...`).

---

## 7. Conectar tu dominio de SiteGround

1. En Vercel, en tu proyecto, ve a **Settings** → **Domains** (Dominios).
2. En **Add**, escribe tu dominio, por ejemplo: **fernandodejesuss2.sg-host.com**.
3. Haz clic en **Add**. Vercel te mostrará un registro **CNAME** que debes configurar en SiteGround, algo como:
   - **Name / Host:** `fernandodejesuss2` (o lo que sea el subdominio) o `@` si es el dominio raíz.
   - **Value / Points to:** `cname.vercel-dns.com` (o la URL que te indique Vercel).
4. Entra en **SiteGround** → **Site Tools** → **Domain** → **DNS Zone** (o **DNS Management**).
5. Añade un registro **CNAME**:
   - **Name:** el subdominio (ej. `fernandodejesuss2` si tu dominio es `sg-host.com`) o lo que Vercel te indique.
   - **Points to / Target:** el valor que te dio Vercel (ej. `cname.vercel-dns.com`).
6. Guarda. Los DNS pueden tardar unos minutos (hasta 24 h, pero suele ser rápido).
7. En Vercel, cuando el dominio se verifique, tu app se abrirá en **https://fernandodejesuss2.sg-host.com**.

---

## 8. URL del webhook para CodeREADr

Cuando el dominio esté conectado, en CodeREADr usa esta **Postback URL**:

```
https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47
```

(Si usas otra URL de Vercel antes de conectar el dominio, sería algo como `https://panatickets-badges-xxx.vercel.app/api/webhook/codereadr?token=...`.)

---

## 9. Desarrollo local (opcional)

Para seguir usando la app en tu PC con la misma base:

1. Instala la CLI de Vercel: `npm i -g vercel`.
2. En la carpeta del proyecto: `vercel login` y luego `vercel link` (elige el proyecto).
3. Descarga las variables: `vercel env pull .env.local`.  
   Así tendrás `DATABASE_URL` y `WEBHOOK_SECRET` en `.env.local` para `npm run dev`.

**Importante:** La app usa **PostgreSQL** (no SQLite). En local necesitas una URL de Postgres:
- **Opción A:** En Vercel, después de conectar la base al proyecto, ejecuta `vercel env pull .env.local` en la carpeta del proyecto; así tendrás `DATABASE_URL` y `WEBHOOK_SECRET` en tu PC.
- **Opción B:** Crea una base gratis en **https://neon.tech** (Neon), copia la connection string y pégala en `.env.local` como `DATABASE_URL=postgresql://...`. Añade también `WEBHOOK_SECRET=...` (el mismo valor de arriba).

---

## Resumen

| Paso | Dónde | Qué hacer |
|------|--------|-----------|
| 1 | vercel.com | Crear cuenta |
| 2 | GitHub | Subir código (o usar Vercel CLI sin Git) |
| 3 | Vercel | Import project desde GitHub |
| 4 | Vercel → Storage | Crear Postgres, Connect al proyecto |
| 5 | Vercel → Settings → Env | Añadir WEBHOOK_SECRET |
| 6 | Vercel | Deploy / Redeploy |
| 7 | Vercel → Domains + SiteGround DNS | Añadir dominio y CNAME |
| 8 | CodeREADr | Postback URL con tu dominio y token |

Si en algún paso no ves las mismas opciones (por ejemplo “Storage” o “Domains”), busca en el menú del proyecto **Storage**, **Environment Variables** y **Domains**; los nombres pueden variar un poco según la interfaz.
