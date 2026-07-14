import {
  type Board,
  type Color,
  type Piece,
  type Square,
  fileOf,
  rankOf,
  squareOf,
  inBounds,
  otherColor,
} from "./types";

export function createInitialBoard(): Board {
  const board: Board = new Array(64).fill(null);
  const backRank: Array<Piece["type"]> = ["r", "n", "b", "q", "k", "b", "n", "r"];

  for (let file = 0; file < 8; file++) {
    board[squareOf(file, 0)] = { type: backRank[file], color: "w" };
    board[squareOf(file, 1)] = { type: "p", color: "w" };
    board[squareOf(file, 6)] = { type: "p", color: "b" };
    board[squareOf(file, 7)] = { type: backRank[file], color: "b" };
  }

  return board;
}

export function cloneBoard(board: Board): Board {
  return board.slice();
}

export function findKing(board: Board, color: Color): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece && piece.type === "k" && piece.color === color) return sq;
  }
  return null;
}

const KNIGHT_DELTAS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const KING_DELTAS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Is `sq` attacked by any piece of `byColor`? Ignores offside — attack power is unconditional. */
export function isSquareAttacked(board: Board, sq: Square, byColor: Color): boolean {
  const f = fileOf(sq);
  const r = rankOf(sq);

  // Pawn attacks: a pawn of byColor attacks diagonally "forward" from its perspective,
  // so we look one rank behind (from sq's perspective) for an enemy pawn.
  const pawnRankDelta = byColor === "w" ? -1 : 1;
  for (const df of [-1, 1]) {
    const pf = f + df;
    const pr = r + pawnRankDelta;
    if (inBounds(pf, pr)) {
      const piece = board[squareOf(pf, pr)];
      if (piece && piece.color === byColor && piece.type === "p") return true;
    }
  }

  for (const [df, dr] of KNIGHT_DELTAS) {
    const nf = f + df;
    const nr = r + dr;
    if (inBounds(nf, nr)) {
      const piece = board[squareOf(nf, nr)];
      if (piece && piece.color === byColor && piece.type === "n") return true;
    }
  }

  for (const [df, dr] of KING_DELTAS) {
    const nf = f + df;
    const nr = r + dr;
    if (inBounds(nf, nr)) {
      const piece = board[squareOf(nf, nr)];
      if (piece && piece.color === byColor && piece.type === "k") return true;
    }
  }

  for (const [df, dr] of BISHOP_DIRS) {
    let nf = f + df;
    let nr = r + dr;
    while (inBounds(nf, nr)) {
      const piece = board[squareOf(nf, nr)];
      if (piece) {
        if (piece.color === byColor && (piece.type === "b" || piece.type === "q")) return true;
        break;
      }
      nf += df;
      nr += dr;
    }
  }

  for (const [df, dr] of ROOK_DIRS) {
    let nf = f + df;
    let nr = r + dr;
    while (inBounds(nf, nr)) {
      const piece = board[squareOf(nf, nr)];
      if (piece) {
        if (piece.color === byColor && (piece.type === "r" || piece.type === "q")) return true;
        break;
      }
      nf += df;
      nr += dr;
    }
  }

  return false;
}

export function isInCheck(board: Board, color: Color): boolean {
  const kingSq = findKing(board, color);
  if (kingSq === null) return false;
  return isSquareAttacked(board, kingSq, otherColor(color));
}
