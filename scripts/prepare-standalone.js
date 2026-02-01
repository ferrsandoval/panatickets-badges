/**
 * Copia .next/static y public (y prisma) al standalone para subir a SiteGround.
 * Ejecutar después de: npm run build
 */
const fs = require("fs");
const path = require("path");

const standaloneDir = path.join(__dirname, "..", ".next", "standalone");
const nextDir = path.join(standaloneDir, ".next");

if (!fs.existsSync(standaloneDir)) {
  console.error("No existe .next/standalone. Ejecuta antes: npm run build");
  process.exit(1);
}

// .next/static -> .next/standalone/.next/static
const staticSrc = path.join(__dirname, "..", ".next", "static");
const staticDest = path.join(nextDir, "static");
if (fs.existsSync(staticSrc)) {
  copyRecursive(staticSrc, staticDest);
  console.log("Copiado .next/static -> standalone/.next/static");
}

// public -> .next/standalone/public
const publicSrc = path.join(__dirname, "..", "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
  copyRecursive(publicSrc, publicDest);
  console.log("Copiado public -> standalone/public");
}

// prisma (schema + dev.db si existe) -> .next/standalone/prisma
const prismaSrc = path.join(__dirname, "..", "prisma");
const prismaDest = path.join(standaloneDir, "prisma");
if (fs.existsSync(prismaSrc)) {
  if (!fs.existsSync(prismaDest)) fs.mkdirSync(prismaDest, { recursive: true });
  copyRecursive(prismaSrc, prismaDest);
  console.log("Copiado prisma -> standalone/prisma");
}

console.log("Listo. Sube el contenido de .next/standalone a SiteGround.");
console.log("En el servidor, arranca con: node server.js");

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}
