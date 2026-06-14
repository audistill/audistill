---
title: AI Chat Tools v2 — Advanced Search, Organization, and Recipe Management
status: done
created: 2026-06-14
---

## Problem Statement

The AI Chat assistant has a limited tool surface that forces it into multi-step workarounds for common user requests. Cross-episode search doesn't include transcripts, there's no way to organize episodes through conversation, and users can't leverage the AI's prompt-authoring ability to create or refine Recipes. As the product evolves toward AI-driven discovery (Tavily integration), the Chat needs organizational capabilities as a prerequisite.

## Solution

Expand the AI Chat tool set from 9 to 18 tools across three capability areas: advanced search (cross-episode grep, paginated transcript access, structured filtering), Library organization (list/create folders, move/rename episodes), and Recipe management (list/create/update recipes). Additionally fix the broken `search_episodes` tool and slim down the system prompt to reduce token waste.

## User Stories

1. As a user, I want to ask "which episodes mentioned transformer architecture?" and get results across all my transcripts, so that I can find relevant content without manually searching episode by episode.
2. As a user, I want search results to show me a snippet of where the match occurred, so that I can judge relevance without opening each episode.
3. As a user, I want to search transcripts using regex patterns, so that I can find variations of a term (e.g. "LLM|large language model").
4. As a user, I want to read a specific portion of a long transcript by timestamp range, so that the AI can reference a section without loading the entire transcript.
5. As a user, I want to filter my episodes by date range, duration, source type, or folder, so that the AI can narrow down results before searching content.
6. As a user, I want to say "move this to my Lectures folder" in Chat, so that I can organize without leaving the conversation.
7. As a user, I want to say "create a Machine Learning folder and put this episode there," so that organization flows naturally from discovery.
8. As a user, I want to say "rename this episode to something clearer" in Chat, so that the AI can suggest and apply better titles.
9. As a user, I want to ask "what folders do I have?" so that the AI can help me decide where to organize an episode.
10. As a user, I want to say "create a recipe that extracts action items from meetings," so that the AI authors the prompt template for me.
11. As a user, I want to say "update my Show Notes recipe to include timestamps," so that the AI can refine my existing prompts.
12. As a user, I want to ask "what recipes do I have?" so that the AI can suggest running one or help me choose.
13. As a user, I want the Chat to not waste tokens loading all my tab content upfront, so that responses are faster and cheaper.
14. As a user, I want `search_episodes` to actually find episodes where a term only appears in the transcript, so that search works reliably.
15. As a user, I want search results to tell me whether the match was in the title, transcript, or a tab, so that I understand the context of the result.

## Implementation Decisions

- **Services refactor:** `ChatToolExecutor` will accept a single `ToolServices` object (`{ db, tabs, recipes }`) instead of individual constructor params. This keeps the constructor stable as tools are added.
- **System prompt slimming:** The system prompt will inject only tab names and character counts (a table of contents) instead of full tab content. The active tab's content is still injected for immediate edit context. The AI uses `read_summary` to fetch full content on demand.
- **search_episodes fix:** Remove the vestigial `episode_summaries` JOIN. Add `episodes.transcript` to the WHERE clause. Return a `snippet` (~150 chars around first match) and `matched_in` field per result.
- **Transcript parsing:** Transcripts are stored as JSON arrays of `{ timestamp, text }` segments. `grep_transcripts` and `read_transcript_range` must parse this format. Plain-text fallback (newline-split) is already handled in the existing search tool and should be maintained.
- **Organizational tools** (`list_folders`, `create_folder`, `move_episode`, `rename_episode`) delegate directly to existing `DatabaseService` methods — no new backend logic required.
- **Recipe tools** (`list_recipes`, `create_recipe`, `update_recipe`) delegate to existing `RecipeService` methods. Built-in recipes are returned by `list_recipes` but `update_recipe` should reject updates to built-in recipes.
- **No destructive tools:** `delete_episode`, `delete_folder`, `delete_recipe` are explicitly out of scope — destructive operations remain manual.
- **Tool definitions** live in `ChatSidebar.tsx` as the `TOOL_DEFINITIONS` array (OpenAI function-calling format). Each new tool needs an entry there and a corresponding executor case.

## Testing Decisions

- **Primary seam: `ChatToolExecutor.executeTool()`** — Tests call the executor with tool name, args, and context, then assert on the JSON response. Uses in-memory SQLite, no IPC, no Electron mocks beyond BrowserWindow broadcast stub.
- **Secondary seam: `DatabaseService` query methods** — For the `searchEpisodes` fix and new `filterEpisodes` method, test the SQL logic directly.
- **Prior art:** `tests/chat-tool-executor.test.ts` already has comprehensive coverage for all 9 existing tools following this exact pattern. New tools should follow the same structure: happy path, missing params, not-found errors, edge cases.
- **What makes a good test:** Test external behavior (given these args → expect this JSON shape) not implementation details. Don't test that specific SQL was executed; test that the right data comes back.

## Out of Scope

- Recipe execution via AI tool (remains slash-command only)
- Destructive operations (delete episode/folder/recipe)
- Tavily integration and discovery flow
- Cross-episode chat (Chat remains anchored to one Episode)
- Full-text search indexing (FTS5) — the LIKE-based approach is adequate for the current library size
- UI changes to the Chat sidebar (tool definitions are invisible to the user)

## Further Notes

- The organizational tools lay groundwork for the planned Tavily discovery flow, where the AI finds sources and needs to place ingested episodes into the Library structure.
- Performance of `grep_transcripts` across a large library (100+ episodes) should be monitored. If it becomes a bottleneck, FTS5 virtual tables could be introduced as a future optimization, but LIKE scans are fine for now.
- The `episode_summaries` table remains in the schema for backwards compatibility but is no longer referenced by any active tool or query path after this work.
