/**
 * Test del parser QR con el formato real del CodeREADr.
 * Ejecutar: npx tsx scripts/test-qr-parser.ts
 */

import {
  parseNameFromQrText,
  parseEmpresaFromQrText,
  parseEmailFromQrText,
  parseTelefonoFromQrText,
} from "../src/lib/qr-parser";

const QR_EJEMPLO =
  "Nombre='Lizbeth De La Cruz'|Empresa='Logistics & Customs Servcies, S.A.'|Email='ldelacruza@gmail.com'|Teléfono='(507) 6672-9038'|Celular='(507) 6672-9038'|No.Registro='061123146032'|Control=''";

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error("❌", msg);
    process.exit(1);
  }
  console.log("✅", msg);
}

console.log("--- Test QR Parser ---\n");
console.log("QR de prueba:", QR_EJEMPLO.slice(0, 80) + "...\n");

const name = parseNameFromQrText(QR_EJEMPLO);
const empresa = parseEmpresaFromQrText(QR_EJEMPLO);
const email = parseEmailFromQrText(QR_EJEMPLO);
const telefono = parseTelefonoFromQrText(QR_EJEMPLO);

assert(name === "Lizbeth De La Cruz", `Nombre: "${name}"`);
assert(empresa === "Logistics & Customs Servcies, S.A.", `Empresa: "${empresa}"`);
assert(email === "ldelacruza@gmail.com", `Email: "${email}"`);
assert(telefono === "(507) 6672-9038", `Teléfono: "${telefono}"`);

console.log("\n--- Todos los campos se extraen correctamente ---");
