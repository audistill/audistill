import { describe, it, expect } from 'vitest'
import { parseDDGHtml } from '../src/main/web-search-service'

const DDG_HTML_FIXTURE = `
<!DOCTYPE html>
<html>
<head><title>DuckDuckGo</title></head>
<body>
<div id="links">

<div class="result results_links results_links_deep web-result" id="r1-0">
  <div class="links_main links_deep result__body">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FTypeScript&amp;rut=abc123">
        <b>TypeScript</b> - Wikipedia
      </a>
    </h2>
    <div class="result__extras">
      <a class="result__url" href="https://en.wikipedia.org/wiki/TypeScript">
        en.wikipedia.org/wiki/TypeScript
      </a>
    </div>
    <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FTypeScript&amp;rut=abc123">
      <b>TypeScript</b> is a free and open-source high-level programming language developed by Microsoft that adds static typing with optional type annotations to JavaScript.
    </a>
  </div>
</div>

<div class="result results_links results_links_deep web-result" id="r1-1">
  <div class="links_main links_deep result__body">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.typescriptlang.org%2F&amp;rut=def456">
        <b>TypeScript</b>: JavaScript With Syntax For Types
      </a>
    </h2>
    <div class="result__extras">
      <a class="result__url" href="https://www.typescriptlang.org/">
        www.typescriptlang.org
      </a>
    </div>
    <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.typescriptlang.org%2F&amp;rut=def456">
      <b>TypeScript</b> extends JavaScript by adding types to the language. TypeScript speeds up your development experience by catching errors and providing fixes before you even run your code.
    </a>
  </div>
</div>

<div class="result results_links results_links_deep web-result" id="r1-2">
  <div class="links_main links_deep result__body">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fgithub.com%2Fmicrosoft%2FTypeScript&amp;rut=ghi789">
        microsoft/TypeScript: <b>TypeScript</b> is a superset of JavaScript
      </a>
    </h2>
    <div class="result__extras">
      <a class="result__url" href="https://github.com/microsoft/TypeScript">
        github.com/microsoft/TypeScript
      </a>
    </div>
    <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fgithub.com%2Fmicrosoft%2FTypeScript&amp;rut=ghi789">
      <b>TypeScript</b> is a language for application-scale JavaScript. TypeScript adds optional types to JavaScript that support tools for large-scale JavaScript applications.
    </a>
  </div>
</div>

</div>
</body>
</html>
`

describe('parseDDGHtml', () => {
  it('parses result blocks into structured data', () => {
    const results = parseDDGHtml(DDG_HTML_FIXTURE, 10)
    expect(results).toHaveLength(3)

    expect(results[0]).toEqual({
      title: 'TypeScript - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/TypeScript',
      snippet: 'TypeScript is a free and open-source high-level programming language developed by Microsoft that adds static typing with optional type annotations to JavaScript.',
    })

    expect(results[1]).toEqual({
      title: 'TypeScript: JavaScript With Syntax For Types',
      url: 'https://www.typescriptlang.org/',
      snippet: 'TypeScript extends JavaScript by adding types to the language. TypeScript speeds up your development experience by catching errors and providing fixes before you even run your code.',
    })

    expect(results[2]).toEqual({
      title: 'microsoft/TypeScript: TypeScript is a superset of JavaScript',
      url: 'https://github.com/microsoft/TypeScript',
      snippet: 'TypeScript is a language for application-scale JavaScript. TypeScript adds optional types to JavaScript that support tools for large-scale JavaScript applications.',
    })
  })

  it('respects maxResults limit', () => {
    const results = parseDDGHtml(DDG_HTML_FIXTURE, 2)
    expect(results).toHaveLength(2)
    expect(results[0].title).toBe('TypeScript - Wikipedia')
    expect(results[1].title).toBe('TypeScript: JavaScript With Syntax For Types')
  })

  it('returns empty array for HTML with no results', () => {
    const results = parseDDGHtml('<html><body>No results</body></html>', 10)
    expect(results).toEqual([])
  })

  it('handles results with missing snippets', () => {
    const html = `
    <div class="result results_links results_links_deep web-result" id="r1-0">
      <h2 class="result__title">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&amp;rut=xyz">
          Example Site
        </a>
      </h2>
    </div>
    `
    const results = parseDDGHtml(html, 10)
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      title: 'Example Site',
      url: 'https://example.com',
      snippet: '',
    })
  })

  it('decodes HTML entities in titles and snippets', () => {
    const html = `
    <div class="result results_links results_links_deep web-result" id="r1-0">
      <h2 class="result__title">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&amp;rut=xyz">
          Tom &amp; Jerry&#x27;s &quot;Adventure&quot;
        </a>
      </h2>
      <a class="result__snippet" href="#">
        A &lt;great&gt; show &amp; more
      </a>
    </div>
    `
    const results = parseDDGHtml(html, 10)
    expect(results[0].title).toBe("Tom & Jerry's \"Adventure\"")
    expect(results[0].snippet).toBe('A <great> show & more')
  })
})
