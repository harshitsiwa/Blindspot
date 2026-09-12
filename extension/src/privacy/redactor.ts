import { detectPII } from './pii-detector';

export interface RedactionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  reason: 'pii' | 'face' | 'credential' | 'financial';
}

export class DeterministicRedactor {
  private valueToPlaceholderMap: Map<string, string> = new Map();
  private placeholderToValueMap: Map<string, string> = new Map();
  private counters: Record<string, number> = {};

  public reset(): void {
    this.valueToPlaceholderMap.clear();
    this.placeholderToValueMap.clear();
    this.counters = {};
  }

  /**
   * Get or assign a deterministic placeholder for a raw sensitive value.
   * e.g., getPlaceholder('alice@example.com', 'EMAIL') => '[EMAIL_1]'
   */
  public getPlaceholder(rawValue: string, category: string = 'SECRET'): string {
    if (!rawValue) return '';

    const normalizedCategory = category.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const mapKey = `${normalizedCategory}:${rawValue}`;

    if (this.valueToPlaceholderMap.has(mapKey)) {
      return this.valueToPlaceholderMap.get(mapKey)!;
    }

    this.counters[normalizedCategory] = (this.counters[normalizedCategory] || 0) + 1;
    const count = this.counters[normalizedCategory];
    const placeholder = `[${normalizedCategory}_${count}]`;

    this.valueToPlaceholderMap.set(mapKey, placeholder);
    this.placeholderToValueMap.set(placeholder, rawValue);

    return placeholder;
  }

  /**
   * Redacts sensitive text, replacing all detected PII patterns deterministically.
   */
  public redactText(text: string): string {
    if (!text || typeof text !== 'string') return text;

    let redacted = text;
    const rawMatches = detectPII(text);
    const matches = this.filterOverlappingMatches(rawMatches);

    // Sort matches in reverse index order to replace without invalidating indices
    matches.sort((a, b) => b.index - a.index);

    for (const match of matches) {
      const category = this.mapPIITypeToCategory(match.type);
      const placeholder = this.getPlaceholder(match.text, category);
      redacted =
        redacted.substring(0, match.index) +
        placeholder +
        redacted.substring(match.index + match.text.length);
    }

    return redacted;
  }

  private filterOverlappingMatches(matches: import('./pii-detector').PIIMatch[]): import('./pii-detector').PIIMatch[] {
    if (matches.length <= 1) return matches;

    const sorted = [...matches].sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.text.length - a.text.length;
    });

    const filtered: import('./pii-detector').PIIMatch[] = [];
    let lastEnd = -1;

    for (const match of sorted) {
      const matchEnd = match.index + match.text.length;
      if (match.index >= lastEnd) {
        filtered.push(match);
        lastEnd = matchEnd;
      }
    }

    return filtered;
  }

  /**
   * Returns the private local value-to-placeholder map for Privacy Firewall verification.
   * STRICT WARNING: THIS MAP MUST NEVER LEAVE BROWSER MEMORY.
   */
  public getLocalValueMap(): Map<string, string> {
    const rawToPlaceholder = new Map<string, string>();
    for (const [key, placeholder] of this.valueToPlaceholderMap.entries()) {
      const rawValue = key.substring(key.indexOf(':') + 1);
      rawToPlaceholder.set(rawValue, placeholder);
    }
    return rawToPlaceholder;
  }

  private mapPIITypeToCategory(piiType: string): string {
    switch (piiType) {
      case 'email':
        return 'EMAIL';
      case 'phone':
        return 'PHONE';
      case 'password':
        return 'PASSWORD';
      case 'credit_card':
        return 'CARD';
      case 'ssn':
        return 'SSN';
      case 'pan':
        return 'PAN';
      case 'aadhaar':
        return 'AADHAAR';
      case 'jwt':
      case 'apiKey':
      case 'privateKey':
      case 'secret':
      default:
        return 'SECRET';
    }
  }
}

export const deterministicRedactor = new DeterministicRedactor();

export function redactCanvas(
  canvas: HTMLCanvasElement,
  regions: RedactionRegion[]
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#000000';
  for (const reg of regions) {
    ctx.fillRect(reg.x, reg.y, reg.width, reg.height);
  }

  return canvas;
}
