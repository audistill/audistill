export default function Terms() {
  return (
    <main className="min-h-screen px-6 py-32">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-stone mb-10">Last updated: June 2025</p>

        <div className="space-y-8 text-sm text-secondary leading-relaxed">
          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By downloading, installing, or using Audistill (&ldquo;the App&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              2. License and Services
            </h2>
            <p className="mb-3">
              Audistill is available under a dual-license model:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text">Open Source:</strong> The source code is available under the applicable open-source license. You may build, modify, and run the application from source for personal use.
              </li>
              <li>
                <strong className="text-text">Commercial License:</strong> The compiled, signed, and notarized binary distributed through our website and Homebrew is a commercial product. A one-time license purchase grants you the right to use the compiled application on the number of devices specified by your tier (Solo: 1 device, Personal: 2 devices, Extended: 3 devices).
              </li>
            </ul>
            <p className="mt-3">
              The commercial license includes lifetime updates at no additional cost and a 14-day free trial period.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              3. Cloud Services
            </h2>
            <p className="mb-3">
              Audistill uses OpenRouter as a third-party service for AI-powered features (summaries, chat, recipe execution). Important details:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Only transcribed text is sent to OpenRouter — never audio files.</li>
              <li>You provide your own API key. Audistill does not store, access, or proxy your key through our servers.</li>
              <li>All audio transcription happens locally on your device using the Parakeet ONNX model. Audio never leaves your machine.</li>
              <li>Use of OpenRouter is subject to their own terms of service and privacy policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              4. Restrictions
            </h2>
            <p>
              For the commercial compiled version, you may not: redistribute the compiled binary; reverse-engineer the licensing mechanism; use the application on more devices than your license tier permits; or sub-license the application to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              5. Updates
            </h2>
            <p>
              Licensed users receive lifetime updates to the application at no additional cost. Updates are delivered via the built-in auto-update mechanism or through Homebrew. We reserve the right to release major new versions as separate products, though historically this has not been our practice.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              6. Refund Policy
            </h2>
            <p>
              We offer a 14-day refund policy from the date of purchase. If you are not satisfied with Audistill, contact us at info@audistill.com within 14 days for a full refund. No questions asked.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              7. Disclaimer of Warranty
            </h2>
            <p>
              Audistill is provided &ldquo;as is&rdquo; without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the App will be error-free or uninterrupted.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              8. Limitation of Liability
            </h2>
            <p>
              In no event shall Audistill or its developers be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the App. Our total liability shall not exceed the amount you paid for the license.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              9. Termination
            </h2>
            <p>
              We may terminate or suspend your license if you violate these terms. Upon termination of your license for the commercial version, you must cease using the compiled binary. Your right to use the open-source version under its respective license remains unaffected.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-base text-text mb-3">
              10. Contact
            </h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{" "}
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
