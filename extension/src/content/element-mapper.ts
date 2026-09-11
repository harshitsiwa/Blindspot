/**
 * ElementMapper manages local stable element identifiers (e.g., "el_001", "el_002", "e1", "e2")
 * mapped to actual DOM elements in the content script.
 * 
 * Crucially, this mapping stays strictly within browser memory and is NEVER transmitted
 * to the remote server beyond the anonymous element ID.
 */
class ElementMapper {
  private idToElementMap: Map<string, Element> = new Map();
  private elementToIdMap: WeakMap<Element, string> = new WeakMap();
  private counter = 1;

  public reset(): void {
    this.idToElementMap.clear();
    this.elementToIdMap = new WeakMap();
    this.counter = 1;
  }

  public clear(): void {
    this.reset();
  }

  public register(element: Element, customId?: string): string {
    if (customId) {
      this.idToElementMap.set(customId, element);
      this.elementToIdMap.set(element, customId);
      return customId;
    }

    if (this.elementToIdMap.has(element)) {
      return this.elementToIdMap.get(element)!;
    }

    const id = `e${this.counter++}`;
    this.idToElementMap.set(id, element);
    this.elementToIdMap.set(element, id);
    return id;
  }

  public getElement(id: string): Element | undefined {
    return this.idToElementMap.get(id);
  }

  public getId(element: Element): string | undefined {
    return this.elementToIdMap.get(element);
  }
}

export const elementMapper = new ElementMapper();
