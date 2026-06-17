import { LegalPage, Section } from "@/components/legal-page";

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="June 2026">
      <Section title="Acceptance of Terms">
        <p>
          By downloading, installing, or using Audistill (&ldquo;the App&rdquo;), you agree to be
          bound by these Terms of Service. If you do not agree, do not use the App. These terms
          apply to both the open-source version and the commercially distributed compiled version.
        </p>
      </Section>

      <Section title="License and Services">
        <p>
          <strong className="text-text">Open-source license:</strong>
        </p>
        <p>
          The Audistill source code is available under the applicable open-source license as
          specified in the project repository. You may build, run, and modify the source code in
          accordance with that license.
        </p>

        <p className="mt-4">
          <strong className="text-text">Commercial license (compiled version):</strong>
        </p>
        <p>
          The commercially distributed version — the signed, notarized binary available for download
          — is sold as a one-time purchase. Your purchase grants you a personal, non-transferable
          license to use the compiled App on the number of devices specified by your tier:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1 mt-2">
          <li><strong className="text-text">Solo:</strong> 1 Mac</li>
          <li><strong className="text-text">Personal:</strong> 2 Macs</li>
          <li><strong className="text-text">Extended:</strong> 3 Macs</li>
        </ul>
        <p className="mt-3">
          Your license includes lifetime updates to the App at no additional cost.
        </p>
      </Section>

      <Section title="Cloud Services">
        <p>
          Audistill offers optional AI features (summaries, chat, recipe execution) that require a
          connection to a third-party LLM provider.
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1 mt-2">
          <li>
            <strong className="text-text">What is sent:</strong> Transcribed text only — never audio
            files
          </li>
          <li>
            <strong className="text-text">How it&apos;s sent:</strong> Directly from your Mac to the
            provider you choose (e.g., OpenRouter, Anthropic, OpenAI) using your own API key
          </li>
          <li>
            <strong className="text-text">Our role:</strong> Audistill acts as a client application.
            We do not proxy, intercept, or store any data sent to LLM providers
          </li>
          <li>
            <strong className="text-text">Costs:</strong> You are responsible for any charges from
            your LLM provider. Audistill does not add any markup
          </li>
        </ul>
        <p className="mt-3">
          Audio transcription always runs locally on your Mac using Apple Silicon. Audio files never
          leave your device under any circumstance.
        </p>
      </Section>

      <Section title="Restrictions">
        <p>
          For the commercially licensed compiled version, you agree not to:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>Redistribute the compiled binary to others</li>
          <li>Use one license across more devices than your tier permits</li>
          <li>Remove or alter license verification mechanisms in the compiled version</li>
          <li>Use the App for any unlawful purpose</li>
        </ul>
        <p className="mt-3">
          These restrictions apply only to the compiled distribution. The open-source version is
          governed by its own license terms.
        </p>
      </Section>

      <Section title="Updates">
        <p>
          The compiled version includes automatic update functionality. Updates are delivered as
          signed binaries and may include bug fixes, new features, and security patches. You may
          disable automatic updates in the App settings.
        </p>
        <p className="mt-3">
          We reserve the right to modify or discontinue features with reasonable notice. Core
          functionality (transcription, library management, search) will not be removed from
          versions you have already installed.
        </p>
      </Section>

      <Section title="Free Trial">
        <p>
          Audistill offers a 14-day free trial with full functionality. No credit card is required to
          start the trial. After the trial period:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1 mt-2">
          <li>You may continue to view your library, read transcripts, and search</li>
          <li>Ingest, chat, and recipe execution require a purchased license to continue</li>
        </ul>
      </Section>

      <Section title="Refund Policy">
        <p>
          We offer a full refund within 14 days of purchase, no questions asked. To request a
          refund, contact{" "}
          <a
            href="mailto:info@audistill.com"
            className="text-accent hover:text-accent-hover underline underline-offset-2"
          >
            info@audistill.com
          </a>{" "}
          with your order details.
        </p>
        <p className="mt-3">
          After 14 days, refunds are granted at our discretion for cases involving significant
          technical issues that we are unable to resolve.
        </p>
      </Section>

      <Section title="Disclaimer of Warranty">
        <p>
          Audistill is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind, whether express or implied, including but not limited to implied
          warranties of merchantability, fitness for a particular purpose, and non-infringement.
        </p>
        <p className="mt-3">
          We do not warrant that transcriptions will be 100% accurate, that AI-generated content
          will be error-free, or that the App will operate without interruption. Transcription
          quality depends on audio quality, and AI output quality depends on the model you choose.
        </p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Audistill and its developers shall not be liable
          for any indirect, incidental, special, consequential, or punitive damages, including but
          not limited to loss of data, loss of profits, or business interruption, arising out of or
          related to your use of the App.
        </p>
        <p className="mt-3">
          Our total liability for any claim arising from these Terms or your use of the App shall
          not exceed the amount you paid for your license.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          Your license to use the compiled version remains valid as long as you comply with these
          Terms. We may terminate your license if you materially breach these Terms and fail to cure
          the breach within 30 days of notice.
        </p>
        <p className="mt-3">
          Upon termination, you must cease using the compiled version. Your locally stored data
          (transcripts, library, audio files) remains yours — you can continue to access it via
          the open-source version or by reading the SQLite database directly.
        </p>
      </Section>

      <Section title="Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with applicable law, without
          regard to conflict of law principles.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For questions about these Terms of Service, contact us at{" "}
          <a
            href="mailto:info@audistill.com"
            className="text-accent hover:text-accent-hover underline underline-offset-2"
          >
            info@audistill.com
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
