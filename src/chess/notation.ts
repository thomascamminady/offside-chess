import { generateAllLegalMoves, applyMove } from "./moves";
import { isInCheck } from "./board";
import { type GameState, type Move, fileOf, rankOf, toAlgebraic } from "./types";

const PIECE_LETTERS: Record<string, string> = { n: "N", b: "B", r: "R", q: "Q", k: "K" };

export function moveToSAN(state: GameState, move: Move): string {
  if (move.isCastle === "K") return finishSAN(state, move, "O-O");
  if (move.isCastle === "Q") return finishSAN(state, move, "O-O-O");

  const isCapture = move.captured !== null || move.isEnPassant;

  if (move.piece.type === "p") {
    const base = isCapture
      ? `${"abcdefgh"[fileOf(move.from)]}x${toAlgebraic(move.to)}`
      : toAlgebraic(move.to);
    const promo = move.promotion ? `=${PIECE_LETTERS[move.promotion]}` : "";
    return finishSAN(state, move, `${base}${promo}`);
  }

  const letter = PIECE_LETTERS[move.piece.type];
  const disambiguation = getDisambiguation(state, move);
  const base = `${letter}${disambiguation}${isCapture ? "x" : ""}${toAlgebraic(move.to)}`;
  return finishSAN(state, move, base);
}

function getDisambiguation(state: GameState, move: Move): string {
  const legalMoves = generateAllLegalMoves(state);
  const ambiguous = legalMoves.filter(
    (m) => m.piece.type === move.piece.type && m.to === move.to && m.from !== move.from,
  );
  if (ambiguous.length === 0) return "";

  const sameFile = ambiguous.some((m) => fileOf(m.from) === fileOf(move.from));
  const sameRank = ambiguous.some((m) => rankOf(m.from) === rankOf(move.from));

  if (!sameFile) return "abcdefgh"[fileOf(move.from)];
  if (!sameRank) return String(rankOf(move.from) + 1);
  return toAlgebraic(move.from);
}

function finishSAN(state: GameState, move: Move, base: string): string {
  const next = applyMove(state, move);
  const inCheck = isInCheck(next.board, next.turn);
  if (!inCheck) return base;
  const hasReply = generateAllLegalMoves(next).length > 0;
  return `${base}${hasReply ? "+" : "#"}`;
}
