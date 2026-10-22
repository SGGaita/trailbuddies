/* Stroke icons (ported from the prototype). Paths are constants in this file. */
export const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  speak: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  home: '<path d="M3 11l9-7 9 7v9H3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-4 3.5-5.5 7-5.5s6 1.5 7 5.5"/><circle cx="17" cy="7" r="3"/><path d="M17 13.5c2.5 0 4.5 1.5 5 4.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  game: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11.5" r="1"/><circle cx="18.5" cy="14" r="1"/>',
  shop: '<path d="M4 8h16l-1.5 12h-13z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  room: '<path d="M3 20V9l9-6 9 6v11"/><rect x="9" y="13" width="6" height="7"/>',
  badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-2 7 5.5-3 5.5 3-2-7"/>',
  wish: '<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16l-5.4 3.2 1.3-6-4.5-4 6-.6z"/>',
  chart:
    '<path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  share:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  assign: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 11h6M9 15h4"/>',
  tablet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 18h2"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  trail:
    '<path d="M5 20c0-5 14-3 14-8S7 9 7 4"/><circle cx="7" cy="4" r="1.5"/><circle cx="5" cy="20" r="1.5"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
  thumbup:
    '<path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 6.5A2 2 0 0 1 17.3 20H7"/>',
  thumbdown:
    '<path d="M7 13V4H4v9zM7 13l4 8c1.5 0 2.5-1 2.5-2.5V15h5a2 2 0 0 0 2-2.3l-1.2-6.5A2 2 0 0 0 17.3 4H7"/>',
  sparkle:
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
};

/**
 * @param {{ name: keyof typeof ICONS, size?: number, title?: string, style?: React.CSSProperties }} props
 */
export default function Icon({ name, size = 22, title, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      style={{ flex: "none", ...style }}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : "") + (ICONS[name] || "") }}
    />
  );
}
