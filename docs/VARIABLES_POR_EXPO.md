# Una base de datos por expo — variables en Vercel

Cada expo tiene su propia base de datos. En **Vercel** crea **una variable por expo**.

## Cómo añadirlas en Vercel

**Vercel** → proyecto **panatickets-badges** → **Settings** → **Environment Variables** → **Add New**.

- **Name:** el de la columna "Name" de abajo (solo el nombre, sin comillas).
- **Value:** solo la URL de la columna "Value" (copia y pega tal cual, sin comillas).
- **Environments:** marca **Production** (y Preview si usas ramas).

Puedes usar **una variable por expo** con el nombre corto (tabla de abajo) o las que crea Vercel/Prisma Postgres con sufijo.

**Si ya tienes variables con sufijo** (por ejemplo `DATABASE_URL_EXPO_LOGISTICA_2026_DATABASE_URL`, `_POSTGRES_URL` o `_PRISMA_DATABASE_URL`): **no hace falta cambiar nada**. La app busca, por cada expo, en este orden y usa la primera que exista:
- `DATABASE_URL_EXPO_<EXPO>` (sin sufijo)
- `DATABASE_URL_EXPO_<EXPO>_DATABASE_URL`
- `DATABASE_URL_EXPO_<EXPO>_POSTGRES_URL`
- `DATABASE_URL_EXPO_<EXPO>_PRISMA_DATABASE_URL`

Con tus variables actuales (las que terminan en `_DATABASE_URL`, etc.) la app ya puede conectar. Si ves "Can't reach database server", revisa la sección de troubleshooting al final del documento.

---

## Tabla para copiar y pegar (solo si creas variables a mano)

> ⚠️ **Nunca escribas aquí URLs con usuario y contraseña reales.** Este repositorio es
> público: todo lo que se commitee queda en el historial de git de forma permanente.
> Los valores reales van solo en Vercel → Settings → Environment Variables.

Puedes apuntar las 10 variables a **una sola instancia Postgres** usando un schema por
expo (ver `docs/DEPLOY_VERCEL_SCHEMAS.md`), o a 10 bases separadas. El formato es el mismo:

| Name | Value |
|------|-------|
| `DATABASE_URL_EXPO_LOGISTICA_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_logistica_2026` |
| `DATABASE_URL_EXPO_TURISMO_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_turismo_2026` |
| `DATABASE_URL_EXPO_COMER_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_comer_2026` |
| `DATABASE_URL_EXPO_TECH_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_tech_2026` |
| `DATABASE_URL_EXPO_ELECTRONICA_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_electronica_2026` |
| `DATABASE_URL_EXPO_LOGISTICA_EXPOSITORES_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_logistica_expositores_2026` |
| `DATABASE_URL_EXPO_TURISMO_EXPOSITORES_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_turismo_expositores_2026` |
| `DATABASE_URL_EXPO_COMER_EXPOSITORES_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_comer_expositores_2026` |
| `DATABASE_URL_EXPO_TECH_EXPOSITORES_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_tech_expositores_2026` |
| `DATABASE_URL_EXPO_ELECTRONICA_EXPOSITORES_2026` | `postgres://USUARIO:CLAVE@HOST/BASE?sslmode=require&schema=expo_electronica_expositores_2026` |

En Vercel, al crear cada variable, en **Value** pega solo la URL, **sin** comillas.

### Variables con sufijo `_DATABASE_URL` (para .env local o referencia)

```
DATABASE_URL_EXPO_LOGISTICA_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_TURISMO_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_COMER_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_TECH_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_ELECTRONICA_2026_DATABASE_URL=postgres://...
# Expos EXPOSITORES (crear 5 bases nuevas en Prisma/Vercel):
DATABASE_URL_EXPO_LOGISTICA_EXPOSITORES_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_TURISMO_EXPOSITORES_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_COMER_EXPOSITORES_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_TECH_EXPOSITORES_2026_DATABASE_URL=postgres://...
DATABASE_URL_EXPO_ELECTRONICA_EXPOSITORES_2026_DATABASE_URL=postgres://...
```

---

## Qué hacer ahora (paso a paso)

1. **Variables en Vercel**  
   Asegúrate de tener las 10 variables (5 expos + 5 expos EXPOSITORES) en **Settings → Environment Variables**. Para las 5 bases EXPOSITORES, crea una base Postgres nueva en Prisma/Vercel por cada una. Luego haz **Redeploy** (Deployments → ⋯ → Redeploy).

2. **Crear tablas en cada base** (una sola vez por expo). Sustituye `TU_APP` y `TU_TOKEN` y abre cada URL en el navegador:
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_logistica_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_turismo_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_comer_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_tech_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_electronica_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_logistica_expositores_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_turismo_expositores_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_comer_expositores_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_tech_expositores_2026
   - https://**TU_APP**.vercel.app/api/setup-db?token=**TU_TOKEN**&project=expo_electronica_expositores_2026  
   Debes ver algo como: `{"ok":true,"message":"Tablas print_jobs y qr_country_lookup creadas/actualizadas..."}`

3. **Tabla scan_records (estadísticas BI)**  
   Formato CSV: Scan_ID, Fecha, Hora, Dia_Semana, Timestamp_Completo, EXPO, Tipo_Persona, Nombre, Empresa, Email, Telefono, Celular, Escaneo.  
   Crear tabla: `https://TU_APP.vercel.app/api/setup-scan-records?token=TU_TOKEN` (usa base expo_tech_2026).

4. **Cargar QR → país (lookup)**  
   Opción A: En la app, ve a **Ver bases de datos** → elige una expo → en "Subir CSV" introduce tu token y sube un CSV.  
   - **Expos normales:** columnas `qr_content,pais` (2 columnas).  
   - **Bases EXPOSITORES:** columnas `QR Content,País,Empresa` (3 columnas, en ese orden).  
   Opción B: Si tienes CSV en `data/qr-pais/` (EXPO_LOGISTICA.csv, EXPO_LOGISTICA_EXPOSITORES.csv, etc.), llama una vez a:  
   `https://TU_APP.vercel.app/api/admin/import-qr-pais-from-folder?token=TU_TOKEN`

5. **Webhook en CodeREADr**  
   Configura la URL del webhook con `project` y `point`, por ejemplo:  
   `https://TU_APP.vercel.app/api/webhook/codereadr?token=TU_TOKEN&project=expo_logistica_2026&point=punto1`

6. **Probar**  
   Entra en la app, abre **Ver bases de datos**, elige una expo y comprueba que ves estadísticas y, si subiste CSV, la tabla QR → país.

---

## Después de guardar las variables (referencia)

1. **Redeploy** en Vercel (Deployments → ⋯ del último → Redeploy) para que cargue las nuevas variables.
2. **Crear tablas en cada base** (una vez por expo). Abre en el navegador (con tu token):

   ```
   https://TU_APP.vercel.app/api/setup-db?token=TU_TOKEN&project=expo_logistica_2026
   https://TU_APP.vercel.app/api/setup-db?token=TU_TOKEN&project=expo_turismo_2026
   https://TU_APP.vercel.app/api/setup-db?token=TU_TOKEN&project=expo_comer_2026
   https://TU_APP.vercel.app/api/setup-db?token=TU_TOKEN&project=expo_tech_2026
   https://TU_APP.vercel.app/api/setup-db?token=TU_TOKEN&project=expo_electronica_2026
   ```

3. **Importar CSV desde carpeta** (si tienes los CSV en `data/qr-pais/` y ya hiciste push):

   ```
   https://TU_APP.vercel.app/api/admin/import-qr-pais-from-folder?token=TU_TOKEN
   ```

   Cada archivo se importa en la base de su expo. **Formato CSV:**  
   - Expos normales: cabecera `qr_content,pais` (2 columnas).  
   - Bases EXPOSITORES: cabecera `QR Content,País,Empresa` (3 columnas, en ese orden).  
   - `EXPO_LOGISTICA.csv` → base de expo_logistica_2026  
   - `EXPO_TURISMO.csv` → base de expo_turismo_2026  
   - `EXPO_COMER.csv` → base de expo_comer_2026  
   - `EXPO_TECH.csv` → base de expo_tech_2026  
   - `EXPO_ELECTRONICA.csv` → base de expo_electronica_2026  
   - `EXPO_LOGISTICA_EXPOSITORES.csv` → base de expo_logistica_expositores_2026  
   - `EXPO_TURISMO_EXPOSITORES.csv` → base de expo_turismo_expositores_2026  
   - `EXPO_COMER_EXPOSITORES.csv` → base de expo_comer_expositores_2026  
   - `EXPO_TECH_EXPOSITORES.csv` → base de expo_tech_expositores_2026  
   - `EXPO_ELECTRONICA_EXPOSITORES.csv` → base de expo_electronica_expositores_2026

---

## Webhook en CodeREADr

La URL del webhook debe llevar **siempre** `project` (y `point`). Ejemplo:

```
https://TU_APP.vercel.app/api/webhook/codereadr?token=TU_TOKEN&project=expo_logistica_2026&point=punto1
```

Cambia `project` según la expo a la que corresponda ese escáner.

---

## Si ves "Can't reach database server at db.prisma.io:5432"

Ese mensaje significa que la app no puede conectar con el servidor de base de datos. Revisa:

### Si usas Prisma Postgres (db.prisma.io) en Vercel

1. **Usa la URL con connection pooling**  
   En Vercel/Prisma suelen darte dos URLs:
   - **Direct** (puerto 5432): para migraciones; en serverless puede fallar o saturarse.
   - **Pooled / Prisma** (a veces otro puerto o `?pgbouncer=true`): para producción en Vercel.  
   En el panel de la base (Vercel → Storage → tu base → Variables, o Prisma Data Platform) copia la URL que diga **“Pooled”**, **“Prisma”** o **“Transaction”** y úsala en `DATABASE_URL_EXPO_...`. No uses solo la URL “Direct” en producción en Vercel.

2. **Reinicia la base de datos**  
   En el panel (Vercel Storage → tu base → Open in Prisma, o Prisma Console): Settings → **Restart** o **Resume** si está pausada. Las bases en plan gratuito a veces se pausan por inactividad.

3. **Timeout en la URL**  
   Prueba añadir al final de la URL (si no hay ya parámetros):  
   `?connect_timeout=15`  
   o, si ya hay `?sslmode=require`:  
   `?sslmode=require&connect_timeout=15`

4. **Redeploy**  
   Después de cambiar cualquier variable en Vercel, haz **Redeploy** del proyecto.

### Comprobaciones generales

- **Que la base esté activa** y no pausada o eliminada.
- **Que la URL sea la correcta** (la que muestra el panel de la base).
- **Red/firewall**: desde Vercel debe poder salir al puerto de la base (5432 o el que use el pooler).
