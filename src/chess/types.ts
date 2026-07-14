export type Color = "w" | "b";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  type: PieceType;
  color: Color;
}

/** Square index 0-63, index = rank * 8 + file. Rank 0 = rank "1", file 0 = file "a". */
export type Square = number;

export type Board = (Piece | null)[];

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured: Piece | null;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastle?: "K" | "Q";
  isDoublePawnPush?: boolean;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export type GameStatus =
  | "ongoing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw-insufficient"
  | "draw-fifty-move"
  | "draw-repetition";

export interface GameState {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export function fileOf(sq: Square): number {
  return sq % 8;
}

export function rankOf(sq: Square): number {
  return Math.floor(sq / 8);
}

export function squareOf(file: number, rank: number): Square {
  return rank * 8 + file;
}

export function inBounds(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

export function toAlgebraic(sq: Square): string {
  return `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
}

export function fromAlgebraic(alg: string): Square {
  const file = FILES.indexOf(alg[0] as (typeof FILES)[number]);
  const rank = parseInt(alg[1], 10) - 1;
  return squareOf(file, rank);
}

export function otherColor(color: Color): Color {
  return color === "w" ? "b" : "w";
}
