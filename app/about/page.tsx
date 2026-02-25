import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import LegalModals from '@/components/LegalModals';

export const metadata: Metadata = {
  title: 'About - Radiordle',
  description: 'Learn about Radiordle, the daily radiology puzzle game designed for medical students, radiology residents, and healthcare professionals.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen relative overflow-y-auto overflow-x-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-page-bg via-page-bg-mid to-page-bg">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.75) 88%, rgba(0, 0, 0, 0.9) 100%)'
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-bold font-baloo-2">Back to Game</span>
          </Link>

          <div className="flex items-center gap-1 drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16">
              <Image
                src="/radle_icon.svg"
                alt="Radiordle Icon"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl text-white font-baloo-2 font-extrabold tracking-tight">
              Radiordle
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-3xl space-y-8">

            {/* About Section */}
            <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl text-white font-baloo-2 font-bold mb-4">
                About Radiordle
              </h2>
              <div className="space-y-4 text-white/90">
                <p className="text-lg">
                  Radiordle is a daily radiology puzzle game inspired by Wordle. Each day, players are presented with a medical imaging case and must guess the correct diagnosis.
                </p>
                <p>
                  The game is designed to be both educational and entertaining, helping medical students, radiology residents, and healthcare professionals sharpen their diagnostic skills in a fun, gamified format.
                </p>
                <p>
                  New puzzles are released daily at midnight EST, featuring a variety of imaging modalities including X-rays, CT scans, MRIs, and ultrasounds.
                </p>
              </div>
            </section>

            {/* How to Play */}
            <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl text-white font-baloo-2 font-bold mb-4">
                How to Play
              </h2>
              <ul className="space-y-3 text-white/90">
                <li className="flex items-start gap-3">
                  <span className="text-xl">1.</span>
                  <span>View the medical image and make your best diagnosis guess</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">2.</span>
                  <span>After each incorrect guess, a new hint is revealed to help narrow down the diagnosis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">3.</span>
                  <span>You have 5 attempts to guess the correct diagnosis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">4.</span>
                  <span>Share your results and compare with colleagues!</span>
                </li>
              </ul>
            </section>

            {/* Educational Purpose */}
            <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl text-white font-baloo-2 font-bold mb-4">
                Educational Purpose
              </h2>
              <div className="space-y-4 text-white/90">
                <p>
                  Radiordle serves as a supplementary educational tool for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Medical students learning radiology fundamentals</li>
                  <li>Radiology residents preparing for board exams</li>
                  <li>Healthcare professionals maintaining diagnostic skills</li>
                  <li>Anyone interested in medical imaging education</li>
                </ul>
                <p className="mt-4 text-sm text-white/70 italic">
                  Note: Radiordle is designed for entertainment and educational purposes only. It does not provide medical advice and should not be used for clinical decision-making. Always consult a qualified healthcare professional for medical concerns.
                </p>
              </div>
            </section>

            {/* Contact Section */}
            <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl text-white font-baloo-2 font-bold mb-4">
                Contact & Contribute
              </h2>
              <div className="space-y-4 text-white/90">
                <p>
                  Have feedback, suggestions, or found a bug? We would love to hear from you!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <a
                    href="https://github.com/kishanasokan/Radwordle"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[#24292e] hover:bg-[#3a3f44] text-white rounded-lg transition-colors font-bold"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub Repository
                  </a>
                  <Link
                    href="/"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors font-bold"
                  >
                    <span>💬</span>
                    Send Feedback
                  </Link>
                </div>
              </div>
            </section>

            {/* Image Credits */}
            <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl text-white font-baloo-2 font-bold mb-4">
                Image Sources & Credits
              </h2>
              <div className="space-y-4 text-white/90">
                <p>
                  All medical images used in Radiordle are sourced from open-source or free-use collections and are used in accordance with their respective licenses. We are grateful to the medical imaging community for making educational resources freely available.
                </p>
              </div>
            </section>

            {/* Disclaimer */}
            <section className="bg-white/5 rounded-xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-2xl sm:text-3xl text-white font-baloo-2 font-bold mb-4">
                Disclaimer
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Radiordle is designed for entertainment and general educational interest only and does not provide medical advice. Users should consult a qualified healthcare professional for medical concerns. All images used are sourced from open-source or free-use collections and are used in accordance with their licenses.
              </p>
            </section>

            {/* Legal Buttons */}
            <LegalModals />

          </div>
        </div>

        {/* Footer */}
        <footer className="relative bg-gradient-to-r from-page-bg-dark via-footer-bg to-page-bg-dark border-t border-white border-opacity-5">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <p className="text-white text-center text-xs font-baloo-2 opacity-70">
              © {new Date().getFullYear()} Radiordle. For educational and entertainment purposes only.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
