type EchoPayload = {
  ok: true;
  message: string;
  receivedAt: string;
  bodyKeys: string[];
  bodySample: Record<string, string>;
};

const globalForEcho = globalThis as unknown as {
  lastCodereadrEcho?: EchoPayload | null;
};

export function setLastCodereadrEcho(payload: EchoPayload) {
  globalForEcho.lastCodereadrEcho = payload;
}

export function getLastCodereadrEcho(): EchoPayload | null {
  return globalForEcho.lastCodereadrEcho ?? null;
}

export type { EchoPayload };
