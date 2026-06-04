const DISALLOWED_SVG_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
]);

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

export function parseSanitizedSvg(markup: string): SVGSVGElement | null {
  const parsedDocument = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svgElement = parsedDocument.documentElement;

  if (svgElement.tagName.toLowerCase() !== 'svg') {
    return null;
  }

  sanitizeSvgElement(svgElement);
  return svgElement as unknown as SVGSVGElement;
}