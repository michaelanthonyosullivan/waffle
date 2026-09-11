/* Waffle clone — game logic.  Board maths lives in js/waffle-core.js and the
 * sound effects in js/sound.js. */

(function () {
  "use strict";

  const Core = window.WaffleCore || { CELLS: [], SIZE: 5 };
  const CELLS = Core.CELLS;
  const CELL_COUNT = CELLS.length;
  const SIZE = Core.SIZE;
  const Sound =
    window.WaffleSound ||
    {
      isEnabled: () => false,
      setEnabled: () => false,
      toggle: () => false,
      unlock() {},
      swap() {},
      invalid() {},
      complete() {},
      win() {},
      lose() {},
    };

  const SWAP_BUDGET = 15;
  const STAR_CAP = 5;
  const DAY = 86400000;
  const EPOCH = Date.UTC(2022, 1, 13); // puzzle #1
  const RESULTS_KEY = "waffle-clone:results";
  const ARCHIVE_DAYS = 30;

  // ---------------------------------------------------------------- dom ---

  const boardEl = document.getElementById("board");
  const subtitleEl = document.getElementById("subtitle");
  const hudEl = document.getElementById("hud");
  const swapsEl = document.getElementById("swaps");
  const hudLabelEl = document.getElementById("hud-label");
  const starsEl = document.getElementById("stars");
  const shareBtn = document.getElementById("share");
  const soundBtn = document.getElementById("sound");
  const modalEl = document.getElementById("modal");
  const modalTitleEl = document.getElementById("modal-title");
  const modalBodyEl = document.getElementById("modal-body");
  const toastEl = document.getElementById("toast");

  // -------------------------------------------------------------- state ---

  let puzzle = null;
  let mode = "daily";
  let label = "";
  let number = 0;
  let acrossWords = [];
  let downWords = [];
  let solution = [];
  let tiles = [];
  let grid = []; // cell index -> tile
  let swapsRemaining = SWAP_BUDGET;
  let selected = null;
  let drag = null;
  let metrics = { size: 56, gap: 6 };
  let solved = false;
  let outOfSwaps = false;
  let revealed = false;
  let earnedStars = 0;
  let toastTimer = 0;

  function boardLocked() {
    return solved || revealed;
  }

  function boardLetters() {
    return grid.map((tile) => tile.letter);
  }

  function reducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // --------------------------------------------------------------- dates ---

  function todayNumber() {
    const now = new Date();
    const utcMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((utcMidnight - EPOCH) / DAY) + 1;
  }

  function dailyIndexFor(puzzleNumber) {
    const length = WAFFLE_DAILY.length;
    return (((puzzleNumber - 1) % length) + length) % length;
  }

  function dateFor(puzzleNumber) {
    return new Date(EPOCH + (puzzleNumber - 1) * DAY);
  }

  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  // ------------------------------------------------------------- results ---

  function loadResults() {
    try {
      const raw = window.localStorage.getItem(RESULTS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveResults(results) {
    try {
      window.localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    } catch (error) {
      /* private mode: results just will not persist */
    }
  }

  /** A solved board records its stars; a loss records -1. Solving after a loss
   *  (with no swaps left, so no stars) still counts as a win. */
  function recordResult(won, stars) {
    if (mode !== "daily") return;
    const results = loadResults();
    const key = String(number);
    const existing = results[key];

    if (won) {
      if (existing === undefined || existing < 0 || stars > existing) results[key] = stars;
      else return;
    } else {
      if (existing !== undefined) return;
      results[key] = -1;
    }
    saveResults(results);
  }

  function summarise() {
    const results = loadResults();
    const numbers = Object.keys(results)
      .map(Number)
      .sort((a, b) => a - b);

    const distribution = [0, 0, 0, 0, 0];
    let wins = 0;
    numbers.forEach((n) => {
      const stars = results[String(n)];
      if (stars >= 0) {
        wins += 1;
        if (stars > 0) distribution[stars - 1] += 1;
      }
    });

    let best = 0;
    let run = 0;
    let previous = null;
    numbers.forEach((n) => {
      if (results[String(n)] >= 0) {
        run = previous !== null && n === previous + 1 ? run + 1 : 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
      previous = n;
    });

    let current = 0;
    const today = todayNumber();
    let cursor = results[String(today)] !== undefined ? today : today - 1;
    while (results[String(cursor)] !== undefined && results[String(cursor)] >= 0) {
      current += 1;
      cursor -= 1;
    }

    return { played: numbers.length, wins, best, current, distribution, results };
  }

  // ------------------------------------------------------- puzzle set up ---

  function start(data, options) {
    puzzle = data;
    mode = options.mode;
    label = options.label;
    number = options.number || 0;

    acrossWords = data.across.slice();
    downWords = data.down.slice();
    solution = Core.solutionLetters(acrossWords, downWords);

    swapsRemaining = SWAP_BUDGET;
    selected = null;
    drag = null;
    solved = false;
    outOfSwaps = false;
    revealed = false;
    earnedStars = 0;

    subtitleEl.textContent = label;
    buildBoard();
    layout();
    renderStars(0);
    paint();
    refreshHud();
    closeModal();
    dealIn();
  }

  function startDaily() {
    const n = todayNumber();
    start(WAFFLE_DAILY[dailyIndexFor(n)], {
      mode: "daily",
      label: "Daily Waffle #" + n + " · " + formatDate(dateFor(n)),
      number: n,
    });
  }

  function startArchive(n) {
    start(WAFFLE_DAILY[dailyIndexFor(n)], {
      mode: "archive",
      label: "Archive Waffle #" + n + " · " + formatDate(dateFor(n)),
      number: n,
    });
  }

  function startPractice() {
    const index = Math.floor(Math.random() * WAFFLE_PRACTICE.length);
    start(WAFFLE_PRACTICE[index], { mode: "practice", label: "Practice Waffle", number: 0 });
  }

  function restart() {
    start(puzzle, { mode, label, number });
  }

  function buildBoard() {
    boardEl.textContent = "";
    tiles = [];
    grid = [];

    for (let i = 0; i < CELL_COUNT; i += 1) {
      const tile = {
        el: document.createElement("div"),
        letter: puzzle.board[i],
        cell: i,
        baseX: 0,
        baseY: 0,
        index: i,
        mark: "",
        locked: false,
      };
      tile.el.className = "tile";
      tile.el.textContent = tile.letter;
      tile.el.style.setProperty("--i", String(i));
      tile.el.setAttribute("role", "gridcell");
      tile.el.tabIndex = 0;
      tile.el.addEventListener("pointerdown", (event) => onPointerDown(event, tile));
      tile.el.addEventListener("keydown", (event) => onKeyDown(event, tile));
      boardEl.appendChild(tile.el);
      tiles.push(tile);
      grid[i] = tile;
    }
  }

  // ------------------------------------------------------------- layout ---

  function offsetFor(x, y) {
    const step = metrics.size + metrics.gap;
    return { left: x * step, top: y * step };
  }

  // Tiles are positioned with the standalone `translate` property, which leaves
  // `scale` and `transform` free for the lift, pop and shake animations.
  function placeTile(tile) {
    const cell = CELLS[tile.cell];
    const offset = offsetFor(cell.x, cell.y);
    tile.baseX = offset.left;
    tile.baseY = offset.top;
    tile.el.style.translate = offset.left + "px " + offset.top + "px";
  }

  function layout() {
    const width = boardEl.clientWidth;
    if (!width) return;
    // Fractional sizes keep the board exactly square instead of leaving a few
    // pixels of slack on the right edge.
    const gap = Math.max(4, width * 0.016);
    const size = (width - gap * (SIZE - 1)) / SIZE;
    metrics = { size, gap };
    boardEl.style.setProperty("--tile", size + "px");
    boardEl.style.setProperty("--gap", gap + "px");
    boardEl.style.height = size * SIZE + gap * (SIZE - 1) + "px";
    tiles.forEach(placeTile);
  }

  // ------------------------------------------------------------ grading ---

  function describeMark(mark) {
    if (mark === "green") return "correct position";
    if (mark === "yellow") return "in one of its words, wrong position";
    return "not in any of its words";
  }

  /** Repaint every tile and return the ones that have just turned green. */
  function paint() {
    const marks = Core.gradeBoard(boardLetters(), acrossWords, downWords);
    const turnedGreen = [];

    for (let i = 0; i < CELL_COUNT; i += 1) {
      const tile = grid[i];
      const cell = CELLS[i];
      const wasGreen = tile.mark === "green";

      tile.mark = marks[i];
      tile.locked = marks[i] === "green";
      tile.el.classList.toggle("is-green", marks[i] === "green");
      tile.el.classList.toggle("is-yellow", marks[i] === "yellow");
      tile.el.setAttribute(
        "aria-label",
        tile.letter.toUpperCase() + ", row " + (cell.y + 1) + ", column " + (cell.x + 1) + ": " + describeMark(marks[i]),
      );

      if (!wasGreen && marks[i] === "green") turnedGreen.push(tile);
    }
    return turnedGreen;
  }

  // ---------------------------------------------------------- animation ---

  function briefly(node, className, ms) {
    node.classList.add(className);
    window.setTimeout(() => node.classList.remove(className), ms);
  }

  function flashGreen(tile) {
    if (reducedMotion()) return;
    tile.el.classList.remove("is-new-green");
    // Restart the animation when the same tile turns green twice in a row.
    void tile.el.offsetWidth;
    briefly(tile.el, "is-new-green", 470);
  }

  function shakeTile(tile) {
    if (reducedMotion()) return;
    tile.el.classList.remove("is-shake");
    void tile.el.offsetWidth;
    briefly(tile.el, "is-shake", 340);
  }

  function dealIn() {
    if (reducedMotion()) return;
    boardEl.classList.remove("is-dealing");
    void boardEl.offsetWidth;
    boardEl.classList.add("is-dealing");
    window.setTimeout(() => boardEl.classList.remove("is-dealing"), CELL_COUNT * 18 + 520);
  }

  // --------------------------------------------------------------- swaps ---

  function clearSelection() {
    if (selected) selected.el.classList.remove("is-selected");
    selected = null;
  }

  function swap(a, b) {
    if (boardLocked() || !a || !b || a === b) return false;
    if (a.locked || b.locked) return false;
    if (a.letter === b.letter) {
      clearSelection();
      Sound.invalid();
      return false; // swapping identical letters is free and pointless
    }

    const from = a.cell;
    const to = b.cell;
    grid[from] = b;
    grid[to] = a;
    a.cell = to;
    b.cell = from;

    a.el.classList.add("is-moving");
    b.el.classList.add("is-moving");
    placeTile(a);
    placeTile(b);
    window.setTimeout(() => {
      a.el.classList.remove("is-moving");
      b.el.classList.remove("is-moving");
    }, 300);

    clearSelection();
    swapsRemaining -= 1;
    Sound.swap();

    const turnedGreen = paint();
    refreshHud();
    if (!reducedMotion()) turnedGreen.forEach(flashGreen);

    if (Core.isSolved(boardLetters(), solution)) {
      finish(true);
    } else if (swapsRemaining <= 0 && !outOfSwaps) {
      finish(false);
    } else if (turnedGreen.length) {
      Sound.complete();
    }
    return true;
  }

  function finish(won) {
    if (won) {
      solved = true;
      earnedStars = Math.max(0, Math.min(STAR_CAP, swapsRemaining));
      renderStars(earnedStars);
      recordResult(true, earnedStars);
      refreshHud();
      Sound.win();
      showWinModal();
    } else {
      outOfSwaps = true;
      recordResult(false, 0);
      refreshHud();
      Sound.lose();
      showLoseModal();
    }
  }

  // -------------------------------------------------------- interaction ---

  function nearestCell(clientX, clientY) {
    const rect = boardEl.getBoundingClientRect();
    let best = null;
    let bestDistance = Infinity;

    for (let i = 0; i < CELL_COUNT; i += 1) {
      const tile = grid[i];
      if (tile.locked) continue; // green tiles are locked in place
      const cell = CELLS[i];
      const offset = offsetFor(cell.x, cell.y);
      const centreX = rect.left + offset.left + metrics.size / 2;
      const centreY = rect.top + offset.top + metrics.size / 2;
      const distance = Math.hypot(centreX - clientX, centreY - clientY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = tile;
      }
    }
    return best;
  }

  function highlightDrop(clientX, clientY) {
    const found = nearestCell(clientX, clientY);
    const target = found === drag.tile ? null : found;
    if (drag.drop === target) return;
    if (drag.drop) drag.drop.el.classList.remove("is-drop");
    drag.drop = target;
    if (target) target.el.classList.add("is-drop");
  }

  function onPointerDown(event, tile) {
    if (event.button !== undefined && event.button !== 0) return;
    Sound.unlock();

    if (boardLocked()) {
      clearSelection();
      return;
    }
    if (tile.locked) {
      shakeTile(tile);
      Sound.invalid();
      return;
    }

    event.preventDefault();
    if (tile.el.setPointerCapture) {
      try {
        tile.el.setPointerCapture(event.pointerId);
      } catch (error) {
        /* the pointer may already be gone */
      }
    }
    tile.el.focus({ preventScroll: true });

    drag = {
      tile,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      drop: null,
    };
    tile.el.classList.add("is-dragging");
    tile.el.style.transition = "none";
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > 6) drag.moved = true;
    drag.tile.el.style.translate = drag.tile.baseX + dx + "px " + (drag.tile.baseY + dy) + "px";
    drag.tile.el.style.scale = "1.09";
    if (drag.moved) highlightDrop(event.clientX, event.clientY);
  }

  function endDrag(event, cancelled) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { tile, moved, drop } = drag;
    drag = null;

    tile.el.style.transition = "";
    tile.el.style.scale = "";
    tile.el.classList.remove("is-dragging");
    if (drop) drop.el.classList.remove("is-drop");

    if (cancelled || !moved) {
      placeTile(tile);
      if (!cancelled) handleTap(tile);
      return;
    }
    if (drop && drop !== tile) {
      if (!swap(tile, drop)) placeTile(tile);
    } else {
      placeTile(tile);
    }
  }

  function handleTap(tile) {
    if (boardLocked() || tile.locked) {
      clearSelection();
      return;
    }
    if (!selected) {
      selected = tile;
      tile.el.classList.add("is-selected");
      return;
    }
    if (selected === tile) {
      clearSelection();
      return;
    }
    swap(selected, tile);
  }

  function neighbour(x, y, dx, dy) {
    let nx = x + dx;
    let ny = y + dy;
    while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      const index = Core.cellIndex(nx, ny);
      if (index >= 0) return index;
      nx += dx;
      ny += dy;
    }
    return -1;
  }

  function onKeyDown(event, tile) {
    const cell = CELLS[tile.cell];
    let dx = 0;
    let dy = 0;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      Sound.unlock();
      handleTap(tile);
      return;
    }
    if (event.key === "Escape") {
      clearSelection();
      return;
    }
    if (event.key === "ArrowUp") dy = -1;
    else if (event.key === "ArrowDown") dy = 1;
    else if (event.key === "ArrowLeft") dx = -1;
    else if (event.key === "ArrowRight") dx = 1;
    else return;

    event.preventDefault();
    const next = neighbour(cell.x, cell.y, dx, dy);
    if (next >= 0) grid[next].el.focus();
  }

  // ------------------------------------------------------------- readout ---

  function refreshHud() {
    const shown = Math.max(0, swapsRemaining);
    swapsEl.textContent = String(shown);
    hudLabelEl.textContent = shown === 1 ? "swap remaining" : "swaps remaining";
    hudEl.classList.toggle("is-spent", outOfSwaps && !solved);
    hudEl.classList.toggle("is-solved", solved);
    boardEl.classList.toggle("is-solved", solved);
    shareBtn.disabled = !(solved || outOfSwaps || revealed);
  }

  function refreshSound() {
    const on = Sound.isEnabled();
    soundBtn.textContent = "Sound: " + (on ? "on" : "off");
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function renderStars(earned, node) {
    const host = node || starsEl;
    host.textContent = "";
    for (let i = 0; i < STAR_CAP; i += 1) {
      const star = document.createElement("span");
      star.className = "star" + (i < earned ? " is-earned" : "");
      star.style.setProperty("--i", String(i));
      star.textContent = "★";
      host.appendChild(star);
    }
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-shown");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("is-shown"), 2200);
  }

  // ---------------------------------------------------------------- modal ---

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function button(labelText, onClick, ghost) {
    const node = element("button", "button" + (ghost ? " button--ghost" : ""), labelText);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function actionsRow(specs) {
    const row = element("div", "modal-actions");
    specs.forEach((spec) => row.appendChild(button(spec.label, spec.onClick, spec.ghost)));
    return row;
  }

  function statsGrid(summary) {
    const stats = summary || summarise();
    const list = element("dl", "stats");
    [
      ["Played", stats.played],
      ["Wins", stats.wins],
      ["Streak", stats.current],
      ["Best", stats.best],
    ].forEach(([name, value]) => {
      const cell = element("div");
      cell.appendChild(element("dt", null, name));
      cell.appendChild(element("dd", null, String(value)));
      list.appendChild(cell);
    });
    return list;
  }

  function distributionChart(summary) {
    const stats = summary || summarise();
    const max = Math.max(1, ...stats.distribution);
    const wrap = element("div", "distribution");

    for (let stars = STAR_CAP; stars >= 1; stars -= 1) {
      const count = stats.distribution[stars - 1];
      const row = element("div", "distribution__row");
      row.appendChild(element("span", "distribution__label", stars + "★"));

      const bar = element("span", "distribution__bar");
      const fill = element("span");
      fill.style.width = Math.round((count / max) * 100) + "%";
      bar.appendChild(fill);

      row.appendChild(bar);
      row.appendChild(element("span", "distribution__count", String(count)));
      wrap.appendChild(row);
    }
    return wrap;
  }

  function starSummary(value) {
    const node = element("span", "archive__result");
    if (value === undefined) {
      node.textContent = "Play";
      return node;
    }
    if (value < 0) {
      node.textContent = "✗";
      return node;
    }
    for (let i = 0; i < STAR_CAP; i += 1) {
      node.appendChild(element("span", i < value ? "on" : "", "★"));
    }
    return node;
  }

  function archiveList() {
    const results = loadResults();
    const today = todayNumber();
    const list = element("div", "archive");

    for (let n = today - 1; n >= Math.max(1, today - ARCHIVE_DAYS); n -= 1) {
      const item = element("button", "archive__item");
      item.type = "button";

      const details = element("span");
      details.appendChild(element("strong", null, "Waffle #" + n));
      details.appendChild(element("span", "archive__date", formatDate(dateFor(n))));

      item.appendChild(details);
      item.appendChild(starSummary(results[String(n)]));
      item.addEventListener("click", () => startArchive(n));
      list.appendChild(item);
    }
    return list;
  }

  function openModal(title, body) {
    modalTitleEl.textContent = title;
    modalBodyEl.textContent = "";
    modalBodyEl.appendChild(body);
    modalEl.hidden = false;
    const focusTarget = modalEl.querySelector("button");
    if (focusTarget) focusTarget.focus();
  }

  function closeModal() {
    modalEl.hidden = true;
  }

  function showWinModal() {
    const body = document.createDocumentFragment();
    body.appendChild(element("h3", null, earnedStars > 0 ? "Nicely done" : "There in the end"));
    body.appendChild(
      element(
        "p",
        null,
        earnedStars > 0
          ? "Solved with " + earnedStars + (earnedStars === 1 ? " swap" : " swaps") + " to spare."
          : "You got there, but with no swaps left for stars.",
      ),
    );

    const stars = element("div", "stars");
    renderStars(earnedStars, stars);
    body.appendChild(stars);
    if (mode === "daily") body.appendChild(statsGrid());
    body.appendChild(
      actionsRow([
        { label: "Share", onClick: share },
        { label: "Stats", ghost: true, onClick: showStats },
        { label: "Practice", ghost: true, onClick: startPractice },
      ]),
    );
    openModal("Success!", body);
  }

  function showLoseModal() {
    const body = document.createDocumentFragment();
    body.appendChild(element("h3", null, "Out of swaps"));
    body.appendChild(element("p", null, "No stars this time, but you can keep swapping and still try to solve it."));
    if (mode === "daily") body.appendChild(statsGrid());
    body.appendChild(
      actionsRow([
        { label: "Keep trying", onClick: closeModal },
        { label: "Show solution", ghost: true, onClick: revealSolution },
        { label: "Retry", ghost: true, onClick: restart },
      ]),
    );
    openModal("Game over", body);
  }

  function showStats() {
    const summary = summarise();
    const body = document.createDocumentFragment();

    body.appendChild(element("h3", null, "Your record"));
    body.appendChild(statsGrid(summary));
    body.appendChild(element("h3", null, "Star distribution"));
    body.appendChild(distributionChart(summary));

    const heading = element("h3", null, "Archive");
    body.appendChild(heading);
    body.appendChild(
      element("p", null, "The last " + ARCHIVE_DAYS + " Waffles. Archive games do not count towards your streak."),
    );
    body.appendChild(archiveList());
    body.appendChild(actionsRow([{ label: "Close", onClick: closeModal }]));
    openModal("Stats & archive", body);
  }

  function revealSolution() {
    const pool = tiles.slice();
    const used = new Set();
    for (let i = 0; i < CELL_COUNT; i += 1) {
      const index = pool.findIndex((tile, position) => !used.has(position) && tile.letter === solution[i]);
      if (index < 0) continue;
      used.add(index);
      const tile = pool[index];
      tile.cell = i;
      grid[i] = tile;
    }
    tiles.forEach(placeTile);
    revealed = true;
    selected = null;
    paint();
    refreshHud();

    const body = document.createDocumentFragment();
    body.appendChild(element("h3", null, "Across"));
    body.appendChild(element("p", null, acrossWords.join(", ")));
    body.appendChild(element("h3", null, "Down"));
    body.appendChild(element("p", null, downWords.join(", ")));
    body.appendChild(
      actionsRow([
        { label: "Retry", onClick: restart },
        { label: "Stats", ghost: true, onClick: showStats },
      ]),
    );
    openModal("Solution", body);
  }

  function sampleRow(word, highlight, markClass, description) {
    const item = element("li");
    const sample = element("span", "sample");
    word.split("").forEach((letter, index) => {
      sample.appendChild(element("b", index === highlight ? markClass : "", letter));
    });
    item.appendChild(sample);
    item.appendChild(element("span", null, description));
    return item;
  }

  function showHelp() {
    const body = document.createDocumentFragment();
    const intro = element("p");
    intro.innerHTML =
      "Rearrange the letters until <strong>every row and every column reads a word</strong>. " +
      "Drag a letter anywhere on the board and the two tiles swap places.";
    body.appendChild(intro);

    const legend = element("ul", "legend");
    legend.appendChild(sampleRow("perky", 0, "is-green", "Correct letter in the correct place."));
    legend.appendChild(sampleRow("knoll", 1, "is-yellow", "In the word for that tile, but in a different position."));
    legend.appendChild(sampleRow("blank", -1, "", "Not in any of the words that tile belongs to."));
    body.appendChild(element("h3", null, "Colours"));
    body.appendChild(legend);

    const rules = element("p");
    rules.innerHTML =
      "You get <strong>15 swaps</strong>. Every Waffle can be solved in <strong>10</strong>, and you earn a star " +
      "for each swap you have left over — five at best.";
    body.appendChild(element("h3", null, "Swaps and stars"));
    body.appendChild(rules);

    const shape = element("p");
    shape.innerHTML =
      "The middle of each long row and column crosses two words at once; the outer tiles belong to just one. " +
      "Green tiles are already correct, so they cannot be moved or swapped onto.";
    body.appendChild(element("h3", null, "The board"));
    body.appendChild(shape);
    body.appendChild(actionsRow([{ label: "Got it", onClick: closeModal }]));
    openModal("How to play", body);
  }

  // -------------------------------------------------------------- sharing ---

  function shareText() {
    const who =
      mode === "daily" ? "Waffle #" + number : mode === "archive" ? "Waffle #" + number + " (archive)" : "Waffle (practice)";
    const lines = [who + " " + earnedStars + "/" + STAR_CAP];

    for (let y = 0; y < SIZE; y += 1) {
      let row = "";
      for (let x = 0; x < SIZE; x += 1) {
        if (x % 2 === 1 && y % 2 === 1) {
          row += "⬜";
          continue;
        }
        row += grid[Core.cellIndex(x, y)].mark === "green" ? "🟩" : "⬛";
      }
      lines.push(row);
    }
    return lines.join("\n");
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => fallbackCopy(text),
      );
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function share() {
    copyText(shareText()).then((ok) => {
      toast(ok ? "Copied result to the clipboard" : "Could not copy the result");
    });
  }

  // ----------------------------------------------------------------- init ---

  function init() {
    if (!Core || !CELL_COUNT) {
      openModal("Something is missing", element("p", null, "js/waffle-core.js did not load."));
      return;
    }
    if (typeof WAFFLE_DAILY === "undefined" || !WAFFLE_DAILY.length) {
      openModal("Puzzles missing", element("p", null, "js/puzzles.js did not load, so there is nothing to play."));
      return;
    }

    document.getElementById("play-daily").addEventListener("click", startDaily);
    document.getElementById("play-practice").addEventListener("click", startPractice);
    document.getElementById("stats").addEventListener("click", showStats);
    document.getElementById("help").addEventListener("click", showHelp);
    shareBtn.addEventListener("click", share);
    soundBtn.addEventListener("click", () => {
      Sound.toggle();
      refreshSound();
      if (Sound.isEnabled()) Sound.complete();
    });
    document.getElementById("modal-close").addEventListener("click", closeModal);

    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modalEl.hidden) closeModal();
    });
    boardEl.addEventListener("pointerdown", (event) => {
      if (event.target === boardEl) clearSelection();
    });

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", (event) => endDrag(event, false));
    window.addEventListener("pointercancel", (event) => endDrag(event, true));
    window.addEventListener("resize", layout);
    if (window.ResizeObserver) new ResizeObserver(layout).observe(boardEl);

    refreshSound();
    renderStars(0);
    startDaily();
    window.requestAnimationFrame(layout);
  }

  init();
})();
