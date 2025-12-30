import Link from 'next/link';
import Image from 'next/image';
import ArchiveBrowser from '@/components/ArchiveBrowser';

export default function ArchivePage() {
  return (
    <div className="min-h-screen relative overflow-y-auto overflow-x-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2e5a] via-[#233b6e] to-[#1a2e5a]">
        {/* Radial Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.75) 88%, rgba(0, 0, 0, 0.9) 100%)',
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6">
          {/* Back Button */}
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-[#3d4d68] hover:bg-[#4a5b7a] text-white rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-bold font-baloo-2">Back</span>
          </Link>

          {/* Logo and Title - Centered */}
          <div className="flex items-center gap-1">
            <div className="relative w-16 h-16">
              <Image
                src="/radle_icon.svg"
                alt="Radiordle Icon"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h1 className="text-[3.375rem] text-white font-baloo-2 font-extrabold tracking-tight">
              Radiordle
            </h1>
          </div>

          {/* Spacer for centering */}
          <div className="w-[100px]"></div>
        </div>

        {/* Archive Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl text-white font-bold font-baloo-2">Archive</h2>
          <p className="text-gray-300 mt-2">Play any past puzzle</p>
        </div>

        {/* Archive Browser */}
        <div className="flex-1 px-4 pb-20">
          <ArchiveBrowser />
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-gradient-to-r from-[#0f1c2e] via-[#1a2744] to-[#0f1c2e] border-t border-white border-opacity-5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <p className="text-white text-center text-sm font-baloo-2 opacity-70">
            Radiordle is for entertainment and educational use only and does not provide medical
            advice. Always consult a qualified healthcare professional for medical concerns.
          </p>
        </div>
      </footer>
    </div>
  );
}
