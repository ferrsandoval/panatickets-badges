# Lookup QR completo → país (tabla auxiliar)

Se usa una **tabla auxiliar central** para asignar país a un job cuando el texto del QR coincide exactamente con una fila cargada desde un CSV.

## Tabla

- **Nombre:** `qr_country_lookup`
- **Base de datos:** la **por defecto** (`DATABASE_URL`), no la de cada expo.
- **Columnas:** `id`, `qr_content` (único), `pais`, `created_at`.

## Flujo

1. Al recibir un escaneo en el webhook, se toma el **texto completo del QR** (tal como lo envía CodeREADr).
2. Se busca en `qr_country_lookup` una fila con `qr_content` igual a ese texto (tras recortar espacios).
3. Si hay coincidencia, se usa ese `pais` al crear el `print_job` (y en la etiqueta).
4. Si no hay coincidencia, se usa el país que venga en el QR (parser) o se deja vacío.

**Importante:** el match es **exacto**. Si cambia un espacio, acento, orden o comilla, no habrá match.

## Cargar datos desde CSV

**Formato del CSV:**

```csv
qr_content,pais
"Nombre='ABDIEL CHANG'|Empresa=''|Email='achang@petrodelta.com'|Teléfono=''|Celular='+507 6618-8952'|No.Registro=''|Control=''",PANAMA
"Nombre='MARIA LOPEZ'|Empresa='ABC'|Email='maria@abc.com'|...",COLOMBIA
```

- Primera fila: cabecera con `qr_content` y `pais`.
- Resto: texto completo del QR (entre comillas si lleva comas) y país.

**Subir el CSV:**

1. **Por URL (body en texto):**
   ```bash
   curl -X POST "https://TU_DOMINIO/api/admin/upload-qr-pais-csv?token=TU_WEBHOOK_SECRET" \
     -H "Content-Type: text/csv" \
     --data-binary @mi_archivo.csv
   ```

2. **Por formulario (archivo):**
   ```bash
   curl -X POST "https://TU_DOMINIO/api/admin/upload-qr-pais-csv?token=TU_WEBHOOK_SECRET" \
     -F "file=@mi_archivo.csv"
   ```

Si un `qr_content` ya existe, se **actualiza** el `pais` (upsert).

## Crear la tabla

La tabla se crea al llamar **una vez** a setup-db (misma URL que para `print_jobs`):

```
GET https://TU_DOMINIO/api/setup-db?token=TU_WEBHOOK_SECRET
```

Eso crea o actualiza `print_jobs` y además **crea** `qr_country_lookup` en la base por defecto.
