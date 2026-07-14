export default function Icon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e8c87a"/>
        <stop offset="50%" stop-color="#d4a554"/>
        <stop offset="100%" stop-color="#b8873a"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="52" r="30" fill="none" stroke="url(#g)" stroke-width="7"/>
    <circle cx="50" cy="52" r="30" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-dasharray="8 14" stroke-dashoffset="-4"/>
    <ellipse cx="50" cy="26" rx="10" ry="9" fill="none" stroke="url(#g)" stroke-width="3"/>
    <circle cx="50" cy="18" r="4" fill="#e8c87a" opacity="0.9"/>
  </svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
