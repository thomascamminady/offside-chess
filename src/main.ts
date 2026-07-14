import "./style.css";
import { Game } from "./chess/game";
import { pseudoLegalMovesFrom } from "./chess/moves";
import { offsideBoundary, isOnside } from "./chess/offside";
import { findKing, isInCheck } from "./chess/board";
import { type Color, type Move, type Square, fileOf, rankOf, squareOf, toAlgebraic, otherColor } from "./chess/types";
import { chooseEngineMove, type Difficulty } from "./chess/engine";
import { offsideTrapPosition } from "./chess/examples";
import { GLYPHS } from "./pieces";

type HumanSide = Color | "both";

interface UiState {
  selected: Square | null;
  legalTargets: Move[];
  lastMove: { from: Square; to: Square } | null;
  flashSquare: Square | null;
  flipped: boolean;
  humanSide: HumanSide;
  difficulty: Difficulty;
  thinking: boolean;
}

const game = new Game();
const ui: UiState = {
  selected: null,
  legalTargets: [],
  lastMove: null,
  flashSquare: null,
  flipped: false,
  humanSide: "w",
  difficulty: "medium",
  thinking: false,
};

const colorName = (c: Color) => (c === "w" ? "White" : "Black");

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app root");

app.innerHTML = `
  <header class="hero">
    <h1 class="wordmark"><span class="offside-word">Offside</span><span class="flag-mark" aria-hidden="true">&#9873;</span><span class="chess-word">Chess</span></h1>
    <p class="tagline">Standard chess, plus one law borrowed from soccer: nothing but a pawn may play itself onside.</p>
  </header>
  <main class="layout">
    <section class="board-wrap">
      <div class="board-frame" id="board-frame">
        <div class="board" id="board"></div>
      </div>
      <p class="board-caption" id="board-caption"></p>
    </section>
    <aside class="panel">
      <div class="status" id="status"></div>
      <div class="controls">
        <div class="control-row">
          <span>Play as</span>
          <select id="side-select">
            <option value="w">White vs. engine</option>
            <option value="b">Black vs. engine</option>
            <option value="both">Two player</option>
          </select>
        </div>
        <div class="control-row">
          <span>Engine strength</span>
          <select id="difficulty-select">
            <option value="easy">Sunday league</option>
            <option value="medium" selected>Club player</option>
            <option value="hard">First team</option>
          </select>
        </div>
        <div class="button-row">
          <button class="action primary" id="new-game">New match</button>
          <button class="action" id="flip-board">Flip board</button>
        </div>
        <button class="action" id="load-example">Load example: The Offside Trap</button>
      </div>
      <ol class="move-list" id="move-list"></ol>
      <details class="rules">
        <summary>The offside law</summary>
        <p>
          A piece other than a pawn may never move to a square further into enemy
          territory than the opponent's <em>second</em>-deepest piece &mdash; their
          deepest piece plays "goalkeeper" and doesn't count. You're always free to
          manoeuvre in your own half. Pawns are exempt entirely, including when
          they promote.
        </p>
        <ul>
          <li>The dashed line on the board shows where the side to move is currently offside.</li>
          <li>Push the opponent's defenders back and the line retreats with them.</li>
          <li>If the opponent has nothing left but their king, the line disappears &mdash; an open pitch.</li>
          <li>Not obvious yet? Load the example below to see it bite immediately.</li>
        </ul>
      </details>
    </aside>
  </main>
  <footer class="credit">
    Rule inspired by <a href="https://xkcd.com/3268/" target="_blank" rel="noopener noreferrer">xkcd #3268, &ldquo;Offside&rdquo;</a>.
  </footer>
`;

function required<T extends Element>(el: T | null, name: string): T {
  if (!el) throw new Error(`app shell failed to build: missing ${name}`);
  return el;
}

const boardEl = required(document.querySelector<HTMLDivElement>("#board"), "#board");
const boardFrameEl = required(document.querySelector<HTMLDivElement>("#board-frame"), "#board-frame");
const captionEl = required(document.querySelector<HTMLParagraphElement>("#board-caption"), "#board-caption");
const statusEl = required(document.querySelector<HTMLDivElement>("#status"), "#status");
const moveListEl = required(document.querySelector<HTMLOListElement>("#move-list"), "#move-list");
const sideSelect = required(document.querySelector<HTMLSelectElement>("#side-select"), "#side-select");
const difficultySelect = required(
  document.querySelector<HTMLSelectElement>("#difficulty-select"),
  "#difficulty-select",
);
const newGameBtn = required(document.querySelector<HTMLButtonElement>("#new-game"), "#new-game");
const flipBoardBtn = required(document.querySelector<HTMLButtonElement>("#flip-board"), "#flip-board");
const loadExampleBtn = required(document.querySelector<HTMLButtonElement>("#load-example"), "#load-example");

function visualToSquare(row: number, col: number, flipped: boolean): Square {
  const rank = flipped ? row : 7 - row;
  const file = flipped ? 7 - col : col;
  return squareOf(file, rank);
}

function pieceName(type: Move["piece"]["type"]): string {
  switch (type) {
    case "p":
      return "pawn";
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "r":
      return "rook";
    case "q":
      return "queen";
    case "k":
      return "king";
  }
}

function renderBoard() {
  const turnColor = game.state.turn;
  const inCheckNow = isInCheck(game.state.board, turnColor);
  const checkedKingSq = inCheckNow ? findKing(game.state.board, turnColor) : null;

  let html = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = visualToSquare(row, col, ui.flipped);
      const file = fileOf(sq);
      const rank = rankOf(sq);
      const isLight = (file + rank) % 2 === 1;
      const piece = game.state.board[sq];

      const classes = ["square", isLight ? "light" : "dark"];
      const targetMove = ui.legalTargets.find((m) => m.to === sq);
      const canClick = !ui.thinking && !game.isGameOver && (ui.humanSide === "both" || ui.humanSide === turnColor);
      if (canClick) classes.push("playable");
      if (ui.selected === sq) classes.push("selected");
      if (ui.lastMove?.from === sq) classes.push("last-from");
      if (ui.lastMove?.to === sq) classes.push("last-to");
      if (checkedKingSq === sq) classes.push("in-check");
      if (targetMove) classes.push("move-dot");
      if (targetMove && (targetMove.captured || targetMove.isEnPassant)) classes.push("capture");
      if (ui.flashSquare === sq) classes.push("offside-flash");

      const label = piece
        ? `${toAlgebraic(sq)}, ${piece.color === "w" ? "White" : "Black"} ${pieceName(piece.type)}`
        : toAlgebraic(sq);

      html += `<button type="button" class="${classes.join(" ")}" data-square="${sq}" aria-label="${label}">`;
      if (row === 7) html += `<span class="coord file">${"abcdefgh"[file]}</span>`;
      if (col === 0) html += `<span class="coord rank">${rank + 1}</span>`;
      if (piece) {
        html += `<span class="piece ${piece.color === "w" ? "white" : "black"}">${GLYPHS[piece.type]}</span>`;
      }
      html += "</button>";
    }
  }
  boardEl.innerHTML = html;

  renderOffsideLine();
}

function renderOffsideLine() {
  const turnColor = game.state.turn;
  const boundary = offsideBoundary(game.state.board, turnColor);
  const unrestricted = turnColor === "w" ? boundary === 7 : boundary === 0;
  if (unrestricted) return;

  const gapRank = turnColor === "w" ? boundary + 0.5 : boundary - 0.5;
  const rowSpace = ui.flipped ? gapRank : 7 - gapRank;
  const topPercent = (rowSpace / 8) * 100;

  const line = document.createElement("div");
  line.className = "offside-line";
  line.style.top = `${topPercent}%`;
  line.innerHTML = `<span class="flagpole" aria-hidden="true">&#9873;</span>`;
  boardEl.appendChild(line);
}

function renderCaption() {
  const turnColor = game.state.turn;
  const boundary = offsideBoundary(game.state.board, turnColor);
  const unrestricted = turnColor === "w" ? boundary === 7 : boundary === 0;

  if (unrestricted) {
    captionEl.textContent = `${colorName(turnColor)} has an open pitch — no offside line right now.`;
    return;
  }

  const rankLabel = boundary + 1;
  captionEl.innerHTML = `${colorName(turnColor)}'s offside line: pieces (not pawns) can't advance past <strong>rank ${rankLabel}</strong>.`;
}

function renderStatus() {
  const status = game.status;
  const turnColor = game.state.turn;
  statusEl.classList.remove("check", "over");

  let text = "";
  switch (status) {
    case "ongoing":
      text = `${colorName(turnColor)} to move`;
      break;
    case "check":
      text = `${colorName(turnColor)} is in check`;
      statusEl.classList.add("check");
      break;
    case "checkmate":
      text = `Checkmate — ${colorName(otherColor(turnColor))} wins`;
      statusEl.classList.add("over");
      break;
    case "stalemate":
      text = "Draw by stalemate";
      statusEl.classList.add("over");
      break;
    case "draw-insufficient":
      text = "Draw — insufficient material";
      statusEl.classList.add("over");
      break;
    case "draw-fifty-move":
      text = "Draw — 50-move rule";
      statusEl.classList.add("over");
      break;
    case "draw-repetition":
      text = "Draw by repetition";
      statusEl.classList.add("over");
      break;
  }
  if (ui.thinking) text += " · thinking…";
  statusEl.textContent = text;

  boardFrameEl.classList.toggle("thinking", ui.thinking);
}

function renderMoveList() {
  if (game.history.length === 0) {
    moveListEl.innerHTML = `<li class="move-list-empty">No moves yet — make the first move.</li>`;
    return;
  }

  let html = "";
  for (let i = 0; i < game.history.length; i += 2) {
    const moveNumber = i / 2 + 1;
    const white = game.history[i];
    const black = game.history[i + 1];
    html += `<li class="num">${moveNumber}.</li>`;
    html += `<li class="san">${white.san}</li>`;
    html += `<li class="san">${black ? black.san : ""}</li>`;
  }
  moveListEl.innerHTML = html;
  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function render() {
  renderBoard();
  renderCaption();
  renderStatus();
  renderMoveList();
}

function triggerFlash(sq: Square) {
  ui.flashSquare = sq;
  render();
  window.setTimeout(() => {
    if (ui.flashSquare === sq) {
      ui.flashSquare = null;
      render();
    }
  }, 550);
}

function clearSelection() {
  ui.selected = null;
  ui.legalTargets = [];
}

function performMove(from: Square, to: Square, promotion?: Move["promotion"]) {
  const entry = game.makeMove(from, to, promotion);
  clearSelection();
  if (entry) {
    ui.lastMove = { from, to };
  }
  render();
  window.setTimeout(maybeEngineMove, 20);
}

function maybeEngineMove() {
  if (game.isGameOver) return;
  const turnColor = game.state.turn;
  const engineControls = ui.humanSide !== "both" && ui.humanSide !== turnColor;
  if (!engineControls) return;

  ui.thinking = true;
  render();

  window.setTimeout(() => {
    const move = chooseEngineMove(game.state, ui.difficulty);
    if (move) {
      game.makeMove(move.from, move.to, move.promotion);
      ui.lastMove = { from: move.from, to: move.to };
    }
    ui.thinking = false;
    render();
  }, 40);
}

function handleSquareClick(sq: Square) {
  if (ui.thinking || game.isGameOver) return;
  const turnColor = game.state.turn;
  const humanControlsTurn = ui.humanSide === "both" || ui.humanSide === turnColor;
  if (!humanControlsTurn) return;

  const clickedPiece = game.state.board[sq];

  if (ui.selected === null) {
    if (clickedPiece && clickedPiece.color === turnColor) {
      ui.selected = sq;
      ui.legalTargets = game.getLegalMoves(sq);
      render();
    }
    return;
  }

  if (sq === ui.selected) {
    clearSelection();
    render();
    return;
  }

  const legalMove = ui.legalTargets.find((m) => m.to === sq);
  if (legalMove) {
    performMove(ui.selected, sq, legalMove.promotion);
    return;
  }

  if (clickedPiece && clickedPiece.color === turnColor) {
    ui.selected = sq;
    ui.legalTargets = game.getLegalMoves(sq);
    render();
    return;
  }

  const from = ui.selected;
  const pseudo = pseudoLegalMovesFrom(game.state, from).find((m) => m.to === sq);
  clearSelection();
  if (pseudo) {
    const boundary = offsideBoundary(game.state.board, turnColor);
    const blockedByOffside = pseudo.piece.type !== "p" && !isOnside(turnColor, rankOf(sq), boundary);
    if (blockedByOffside) triggerFlash(sq);
  }
  render();
}

boardEl.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const squareEl = target.closest<HTMLElement>(".square");
  if (!squareEl) return;
  const sq = Number(squareEl.dataset.square);
  handleSquareClick(sq);
});

newGameBtn.addEventListener("click", () => {
  game.reset();
  clearSelection();
  ui.lastMove = null;
  ui.flashSquare = null;
  ui.flipped = ui.humanSide === "b";
  render();
  window.setTimeout(maybeEngineMove, 20);
});

flipBoardBtn.addEventListener("click", () => {
  ui.flipped = !ui.flipped;
  render();
});

loadExampleBtn.addEventListener("click", () => {
  game.loadPosition(offsideTrapPosition(), "w");
  clearSelection();
  ui.lastMove = null;
  ui.flashSquare = null;
  ui.flipped = false;
  ui.humanSide = "w";
  sideSelect.value = "w";
  render();
});

sideSelect.addEventListener("change", () => {
  ui.humanSide = sideSelect.value as HumanSide;
  render();
  window.setTimeout(maybeEngineMove, 20);
});

difficultySelect.addEventListener("change", () => {
  ui.difficulty = difficultySelect.value as Difficulty;
});

render();
