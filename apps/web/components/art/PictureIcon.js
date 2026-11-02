/**
 * FAM-02: the 9 pictures of a picture password, drawn in code (no image files) so they're
 * crisp at any size, work offline and are easy to tell apart for a 4-year-old.
 * @param {{ id: string, size?: number }} props
 */
export default function PictureIcon({ id, size = 64 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      {SHAPES[id] || null}
    </svg>
  );
}

const SHAPES = {
  apple: (
    <>
      <path
        d="M32 20c-6-6-20-4-20 12 0 14 10 24 16 24 2 0 3-1 4-1s2 1 4 1c6 0 16-10 16-24 0-16-14-18-20-12z"
        fill="#e53935"
      />
      <path d="M32 20c0-6 2-10 6-12" stroke="#6d4c41" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M34 14c4-6 12-6 14-2-4 4-10 5-14 2z" fill="#43a047" />
      <ellipse cx="22" cy="30" rx="3" ry="6" fill="#ff8a80" opacity=".7" />
    </>
  ),
  banana: (
    <>
      <path d="M10 22c4 22 26 32 44 22 2-1 1-4-1-4-16 4-30-6-36-20-1-3-8-2-7 2z" fill="#fdd835" />
      <path d="M12 22c6 14 18 22 36 20" stroke="#f9a825" strokeWidth="2" fill="none" />
      <path d="M9 19l3-6 4 3-2 5z" fill="#6d4c41" />
    </>
  ),
  cat: (
    <>
      <path d="M14 24l2-14 10 8h12l10-8 2 14v14c0 10-8 18-18 18S14 48 14 38z" fill="#ffa726" />
      <circle cx="25" cy="32" r="3" fill="#212121" />
      <circle cx="39" cy="32" r="3" fill="#212121" />
      <path d="M29 40h6l-3 3z" fill="#d84315" />
      <path d="M20 40h-10M20 43l-9 3M44 40h10M44 43l9 3" stroke="#5d4037" strokeWidth="1.5" />
    </>
  ),
  dog: (
    <>
      <ellipse cx="32" cy="36" rx="16" ry="17" fill="#a1887f" />
      <ellipse cx="14" cy="28" rx="6" ry="13" fill="#5d4037" />
      <ellipse cx="50" cy="28" rx="6" ry="13" fill="#5d4037" />
      <circle cx="26" cy="32" r="3" fill="#212121" />
      <circle cx="38" cy="32" r="3" fill="#212121" />
      <ellipse cx="32" cy="42" rx="5" ry="4" fill="#212121" />
      <path d="M32 46v4" stroke="#212121" strokeWidth="2" />
    </>
  ),
  fish: (
    <>
      <path d="M8 32c8-12 30-14 40 0-10 14-32 12-40 0z" fill="#29b6f6" />
      <path d="M46 32l12-10v20z" fill="#0288d1" />
      <circle cx="18" cy="30" r="3" fill="#fff" />
      <circle cx="18" cy="30" r="1.5" fill="#212121" />
      <path d="M28 24c3 5 3 11 0 16" stroke="#0288d1" strokeWidth="2" fill="none" />
    </>
  ),
  star: (
    <path
      d="M32 6l7 16 17 2-13 12 4 17-15-9-15 9 4-17L8 24l17-2z"
      fill="#ffca28"
      stroke="#f9a825"
      strokeWidth="2"
    />
  ),
  sun: (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="30"
          y="4"
          width="4"
          height="12"
          rx="2"
          fill="#ff9800"
          transform={`rotate(${i * 45} 32 32)`}
        />
      ))}
      <circle cx="32" cy="32" r="14" fill="#ffc107" />
    </>
  ),
  moon: (
    <>
      <path d="M40 8a24 24 0 1 0 16 36A20 20 0 0 1 40 8z" fill="#5c6bc0" />
      <circle cx="26" cy="30" r="3" fill="#3949ab" />
      <circle cx="34" cy="44" r="2" fill="#3949ab" />
    </>
  ),
  flower: (
    <>
      <path d="M32 40v20" stroke="#43a047" strokeWidth="4" />
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse
          key={i}
          cx="32"
          cy="16"
          rx="7"
          ry="11"
          fill="#ec407a"
          transform={`rotate(${i * 60} 32 28)`}
        />
      ))}
      <circle cx="32" cy="28" r="7" fill="#ffeb3b" />
    </>
  ),
};
