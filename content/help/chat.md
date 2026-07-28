---
title: Chat
order: 50
---

**Chat** is a per-Episode command surface. It stays attached to the Episode you have open, so questions, tool use, and generated work start from that Episode's Transcript and Tabs.

## Ask about an Episode

Use Chat to ask questions, extract details, compare moments in the Transcript, or turn a long Episode into something easier to work with.

Chat can use tools to read and search the current Transcript, inspect Tabs, read Episode metadata, and search across your Library when that helps answer the question. It can also search the web for outside context when you ask about something not covered by the Episode.

## Generate or edit Tabs

Chat answers ordinary questions in the Chat history. When you ask it to draft, rewrite, or create a deliverable, it should put that work in a Tab so you can keep editing and exporting it.

When you ask Chat to refine the content you are viewing—for example, “make this shorter” or “rewrite the introduction”—it edits the active Tab. This works for user-authored Tabs as well as Recipe-generated and Pipeline Tabs. You can name another Tab when you want Chat to update that document instead.

You can also type `/` in Chat to run a Recipe against the active Episode. Choosing a Recipe creates a new Tab, or opens the existing Tab if that Recipe has already been run for the Episode.

## Models

Chat uses your OpenRouter API key. By default it uses the Model from Settings, but you can choose a different Model from the Chat header for the current Chat work.

The selected Model receives text context: the conversation, relevant Transcript or Tab excerpts, and tool results. Audio is not sent to OpenRouter.

## Chat history

Chat history is stored locally on the Episode. Switching Episodes switches to that Episode's Chat history. Use the clear button in the Chat header when you want to remove the current Episode's Chat messages.
