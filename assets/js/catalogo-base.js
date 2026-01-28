document.addEventListener("DOMContentLoaded", () => {
  /* =============================
    VARIABLES BASE
    ============================== */

  let selectedGames = [];
  let totalSize = 0;
  let diskLimit = null;
  let diskLabel = "";
  let gamesData = [];

  /* =============================
    FILTROS (SEARCH + LETRAS)
    ============================== */

  let searchTerm = "";
  let activeLetter = "ALL"; // ALL | # | A-Z

  function getFilteredGames() {
    const term = searchTerm.trim().toLowerCase();

    return gamesData.filter((g) => {
      const name = String(g.name || "").trim();
      if (!name) return false;

      // filtro por letra
      if (activeLetter !== "ALL") {
        const first = name[0].toUpperCase();
        const isNum = /^[0-9]/.test(first);

        if (activeLetter === "#") {
          if (!isNum) return false;
        } else {
          if (first !== activeLetter) return false;
        }
      }

      // búsqueda
      if (term) {
        return name.toLowerCase().includes(term);
      }

      return true;
    });
  }

  function refreshCatalogButtonsState() {
    document.querySelectorAll(".add-game").forEach((btn) => {
      const id = Number(btn.dataset.id);
      const size = Number(btn.dataset.size);

      const alreadyAdded = selectedGames.some((g) => g.id === id);

      if (alreadyAdded) {
        btn.disabled = true;
        btn.textContent = "Agregado";
        btn.classList.add("added");
        return;
      }

      const noSpace = diskLimit !== null && totalSize + size > diskLimit;

      btn.disabled = noSpace;

      if (noSpace) {
        btn.textContent = "No cabe";
        btn.classList.add("blocked");
      } else {
        btn.textContent = "Agregar";
        btn.classList.remove("blocked");
      }
    });
  }

  /* =============================
    CARGAR STORAGE DESDE CONTEXTO
    ============================== */

  const ctx = window.GTSContext?.load?.();

  /* =============================
    CARGAR SERVICES.JSON (GLOBAL)
    ============================= */

  let servicesData = {};

  fetch("/assets/data/services.json")
    .then((res) => {
      if (!res.ok) throw new Error("No se pudo cargar services.json");
      return res.json();
    })
    .then((data) => {
      servicesData = data;
      // 🌍 Exponer globalmente
      window.SERVICES_DATA = data;
    })
    .catch((err) => {
      console.error("Error cargando services.json:", err);
    });

  if (ctx?.storage) {
    diskLimit = Number(ctx.storage.usableGB);
    diskLabel = ctx.storage.label;
  } else {
    alert("No se detectó almacenamiento válido para el catálogo.");
    window.location.href = "/consolas/xbox360/";
  }

  const gameCountEl = document.getElementById("gameCount");
  const totalSizeEl = document.getElementById("totalSize");
  const catalogEl = document.querySelector(".selector-catalog .catalog-list");
  const saveBtn = document.getElementById("saveSelection");

  /* =============================
    TEXTOS DINÁMICOS
    ============================== */

  document.title = `Catálogo de juegos ${CONSOLE_CONFIG.fullName} | GameTechSolutions`;

  document.querySelectorAll(".consoleFull").forEach((el) => {
    el.textContent = CONSOLE_CONFIG.fullName;
  });

  /* =============================
    CARGAR JUEGOS DESDE JSON
    ============================== */

  fetch(CONSOLE_CONFIG.gamesJson)
    .then((res) => {
      if (!res.ok) throw new Error("No se pudo cargar el catálogo");
      return res.json();
    })
    .then((data) => {
      gamesData = data;

      renderLetterFilter();
      bindSearchControls();

      renderCatalog();
    })

    .catch((err) => {
      console.error(err);
      catalogEl.innerHTML = "<p>Error cargando el catálogo de juegos.</p>";
    });

  function renderCatalog() {
    // ===== Virtual Scroll settings =====
    const ROW_HEIGHT = 72; // ajusta si cambias padding/alto en CSS
    const OVERSCAN = 10; // items extra arriba/abajo para scroll suave
    const filteredGames = getFilteredGames();

    catalogEl.innerHTML = "";

    // contenedor virtual
    const vwrap = document.createElement("div");
    vwrap.className = "catalog-virtual";
    vwrap.style.position = "relative";
    vwrap.style.width = "100%";

    // “phantom” para simular altura total del catálogo
    const phantom = document.createElement("div");
    phantom.className = "catalog-phantom";
    phantom.style.height = `${filteredGames.length * ROW_HEIGHT}px`;

    // capa donde realmente pintamos filas
    const viewport = document.createElement("div");
    viewport.className = "catalog-viewport";
    viewport.style.position = "absolute";
    viewport.style.left = "0";
    viewport.style.right = "0";
    viewport.style.top = "0";

    vwrap.appendChild(phantom);
    vwrap.appendChild(viewport);
    catalogEl.appendChild(vwrap);

    // crea item DOM
    function createRow(game) {
      const item = document.createElement("div");
      item.className = "selector-item";
      item.style.height = `${ROW_HEIGHT}px`;

      // ✅ revisa si ya fue agregado
      const alreadyAdded = selectedGames.some(
        (g) => Number(g.id) === Number(game.id),
      );

      item.innerHTML = `
    <span>${game.name}</span>
    <span>${Number(game.size).toFixed(2)} GB</span>
    <button class="btn-small add-game ${alreadyAdded ? "added" : ""}"
            data-id="${game.id}"
            data-size="${game.size}"
            ${alreadyAdded ? "disabled" : ""}>
      ${alreadyAdded ? "Agregado" : "Agregar"}
    </button>
  `;

      return item;
    }

    // renderizado por ventana
    function updateVisibleRows() {
      const scrollTop = catalogEl.scrollTop;
      const viewHeight = catalogEl.clientHeight;

      let startIndex = Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN;
      let endIndex =
        Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN;

      startIndex = Math.max(0, startIndex);
      endIndex = Math.min(filteredGames.length - 1, endIndex);

      viewport.innerHTML = "";

      // desplaza viewport a su posición real
      viewport.style.transform = `translateY(${startIndex * ROW_HEIGHT}px)`;

      const fragment = document.createDocumentFragment();

      for (let i = startIndex; i <= endIndex; i++) {
        fragment.appendChild(createRow(filteredGames[i]));
      }

      viewport.appendChild(fragment);

      // binds a botones (solo los visibles)
      bindAddButtons();
      refreshCatalogButtonsState();
    }

    // IMPORTANTE: aseguramos que el contenedor tenga scroll
    // Si tu CSS ya lo controla en otro wrapper, no pasa nada.
    catalogEl.style.overflowY = "auto";
    catalogEl.style.position = "relative";

    // primer render
    updateVisibleRows();

    // scroll listener
    catalogEl.onscroll = () => {
      window.requestAnimationFrame(updateVisibleRows);
    };
  }

  /* =============================
    UI FILTROS (SEARCH + LETRAS)
    ============================== */

  function bindSearchControls() {
    const input = document.getElementById("catalogSearch");
    const clearBtn = document.getElementById("clearSearch");

    if (input) {
      input.addEventListener("input", () => {
        searchTerm = input.value || "";
        renderCatalog();
      });
    }

    if (clearBtn) {
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

    letters.forEach((L) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = L === "ALL" ? "Todo" : L;

      if (activeLetter === L) btn.classList.add("active");

      btn.addEventListener("click", () => {
        activeLetter = L;

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
    AGREGAR JUEGOS
    ============================== */

  function bindAddButtons() {
    document.querySelectorAll(".add-game").forEach((button) => {
      button.addEventListener("click", () => {
        const id = Number(button.dataset.id);
        const size = Number(button.dataset.size);

        if (diskLimit === null) {
          alert("Primero selecciona el tamaño del almacenamiento.");
          return;
        }

        if (selectedGames.some((g) => g.id === id)) return;

        if (totalSize + size > diskLimit) {
          showLimitWarning(
            "⚠️ No hay espacio suficiente para agregar más juegos.",
          );
          updateSummary();
          return;
        }

        selectedGames.push({
          id,
          size,
        });
        totalSize += size;

        button.disabled = true;
        button.textContent = "Agregado";
        button.classList.add("added");

        updateSummary();
      });
    });
  }

  /* =============================
    CONTROLES
    ============================== */

  document.getElementById("removeLast")?.addEventListener("click", () => {
    if (!selectedGames.length) return;

    const removed = selectedGames.pop();
    totalSize -= removed.size;

    const btn = document.querySelector(`.add-game[data-id="${removed.id}"]`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Agregar";
      btn.classList.remove("added");
    }

    updateSummary();
  });

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

    const hasGames = selectedGames.length > 0;
    const selectionId = generateSelectionId(CONSOLE_CONFIG.code, hasGames);

    const humanList = selectedGames
      .map((g) => {
        const game = gamesData.find((x) => Number(x.id) === Number(g.id));
        return game ? game.name : null;
      })
      .filter(Boolean)
      .join("\n");

    // 🔒 RECUPERAR CONTEXTO EXISTENTE (NO BORRAR MODELO)
    const prevContext = JSON.parse(localStorage.getItem("GTS_CONTEXT")) || {};

    // 🧩 Inyectar modelo por defecto si la consola no tiene identificación
    if (!prevContext.model) {
      prevContext.model = {
        id: "default",
        description: `${CONSOLE_CONFIG.fullName} (modelo único)`,
        notes: "Modelo único, no requiere identificación previa",
      };
    }

    // ✅ GUARDAR CONTEXTO GLOBAL (ROBUSTO)
    const contextPayload = {
      ...prevContext, // 👈 CLAVE: conserva model, package, etc.

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
        selectionID: selectionId,
        count: selectedGames.length,
        totalSizeGB: Number(totalSize.toFixed(2)),
        list: selectedGames.map((g) => ({
          id: g.id,
          name: gamesData.find((x) => x.id == g.id)?.name || "Desconocido",
          sizeGB: g.size,
        })),
        humanList,
      },

      meta: {
        ...prevContext.meta,
        source: "catalogo",
        createdAt: new Date().toISOString(),
      },
    };

    if (window.GTSContext && typeof window.GTSContext.save === "function") {
      // PS2 / Xbox 360 (con context.js)
      window.GTSContext.save(contextPayload);
    } else {
      // Xbox clásica y fallback seguro
      localStorage.setItem("GTS_CONTEXT", JSON.stringify(contextPayload));
    }
    window.location.href = "/contacto/";
  });

  /* =============================
    UTILIDADES
    ============================== */

  function generateSelectionId(consoleCode, hasGames) {
    const year = new Date().getFullYear();
    const type = hasGames ? "GAMES" : "SVC";
    const key = `selectionCounter_${consoleCode}_${type}_${year}`;

    let counter = Number(localStorage.getItem(key)) || 0;
    counter += 1;

    localStorage.setItem(key, counter);
    return `${consoleCode}-${type}-${year}-${String(counter).padStart(3, "0")}`;
  }

  function resetSelection() {
    selectedGames = [];
    totalSize = 0;

    document.querySelectorAll(".add-game").forEach((btn) => {
      btn.disabled = false;
      btn.textContent = "Agregar";
      btn.classList.remove("added");
    });

    hideLimitWarning();
  }

  function updateSummary() {
    gameCountEl.textContent = selectedGames.length;
    totalSizeEl.textContent = totalSize.toFixed(2);

    hideLimitWarning();

    // 🔒 Deshabilitar botones que ya no caben
    document.querySelectorAll(".add-game:not(.added)").forEach((btn) => {
      const size = Number(btn.dataset.size);
      btn.disabled = diskLimit !== null && totalSize + size > diskLimit;
    });

    if (diskLimit !== null && !canAddAnyMoreGames()) {
      showLimitWarning(
        "⚠️ Ya no hay espacio suficiente para agregar más juegos.",
      );
    }

    const recEl = document.getElementById("recommendedGames");
    if (recEl) {
      const rec = getRecommendedGames();
      if (rec) {
        recEl.textContent = `💡 Recomendación para tu disco de (${diskLabel}): aproximadamente ${rec} juegos.`;
      } else {
        recEl.textContent = "";
      }
    }
    refreshCatalogButtonsState();
  }

  function canAddAnyMoreGames() {
    if (diskLimit === null) return true;
    return gamesData.some((g) => totalSize + Number(g.size) <= diskLimit);
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

  function getRecommendedGames() {
    const ctx = window.GTSContext.load();
    if (!ctx?.storage || !ctx?.services) return null;

    if (!window.SERVICES_DATA) return null;

    const consoleCode = ctx.console?.code;
    const services = ctx.services;

    const size = ctx.storage.label.replace(" GB", "");

    const storageOptions = window.SERVICES_DATA?.[consoleCode]?.storageOptions;

    // 👉 Disco proporcionado por GameTechSolutions
    if (services.includes("storage_with_games")) {
      return storageOptions?.provided?.sizes?.[size]?.gamesIncluded || null;
    }

    // 👉 Disco del cliente (Carga de juegos)
    if (services.includes("games_only")) {
      return storageOptions?.client?.sizes?.[size]?.gamesIncluded || null;
    }

    return null;
  }
});
