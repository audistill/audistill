# Audistill

A local-first macOS application that turns audio content (podcasts, lectures, meetings, interviews) into a searchable, retrievable personal knowledge base. Transcription is always on-device; AI-powered content generation uses the user's own API key (BYOK).

## Language

### Core Entities

**Episode**:
An item in the application representing audio content ingested into the system. Once created, an Episode is self-sufficient — it does not depend on its Source audio to function. Owns a Transcript, Tabs, and Chat history.
_Avoid_: File, recording, item, document

**Transcript**:
The immutable verbatim text output of on-device speech recognition, stored on the Episode. The foundational artifact from which all other content is derived. Cannot be edited by the user.
_Avoid_: Text, subtitles, captions

**Tab**:
A persistent content document within an Episode. May be AI-generated (from a Recipe) or user-authored (blank). Each Tab has a name, markdown content, and an optional `recipe_id` recording which Recipe originally created it (provenance only — content lives its own life after creation). A Pipeline Tab is a Tab produced during Ingest that cannot be closed.
_Avoid_: Canvas, page, note, summary

**Recipe**:
A reusable prompt template. When executed against a Transcript, it produces a Tab. Has a name, prompt text, and optional Model override. Built-in Recipes (Brief, Detailed, Full) cannot be deleted. One Recipe is designated as the Pipeline Recipe — it auto-runs during Ingest.
_Avoid_: Template, prompt, preset

**Source**:
The origin of an Episode's audio. Provenance only; the Episode does not depend on its Source after Transcription completes. URL-sourced Episodes have their temp audio deleted after Transcription. Every Episode has exactly one Source Type: Local (file import), YouTube (yt-dlp download), RSS (feed enclosure download), or Direct (HTTP media file download).
_Avoid_: Input, file, origin

**Feed**:
An RSS or Atom document at a URL containing a list of items with enclosure links to audio/video files. The app fetches and parses a Feed on demand but does not persist or subscribe to it — Feed-level metadata (title, image, URL) is stored on each resulting Episode as provenance for future grouping.
_Avoid_: Subscription, channel, podcast, source list

### Processes

**Transcription**:
The on-device process of converting audio to text using the Parakeet ASR model via ONNX runtime. Always local, never cloud-based — the privacy guarantee. Produces timestamped segments that form the Transcript.
_Avoid_: Speech-to-text, STT, recognition

**Ingest**:
The complete pipeline from Source to ready-to-use Episode. Begins in a queued state, then progresses through phases: downloading (URL sources only) → transcribing → generating → complete. Includes executing the Pipeline Recipe to produce the Pipeline Tab. An Episode is not considered complete until Ingest finishes. Ingest can terminate early as cancelled (user-initiated) or error (system failure).
_Avoid_: Import, upload, processing

**Regenerate**:
Re-executing a Tab's original Recipe against the current Transcript, replacing the Tab's content with fresh output. A snapshot of the existing content is taken before execution begins; if generation fails, the Tab reverts to the snapshot automatically.
_Avoid_: Refresh, redo, re-run

### Organization

**Library**:
The user's entire collection of Episodes. Not an entity in the database — the top-level concept encompassing all Episodes, Folders, and the Inbox.
_Avoid_: Collection, database, archive

**Inbox**:
The implicit landing zone for newly ingested Episodes that have not been organized into a Folder. Always exists, cannot be renamed or deleted. An Episode lives in the Inbox or in a Folder — mutually exclusive.
_Avoid_: Unsorted, default folder, queue

**Folder**:
A user-created container for organizing Episodes within the Library. Supports nesting via parent-child relationships. An Episode belongs to exactly one Folder, or to the Inbox.
_Avoid_: Category, tag, collection, group

**Starred**:
A cross-cutting shortcut that marks an Episode for quick access in the sidebar. Starring is orthogonal to folder membership — the Episode remains in its Folder or Inbox and additionally appears in the Starred section. Any Episode can be starred regardless of status. Ordered newest-starred-first. The Starred section is hidden when no Episodes are starred.
_Avoid_: Pinned (overloaded with Workspace Tab pinning), bookmarked, favorited

### Interaction

**Chat**:
A per-Episode conversational interface anchored to one Episode. The command surface for both Q&A (responses stay in Chat) and content generation (output lands in a Tab). The AI can read across the entire Library via tools but always operates in the context of one Episode.
_Avoid_: Conversation, assistant, copilot

**Workspace Tab**:
An Episode currently open in the top navigation bar. Supports preview mode (single-click, auto-replaced) and pinned mode (double-click, persistent). Persists across app restarts.
_Avoid_: Editor tab, open episode, window

**Custom Instructions**:
A user-authored directive that is injected into every AI interaction — Recipe execution and Chat alike. Shapes tone, focus, and output style globally. Configured once in Settings, applied everywhere.
_Avoid_: System prompt, persona, preferences

**Model**:
An external LLM used to execute Recipes and power Chat, accessed via OpenRouter. Users configure a global default Model and optional per-Recipe overrides. The app never calls an LLM without the user's own API key.
_Avoid_: AI, engine, provider

### Licensing

**License**:
A one-time purchase that unlocks gated features (Ingest, Chat, Recipe execution). Validated via Polar API using a license key. A License has an activation limit determining how many machines it can be used on simultaneously. The app remains viewable (Episodes, Transcripts, Tabs) without a License — only creation of new content is gated.
_Avoid_: Subscription, plan, seat

**Trial**:
A 14-day period starting on first launch of an official build. During Trial, all features are unlocked. When Trial expires, the user must purchase a License to continue creating content. Existing content remains accessible.
_Avoid_: Free tier, demo, beta

**Activation**:
Binding a License to a specific machine. Each License has a limit (1, 2, or 3 depending on tier). A user can deactivate a machine to free up a slot. Identified by machine ID.
_Avoid_: Registration, seat, device slot

## Example Dialogue

> **Dev:** A user imported a YouTube lecture and wants show notes. Walk me through what happens.
>
> **Domain expert:** First, Ingest kicks off — the Source URL is downloaded, then Transcription runs on-device to produce the Transcript. Then the Pipeline Recipe executes against the Transcript and creates the Pipeline Tab. The Episode lands in the Inbox as complete.
>
> **Dev:** Now they want show notes specifically?
>
> **Domain expert:** They open Chat on that Episode and use a slash command to invoke the "Show Notes" Recipe. That Recipe executes against the Transcript, and the output streams into a new Tab named "Show Notes." The Chat just shows a brief confirmation.
>
> **Dev:** What if they want to tweak the show notes?
>
> **Domain expert:** They can type in Chat — "make the bullets shorter" — and the AI edits the active Tab directly. Or they can toggle to edit mode on the Tab and write themselves. Either way, the Tab's content diverges from what the Recipe originally produced, and that's fine — the Recipe is just provenance.
>
> **Dev:** Where does all this live in the Library?
>
> **Domain expert:** The Episode is in the Inbox until they move it to a Folder. They might have a "Lectures" Folder. The Episode carries its Transcript, all its Tabs, and the Chat history with it — those belong to the Episode, not to any Folder.
