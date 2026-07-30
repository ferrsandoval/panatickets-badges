# Despliegue en entorno de pruebas

**Dominio:** https://fernandodejesuss2.sg-host.com/

Token generado (único para este entorno): `TU_WEBHOOK_SECRET`

---

## 1. Copiar y pegar en CodeREADr

**Postback URL** (pégala tal cual en CodeREADr):

```
https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=TU_WEBHOOK_SECRET
```

---

## 2. Variable de entorno en el servidor

En el panel del hosting (cPanel, variables de entorno, etc.) define **exactamente**:

```
WEBHOOK_SECRET=TU_WEBHOOK_SECRET
```

---

## 3. URLs de la app

| Uso | URL |
|-----|-----|
| Cola de impresión (webapp) | https://fernandodejesuss2.sg-host.com/ |
| Webhook (ya con token) | https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=TU_WEBHOOK_SECRET |
| Etiqueta | https://fernandodejesuss2.sg-host.com/label/ID_DEL_JOB |

---

## 4. Build en el servidor

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm start
```

La app usa SQLite (`prisma/dev.db`). El directorio `prisma/` debe ser escribible por Node.

---

## 5. Probar el webhook (curl)

```bash
curl -X POST "https://TU_APP.vercel.app/api/webhook/codereadr?project=expo_logistica_2026&point=punto1&token=TU_WEBHOOK_SECRET" -H "Content-Type: application/x-www-form-urlencoded" -d "scan_id=prueba-001&barcode_data=Name: Itzel Ortega%0ACompany: Test"
```

Respuesta esperada: `201` y `{"ok":true,"id":"..."}`.
