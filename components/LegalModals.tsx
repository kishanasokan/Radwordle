'use client';

import { useState, useEffect } from 'react';

export default function LegalModals() {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  // Lock background scroll while any legal modal is open
  useEffect(() => {
    if (showPrivacyPolicy || showTermsOfService) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showPrivacyPolicy, showTermsOfService]);

  return (
    <>
      {/* Legal Section Buttons */}
      <section className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
        <button
          onClick={() => setShowPrivacyPolicy(true)}
          className="flex items-center gap-2 px-6 py-3 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors font-bold font-baloo-2"
        >
          <span>🔒</span>
          Privacy Policy
        </button>
        <button
          onClick={() => setShowTermsOfService(true)}
          className="flex items-center gap-2 px-6 py-3 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors font-bold font-baloo-2"
        >
          <span>📜</span>
          Terms of Service
        </button>
      </section>

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="bg-page-bg rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-xl sm:text-2xl text-white font-baloo-2 font-bold">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="text-white/70 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-80px)] text-white/90 space-y-4">
              <p className="text-sm text-white/60">Last updated: January 12, 2025</p>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">1. Introduction</h3>
                <p>Welcome to Radiordle. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">2. Information We Collect</h3>
                <p><strong>Local Storage Data:</strong> We store your game progress, statistics, and preferences locally on your device using browser local storage. This data never leaves your device unless you choose to share your results.</p>
                <p><strong>Anonymous Usage Data:</strong> We collect anonymous, aggregated statistics about game completion rates to display community statistics. This data cannot be used to identify individual users.</p>
                <p><strong>Feedback Submissions:</strong> If you voluntarily submit feedback, we collect the content of your message and a device fingerprint for rate-limiting purposes only.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">3. How We Use Your Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>To save your game progress and statistics locally</li>
                  <li>To display anonymous community statistics</li>
                  <li>To respond to feedback and improve the game</li>
                  <li>To prevent abuse of our feedback system</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">4. Data Sharing</h3>
                <p>We do not sell, trade, or share your personal information with third parties. Anonymous, aggregated statistics may be displayed publicly on the website.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">5. Cookies and Local Storage</h3>
                <p>We use browser local storage to save your game state and preferences. We do not use tracking cookies or third-party analytics services. You can clear this data at any time through your browser settings.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">6. Data Security</h3>
                <p>Your game data is stored locally on your device. Any data transmitted to our servers (such as anonymous statistics or feedback) is encrypted using HTTPS.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">7. Children&apos;s Privacy</h3>
                <p>Radiordle is intended for educational purposes and is suitable for users of all ages. We do not knowingly collect personal information from children under 13.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">8. Your Rights</h3>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Clear your local game data at any time via browser settings</li>
                  <li>Request information about any data we hold</li>
                  <li>Request deletion of any feedback submissions</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">9. Changes to This Policy</h3>
                <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">10. Contact Us</h3>
                <p>If you have questions about this Privacy Policy, please contact us through our GitHub repository or feedback form.</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsOfService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowTermsOfService(false)}>
          <div className="bg-page-bg rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-xl sm:text-2xl text-white font-baloo-2 font-bold">Terms of Service</h2>
              <button
                onClick={() => setShowTermsOfService(false)}
                className="text-white/70 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-80px)] text-white/90 space-y-4">
              <p className="text-sm text-white/60">Last updated: January 12, 2025</p>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">1. Acceptance of Terms</h3>
                <p>By accessing and using Radiordle, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the website.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">2. Description of Service</h3>
                <p>Radiordle is a free, web-based educational game that presents daily radiology puzzles. The service is provided &quot;as is&quot; and is intended for educational and entertainment purposes only.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">3. Medical Disclaimer</h3>
                <p className="font-semibold text-yellow-300">IMPORTANT: Radiordle is NOT a medical diagnostic tool.</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>The content is for educational and entertainment purposes only</li>
                  <li>Do not use Radiordle for clinical decision-making</li>
                  <li>Always consult qualified healthcare professionals for medical advice</li>
                  <li>The diagnoses presented may be simplified for educational purposes</li>
                  <li>We make no warranties about the accuracy or completeness of medical information</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">4. User Conduct</h3>
                <p>You agree not to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use the service for any unlawful purpose</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the service</li>
                  <li>Submit false or misleading feedback</li>
                  <li>Use automated systems to access the service excessively</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">5. Intellectual Property</h3>
                <p>The Radiordle name, logo, and original content are protected by intellectual property laws. Medical images are sourced from open-source collections and used in accordance with their respective licenses.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">6. Limitation of Liability</h3>
                <p>To the fullest extent permitted by law, Radiordle and its creators shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use or inability to use the service</li>
                  <li>Any medical decisions made based on content viewed on this site</li>
                  <li>Unauthorized access to your data</li>
                  <li>Any interruption or cessation of the service</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">7. Availability</h3>
                <p>We strive to keep Radiordle available 24/7, but we do not guarantee uninterrupted access. We may modify, suspend, or discontinue the service at any time without notice.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">8. Changes to Terms</h3>
                <p>We reserve the right to modify these Terms of Service at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">9. Governing Law</h3>
                <p>These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white">10. Contact</h3>
                <p>For questions about these Terms of Service, please contact us through our GitHub repository or feedback form.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
