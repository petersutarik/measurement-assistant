export interface ParsedProjectUrl {
  href: string;
  hostname: string;
}

export function parseProjectUrl(
  url: string | null | undefined
): ParsedProjectUrl | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !parsed.hostname
    ) {
      return null;
    }

    return {
      href: parsed.toString(),
      hostname: parsed.hostname,
    };
  } catch {
    return null;
  }
}

export function getProjectFaviconUrl(hostname: string, size: number): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
}
