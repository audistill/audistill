import { net } from 'electron'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * Parse DuckDuckGo HTML search results into structured data.
 * Exported for unit testing.
 */
export function parseDDGHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // DDG HTML results are in <div class="result results_links results_links_deep web-result">
  // Each result has:
  //   <a class="result__a" href="...">title</a>
  //   <a class="result__snippet">snippet text</a>
  // The URL is in <a class="result__url" href="..."> or extracted from result__a href

  // Split by result blocks
  const resultBlocks = html.split(/class="result\s[^"]*results_links[^"]*web-result/)

  for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
    const block = resultBlocks[i]

    // Extract title from <a class="result__a" ...>title</a>
    const titleMatch = block.match(/<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/)
    const title = titleMatch ? stripHtmlTags(titleMatch[1]).trim() : ''

    // Extract URL from <a class="result__a" href="...">
    const urlMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]*)"/)
    let url = urlMatch ? urlMatch[1] : ''

    // DDG sometimes wraps URLs in a redirect; extract the actual URL
    if (url.includes('uddg=')) {
      const uddgMatch = url.match(/uddg=([^&]+)/)
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1])
      }
    }

    // Extract snippet from <a class="result__snippet">...</a> or <span class="result__snippet">
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|span)>/)
    const snippet = snippetMatch ? stripHtmlTags(snippetMatch[1]).trim() : ''

    if (title && url) {
      results.push({ title, url, snippet })
    }
  }

  return results
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Search DuckDuckGo HTML endpoint and return structured results.
 */
export async function searchDDG(query: string, maxResults: number = 10): Promise<SearchResult[]> {
  const body = new URLSearchParams({ q: query })

  const response = await net.fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; Podscribe/1.0)',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed (${response.status}): ${response.statusText}`)
  }

  const html = await response.text()
  return parseDDGHtml(html, maxResults)
}
