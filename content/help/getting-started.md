---
title: Getting Started
order: 10
---

Welcome to Audistill. The app turns podcasts, meetings, lectures, interviews, and other audio into a local-first knowledge base: each **Episode** gets a searchable **Transcript**, useful **Tabs**, and its own **Chat** history.

## First launch

Audistill needs two pieces before the full workflow is ready:

1. An OpenRouter API key for AI features such as Recipes and Chat.
2. The local **Transcription Model** that turns audio into a Transcript on your Mac.

You choose the OpenRouter **Model** used for AI-generated writing. The Transcription Model is different: Audistill uses a built-in local model and downloads it for you. You can see its status in the top banner and in Settings, but you do not need to choose between Transcription Models.

## The basic flow

1. Add audio from a local file, YouTube URL, RSS feed item, or direct media URL.
2. Audistill starts **Ingest**. URL Sources are downloaded first, then local **Transcription** creates the Transcript.
3. The Pipeline Recipe runs after Transcription and creates the first generated **Tab**.
4. The completed Episode appears in your Library, usually in the Inbox until you move it to a Folder.
5. Open the Episode to read the Tab, inspect the Transcript, run more Recipes, or ask questions in Chat.

## What stays local

Transcription runs on your Mac. Audistill stores Episodes, Transcripts, Tabs, Recipes, folders, Chat history, and settings locally.

When you use Recipes or Chat, Audistill sends text context to OpenRouter with your API key and selected Model. Audio is not sent to OpenRouter. For URL-sourced Episodes, the temporary downloaded audio is deleted after Transcription; the Episode keeps the Transcript, Tabs, Chat history, and Source provenance.

## Good first steps

- Wait for the Transcription Model banner to say it is ready.
- Add one short audio file or URL to confirm Ingest works end to end.
- Open the Transcript panel to see the timestamped Transcript.
- Try the + button in the Episode header to create a blank Tab or run another Recipe.
- Open Chat and ask one concrete question about the Episode.
- Move Episodes out of the Inbox once your Library starts to grow.
