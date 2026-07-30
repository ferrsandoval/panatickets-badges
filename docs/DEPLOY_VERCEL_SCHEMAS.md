# Montar la app en Vercel desde cero (una base Postgres, 10 schemas)

Las 10 expos comparten **una instancia Postgres**, cada una en su propio **schema**.
`getPrismaForProject()` resuelve una URL por expo; si una expo no tiene variable propia,
cae a `DATABASE_URL` añadiendo `?schema=<expo>`. Por eso basta con **dos** variables de
entorno en lugar de once.

---

## FASE 0 — Antes de tocar Vercel

### 0.1 Exportar lo que no se puede regenerar

Los CSV de **expositores no están en el repo** (`data/qr-pais/` solo tiene los 5 de
invitados). Antes de borrar las bases viejas, exporta de cada una de las 5 bases de
expositores:

```sql
SELECT qr_content, pais, empresa FROM qr_country_lookup;
```

Los `print_jobs` son histórico de escaneos; decide si te interesan.

### 0.2 Revocar credenciales filtradas

Las connection strings de las 5 bases antiguas estuvieron publicadas en el repositorio
público y **siguen en el historial de git de forma permanente**. Rotar la contraseña no
protege los datos que alguien ya haya podido copiar: una vez exportado lo necesario,
**borra esas bases** en Prisma Console.

### 0.3 Apagar el despliegue antiguo

El proyecto Vercel anterior sigue vivo con el token público. Cualquiera puede llamar a
`/api/admin/clear-qr-lookup` y vaciarle la tabla de países. Elimínalo (o bórrale las
variables de entorno) en cuanto el nuevo esté funcionando.

### 0.4 Repositorio a privado

GitHub → Settings → General → Danger Zone → Change visibility. No borra el historial
público, pero corta lectores nuevos.

### 0.5 Token nuevo

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Se pega solo en Vercel y en CodeREADr. Nunca en un archivo del repo.

---

## FASE 1 — Base de datos

Crea **una sola instancia** Postgres nueva (Prisma Postgres, Neon o Supabase). Que sea
nueva: no reutilices una con credenciales filtradas.

- Elige región **us-east** — cerca de Panamá y de las funciones de Vercel.
- Usa la connection string **pooled** si el proveedor la ofrece. Vercel es serverless y
  abre muchas conexiones cortas.

No hace falta crear los schemas a mano: `/api/setup-db` los crea (FASE 3).

---

## FASE 2 — Proyecto en Vercel

1. **Add New** → **Project** → importar el repositorio de GitHub.
2. **Framework Preset:** Next.js (lo detecta solo). **Root Directory:** en blanco.
   **Build Command:** el de por defecto (`npm run build`, que incluye `prisma generate`).
3. **Antes del primer deploy**, añade las variables de entorno (Production):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | la connection string de la FASE 1 |
   | `WEBHOOK_SECRET` | el token de 0.5 |

   Opcional: `SCAN_STATS_PROJECT` (por defecto `expo_tech_2026`) decide en qué schema
   viven las `scan_records` del dashboard BI.

   > **No crees las variables `DATABASE_URL_EXPO_*`.** El fallback las hace innecesarias,
   > y si alguna queda definida **gana sobre `DATABASE_URL`**: la app conectaría a esa
   > base sin ningún aviso. Esto incluye las variantes con sufijo `_DATABASE_URL`,
   > `_POSTGRES_URL` y `_PRISMA_DATABASE_URL`.

4. Deploy.
5. **Settings** → **Functions** → región **Washington D.C. (iad1)**, para que las
   funciones queden junto a la base.

Nota: `next.config.js` fija `output: "standalone"`, que se añadió para el hosting propio
y en Vercel no hace falta. Si el build da problemas raros, es lo primero que quitaría.

> Cada vez que cambies una variable de entorno hay que hacer **Redeploy**: Vercel no las
> recarga en los despliegues ya construidos.

---

## FASE 3 — Tablas y datos

### 3.1 Crear tablas en los 10 schemas

Una llamada por expo. Es idempotente, se puede repetir.

**Empieza por una sola** y comprueba la respuesta antes de lanzar las diez:

```
https://TU_APP.vercel.app/api/setup-db?token=TU_TOKEN&project=expo_logistica_2026
```

```json
{ "ok": true, "project": "expo_logistica_2026", "schema": "expo_logistica_2026" }
```

Si `schema` sale como `public (por defecto)`, el `?schema=` no se está aplicando y las 10
expos compartirían las mismas tablas. Para ahí y revisa `DATABASE_URL`.

Luego repite con: `expo_turismo_2026`, `expo_comer_2026`, `expo_tech_2026`,
`expo_electronica_2026`, `expo_logistica_expositores_2026`,
`expo_turismo_expositores_2026`, `expo_comer_expositores_2026`,
`expo_tech_expositores_2026`, `expo_electronica_expositores_2026`.

### 3.2 Crear scan_records — UNA SOLA VEZ

```
https://TU_APP.vercel.app/api/setup-scan-records?token=TU_TOKEN
```

> ⚠️ Este endpoint hace `DROP TABLE IF EXISTS "scan_records" CASCADE` antes de crearla.
> Llamarlo otra vez **borra todos los datos del dashboard BI**. Se usa al montar y nunca más.

### 3.3 Cargar la tabla QR → país

Invitados (5 expos), de una tacada desde los CSV del repo:

```
https://TU_APP.vercel.app/api/admin/import-qr-pais-from-folder?token=TU_TOKEN
```

Expositores (5 expos): subir a mano desde `/databases`, seleccionando cada expo, los CSV
que exportaste en 0.1. Formato de 3 columnas: QR Content, País, Empresa.

### 3.4 Estadísticas BI (opcional)

Si usas el dashboard, carga el CSV de estadísticas desde `/estadisticas`.

---

## FASE 4 — CodeREADr

Actualiza la Postback URL de cada punto con el dominio y el token nuevos:

```
https://TU_APP.vercel.app/api/webhook/codereadr?project=expo_logistica_2026&token=TU_TOKEN
```

El punto de impresión sale del `User ID` del dispositivo, mapeado en
`src/app/api/webhook/codereadr/route.ts`. Un escáner que no esté en esa lista recibe
**403**, y añadirlo exige tocar código y redesplegar — mal momento en plena feria.

---

## FASE 5 — Verificación

1. `/databases` → cada una de las 10 expos carga sin error y con su contador de QR → país.
2. Escanear un QR real (o el `curl` de `docs/DEPLOY_PRUEBAS.md`).
3. Aparece en la cola de `/?point=punto1`.
4. La etiqueta sale **con país**. Si sale vacío, el lookup no encontró ese QR en el
   schema de esa expo.
5. Apagar el despliegue antiguo (0.3).

---

## Lo que este montaje NO arregla

Bugs conocidos, pendientes de corregir:

- **Una base caída tumba la cola entera** (`src/app/page.tsx` e `informe-impresos/page.tsx`
  usan `Promise.all`). Con una sola instancia el riesgo baja: o fallan todas o ninguna.
- **Se marca "impreso" a los 1200 ms** sin confirmar que la etiqueta salió. Si el fetch
  tarda, se destruye el iframe antes de imprimir y el job queda marcado igualmente.
- **Reescanear el mismo QR devuelve 500** en vez de tratarlo como duplicado.

El plan gratuito de Vercel es de uso no comercial según sus ToS.
