# País desde CSV — Paso a paso (para dummies)

## Qué hace esto

Tú subes una lista (CSV) que dice: “este QR completo = este país”.  
Cuando alguien escanee ese mismo QR, en la etiqueta saldrá ese país.

---

## Paso 1: Crear la tabla (solo una vez)

1. Abre el navegador.
2. Pega esta URL (cambia `TU_DOMINIO` por tu app, ej. `panatickets-badges-4fkq.vercel.app`, y `TU_TOKEN` por tu token del webhook):

   ```
   https://TU_DOMINIO/api/setup-db?token=TU_TOKEN
   ```

3. Pulsa Enter.
4. Tienes que ver algo como: `{"ok":true,"message":"Tabla print_jobs y qr_country_lookup..."}`.  
   Si lo ves, listo. No hace falta repetir este paso.

---

## Paso 2: Hacer tu archivo CSV

1. Abre **Excel** o **Google Sheets**.
2. En la **primera fila** escribe exactamente (sin comillas en la cabecera):
   - celda A1: `qr_content`
   - celda B1: `pais`
3. Desde la **segunda fila**:
   - En A2 (y siguientes): pega el **texto completo** de un QR (tal como lo manda CodeREADr), por ejemplo:
     ```
     Nombre='MARIA LOPEZ'|Empresa='ABC'|Email='maria@abc.com'|Teléfono=''|Celular='123'|No.Registro=''|Control=''
     ```
   - En B2 (y siguientes): el **país** que quieres que salga, ej. `PANAMA` o `COLOMBIA`.
4. Guarda el archivo como **CSV**:
   - Excel: “Guardar como” → tipo “CSV (delimitado por comas)”.
   - Google Sheets: “Descargar” → “Valores separados por comas (.csv)”.

---

## Paso 3: Subir el CSV a la app

1. Abre **PowerShell** (o la terminal) en tu PC.
2. Ve a la carpeta donde guardaste el CSV, por ejemplo:
   ```powershell
   cd C:\Users\TuUsuario\Desktop
   ```
3. Ejecuta (sustituye `TU_DOMINIO` y `TU_TOKEN` por los tuyos):

   ```powershell
   curl.exe -X POST "https://TU_DOMINIO/api/admin/upload-qr-pais-csv?token=TU_TOKEN" -F "file=@nombre_de_tu_archivo.csv"
   ```

   Ejemplo si tu archivo se llama `paises.csv`:

   ```powershell
   curl.exe -X POST "https://panatickets-badges-4fkq.vercel.app/api/admin/upload-qr-pais-csv?token=TU_WEBHOOK_SECRET" -F "file=@paises.csv"
   ```

4. Si todo va bien verás algo como: `{"ok":true,"message":"CSV importado...","total":10}`.

---

## Paso 4: Probar

1. Escanea con CodeREADr un QR que esté **exactamente** como en tu CSV (mismo texto, mismo orden, mismos espacios).
2. En la cola de impresión debería aparecer el job.
3. Al imprimir la etiqueta, debe salir el **país** que pusiste en el CSV para ese QR.

---

## Resumen en 4 pasos

| Paso | Qué haces |
|------|-----------|
| 1 | Abres en el navegador la URL de setup-db con tu token (una sola vez). |
| 2 | Haces un CSV con columnas `qr_content` y `pais` y guardas como .csv. |
| 3 | En PowerShell haces `curl.exe -X POST "https://TU_DOMINIO/api/admin/upload-qr-pais-csv?token=TU_TOKEN" -F "file=@tu_archivo.csv"`. |
| 4 | Escaneas un QR que esté en el CSV y compruebas que en la etiqueta sale el país. |

---

## Si algo falla

- **“Unauthorized”:** el token de la URL no es correcto; usa el mismo que en CodeREADr.
- **“No se encontraron filas válidas”:** revisa que la primera fila sea `qr_content,pais` y que haya al menos una fila de datos debajo.
- **El país no sale en la etiqueta:** el texto del QR tiene que ser **idéntico** al del CSV (sin espacios de más, sin cambiar comillas ni orden). Si falta un carácter, no hace match.
