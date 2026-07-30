export type ManualEntryInput = {
  name: string;
  empresa?: string | null;
};

export type ManualQrFormat = "invitados" | "expositores";

function normalizeManualValue(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/['"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildManualQrContent(
  input: ManualEntryInput,
  format: ManualQrFormat = "invitados"
): string {
  const name = normalizeManualValue(input.name);
  const empresa = normalizeManualValue(input.empresa);

  if (format === "expositores") {
    return [
      `Empresa='${empresa}'`,
      `Nombre='${name}'`,
      `Teléfono=''`,
      `Email=''`,
      `Celular=''`,
      `No.Registro=''`,
      `Control=''`,
    ].join("|");
  }

  return [
    `Nombre="${name}"`,
    `Empresa="${empresa}"`,
    `Email=""`,
    `Teléfono=""`,
    `Celular=""`,
    `No.Registro=""`,
    `Control=""`,
  ].join("|");
}
