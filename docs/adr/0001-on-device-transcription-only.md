# On-device transcription only — no cloud ASR

All speech-to-text runs locally on Apple Silicon via the Parakeet-TDT v3 ONNX model (~670MB). The app never sends audio to a cloud service, even as an optional fast-path. This is the core privacy guarantee and the primary differentiator from NotebookLM, Otter.ai, and other cloud-dependent tools.

The trade-off: transcription speed is limited to ~30x real-time on CPU (a 1-hour file takes ~2 minutes), and accuracy depends on a single model family rather than choosing the best provider per language. We accept this because the target audience (privacy-conscious knowledge workers) values data sovereignty over marginal speed/accuracy gains, and the Parakeet model's 25-language support is sufficient for the European-heavy user base.

## Considered Options

- **Cloud ASR (Whisper API, Deepgram, AssemblyAI)** — faster, potentially more accurate, but violates the local-first promise and introduces per-minute cost.
- **Hybrid (local default, optional cloud)** — preserves privacy for most users but complicates the product story ("is my data local or not?") and doubles the integration surface.
- **Local-only via Parakeet ONNX** — chosen. Simple architecture, zero marginal cost, absolute privacy guarantee.
