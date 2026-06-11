export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildTabFilename(episodeTitle: string, tabName: string): string {
  return `${slugify(episodeTitle)}--${slugify(tabName)}.md`
}
