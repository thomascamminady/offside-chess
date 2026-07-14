import { type Board, type Color, rankOf, otherColor } from "./types";

/**
 * The Offside Rule (xkcd #3268)
 * ------------------------------
 * Non-pawn pieces may never move to a square that is "offside": further into
 * enemy territory than the enemy's own second-deepest piece, mirroring
 * soccer's offside law (you can't be ahead of the second-last defender when
 * the ball is played).
 *
 * For a mover of `color`, look at every piece the opponent has, ranked by
 * how close it sits to the opponent's own back rank ("depth"). The single
 * deepest opponent piece is the "goalkeeper" and is ignored; the *next*
 * deepest sets the offside line. A mover can never be offside in its own
 * half regardless of that line (mirrors "you can't be offside past the
 * halfway line into your own half").
 *
 * If the opponent has only one piece left (just the king), there is no
 * second-deepest piece, so no offside line applies.
 */

const HALFWAY_INDEX_W = 3; // rank 4, last rank of White's own half
const HALFWAY_INDEX_B = 4; // rank 5, last rank of Black's own half

/**
 * Returns the furthest-advanced rank index (0-7) a piece of `color` is
 * allowed to move to. Moving to a rank beyond this (further into enemy
 * territory) is offside and illegal for non-pawn pieces.
 */
export function offsideBoundary(board: Board, color: Color): number {
  const opponent = otherColor(color);

  // Depth = distance from the opponent's own back rank (0 = sitting at home).
  const backRank = opponent === "w" ? 0 : 7;
  const depths: number[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece && piece.color === opponent) {
      depths.push(Math.abs(rankOf(sq) - backRank));
    }
  }

  if (depths.length < 2) {
    // No second-last defender: no offside restriction at all.
    return color === "w" ? 7 : 0;
  }

  depths.sort((a, b) => a - b); // ascending depth: index 0 = deepest ("goalkeeper")
  const secondDeepestDepth = depths[1];
  const secondDeepestRank = backRank + (opponent === "w" ? secondDeepestDepth : -secondDeepestDepth);

  if (color === "w") {
    return Math.max(secondDeepestRank, HALFWAY_INDEX_W);
  }
  return Math.min(secondDeepestRank, HALFWAY_INDEX_B);
}

export function isOnside(color: Color, destRank: number, boundary: number): boolean {
  return color === "w" ? destRank <= boundary : destRank >= boundary;
}

/** Convenience used by the UI to draw the offside line for the side about to move. */
export function offsideLineRank(board: Board, color: Color): number {
  return offsideBoundary(board, color);
}
