export default function Privacy() {
  return (
    <main className="min-h-screen px-6 py-32">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-stone mb-10">Last updated: June 2025</p>

        <div className="space-y-8 text-sm text-secondary leading-relaxed">
          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              1. Introduction
            </h2>
            <p>
              Audistill is a privacy-first, local-by-default macOS application. Your audio files, transcripts, and generated content stay on your machine unless you explicitly choose to use cloud AI features. This policy explains what data exists, where it lives, and what — if anything — leaves your device.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              2. Data We Collect
            </h2>
            <p className="mb-3"><strong className="text-text">Local data (never leaves your device):</strong></p>
            <ul className="list-disc pl-5 space-y-1.5 mb-4">
              <li>Audio files you import</li>
              <li>Transcripts generated on-device by the Parakeet ONNX model</li>
              <li>Tabs, recipes, and structured content you create</li>
              <li>Episode metadata, folders, and library organization</li>
              <li>Application settings and preferences</li>
            </ul>
            <p className="mb-3"><strong className="text-text">Cloud data (only when you opt in):</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Transcribed text sent to OpenRouter for AI features (summaries, chat, recipe execution). Only text — never audio.</li>
              <li>Your API key is stored locally in the macOS Keychain and sent directly to OpenRouter. We never see or proxy it.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              3. Data Storage
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text">SQLite database:</strong> Transcripts, episodes, tabs, recipes, and metadata are stored in a local SQLite database in your Application Support directory.</li>
              <li><strong className="text-text">macOS Keychain:</strong> API keys are stored securely in the operating system&apos;s Keychain, encrypted at rest by macOS.</li>
              <li><strong className="text-text">Filesystem:</strong> Audio files remain where you placed them, or in the app&apos;s support directory if imported. They are never uploaded anywhere.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              4. Data Retention
            </h2>
            <p>
              You have full control over data retention. All data is stored locally and persists until you delete it. You can delete individual episodes, clear your entire library, or uninstall the application to remove all associated data. There is no automatic deletion unless you configure it.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              5. Third-Party Services
            </h2>
            <p className="mb-3">
              The only third-party service Audistill communicates with is <strong className="text-text">OpenRouter</strong> (openrouter.ai), and only when you:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mb-3">
              <li>Provide your own OpenRouter API key</li>
              <li>Explicitly trigger an AI feature (summary, chat, or recipe execution)</li>
            </ul>
            <p>
              When this happens, only the transcribed text of selected content is sent — never audio files, never your full library. OpenRouter&apos;s handling of your data is governed by their{" "}
              <a href="https://openrouter.ai/privacy" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                privacy policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              6. Your Privacy Rights
            </h2>
            <p className="mb-3">Because your data is local, you have complete control:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-text">Access:</strong> All your data is in readable formats on your filesystem.</li>
              <li><strong className="text-text">Delete:</strong> Remove any episode, transcript, or generated content at any time.</li>
              <li><strong className="text-text">Export:</strong> Export transcripts and content in standard formats.</li>
              <li><strong className="text-text">Edit:</strong> Modify any content directly within the app.</li>
              <li><strong className="text-text">Opt out of cloud:</strong> Simply don&apos;t provide an API key. The app works fully offline for transcription.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              7. Data Security
            </h2>
            <p>
              Audistill relies on macOS platform security: FileVault disk encryption, Keychain for secrets, and app sandboxing. The application does not run its own server, does not open network ports, and does not transmit data except when you explicitly invoke AI features with your own API key.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              8. Children&apos;s Privacy
            </h2>
            <p>
              Audistill is not intended for use by children under 13 years of age. We do not knowingly collect any information from children.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated &ldquo;Last updated&rdquo; date. Continued use of the App after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              10. Contact
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:info@audistill.com" className="text-accent hover:underline">
                info@audistill.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
