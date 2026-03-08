# Carpeta para CSV QR → país

Pon aquí tus archivos **.csv** con dos columnas:

- **qr_content:** texto completo del QR (igual al que envía CodeREADr)
- **pais:** país a mostrar en la etiqueta (ej. PANAMA, COLOMBIA)

Ejemplo de contenido del CSV:

```csv
qr_content,pais
"Nombre='MARIA LOPEZ'|Empresa='ABC'|Email='maria@abc.com'|...",PANAMA
```

**Pasos:**

1. Añade uno o más archivos `.csv` en esta carpeta (`data/qr-pais/`).
2. Sube los cambios a GitHub (push). Vercel redesplegará.
3. Cuando el deploy termine, abre en el navegador (una vez):
   ```
   https://TU_APP.vercel.app/api/admin/import-qr-pais-from-folder?token=TU_TOKEN
   ```
4. Esa URL lee todos los CSV de esta carpeta e importa los datos a la base. No hace falta usar curl ni Postman.
