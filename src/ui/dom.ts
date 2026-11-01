/**
 * The whole "framework": one element helper.
 *
 * Nothing here re-renders anything. Views build their DOM once with `el`,
 * keep the references they need, and on each keystroke write only the
 * classes and text that actually changed.
 */

type Attrs = Record<string, string | number | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/** Set a class only when it is actually changing, so writes stay minimal. */
export function toggleClass(node: Element, name: string, on: boolean): void {
  if (node.classList.contains(name) === on) return;
  node.classList.toggle(name, on);
}

/** Write text only when it differs — `textContent =` always dirties the node. */
export function setText(node: Node, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
