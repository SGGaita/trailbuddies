// LES-18: which recording plays for a line. A grown-up's own recording of the word wins, then
// a voice-pack clip, then (null) the device voice.

/**
 * @param {string} text what is being said
 * @param {string | undefined} clipId the voice-pack asset for this line, if any
 * @param {{ parent: Map<string, string>, pack: Map<string, string> }} clips urls by key
 *   (parent recordings are keyed by the lower-cased word)
 * @returns {string | null}
 */
export function chooseClip(text, clipId, { parent, pack }) {
  const word = String(text || "").trim().toLowerCase();
  return (word && parent.get(word)) || (clipId && pack.get(clipId)) || null;
}
