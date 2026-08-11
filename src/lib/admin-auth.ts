/**
 * Contraseña fija para las acciones de administración de /configuraciones
 * (guardar settings, subir CSV, borrar datos, editar puntos de impresión).
 * Reemplaza el uso de WEBHOOK_SECRET en esas rutas: el staff del evento no
 * necesita conocer ninguna variable de entorno, solo esta contraseña.
 */
export const CONFIG_ADMIN_PASSWORD = "admin123";

export function isValidConfigAdminToken(token: string | null | undefined): boolean {
  return token === CONFIG_ADMIN_PASSWORD;
}
