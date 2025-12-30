import { ImageResponse } from 'next/og'

export const alt = 'Radiordle'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: '#1a237e',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'sans-serif',
          gap: '24px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://radiordle.org/radle_icon.svg"
          width={200}
          height={200}
          alt="Radiordle icon"
          style={{ objectFit: 'contain' }}
        />
        <span style={{ fontWeight: 'bold' }}>Radiordle</span>
      </div>
    ),
    {
      ...size,
    }
  )
}
