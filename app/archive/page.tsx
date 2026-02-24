import Link from 'next/link';
import Image from 'next/image';
import ArchiveBrowser from '@/components/ArchiveBrowser';

export default function ArchivePage() {
  return (
    <div className="min-h-screen relative overflow-y-auto overflow-x-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-page-bg via-page-bg-mid to-page-bg">
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
        <div className="flex justify-between items-center p-4 sm:p-6">
          {/* Back Button */}
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors flex-shrink-0"
          >
            <span className="text-xl sm:text-2xl">←</span>
          </Link>

          {/* Logo and Title - Centered */}
          <div className="flex items-center gap-1 drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex-shrink-0">
              <Image
                src="/radle_icon.svg"
                alt="Radiordle Icon"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-[3.375rem] text-white font-baloo-2 font-extrabold tracking-tight">
              Radiordle
            </h1>
          </div>

          {/* Spacer for centering */}
          <div className="w-10 sm:w-12"></div>
        </div>

        {/* Archive Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl text-white font-bold font-baloo-2">Archive</h2>
          <p className="text-gray-300 mt-2 font-baloo-2">Play any past puzzle!</p>
        </div>

        {/* Archive Browser */}
        <div className="flex-1 px-4 pb-20">
          <ArchiveBrowser />
        </div>
      </div>
    </div>
  );
}
