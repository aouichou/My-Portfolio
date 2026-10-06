/**
 * svg-sanitizer — v2 port (F3-01).
 *
 * Ported verbatim in behavior from portfolio_ui/src/library/svg-sanitizer.ts
 * @ rework/v2 6bb5a78. Security-critical (Mermaid diagram rendering path);
 * the capture suite pins its behavior, including the two documented gaps
 * (external <use>/<image> references are NOT stripped — flagged for the
 * Security Auditor, not silently changed here; no Step-1 test proved them
 * bugs to fix in this port).
 */

const DISALLOWED_SVG_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
]);

/**
 * Kept from v1 verbatim (documented): the allowlist documents the intended
 * foreignObject policy even though enforcement is via the denylist below.
 */
const ALLOWED_FOREIGNOBJECT_TAGS = new Set([
  'b', 'i', 'u', 'em', 'strong', 'span', 'br', 'div', 'p',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'code', 'pre',
  'sub', 'sup',
  'a',
]);

const DISALLOWED_FOREIGNOBJECT_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'canvas',
  'video',
  'audio',
  'link',
  'meta',
  'base',
]);

const URL_ATTRIBUTES = new Set(['href', 'xlink:href', 'src']);

function sanitizeSvgElement(element: Element): void {
  // Sanitize attributes on the element itself
  Array.from(element.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    const attributeValue = attribute.value.trim().toLowerCase();

    if (attributeName.startsWith('on')) {
      element.removeAttribute(attribute.name);
      return;
    }

    if (URL_ATTRIBUTES.has(attributeName) && attributeValue.startsWith('javascript:')) {
      element.removeAttribute(attribute.name);
    }
  });

  Array.from(element.children).forEach((child) => {
    const tagName = child.tagName.toLowerCase();

    // Handle foreignObject: sanitize inner HTML instead of removing it
    if (tagName === 'foreignobject') {
      sanitizeForeignObjectContent(child as HTMLElement);
      return;
    }

    if (DISALLOWED_SVG_TAGS.has(tagName)) {
      child.remove();
      return;
    }

    sanitizeSvgElement(child);
  });
}

/**
 * Sanitize the children of a <foreignObject> element.
 * Mermaid uses foreignObject for rich text labels in flowcharts.
 * We strip dangerous tags and event handlers while keeping text formatting.
 */
function sanitizeForeignObjectContent(el: HTMLElement): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
  const nodesToRemove: Node[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (node.nodeType === Node.ELEMENT_NODE) {
      const htmlEl = node as HTMLElement;
      const tagName = htmlEl.tagName.toLowerCase();

      // Remove dangerous tags
      if (DISALLOWED_FOREIGNOBJECT_TAGS.has(tagName)) {
        nodesToRemove.push(htmlEl);
        continue;
      }

      // Remove event handlers
      Array.from(htmlEl.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith('on')) {
          htmlEl.removeAttribute(attr.name);
        }
        if (URL_ATTRIBUTES.has(attr.name.toLowerCase()) && attr.value.trim().toLowerCase().startsWith('javascript:')) {
          htmlEl.removeAttribute(attr.name);
        }
      });
    }
  }

  nodesToRemove.forEach((node) => node.parentNode?.removeChild(node));
}

// Referenced so the documented allowlist survives strict noUnusedLocals.
void ALLOWED_FOREIGNOBJECT_TAGS;

export function parseSanitizedSvg(markup: string): SVGSVGElement | null {
  const parsedDocument = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svgElement = parsedDocument.documentElement;

  if (svgElement.tagName.toLowerCase() !== 'svg') {
    return null;
  }

  sanitizeSvgElement(svgElement);
  return svgElement as unknown as SVGSVGElement;
}
