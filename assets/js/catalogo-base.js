"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* =============================
    VARIABLES BASE
    ============================== */

  const LIBRARY_RULES_URL = "/assets/data/catalog-library-rules.json";
  const CONTEXT_KEY = "GTS_CONTEXT";

  let selectedGames = [];
  let emulatorBases = {};
  let totalSize = 0;
  let diskLimit = null;
  let diskLabel = "";
  let servicesData = {};

  let libraries = [];
  let librariesData = {};
  let gamesByKey = new Map();
  let activeLibraryId = "";

  /* =============================
    FILTROS (SEARCH + LETRAS)
    ============================== */

  let searchTerm = "";
  let activeLetter = "ALL"; // ALL | # | A-Z

  /* =============================
    UTILIDADES
    ============================== */

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function formatGameSize(sizeGB) {
    const gb = safeNumber(sizeGB);

    if (gb <= 0) return "0 GB";

    const mb = gb * 1024;
    const kb = mb * 1024;

    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    return `${kb.toFixed(0)} KB`;
  }

  function roundSizeGB(value) {
    return Number(safeNumber(value).toFixed(6));
  }

  function getContext() {
    if (window.GTSContext && typeof window.GTSContext.load === "function") {
      return window.GTSContext.load();
    }

    try {
      return JSON.parse(localStorage.getItem(CONTEXT_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveContextPayload(payload) {
    if (window.GTSContext && typeof window.GTSContext.save === "function") {
      window.GTSContext.save(payload);
    } else {
      localStorage.setItem(CONTEXT_KEY, JSON.stringify(payload));
    }
  }

  function getConsoleHomePath() {
    if (CONSOLE_CONFIG.catalogPath) {
      return CONSOLE_CONFIG.catalogPath.replace("/catalogo.html", "/");
    }

    return "/";
  }

  function getLibrary(libraryId) {
    return libraries.find((library) => library.libraryId === libraryId) || null;
  }

  function getCurrentGames() {
    return librariesData[activeLibraryId] || [];
  }

  function getSelectedGamesForLibrary(libraryId) {
    return selectedGames.filter((game) => game.libraryId === libraryId);
  }

  function recalculateTotalSize() {
    const gamesTotal = selectedGames.reduce(
      (sum, game) => sum + safeNumber(game.sizeGB),
      0,
    );

    const basesTotal = Object.values(emulatorBases).reduce(
      (sum, base) => sum + safeNumber(base.sizeGB),
      0,
    );

    totalSize = roundSizeGB(gamesTotal + basesTotal);
  }

  function shouldAutoAddEmulatorBase(library) {
    return Boolean(
      library &&
      library.requiresEmulator &&
      library.autoAddEmulatorBase &&
      safeNumber(library.emulatorInstallSizeGB) > 0,
    );
  }

  function getPotentialEmulatorBaseSize(library) {
    if (!shouldAutoAddEmulatorBase(library)) return 0;
    if (emulatorBases[library.libraryId]) return 0;
    if (getSelectedGamesForLibrary(library.libraryId).length > 0) return 0;

    return safeNumber(library.emulatorInstallSizeGB);
  }

  function getAdditionalSizeForGame(game) {
    const library = getLibrary(game.libraryId);
    return roundSizeGB(
      safeNumber(game.sizeGB) + getPotentialEmulatorBaseSize(library),
    );
  }

  function ensureEmulatorBaseForLibrary(libraryId) {
    const library = getLibrary(libraryId);
    if (!shouldAutoAddEmulatorBase(library)) return;

    if (emulatorBases[libraryId]) return;

    emulatorBases[libraryId] = {
      id: library.emulatorId || `emulator_${libraryId}`,
      name: library.emulatorName || `Emulador ${library.label}`,
      libraryId: library.libraryId,
      libraryLabel: library.label,
      type: "emulator_base",
      sizeGB: safeNumber(library.emulatorInstallSizeGB),
      autoAdded: true,
    };
  }

  function removeEmulatorBaseIfUnused(libraryId) {
    const hasGamesInLibrary = selectedGames.some(
      (game) => game.libraryId === libraryId,
    );

    if (!hasGamesInLibrary) {
      delete emulatorBases[libraryId];
    }
  }

  function normalizeGame(rawGame, library, index) {
    const rawId =
      rawGame.id ??
      rawGame.titleId ??
      rawGame.name ??
      `${library.libraryId}_${index}`;

    const name = String(rawGame.name || rawGame.title || rawId).trim();
    const sizeGB = safeNumber(
      rawGame.size ?? rawGame.sizeGB ?? rawGame.sizeGb ?? rawGame.gb,
      0,
    );

    const id = String(rawId).trim();
    const key = `${library.libraryId}:${id}`;

    return {
      key,
      id,
      titleId: rawGame.titleId ?? null,
      name,
      sizeGB,
      size: sizeGB,
      libraryId: library.libraryId,
      libraryLabel: library.label,
      catalogSourceRef: library.catalogSourceRef || "",
      type: library.type === "native" ? "native_game" : "emulator_game",
      raw: rawGame,
    };
  }

  function getFilteredGames() {
    const term = searchTerm.trim().toLowerCase();
    const games = getCurrentGames();

    return games.filter((game) => {
      const name = String(game.name || "").trim();
      if (!name) return false;

      if (activeLetter !== "ALL") {
        const first = name[0].toUpperCase();
        const isNum = /^[0-9]/.test(first);

        if (activeLetter === "#") {
          if (!isNum) return false;
        } else if (first !== activeLetter) {
          return false;
        }
      }

      if (term) {
        return name.toLowerCase().includes(term);
      }

      return true;
    });
  }

  function refreshCatalogButtonsState() {
    document.querySelectorAll(".add-game").forEach((btn) => {
      const key = btn.dataset.key;
      const game = gamesByKey.get(key);
      if (!game) return;

      const alreadyAdded = selectedGames.some((g) => g.key === key);

      btn.classList.remove("added", "blocked");

      if (alreadyAdded) {
        btn.disabled = false;
        btn.textContent = "✓";
        btn.classList.add("added");
        btn.setAttribute("aria-pressed", "true");
        btn.setAttribute("aria-label", `Quitar ${game.name}`);
        return;
      }

      const additionalSize = getAdditionalSizeForGame(game);
      const noSpace = diskLimit !== null && totalSize + additionalSize > diskLimit;

      btn.disabled = noSpace;

      if (noSpace) {
        btn.disabled = true;
        btn.textContent = "×";
        btn.classList.add("blocked");
        btn.setAttribute("aria-pressed", "false");
        btn.setAttribute("aria-label", `No hay espacio para ${game.name}`);
      } else {
        btn.disabled = false;
        btn.textContent = "+";
        btn.setAttribute("aria-pressed", "false");
        btn.setAttribute("aria-label", `Agregar ${game.name}`);
      }
    });
  }

  /* =============================
    CARGAR STORAGE DESDE CONTEXTO
    ============================== */

  const ctx = getContext();

  if (ctx?.storage) {
    diskLimit = Number(ctx.storage.usableGB);
    diskLabel = ctx.storage.label;
  } else {
    alert("No se detectó almacenamiento válido para el catálogo.");
    window.location.href = getConsoleHomePath();
    return;
  }

  const gameCountEl = document.getElementById("gameCount");
  const totalSizeEl = document.getElementById("totalSize");
  const catalogEl = document.querySelector(".selector-catalog .catalog-list");
  const saveBtn = document.getElementById("saveSelection");

  if (!catalogEl) {
    console.error("No se encontró .selector-catalog .catalog-list");
    return;
  }

  /* =============================
    TEXTOS DINÁMICOS
    ============================== */

  document.title = `Catálogo de juegos ${CONSOLE_CONFIG.fullName} | GameTechSolutions`;

  document.querySelectorAll(".consoleFull").forEach((el) => {
    el.textContent = CONSOLE_CONFIG.fullName;
  });

  /* =============================
    CARGAR SERVICES.JSON (GLOBAL)
    ============================= */

  const localServicesUrl = "/assets/data/services.json";
  const remoteServicesUrl =
    window.GTS_REMOTE_CONFIG?.servicesJsonRemote || null;

  async function loadServicesConfig() {
    const candidates = [remoteServicesUrl, localServicesUrl].filter(Boolean);

    let lastError = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`No se pudo cargar services.json desde ${url}`);
        }

        const data = await res.json();
        servicesData = data;
        window.SERVICES_DATA = data;

        console.log(`services.json cargado desde: ${url}`);
        return data;
      } catch (err) {
        console.warn(`Falló carga de services.json desde: ${url}`, err);
        lastError = err;
      }
    }

    throw lastError || new Error("No se pudo cargar services.json.");
  }

  loadServicesConfig().catch((err) => {
    console.error("Error cargando services.json:", err);
  });

  /* =============================
    REGLAS DE BIBLIOTECAS
    ============================= */

  async function loadLibraryRules() {
    try {
      const res = await fetch(LIBRARY_RULES_URL, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`No se pudo cargar ${LIBRARY_RULES_URL}`);
      }

      return await res.json();
    } catch (err) {
      console.warn("No se pudieron cargar reglas de bibliotecas. Usando catálogo base.", err);
      return null;
    }
  }

  function buildLibrariesFromRules(rules) {
    const definitions = rules?.libraryDefinitions || {};
    const profile = rules?.consoleProfiles?.[CONSOLE_CONFIG.code] || null;

    const nativeDefinition =
      definitions[profile?.nativeLibraryId] || {
        libraryId: String(CONSOLE_CONFIG.code || "native").toLowerCase(),
        label: CONSOLE_CONFIG.fullName,
        type: "native",
        catalogSourceRef: CONSOLE_CONFIG.code,
        requiresEmulator: false,
      };

    const nativeLibrary = {
      ...nativeDefinition,
      libraryId: nativeDefinition.libraryId,
      label: nativeDefinition.label || CONSOLE_CONFIG.fullName,
      type: nativeDefinition.type || "native",
      catalogSourceRef: nativeDefinition.catalogSourceRef || CONSOLE_CONFIG.code,
      requiresEmulator: false,
      isNative: true,
      status: "active",
    };

    const result = [nativeLibrary];

    if (profile?.enabled) {
      const extraLibraries = Array.isArray(profile.extraLibraries)
        ? profile.extraLibraries
        : [];

      extraLibraries
        .filter((entry) => entry.status === "active")
        .filter((entry) => isLibraryAllowedByContext(entry, ctx))
        .forEach((entry) => {
          const definition = definitions[entry.libraryId];
          if (!definition) {
            console.warn(`No existe libraryDefinition para ${entry.libraryId}`);
            return;
          }

          result.push({
            ...definition,
            ...entry,
            libraryId: entry.libraryId,
            label: definition.label || entry.libraryId,
            type: definition.type || "emulator",
            catalogSourceRef: definition.catalogSourceRef,
            requiresEmulator: Boolean(definition.requiresEmulator),
            isNative: false,
          });
        });
    }

    return result;
  }

  function isLibraryAllowedByContext(entry, ctx) {
    const requires = entry.requires;
    if (!requires) return true;

    const compatibility = ctx?.compatibility || ctx?.model?.compatibility || {};

    if (Array.isArray(requires.modType) && requires.modType.length) {
      if (!requires.modType.includes(compatibility.modType)) {
        return false;
      }
    }

    if (
      typeof requires.ps2IsoGames === "boolean" &&
      compatibility.ps2IsoGames !== requires.ps2IsoGames
    ) {
      return false;
    }

    if (
      typeof requires.ps1Games === "boolean" &&
      compatibility.ps1Games !== requires.ps1Games
    ) {
      return false;
    }

    if (
      typeof requires.gamecubeGames === "boolean" &&
      compatibility.gamecubeGames !== requires.gamecubeGames
    ) {
      return false;
    }

    return true;
  }

  function getCatalogCandidatesForLibrary(library) {
    const remoteFromSources =
      window.GTS_CATALOG_SOURCES?.[library.catalogSourceRef]?.gamesJsonRemote ||
      null;

    const remoteFromConsole =
      library.isNative ? CONSOLE_CONFIG.gamesJsonRemote || null : null;

    const localFromConsole = library.isNative ? CONSOLE_CONFIG.gamesJson : null;
    const localFallback = `/assets/data/games/${library.libraryId}.json`;

    return [
      remoteFromConsole,
      remoteFromSources,
      localFromConsole,
      localFallback,
    ].filter(Boolean);
  }

  async function loadGamesForLibrary(library) {
    const candidates = getCatalogCandidatesForLibrary(library);

    let lastError = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`No se pudo cargar catálogo desde ${url}`);
        }

        const rawData = await res.json();
        const list = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData.games)
            ? rawData.games
            : [];

        const normalized = list
          .map((game, index) => normalizeGame(game, library, index))
          .filter((game) => game.name && game.sizeGB >= 0);

        console.log(
          `Catálogo ${library.label} cargado desde: ${url} (${normalized.length} juegos)`,
        );

        return normalized;
      } catch (err) {
        console.warn(
          `Falló carga de catálogo ${library.label} desde: ${url}`,
          err,
        );
        lastError = err;
      }
    }

    throw lastError || new Error(`No se pudo cargar catálogo ${library.label}.`);
  }

  async function loadAllLibraries() {
    const rules = await loadLibraryRules();
    const candidateLibraries = buildLibrariesFromRules(rules);

    const loadedLibraries = [];
    librariesData = {};
    gamesByKey = new Map();

    for (const library of candidateLibraries) {
      try {
        const games = await loadGamesForLibrary(library);

        loadedLibraries.push(library);
        librariesData[library.libraryId] = games;

        games.forEach((game) => {
          gamesByKey.set(game.key, game);
        });
      } catch (err) {
        if (library.isNative) {
          throw err;
        }

        console.warn(
          `Biblioteca extra omitida por error de carga: ${library.label}`,
          err,
        );
      }
    }

    libraries = loadedLibraries;

    if (!libraries.length) {
      throw new Error("No se pudo cargar ninguna biblioteca de juegos.");
    }

    activeLibraryId = libraries[0].libraryId;

    renderLibraryTabs();
    renderLetterFilter();
    bindSearchControls();
    renderCatalog();
    updateSummary();

    return libraries;
  }

  loadAllLibraries().catch((err) => {
    console.error(err);
    catalogEl.innerHTML = "<p>Error cargando el catálogo de juegos.</p>";
  });

  /* =============================
    UI BIBLIOTECAS
    ============================== */

  function renderLibraryTabs() {
    const shell = document.querySelector(".selector-catalog");
    if (!shell) return;

    document.getElementById("catalogLibraryTabs")?.remove();

    if (libraries.length <= 1) return;

    const tabs = document.createElement("div");
    tabs.id = "catalogLibraryTabs";
    tabs.className = "catalog-library-tabs";

    libraries.forEach((library) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = library.label;
      btn.dataset.libraryId = library.libraryId;

      if (library.libraryId === activeLibraryId) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => {
        activeLibraryId = library.libraryId;
        activeLetter = "ALL";

        tabs.querySelectorAll("button").forEach((item) => {
          item.classList.toggle(
            "active",
            item.dataset.libraryId === activeLibraryId,
          );
        });

        renderLetterFilter();
        renderCatalog();
      });

      tabs.appendChild(btn);
    });

    shell.prepend(tabs);
  }

  /* =============================
    UI FILTROS (SEARCH + LETRAS)
    ============================== */

  function bindSearchControls() {
    const input = document.getElementById("catalogSearch");
    const clearBtn = document.getElementById("clearSearch");

    if (input && !input.dataset.boundSearch) {
      input.dataset.boundSearch = "1";

      input.addEventListener("input", () => {
        searchTerm = input.value || "";
        renderCatalog();
      });
    }

    if (clearBtn && !clearBtn.dataset.boundClear) {
      clearBtn.dataset.boundClear = "1";

      clearBtn.addEventListener("click", () => {
        if (input) input.value = "";
        searchTerm = "";
        renderCatalog();
        input?.focus();
      });
    }
  }

  function renderLetterFilter() {
    const el = document.getElementById("catalogLetters");
    if (!el) return;

    const letters = ["ALL", "#"];
    for (let i = 65; i <= 90; i++) letters.push(String.fromCharCode(i));

    el.innerHTML = "";

    letters.forEach((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = letter === "ALL" ? "Todo" : letter;

      if (activeLetter === letter) btn.classList.add("active");

      btn.addEventListener("click", () => {
        activeLetter = letter;

        el.querySelectorAll("button").forEach((b) =>
          b.classList.remove("active"),
        );
        btn.classList.add("active");

        renderCatalog();
      });

      el.appendChild(btn);
    });
  }

  /* =============================
    RENDER CATÁLOGO
    ============================== */

  function renderCatalog() {
    const ROW_HEIGHT = window.matchMedia("(max-width: 520px)").matches ? 58 : 62;
    const OVERSCAN = 10;
    const filteredGames = getFilteredGames();

    catalogEl.innerHTML = "";
    catalogEl.scrollTop = 0;

    if (!filteredGames.length) {
      const activeLibrary = getLibrary(activeLibraryId);
      catalogEl.innerHTML = `
        <p class="limit-warning">
          No hay juegos disponibles para ${escapeHTML(activeLibrary?.label || "esta biblioteca")} con los filtros actuales.
        </p>
      `;
      return;
    }

    renderCatalogSpaceNotice();

    const vwrap = document.createElement("div");
    vwrap.className = "catalog-virtual";
    vwrap.style.position = "relative";
    vwrap.style.width = "100%";

    const phantom = document.createElement("div");
    phantom.className = "catalog-phantom";
    phantom.style.height = `${filteredGames.length * ROW_HEIGHT}px`;

    const viewport = document.createElement("div");
    viewport.className = "catalog-viewport";
    viewport.style.position = "absolute";
    viewport.style.left = "0";
    viewport.style.right = "0";
    viewport.style.top = "0";

    vwrap.appendChild(phantom);
    vwrap.appendChild(viewport);
    catalogEl.appendChild(vwrap);

    function createRow(game) {
      const item = document.createElement("div");
      item.className = "selector-item";
      item.style.height = `${ROW_HEIGHT}px`;

      const alreadyAdded = selectedGames.some((g) => g.key === game.key);

      item.innerHTML = `
        <span>${escapeHTML(game.name)}</span>
        <span>${formatGameSize(game.sizeGB)}</span>
        <button class="btn-small add-game ${alreadyAdded ? "added" : ""}"
                data-key="${escapeHTML(game.key)}"
                data-library-id="${escapeHTML(game.libraryId)}"
                data-size="${game.sizeGB}"
                aria-pressed="${alreadyAdded ? "true" : "false"}"
                aria-label="${alreadyAdded ? `Quitar ${escapeHTML(game.name)}` : `Agregar ${escapeHTML(game.name)}`}">
          ${alreadyAdded ? "✓" : "+"}
        </button>
      `;

      return item;
    }

    function updateVisibleRows() {
      const scrollTop = catalogEl.scrollTop;
      const viewHeight = catalogEl.clientHeight;

      let startIndex = Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN;
      let endIndex =
        Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN;

      startIndex = Math.max(0, startIndex);
      endIndex = Math.min(filteredGames.length - 1, endIndex);

      viewport.innerHTML = "";
      viewport.style.transform = `translateY(${startIndex * ROW_HEIGHT}px)`;

      const fragment = document.createDocumentFragment();

      for (let i = startIndex; i <= endIndex; i++) {
        fragment.appendChild(createRow(filteredGames[i]));
      }

      viewport.appendChild(fragment);

      bindAddButtons();
      refreshCatalogButtonsState();
    }

    catalogEl.style.overflowY = "auto";
    catalogEl.style.position = "relative";

    updateVisibleRows();

    catalogEl.onscroll = () => {
      window.requestAnimationFrame(updateVisibleRows);
    };
  }

  /* =============================
    AGREGAR JUEGOS
    ============================== */

  function bindAddButtons() {
    document.querySelectorAll(".add-game").forEach((button) => {
      if (button.dataset.boundAdd === "1") return;
      button.dataset.boundAdd = "1";

      button.addEventListener("click", () => {
        const key = button.dataset.key;
        const game = gamesByKey.get(key);

        if (!game) return;

        if (diskLimit === null) {
          alert("Primero selecciona el tamaño del almacenamiento.");
          return;
        }

        const existingIndex = selectedGames.findIndex((g) => g.key === key);

        // ✅ Si ya estaba agregado, tocar ✓ lo quita
        if (existingIndex !== -1) {
          selectedGames.splice(existingIndex, 1);
          removeEmulatorBaseIfUnused(game.libraryId);
          recalculateTotalSize();

          button.disabled = false;
          button.textContent = "+";
          button.classList.remove("added", "blocked");
          button.setAttribute("aria-pressed", "false");
          button.setAttribute("aria-label", `Agregar ${game.name}`);

          updateSummary();
          return;
        }

        const additionalSize = getAdditionalSizeForGame(game);

        if (totalSize + additionalSize > diskLimit) {
          showLimitWarning(
            "⚠️ No hay espacio suficiente para agregar más juegos.",
          );
          updateSummary();
          return;
        }

        ensureEmulatorBaseForLibrary(game.libraryId);

        selectedGames.push({
          key: game.key,
          id: game.id,
          titleId: game.titleId ?? null,
          name: game.name,
          sizeGB: game.sizeGB,
          size: game.sizeGB,
          libraryId: game.libraryId,
          libraryLabel: game.libraryLabel,
          catalogSourceRef: game.catalogSourceRef,
          type: game.type,
        });

        recalculateTotalSize();

        button.disabled = false;
        button.textContent = "✓";
        button.setAttribute("aria-pressed", "true");
        button.setAttribute("aria-label", `Quitar ${game.name}`);
        button.classList.add("added");

        updateSummary();
      });
    });
  }

  /* =============================
    CONTROLES
    ============================== */

  document.getElementById("clearAll")?.addEventListener("click", () => {
    resetSelection();
    updateSummary();
  });

  /* =============================
    GUARDAR SELECCIÓN
    ============================== */

  saveBtn?.addEventListener("click", () => {
    if (diskLimit === null) {
      alert("Selecciona el tamaño del almacenamiento.");
      return;
    }

    if (!selectedGames.length) {
      alert("Selecciona al menos un juego.");
      return;
    }

    if (totalSize > diskLimit) {
      alert("La selección excede el tamaño disponible.");
      return;
    }

    const humanList = selectedGames
      .map((game) => `[${game.libraryLabel}] ${game.name}`)
      .join("\n");

    const emulatorBaseList = Object.values(emulatorBases);
    const librarySummary = buildLibrarySummary();

    const prevContext = JSON.parse(localStorage.getItem(CONTEXT_KEY)) || {};

    if (!prevContext.model) {
      prevContext.model = {
        id: "default",
        description: `${CONSOLE_CONFIG.fullName} (modelo único)`,
        notes: "Modelo único, no requiere identificación previa",
      };
    }

    const contextPayload = {
      ...prevContext,

      console: {
        ...prevContext.console,
        code: CONSOLE_CONFIG.code,
        name: CONSOLE_CONFIG.fullName,
        brand: CONSOLE_CONFIG.brand,
      },

      storage: {
        label: `${diskLabel} GB`,
        usableGB: diskLimit,
      },

      games: {
        selectionID: null,
        count: selectedGames.length,
        totalSizeGB: roundSizeGB(totalSize),
        selectedGamesSizeGB: roundSizeGB(
          selectedGames.reduce((sum, game) => sum + safeNumber(game.sizeGB), 0),
        ),
        emulatorBaseSizeGB: roundSizeGB(
          emulatorBaseList.reduce((sum, base) => sum + safeNumber(base.sizeGB), 0),
        ),
        list: selectedGames.map((game) => ({
          id: game.id,
          titleId: game.titleId ?? null,
          name: game.name,
          sizeGB: game.sizeGB,
          libraryId: game.libraryId,
          libraryLabel: game.libraryLabel,
          catalogSourceRef: game.catalogSourceRef,
          type: game.type,
        })),
        emulatorBases: emulatorBaseList,
        librarySummary,
        humanList,
      },

      meta: {
        ...prevContext.meta,
        source: "catalogo",
        createdAt: new Date().toISOString(),
      },
    };

    saveContextPayload(contextPayload);

    window.location.href = "/solicitud/";
  });

  /* =============================
    UTILIDADES UI
    ============================== */

  function resetSelection() {
    selectedGames = [];
    emulatorBases = {};
    recalculateTotalSize();

    document.querySelectorAll(".add-game").forEach((btn) => {
      btn.disabled = false;
      btn.textContent = "+";
      btn.classList.remove("added", "blocked");

      const key = btn.dataset.key;
      const game = gamesByKey.get(key);

      if (game) {
        btn.setAttribute("aria-label", `Agregar ${game.name}`);
      }
    });

    hideLimitWarning();
  }

  function updateSummary() {
    recalculateTotalSize();

    if (gameCountEl) gameCountEl.textContent = selectedGames.length;
    if (totalSizeEl) totalSizeEl.textContent = totalSize.toFixed(3);

    hideLimitWarning();
    refreshCatalogButtonsState();
    renderCatalogSpaceNotice();

    if (diskLimit !== null && selectedGames.length && !canAddAnyMoreGames()) {
      showLimitWarning(
        "⚠️ Ya no hay espacio suficiente para agregar más juegos.",
      );
    }

    const recEl = document.getElementById("recommendedGames");
    if (recEl) {
      const rec = getRecommendedGames();
      if (rec) {
        recEl.textContent = `💡 Referencia: aprox. ${rec} juegos principales para ${diskLabel}. La cantidad real puede variar con juegos ligeros o emuladores.`;
      } else {
        recEl.textContent = "";
      }
    }

    renderStorageProgress();
    renderLibraryUsageHint();
  }

  function canAddAnyMoreGames() {
    if (diskLimit === null) return true;

    return Array.from(gamesByKey.values()).some((game) => {
      if (selectedGames.some((selected) => selected.key === game.key)) {
        return false;
      }

      return totalSize + getAdditionalSizeForGame(game) <= diskLimit;
    });
  }

  function renderCatalogSpaceNotice() {
    document.getElementById("catalogSpaceNotice")?.remove();

    if (diskLimit === null) return;
    if (!selectedGames.length) return;
    if (canAddAnyMoreGames()) return;

    const notice = document.createElement("p");
    notice.id = "catalogSpaceNotice";
    notice.className = "catalog-space-notice";
    notice.textContent =
      "Sin espacio disponible para agregar más juegos. Quita un juego o elige un almacenamiento mayor.";

    const toolbar = document.querySelector(".catalog-toolbar");
    toolbar?.insertAdjacentElement("afterend", notice);
  }

  function showLimitWarning(message) {
    if (document.getElementById("limitWarning")) return;

    const p = document.createElement("p");
    p.id = "limitWarning";
    p.className = "limit-warning";
    p.textContent = message;

    document.querySelector(".selector-summary")?.appendChild(p);
  }

  function hideLimitWarning() {
    document.getElementById("limitWarning")?.remove();
  }

  function renderStorageProgress() {
    const summaryBox = document.querySelector(".selector-summary");
    if (!summaryBox || diskLimit === null) return;

    let progress = document.getElementById("storageProgress");

    if (!progress) {
      progress = document.createElement("div");
      progress.id = "storageProgress";
      progress.className = "storage-progress";

      const gamesBlock = document.querySelector(".summary-games");
      if (gamesBlock) {
        gamesBlock.insertAdjacentElement("afterend", progress);
      } else {
        summaryBox.prepend(progress);
      }
    }

    const percent = diskLimit > 0
      ? Math.min(100, Math.max(0, (totalSize / diskLimit) * 100))
      : 0;

    const remaining = Math.max(0, diskLimit - totalSize);

    progress.innerHTML = `
      <div class="storage-progress-head">
        <span>Espacio usado</span>
        <strong>${percent.toFixed(1)}%</strong>
      </div>

      <div class="storage-progress-track">
        <div class="storage-progress-fill" style="width: ${percent}%;"></div>
      </div>

      <div class="storage-progress-meta">
        <span>${totalSize.toFixed(3)} GB usados</span>
        <span>${remaining.toFixed(3)} GB libres</span>
      </div>
  `;

    progress.classList.toggle("is-warning", percent >= 85 && percent < 100);
    progress.classList.toggle("is-full", percent >= 100);
  }

  function buildLibrarySummary() {
    const summary = {};

    selectedGames.forEach((game) => {
      if (!summary[game.libraryId]) {
        summary[game.libraryId] = {
          libraryId: game.libraryId,
          libraryLabel: game.libraryLabel,
          gamesCount: 0,
          gamesSizeGB: 0,
          emulatorBaseSizeGB: 0,
          totalSizeGB: 0,
        };
      }

      summary[game.libraryId].gamesCount += 1;
      summary[game.libraryId].gamesSizeGB += safeNumber(game.sizeGB);
    });

    Object.values(emulatorBases).forEach((base) => {
      if (!summary[base.libraryId]) {
        summary[base.libraryId] = {
          libraryId: base.libraryId,
          libraryLabel: base.libraryLabel,
          gamesCount: 0,
          gamesSizeGB: 0,
          emulatorBaseSizeGB: 0,
          totalSizeGB: 0,
        };
      }

      summary[base.libraryId].emulatorBaseSizeGB += safeNumber(base.sizeGB);
    });

    Object.values(summary).forEach((item) => {
      item.gamesSizeGB = roundSizeGB(item.gamesSizeGB);
      item.emulatorBaseSizeGB = roundSizeGB(item.emulatorBaseSizeGB);
      item.totalSizeGB = roundSizeGB(item.gamesSizeGB + item.emulatorBaseSizeGB);
    });

    return Object.values(summary);
  }

  function renderLibraryUsageHint() {
    const summaryBox = document.querySelector(".selector-summary");
    if (!summaryBox) return;

    let el = document.getElementById("libraryUsageSummary");

    const summary = buildLibrarySummary();

    if (!summary.length) {
      el?.remove();
      return;
    }

    if (!el) {
      el = document.createElement("div");
      el.id = "libraryUsageSummary";
      el.className = "limit-warning";
      summaryBox.appendChild(el);
    }

    const totalLibraries = summary.length;
    const totalGames = summary.reduce((sum, item) => sum + item.gamesCount, 0);

    el.innerHTML = `
  <details class="library-summary-details">
    <summary>
      <span>Resumen por biblioteca</span>
      <strong>${totalLibraries} biblioteca(s) · ${totalGames} juego(s)</strong>
    </summary>

    <div class="library-summary-list">
      ${summary
        .map((item) => {
          const baseText = item.emulatorBaseSizeGB
            ? ` + ${formatGameSize(item.emulatorBaseSizeGB)} emulador`
            : "";

          return `
            <div class="library-summary-row">
              <span>${escapeHTML(item.libraryLabel)}</span>
              <strong>${item.gamesCount} juego(s)</strong>
              <small>${formatGameSize(item.gamesSizeGB)}${baseText}</small>
            </div>
          `;
        })
        .join("")}
    </div>
  </details>
`;
  }

  function getRecommendedGames() {
    const currentCtx = getContext();
    if (!currentCtx?.storage || !currentCtx?.services) return null;

    if (!window.SERVICES_DATA) return null;

    const consoleCode = currentCtx.console?.code;
    const services = currentCtx.services;

    const size = String(currentCtx.storage.label || "").replace(" GB", "");

    const storageOptions = window.SERVICES_DATA?.[consoleCode]?.storageOptions;

    if (services.includes("storage_with_games")) {
      return storageOptions?.provided?.sizes?.[size]?.gamesIncluded || null;
    }

    if (services.includes("games_only")) {
      return storageOptions?.client?.sizes?.[size]?.gamesIncluded || null;
    }

    return null;
  }
});