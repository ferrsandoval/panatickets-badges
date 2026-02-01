# Despliegue en entorno de pruebas

**Dominio:** https://fernandodejesuss2.sg-host.com/

Token generado (único para este entorno): `c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47`

---

## 1. Copiar y pegar en CodeREADr

**Postback URL** (pégala tal cual en CodeREADr):

```
https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47
```

---

## 2. Variable de entorno en el servidor

En el panel del hosting (cPanel, variables de entorno, etc.) define **exactamente**:

```
WEBHOOK_SECRET=c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47
```

---

## 3. URLs de la app

| Uso | URL |
|-----|-----|
| Cola de impresión (webapp) | https://fernandodejesuss2.sg-host.com/ |
| Webhook (ya con token) | https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47 |
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
curl -X POST "https://fernandodejesuss2.sg-host.com/api/webhook/codereadr?token=c9f909336cd195eedaeb4c336ac6110ca43e1a0c8703cd6e57de9a71f8a72a47" -H "Content-Type: application/x-www-form-urlencoded" -d "scan_id=prueba-001&barcode_data=Name: Itzel Ortega%0ACompany: Test"
```

Respuesta esperada: `201` y `{"ok":true,"id":"..."}`.
