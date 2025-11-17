// js/app.js — versión ajustada: random = simple IF que cambia sólo state.K al iniciar.
// Comportamiento solicitado:
// - Si checkbox random está activo -> al pulsar Start: state.K = Math.floor(Math.random() * (state.N + 1)) (0..N).
// - Si checkbox random está desactivado -> NO se modifica state.K en Start; queda lo que el usuario haya dejado (input/+/-).
// - Cuando random está activo los controles de impostores quedan deshabilitados, pero **NO** se modifica el input (no se cambia su valor).
// - Validación mínima: N >= 3, 0 <= K <= N (si K inválido se muestra error).

(() => {
  const DOM = {
    lobby: document.getElementById("lobby"),
    pass: document.getElementById("pass"),
    reveal: document.getElementById("reveal"),
    transition: document.getElementById("transition"),
    complete: document.getElementById("complete"),
    playersCountInput: document.getElementById("players-count"),
    impostorsCountInput: document.getElementById("impostors-count"),
    startBtn: document.getElementById("start-game"),
    previewBtn: document.getElementById("preview-words"),
    playersDecr: document.getElementById("players-decr"),
    playersIncr: document.getElementById("players-incr"),
    impostorsDecr: document.getElementById("impostors-decr"),
    impostorsIncr: document.getElementById("impostors-incr"),
    passPlayer: document.getElementById("pass-player"),
    passIndex: document.getElementById("pass-index"),
    passTotal: document.getElementById("pass-total"),
    revealRoleBtn: document.getElementById("reveal-role"),
    roleLabel: document.getElementById("role-label"),
    wordBox: document.getElementById("word-box"),
    hideRoleBtn: document.getElementById("hide-role"),
    timerElem: document.getElementById("timer"),
    nextBtn: document.getElementById("next-player"),
    progress: document.getElementById("progress"),
    restartBtn: document.getElementById("restart"),
    backToLobbyBtn: document.getElementById("back-to-lobby"),
    summary: document.getElementById("summary"),
    lobbyMsg: document.getElementById("lobby-msg"),
    randomCheckbox: document.getElementById("random-impostors"),
  };

  let WORDS = [];
  let state = {
    N: 6, // jugadores
    K: 1, // impostores (se actualiza cuando el usuario usa input/+/-; si random activo se sobreescribe SOLO en Start)
    revealTime: 12,
    chosenWord: null,
    impostorIndices: [],
    roles: [],
    currentIndex: 0,
    loaded: false,
    randomMode: false,
  };

  // util
  const randInt = (max) => Math.floor(Math.random() * max); // 0..max-1
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sample = (arr, n) => {
    const out = [];
    const copy = arr.slice();
    for (let i = 0; i < n && copy.length; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  };

  // carga palabras
  async function loadWords() {
    try {
      const res = await fetch("./json/dictionary.json", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          WORDS = json
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter(Boolean);
          state.loaded = true;
          DOM.lobbyMsg.textContent = "";
          console.log(
            "Loaded words from ./json/dictionary.json (count:)",
            WORDS.length
          );
          return;
        }
      }
    } catch (e) {
      console.warn("Error loading JSON:", e);
    }
    // fallback mínimo
    WORDS = ["gato", "perro", "casa", "coche", "manzana", "libro"];
    state.loaded = false;
    DOM.lobbyMsg.textContent =
      "No se ha cargado dictionary.json — usando lista de fallback.";
    console.warn("No local JSON loaded; using fallback list");
  }

  // validación: N>=3, 0 <= K <= N
  function validateSettings(N, K) {
    if (!Number.isInteger(N) || N < 3)
      return "Número de jugadores debe ser al menos 3.";
    if (!Number.isInteger(K) || K < 0) return "Número de impostores inválido.";
    if (K > N)
      return "El número de impostores no puede ser mayor que el número de jugadores.";
    return null;
  }

  // preparar la partida usando state.N y state.K tal cual
  function prepareGame() {
    state.currentIndex = 0;
    state.roles = [];
    state.impostorIndices = [];
    state.chosenWord = null;

    if (WORDS.length > 0) state.chosenWord = WORDS[randInt(WORDS.length)];
    else state.chosenWord = "ERROR";

    const indices = new Set();
    if (state.K >= state.N) {
      // todos (K == N) o K >= N
      for (let i = 0; i < state.N; i++) indices.add(i);
    } else {
      while (indices.size < state.K) indices.add(randInt(state.N));
    }
    state.impostorIndices = Array.from(indices);

    for (let i = 0; i < state.N; i++) {
      if (state.impostorIndices.includes(i))
        state.roles.push({ role: "impostor", word: null, seen: false });
      else
        state.roles.push({
          role: "civil",
          word: state.chosenWord,
          seen: false,
        });
    }

    console.log("Game prepared", {
      N: state.N,
      K: state.K,
      chosenWord: state.chosenWord,
      impostorIndices: state.impostorIndices,
    });
  }

  // UI helpers
  function showScreen(name) {
    ["lobby", "pass", "reveal", "transition", "complete"].forEach((id) => {
      DOM[id].classList.add("hidden");
    });
    DOM[name].classList.remove("hidden");
  }

  function updateLobbyUI() {
    DOM.playersCountInput.value = state.N;

    // Si randomMode activo: deshabilitar controles de impostores, PERO NO modificar el valor del input.
    if (state.randomMode) {
      DOM.impostorsCountInput.disabled = true;
      DOM.impostorsDecr.disabled = true;
      DOM.impostorsIncr.disabled = true;
      const parent = DOM.impostorsCountInput.parentElement;
      if (parent && parent.classList) parent.classList.add("disabled");
      // no tocar DOM.impostorsCountInput.value (queda como lo dejó el usuario)
    } else {
      DOM.impostorsCountInput.disabled = false;
      DOM.impostorsDecr.disabled = false;
      DOM.impostorsIncr.disabled = false;
      const parent = DOM.impostorsCountInput.parentElement;
      if (parent && parent.classList) parent.classList.remove("disabled");
      // sincronizar input con state.K (si el usuario dejó K antes, reflejarlo)
      DOM.impostorsCountInput.value = state.K;
    }
  }

  // pantallas
  function openPassScreen() {
    DOM.passPlayer.textContent = state.currentIndex + 1;
    DOM.passIndex.textContent = state.currentIndex + 1;
    DOM.passTotal.textContent = state.N;
    showScreen("pass");
  }

  function openRevealScreen() {
    const r = state.roles[state.currentIndex];
    DOM.roleLabel.textContent = r.role === "impostor" ? "IMPOSTOR" : "CIVIL";
    DOM.wordBox.textContent = r.role === "impostor" ? "—" : r.word || "PALABRA";
    DOM.hideRoleBtn.disabled = false;

    if (state.revealTime > 0) {
      DOM.timerElem.classList.remove("hidden");
      DOM.timerElem.textContent = formatTime(state.revealTime);
      startCountdown(state.revealTime, () => {
        if (!r.seen) hideRole();
      });
    } else {
      DOM.timerElem.classList.add("hidden");
      stopCountdown();
    }

    showScreen("reveal");
  }

  function formatTime(s) {
    const sec = Math.max(0, s | 0);
    return "00:" + (sec < 10 ? "0" + sec : sec);
  }

  let countdownTimer = null;
  function startCountdown(seconds, onEnd) {
    stopCountdown();
    let remaining = seconds;
    DOM.timerElem.textContent = formatTime(remaining);
    countdownTimer = setInterval(() => {
      remaining--;
      DOM.timerElem.textContent = formatTime(remaining);
      if (remaining <= 0) {
        stopCountdown();
        onEnd && onEnd();
      }
    }, 1000);
  }
  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function hideRole() {
    stopCountdown();
    const r = state.roles[state.currentIndex];
    r.seen = true;
    DOM.roleLabel.textContent = "OCULTO";
    DOM.wordBox.textContent = "";
    DOM.hideRoleBtn.disabled = true;
    showScreen("transition");
    DOM.progress.textContent = `${state.currentIndex + 1}/${state.N}`;
  }

  function nextPlayer() {
    state.currentIndex++;
    if (state.currentIndex >= state.N) {
      showComplete();
      return;
    }
    openPassScreen();
  }

  function showComplete() {
    showScreen("complete");
    DOM.summary.textContent = `Jugadores: ${state.N} — Impostores: ${state.K} — Palabra (civil): ${state.chosenWord}`;
  }

  // eventos
  function wireEvents() {
    // players
    DOM.playersDecr.addEventListener("click", () => {
      state.N = Math.max(3, state.N - 1);
      updateLobbyUI();
    });
    DOM.playersIncr.addEventListener("click", () => {
      state.N = Math.min(20, state.N + 1);
      updateLobbyUI();
    });
    DOM.playersCountInput.addEventListener("change", (e) => {
      const v = parseInt(e.target.value || 0, 10);
      state.N = isNaN(v) ? state.N : clamp(v, 3, 20);
      updateLobbyUI();
    });

    // impostors manual (solo actualiza state.K cuando el usuario interactúa)
    DOM.impostorsDecr.addEventListener("click", () => {
      if (state.randomMode) return;
      state.K = Math.max(0, (parseInt(state.K, 10) || 0) - 1);
      updateLobbyUI();
    });
    DOM.impostorsIncr.addEventListener("click", () => {
      if (state.randomMode) return;
      state.K = Math.min(state.N, (parseInt(state.K, 10) || 0) + 1);
      updateLobbyUI();
    });
    DOM.impostorsCountInput.addEventListener("change", (e) => {
      if (state.randomMode) {
        updateLobbyUI();
        return;
      }
      const v = parseInt(e.target.value || 0, 10);
      state.K = isNaN(v) ? state.K : clamp(v, 0, state.N);
      updateLobbyUI();
    });

    // toggle random: sólo cambia modo (no modifica state.K ni el valor del input)
    DOM.randomCheckbox.addEventListener("change", (e) => {
      state.randomMode = !!e.target.checked;
      if (state.randomMode)
        DOM.lobbyMsg.textContent =
          "Impostores elegidos aleatoriamente al iniciar.";
      else DOM.lobbyMsg.textContent = "";
      updateLobbyUI();
    });

    // Start: IF random -> asignar K aleatorio 0..N; ELSE -> leer K del input
    DOM.startBtn.addEventListener("click", async () => {
      DOM.lobbyMsg.textContent = "";

      if (state.randomMode) {
        // 0..N inclusive
        state.K = Math.floor(Math.random() * (state.N + 1));
      } else {
        // Leer el valor actual del input, no usar el valor anterior guardado
        const inputK = parseInt(DOM.impostorsCountInput.value || 0, 10);
        state.K = isNaN(inputK) ? 0 : clamp(inputK, 0, state.N);
      }

      // validación
      const err = validateSettings(state.N, state.K);
      if (err) {
        DOM.lobbyMsg.textContent = err;
        return;
      }

      // tiempo
      const rt = parseInt(document.getElementById("reveal-time").value, 10);
      state.revealTime = isNaN(rt) ? 12 : rt;

      prepareGame();
      openPassScreen();
    });

    // preview palabras
    DOM.previewBtn.addEventListener("click", () => {
      if (!WORDS || WORDS.length === 0) {
        DOM.lobbyMsg.textContent = "No hay palabras cargadas.";
        return;
      }
      const s = sample(WORDS, Math.min(5, WORDS.length));
      alert("Ejemplo de palabras:\n\n" + s.join("\n"));
    });

    // pass & play
    DOM.revealRoleBtn.addEventListener("click", () => {
      const r = state.roles[state.currentIndex];
      if (r && !r.seen) openRevealScreen();
      else showScreen("transition");
    });
    DOM.hideRoleBtn.addEventListener("click", hideRole);
    DOM.nextBtn.addEventListener("click", nextPlayer);
    DOM.restartBtn.addEventListener("click", () => {
      if (state.randomMode) {
        state.K = Math.floor(Math.random() * (state.N + 1));
      }
      prepareGame();
      state.currentIndex = 0;
      openPassScreen();
    });
    DOM.backToLobbyBtn.addEventListener("click", () => showScreen("lobby"));
  }

  // init
  async function init() {
    state.N = parseInt(DOM.playersCountInput.value, 10) || 6;
    const initialK = parseInt(DOM.impostorsCountInput.value, 10);
    if (!isNaN(initialK)) state.K = clamp(initialK, 0, state.N);
    state.randomMode = !!DOM.randomCheckbox.checked;
    updateLobbyUI();
    wireEvents();
    await loadWords();
    console.log("WORDS pool ready, items:", WORDS.length);
    showScreen("lobby");
  }

  init();
})();
