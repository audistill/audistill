import { describe, it, expect } from 'vitest'
import { slugify, buildTabFilename } from './export-assembler'

describe('slugify', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(slugify('My Great Podcast')).toBe('my-great-podcast')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('handles special characters', () => {
    expect(slugify("What's Up? (Episode #3)")).toBe('what-s-up-episode-3')
  })
})

describe('buildTabFilename', () => {
  it('creates filename from episode title and tab name', () => {
    expect(buildTabFilename('My Podcast', 'Brief')).toBe('my-podcast--brief.md')
  })

  it('handles special characters in both parts', () => {
    expect(buildTabFilename('Episode #1: The Beginning', 'Full Notes')).toBe(
      'episode-1-the-beginning--full-notes.md'
    )
  })
})
