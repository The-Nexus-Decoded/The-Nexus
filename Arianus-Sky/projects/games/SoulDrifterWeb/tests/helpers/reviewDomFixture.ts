// Shared DOM contract host. No layout, WebGL or native-browser QA is implied.
export class DomNode {
  parentElement: DomNode | null = null; children: DomNode[] = []; dataset: Record<string, string> = {};
  attributes: Record<string, string> = {}; className = ""; textContent = ""; id = ""; value = ""; type = "";
  hidden = false; disabled = false; checked = false; min = ""; max = ""; step = ""; htmlFor = "";
  listeners = new Map<string, Array<(event: Event) => void>>();
  classList = { add: (...names: string[]) => { this.className += " " + names.join(" "); },
    toggle: (_name: string, _enabled: boolean) => {} };
  constructor(readonly tagName: string) {}
  append(...nodes: DomNode[]) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes: DomNode[]) { this.children.forEach((node) => { node.parentElement = null; }); this.children = []; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((node) => node !== this); this.parentElement = null; }
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
  contains(node: DomNode): boolean { return node === this || this.children.some((child) => child.contains(node)); }
  closest(selector: string): DomNode | null {
    if ((selector === "label" && this.tagName === "LABEL") || (selector === "[data-command]" && this.dataset.command)) return this;
    return this.parentElement?.closest(selector) ?? null;
  }
  querySelector(selector: string): DomNode | null { return this.find((node) => node.tagName === selector.toUpperCase()); }
  find(predicate: (node: DomNode) => boolean): DomNode | null {
    for (const child of this.children) { if (predicate(child)) return child; const found = child.find(predicate); if (found) return found; } return null;
  }
  addEventListener(type: string, handler: (event: Event) => void, options?: { signal: AbortSignal }) {
    const handlers = this.listeners.get(type) ?? []; handlers.push(handler); this.listeners.set(type, handlers);
    options?.signal.addEventListener("abort", () => this.listeners.delete(type));
  }
  emit(type: string, target: DomNode) {
    for (const handler of this.listeners.get(type) ?? []) handler({ type, target, stopPropagation: () => {} } as unknown as Event);
  }
}
export function domFixture() {
  return { activeElement: null as DomNode | null,
    createElement: (tag: string) => new DomNode(tag.toUpperCase()), createTextNode: (text: string) => {
      const node = new DomNode("#TEXT"); node.textContent = text; return node;
    } };
}
