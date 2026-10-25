// The web app's version (package.json, set by next.config.mjs). Used for "What's new" and in
// error reports, so a report says which release it came from.
export const APP_VERSION = process.env.NEXT_PUBLIC_TB_VERSION || "0.0.0";
export const RELEASE = process.env.NEXT_PUBLIC_TB_RELEASE || APP_VERSION;
