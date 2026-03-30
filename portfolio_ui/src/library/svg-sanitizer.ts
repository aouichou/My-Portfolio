const DISALLOWED_SVG_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
]);

const URL_ATTRIBUTES = new Set(['href', 'xlink:href', 'src']);

function sanitizeSvgElement(element: Element): void {
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
    if (DISALLOWED_SVG_TAGS.has(child.tagName.toLowerCase())) {
      child.remove();
      return;
    }

    sanitizeSvgElement(child);
  });
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