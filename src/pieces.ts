import type { PieceType } from "./chess/types";

// Using the solid ("black") unicode glyph set for both colors and tinting
// via CSS keeps rendering consistent across platforms/fonts.
export const GLYPHS: Record<PieceType, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};
