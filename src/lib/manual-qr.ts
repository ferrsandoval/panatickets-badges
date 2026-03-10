export type ManualEntryInput = {
  name: string;
  empresa?: string | null;
};

function normalizeManualValue(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/['"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildManualQrContent(input: ManualEntryInput): string {
  const name = normalizeManualValue(input.name);
  const empresa = normalizeManualValue(input.empresa);

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
