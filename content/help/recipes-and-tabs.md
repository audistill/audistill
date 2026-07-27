---
title: Recipes and Tabs
order: 40
---

A **Recipe** is a reusable prompt that turns a Transcript into a **Tab**. A Tab is a persistent Markdown document inside an Episode. You can read it, edit it, copy it, export it, or regenerate it when it came from a Recipe.

## Built-in and custom Recipes

Audistill includes built-in Recipes such as Brief, Detailed, and Full. In Settings, you can create your own Recipes, duplicate existing Recipes, edit prompts, and choose an optional per-Recipe **Model** override.

Recipes use your default Model unless the Recipe has its own override. The default Model is configured in Settings and can be changed without changing the Recipe prompt.

## Pipeline Recipe

The Pipeline Recipe auto-runs during Ingest. After Transcription finishes, Audistill runs that Recipe against the Transcript and saves the result as the Episode's first generated Tab.

Changing the Pipeline Recipe affects future Episodes. It does not rewrite Tabs that already exist.

## Creating Tabs

Use the + button in the Episode header to create a blank Tab or run a Recipe. Blank Tabs are useful for your own notes. Recipe Tabs are generated from the Episode's Transcript.

If a Tab for the same Recipe already exists on an Episode, choosing that Recipe opens the existing Tab instead of creating a duplicate.

## Editing and provenance

Tabs are normal documents after they are created. You can switch to Edit mode and change the Markdown directly, or ask Chat to write or revise a Tab.

Generated Tabs keep provenance such as when they were generated and which Model was used. Provenance is historical context only. Editing a Tab is allowed and does not change the Recipe.

## Regenerate, copy, and export

Use Regenerate when you want to run the original Recipe again against the current Transcript and replace that Tab's content with fresh output. If generation fails, Audistill restores the previous Tab content.

The Tab toolbar can copy a Tab to the clipboard or export that Tab as Markdown. The Episode context menu can export the whole Episode as Markdown, including Tabs and the Transcript. Multi-select can export several Episodes to a folder.

Tabs render rich Markdown, including tables, task lists, highlights, and Mermaid diagrams when the content contains them.
