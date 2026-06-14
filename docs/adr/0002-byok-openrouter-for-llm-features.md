# BYOK via OpenRouter for all LLM features

All LLM-powered features (Recipe execution, Chat) route through OpenRouter using the user's own API key. The app never bundles API credits, never proxies through a first-party server, and never runs local LLMs for content generation.

This means: zero ongoing infrastructure cost for the developer, no per-user margin pressure, and users get access to 200+ models (choosing their own cost/quality balance). The trade-off is onboarding friction — users must obtain an OpenRouter API key before summarization or chat works, which adds a setup step that competing products (NotebookLM, Snipd) don't require.

We accept this because: the $29 one-time purchase price only works if there's no ongoing cost to serve; BYOK aligns with the privacy-first positioning (user controls where their data goes); and the target audience (technical knowledge workers) already has or can easily get API keys.

## Considered Options

- **Bundled credits / subscription** — smoother onboarding, but creates recurring cost obligation and breaks the one-time-purchase model.
- **Local LLMs (Ollama, llama.cpp)** — maximum privacy, but quality gap is too large for summarization/chat tasks and hardware requirements exclude non-M-series Macs.
- **Direct provider SDKs (OpenAI, Anthropic, Google)** — fewer indirection layers, but locks users to one provider and requires multiple API key fields.
- **OpenRouter BYOK** — chosen. Single key, model marketplace, user controls cost, zero serving infrastructure.
