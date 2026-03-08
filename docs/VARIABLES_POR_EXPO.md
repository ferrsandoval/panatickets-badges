# Una base de datos por expo — variables en Vercel

Cada expo tiene su propia base de datos. En **Vercel** crea **una variable por expo**.

## Cómo añadirlas en Vercel

**Vercel** → proyecto **panatickets-badges** → **Settings** → **Environment Variables** → **Add New**.

- **Name:** el de la columna "Name" de abajo (solo el nombre, sin comillas).
- **Value:** solo la URL de la columna "Value" (copia y pega tal cual, sin comillas).
- **Environments:** marca **Production** (y Preview si usas ramas).

Solo necesitas **una variable por expo**; no crees las que llevan `_DATABASE_URL`, `_POSTGRES_URL` ni `_PRISMA_DATABASE_URL` al final.

---

## Tabla para copiar y pegar

| Name | Value |
|------|-------|
| `DATABASE_URL_EXPO_LOGISTICA_2026` | `postgres://6c15115cf5b990aa76f9efe2746b61c8a05c07a62b1eb2cad2f8971f1fd10d3c:sk_4of8NBp6RYLVV2QDWe3xe@db.prisma.io:5432/postgres?sslmode=require` |
| `DATABASE_URL_EXPO_TURISMO_2026` | `postgres://d6a96757bb43fcc4bc53f0b7e97b2700f8aff6f3f867a452ec393afa90eae09a:sk_LomFLoQx1CeU_ADqEci5P@db.prisma.io:5432/postgres?sslmode=require` |
| `DATABASE_URL_EXPO_COMER_2026` | `postgres://f7781e2cb2287b79320777622a5c736663cdd6aa14ad7de27b4ec0d2f38c248e:sk_wZeIc_Uu0WfsJ5TqfC_4S@db.prisma.io:5432/postgres?sslmode=require` |
| `DATABASE_URL_EXPO_TECH_2026` | `postgres://1c40a8bf13740b731310632fc3cd5d5fa21813b2d9aa168d675424e63f66ab7a:sk_vWszETqpQv4tYgM7OlgDf@db.prisma.io:5432/postgres?sslmode=require` |
| `DATABASE_URL_EXPO_ELECTRONICA_2026` | `postgres://4ab617ad0627b263e76919a51a0d2a722c1dd4277f55b9d4ca30078631673006:sk_-oVc8jucleBsSqfAYhIc4@db.prisma.io:5432/postgres?sslmode=require` |

En Vercel, al crear cada variable, en **Value** pega solo la URL (la parte que está entre comillas en la tabla), **sin** las comillas.

---

## Después de guardar las variables

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

   Cada archivo se importa en la base de su expo:
   - `EXPO_LOGISTICA.csv` → base de expo_logistica_2026  
   - `EXPO_TURISMO.csv` → base de expo_turismo_2026  
   - etc.

---

## Webhook en CodeREADr

La URL del webhook debe llevar **siempre** `project` (y `point`). Ejemplo:

```
https://TU_APP.vercel.app/api/webhook/codereadr?token=TU_TOKEN&project=expo_logistica_2026&point=punto1
```

Cambia `project` según la expo a la que corresponda ese escáner.
