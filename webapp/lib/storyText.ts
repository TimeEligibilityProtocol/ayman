// The text to actually use for a Story wherever the "real" content is
// needed (AI context, manuscript export, translation, etc.): the
// transcription-error-corrected version if one exists, otherwise the raw
// verbatim transcript. transcriptOriginal itself is never modified — this
// is the single place that decides the fallback so it can't drift between
// call sites.
export function effectiveTranscript(story: {
  transcriptCorrected?: string | null;
  transcriptOriginal?: string | null;
}): string {
  return story.transcriptCorrected || story.transcriptOriginal || "";
}
