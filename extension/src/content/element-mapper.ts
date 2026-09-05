/**
 * ElementMapper manages local stable element identifiers (e.g., "e1", "e2", "e3")
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
    this.counter = 1;
  }

  public register(element: Element): string {
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
