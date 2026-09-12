import { detectPIIWithContext } from '../privacy/pii-detector';
import { PrivacyDetection } from '../shared/types';
import { extractVisibleTextNodes } from './text-extractor';

export interface DynamicMutationRecord {
  timestamp: number;
  type: 'childList' | 'characterData' | 'attributes';
  targetId?: string;
  detections: PrivacyDetection[];
}

export class DynamicDOMObserver {
  private observer: MutationObserver | null = null;
  private isObserving = false;
  private pendingMutations: MutationRecord[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs = 50;
  private detectedMutations: DynamicMutationRecord[] = [];
  private activeDetectionsMap: Map<string, PrivacyDetection[]> = new Map();

  /**
   * Starts observing target node (defaults to document.body).
   * Manages its own local lifecycle independent of captureSanitizedContext().
   */
  public start(root: Node = document.body || document): void {
    if (this.isObserving || typeof MutationObserver === 'undefined') return;

    const targetNode = root || document.body || document;
    if (!targetNode) return;

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'placeholder', 'aria-label', 'title'],
    });

    this.isObserving = true;
  }

  /**
   * Stops observing DOM mutations.
   */
  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isObserving = false;
  }

  /**
   * Returns current active status.
   */
  public isActive(): boolean {
    return this.isObserving;
  }

  /**
   * Clears tracked local dynamic privacy state.
   */
  public reset(): void {
    this.pendingMutations = [];
    this.detectedMutations = [];
    this.activeDetectionsMap.clear();
  }

  /**
   * Returns the latest validated local dynamic privacy state.
   */
  public getLatestPrivacyState(): {
    detectedCount: number;
    mutationRecords: DynamicMutationRecord[];
    allDetections: PrivacyDetection[];
  } {
    const allDetections: PrivacyDetection[] = [];
    for (const detections of this.activeDetectionsMap.values()) {
      allDetections.push(...detections);
    }

    return {
      detectedCount: allDetections.length,
      mutationRecords: [...this.detectedMutations],
      allDetections,
    };
  }

  private handleMutations(mutations: MutationRecord[]): void {
    this.pendingMutations.push(...mutations);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingMutations();
    }, this.debounceMs);
  }

  public processPendingMutations(): void {
    if (this.observer) {
      const queuedRecords = this.observer.takeRecords();
      if (queuedRecords.length > 0) {
        this.pendingMutations.push(...queuedRecords);
      }
    }

    const recordsToProcess = [...this.pendingMutations];
    this.pendingMutations = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    for (const record of recordsToProcess) {
      const targetEl = record.target instanceof HTMLElement ? record.target : record.target.parentElement;
      if (!targetEl) continue;

      // Ignore scripts/styles/internal elements
      const tagName = targetEl.tagName?.toLowerCase();
      if (tagName === 'script' || tagName === 'style' || tagName === 'svg') continue;

      const targetId = targetEl.id || undefined;
      let textContent = '';

      if (record.type === 'characterData') {
        textContent = record.target.nodeValue || '';
      } else if (record.type === 'childList') {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
            textContent += ' ' + (node.value || node.getAttribute('value') || '');
          } else if (node instanceof HTMLElement) {
            const visibleNodes = extractVisibleTextNodes(node);
            visibleNodes.forEach((vn) => {
              textContent += ' ' + vn.text;
            });
          } else if (node.nodeType === Node.TEXT_NODE) {
            textContent += ' ' + (node.nodeValue || '');
          }
        });
      } else if (record.type === 'attributes') {
        const attrName = record.attributeName;
        if (attrName && targetEl.hasAttribute(attrName)) {
          textContent = targetEl.getAttribute(attrName) || '';
          if (targetEl instanceof HTMLInputElement) {
            textContent += ' ' + targetEl.value;
          }
        }
      }

      if (textContent.trim().length > 0) {
        const detections = detectPIIWithContext(textContent, {
          source: 'dom',
          elementId: targetId,
          surroundingText: targetEl.innerText || targetEl.textContent || '',
        });

        if (detections.length > 0) {
          const key = targetId || `${record.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          this.activeDetectionsMap.set(key, detections);

          this.detectedMutations.push({
            timestamp: Date.now(),
            type: record.type,
            targetId,
            detections,
          });
        }
      }
    }
  }
}

export const dynamicDOMObserver = new DynamicDOMObserver();
