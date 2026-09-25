---
title: Ingesting audio
order: 20
---

**Ingest** is the full path from a **Source** to a ready-to-use **Episode**. It includes download when needed, local Transcription, and the Pipeline Recipe that creates the first Tab.

## Ways to add audio

Use **Add → Import files…** for local files. Audistill supports common audio and video containers: MP3, M4A, WAV, FLAC, MP4, MOV, MKV, WebM, AAC, OGG, and Opus.

Use **Add → Import from URL…** for:

- YouTube video URLs.
- RSS or Atom feeds with media enclosures.
- Direct links to audio or video files.

You can also drag supported files into the app, drop a supported URL, or paste a URL while the app is focused and you are not typing in a text field.

## Recording System Audio and Microphone

Use **Add → Record audio…** or press **Command–Shift–R** to open a Recording Session. Enable System Audio, a Microphone Source, or both. You can choose any available built-in, Bluetooth, or USB microphone before starting. The activity meters help confirm that the selected sources are receiving audio.

macOS asks only for access needed by the sources you enable. Screen Recording access controls System Audio; Microphone access controls microphone capture. If access was denied, use **Open Settings** beside the source, grant access in Privacy & Security, then return to Audistill.

If one source disconnects or is interrupted, the other source continues and the Recording Workspace shows a warning. Choose a replacement microphone inline when one is disconnected. If no enabled source remains, recording pauses safely. Sleep also pauses recording; after wake, check the sources and explicitly resume.

The pinned Recording Workspace shows active recording time. You can pause and resume, open another Episode, minimize or hide Audistill, and return to the Recording tab without interrupting capture. Paused time is excluded from the Episode duration and Transcript timeline.

Choose **Stop and process** while recording or paused to create one Recorded Episode and begin normal Ingest. Controls are locked while AudiStill safely finalizes the capture. Choose **Cancel** and confirm to permanently discard the captured audio without creating an Episode.

If you quit during capture, choose **Stop and process**, **Discard**, or **Keep recording**. AudiStill waits for processing handoff or cleanup before quitting, and the capture helper never continues after the app exits.

Recording requires at least 1 GB of free temporary storage. If storage becomes critically low during capture, AudiStill stops safely and offers to process valid captured audio or discard it.

If AudiStill or the Mac stops unexpectedly after usable audio was finalized, the next launch opens a recovery card showing when the Recording Session started, its captured duration, and its source types. Choose **Recover and process** to create or resume exactly one Recorded Episode, or **Discard** to permanently delete the temporary audio. Discard remains available even if your Trial or License has changed.

Transcription remains on-device. Captured audio is temporary and is deleted after the Transcript is stored; it does not become a playable or exportable Library asset.

## URL Sources

YouTube Ingest uses the Homebrew-installed `yt-dlp`. If Audistill cannot find it, run `brew install yt-dlp`, then check again. Audistill supplies its own FFmpeg to `yt-dlp`; you do not need to install FFmpeg separately. Current YouTube extraction may also require Deno as a JavaScript runtime; if Audistill reports that no runtime is available, run `brew install deno`. You can also set the `yt-dlp` path and custom arguments in Settings, such as cookies arguments for Sources that require your browser session.

If a download is interrupted or YouTube temporarily refuses or limits it, Audistill retries once from a clean temporary file. If Ingest still fails, open **Show details** on the Episode to see Diagnostic Details alongside the concise explanation.

RSS and Atom feeds open a preview list so you can choose one or more feed items. Items that are already in your Library are marked as imported and cannot be selected again. You can also **Subscribe** to a feed instead of importing from it once.

## Feed subscriptions

A Subscription appears in the Feeds section of the sidebar. Subscribing is silent: everything already in the feed is recorded as seen, so subscribing to a long-running podcast does not hand you its whole back catalogue.

You can also paste a YouTube channel URL, `@handle`, playlist, or individual video URL and subscribe to the channel or playlist behind it. Audistill uses your configured `yt-dlp` both to read YouTube Feed metadata and to add one of its videos to the Library. If `yt-dlp` is missing, the same installation guidance appears as for normal YouTube Ingest. If YouTube extraction reports that no JavaScript runtime is available, install Deno with `brew install deno`.

Audistill checks subscribed feeds shortly after launch and periodically while it is open, and you can check one feed from its header or all of them from the Feeds section. A check fetches feed metadata only — nothing is downloaded, transcribed, or sent to a Model, and it works the same on Trial or with a License. Feeds are checked one at a time. RSS checks reuse server cache validators; YouTube checks run one bounded `yt-dlp` metadata lookup.

Items that arrive after you subscribe are counted on the feed's row and totalled on the Feeds header, and carry an accent dot in the Feed Workspace. Opening a Feed does not clear this New state. Choose **Clear new** when you no longer need those indicators; the Items remain available and an Undo action briefly lets you reverse the change. Nothing becomes an Episode until you choose it: a Subscription never adds to your Library on its own.

Use **New** to focus on Items that still need attention and **All** for the complete catalogue. New is always a subset of All. Activating a New row marks it seen; in New it then moves out of the list, with a brief **Undo** action. Added Items no longer count as New but remain identifiable as **In Library** in All.

Choose **Select** before selecting several Items. While Select mode is active, row clicks only toggle the bulk selection and do not mark Items seen. Use the selection bar to add the selected Items, then choose **Done** or press Escape to leave Select mode. Add, Check, and Clear new show progress and results where the action happened, and failures stay in the Feed Workspace.

Audistill retains every Item returned by an RSS or Atom check and loads long catalogues incrementally. YouTube checks remain limited to the latest 30 Items returned by `yt-dlp`. If new Items arrive while you are reading farther down a feed, Audistill keeps your position and shows a **new items above** button instead of moving the list underneath you.

A Subscription that could not be reached shows a small grey dot on its sidebar row; hover it to read the reason. The Feed Workspace also shows the error so you can check again. Audistill does not interrupt you about it and tries again on the next round.

Direct media URLs show a single preview with an editable Episode title before you import.

## During Ingest

Audistill may show an Episode as queued, downloading, transcribing, generating, complete, cancelled, or in error. Multiple Episodes can be queued; Audistill works through them in order.

Transcription uses Audistill's built-in local Transcription Model. If the model is not ready, Add, drag-and-drop, and paste-to-import are disabled until the model finishes downloading or is downloaded again from Settings.

After Transcription, the selected Pipeline Recipe runs against the Transcript. Its output becomes the Episode's first generated Tab.

## Cancelling and retrying

You can cancel active download or Transcription work from the Episode context menu or the in-progress Episode view. Cancelled and failed Episodes can be retried.

If a failure happens after the Transcript exists, retry may continue with generation instead of starting the whole Ingest path again.

## Opening the original Source

When an Episode has a Source Locator, select the Source icon and label in its header to open the original audio location. YouTube, Direct, and RSS Sources open in your default browser; RSS opens the stored media enclosure. Local Sources open the original file in its default app.

Open Source is available during Ingest and after completion. If a local file was moved, deleted, or cannot be opened, Audistill reports the error but does not change the Episode. Recorded Sources are not openable because their temporary audio is deleted after Transcription.

## After completion

A completed Episode is self-contained for reading and AI work. It does not need the original audio file to show its Transcript, Tabs, or Chat history.

Local-file Episodes keep the original file path as Source context. URL-sourced Episodes keep Source provenance such as the URL, feed title, or YouTube channel, but their temporary downloaded audio is removed after Transcription.
