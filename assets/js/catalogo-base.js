document.addEventListener('DOMContentLoaded', () => {

  /* =============================
     VARIABLES BASE
  ============================== */

  let selectedGames = [];
  let totalSize = 0;
  let diskLimit = null;
  let diskLabel = '';
  let gamesData = [];

  /* =============================
   CARGAR STORAGE DESDE CONTEXTO
  ============================== */
  
  const ctx = window.GTSContext?.load?.();
  
  if (ctx?.storage) {
    diskLimit = Number(ctx.storage.usableGB);
    diskLabel = ctx.storage.label;
  } else {
    alert('No se detectó almacenamiento válido para el catálogo.');
    window.location.href = '/consolas/xbox360/';
  }

  const gameCountEl = document.getElementById('gameCount');
  const totalSizeEl = document.getElementById('totalSize');
  const catalogEl   = document.querySelector('.selector-catalog');
  const saveBtn     = document.getElementById('saveSelection');

  /* =============================
     TEXTOS DINÁMICOS
  ============================== */

  document.title = `Catálogo de juegos ${CONSOLE_CONFIG.fullName} | GameTechSolutions`;

  document.querySelectorAll('.consoleFull').forEach(el => {
    el.textContent = CONSOLE_CONFIG.fullName;
  });

  /* =============================
     CARGAR JUEGOS DESDE JSON
  ============================== */

  fetch(CONSOLE_CONFIG.gamesJson)
    .then(res => {
      if (!res.ok) throw new Error('No se pudo cargar el catálogo');
      return res.json();
    })
    .then(data => {
      gamesData = data;
      renderCatalog();
    })
    .catch(err => {
      console.error(err);
      catalogEl.innerHTML = '<p>Error cargando el catálogo de juegos.</p>';
    });

  function renderCatalog() {
    catalogEl.innerHTML = '';

    gamesData.forEach(game => {
      const item = document.createElement('div');
      item.className = 'selector-item';

      item.innerHTML = `
        <span>${game.name}</span>
        <span>${Number(game.size).toFixed(2)} GB</span>
        <button class="btn-small add-game"
                data-id="${game.id}"
                data-size="${game.size}">
          Agregar
        </button>
      `;

      catalogEl.appendChild(item);
    });

    bindAddButtons();
  }

  /* =============================
     AGREGAR JUEGOS
  ============================== */

  function bindAddButtons() {
    document.querySelectorAll('.add-game').forEach(button => {
      button.addEventListener('click', () => {
        const id   = Number(button.dataset.id);
        const size = Number(button.dataset.size);

        if (diskLimit === null) {
          alert('Primero selecciona el tamaño del almacenamiento.');
          return;
        }

        if (selectedGames.some(g => g.id === id)) return;

        if (totalSize + size > diskLimit) {
          showLimitWarning('⚠️ No hay espacio suficiente para agregar más juegos.');
          updateSummary();
          return;
        }

        selectedGames.push({ id, size });
        totalSize += size;

        button.disabled = true;
        button.textContent = 'Agregado';
        button.classList.add('added');

        updateSummary();
      });
    });
  }

  /* =============================
     CONTROLES
  ============================== */

  document.getElementById('removeLast')?.addEventListener('click', () => {
    if (!selectedGames.length) return;

    const removed = selectedGames.pop();
    totalSize -= removed.size;

    const btn = document.querySelector(`.add-game[data-id="${removed.id}"]`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Agregar';
      btn.classList.remove('added');
    }

    updateSummary();
  });

  document.getElementById('clearAll')?.addEventListener('click', () => {
    resetSelection();
    updateSummary();
  });

  /* =============================
     GUARDAR SELECCIÓN
  ============================== */

  saveBtn?.addEventListener('click', () => {

    if (diskLimit === null) {
      alert('Selecciona el tamaño del almacenamiento.');
      return;
    }

    if (!selectedGames.length) {
      alert('Selecciona al menos un juego.');
      return;
    }

    if (totalSize > diskLimit) {
      alert('La selección excede el tamaño disponible.');
      return;
    }

    const hasGames = selectedGames.length > 0;
	const selectionId = generateSelectionId(CONSOLE_CONFIG.code, hasGames);

    const humanList = selectedGames
      .map(g => {
        const game = gamesData.find(x => Number(x.id) === Number(g.id));
        return game ? game.name : null;
      })
      .filter(Boolean)
      .join('\n');

    // 🔒 RECUPERAR CONTEXTO EXISTENTE (NO BORRAR MODELO)
    const prevContext =
      JSON.parse(localStorage.getItem('GTS_CONTEXT')) || {};

    // 🧩 Inyectar modelo por defecto si la consola no tiene identificación
    if (!prevContext.model) {
      prevContext.model = {
        id: 'default',
        description: `${CONSOLE_CONFIG.fullName} (modelo único)`,
        notes: 'Modelo único, no requiere identificación previa'
      };
    }

    // ✅ GUARDAR CONTEXTO GLOBAL (ROBUSTO)
    const contextPayload = {
      ...prevContext, // 👈 CLAVE: conserva model, package, etc.
    
      console: {
        ...prevContext.console,
        code: CONSOLE_CONFIG.code,
        name: CONSOLE_CONFIG.fullName,
        brand: CONSOLE_CONFIG.brand
      },
    
      storage: {
        label: `${diskLabel} GB`,
        usableGB: diskLimit
      },
    
      games: {
		  selectionID: selectionId,
		  count: selectedGames.length,
		  totalSizeGB: Number(totalSize.toFixed(2)),
		  list: selectedGames.map(g => ({
		    id: g.id,
		    name: gamesData.find(x => x.id == g.id)?.name || 'Desconocido',
		    sizeGB: g.size
		  })),
		  humanList
		},
    
      meta: {
        ...prevContext.meta,
        source: 'catalogo',
        createdAt: new Date().toISOString()
      }
    };

    if (window.GTSContext && typeof window.GTSContext.save === 'function') {
      // PS2 / Xbox 360 (con context.js)
      window.GTSContext.save(contextPayload);
    } else {
      // Xbox clásica y fallback seguro
      localStorage.setItem(
        'GTS_CONTEXT',
        JSON.stringify(contextPayload)
      );
    }
        window.location.href = '/contacto/';
      });

  /* =============================
     UTILIDADES
  ============================== */

  function generateSelectionId(consoleCode, hasGames) {
	  const year = new Date().getFullYear();
	  const type = hasGames ? 'GAMES' : 'SVC';
	  const key  = `selectionCounter_${consoleCode}_${type}_${year}`;
	
	  let counter = Number(localStorage.getItem(key)) || 0;
	  counter += 1;
	
	  localStorage.setItem(key, counter);
	  return `${consoleCode}-${type}-${year}-${String(counter).padStart(3, '0')}`;
	}

  function resetSelection() {
    selectedGames = [];
    totalSize = 0;

    document.querySelectorAll('.add-game').forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Agregar';
      btn.classList.remove('added');
    });

    hideLimitWarning();
  }

  function updateSummary() {
    gameCountEl.textContent = selectedGames.length;
    totalSizeEl.textContent = totalSize.toFixed(2);

    hideLimitWarning();

    // 🔒 Deshabilitar botones que ya no caben
    document.querySelectorAll('.add-game:not(.added)').forEach(btn => {
      const size = Number(btn.dataset.size);
      btn.disabled = diskLimit !== null && (totalSize + size > diskLimit);
    });

    if (diskLimit !== null && !canAddAnyMoreGames()) {
      showLimitWarning('⚠️ Ya no hay espacio suficiente para agregar más juegos.');
    }
	
	const recEl = document.getElementById('recommendedGames');
	if (recEl) {
	  const rec = getRecommendedGames();
	  if (rec) {
		recEl.textContent =
		  `💡 Recomendado para tu disco (${diskLabel}): hasta ${rec} juegos.`;
	  } else {
		recEl.textContent = '';
	  }
	}
  }

  function canAddAnyMoreGames() {
    if (diskLimit === null) return true;
    return gamesData.some(g => totalSize + Number(g.size) <= diskLimit);
  }

  function showLimitWarning(message) {
    if (document.getElementById('limitWarning')) return;

    const p = document.createElement('p');
    p.id = 'limitWarning';
    p.className = 'limit-warning';
    p.textContent = message;

    document.querySelector('.selector-summary')?.appendChild(p);
  }

  function hideLimitWarning() {
    document.getElementById('limitWarning')?.remove();
  }
  
  function getRecommendedGames() {
	  const ctx = window.GTSContext.load();
	  if (!ctx?.storage || !ctx?.services) return null;

	  const services = ctx.services;

	  // Caso: disco con juegos (número fijo)
	  if (services.includes('storage_with_games')) {
		const size = ctx.storage.label.replace(' GB', '');
		const map = {
		  '500': 50,
		  '1000': 100
		};
		return map[size] || null;
	  }

	  // Caso: carga de juegos (estimado por promedio)
	  if (services.includes('games_only') && gamesData.length) {
		const avgSize =
		  gamesData.reduce((acc, g) => acc + Number(g.size), 0) / gamesData.length;

		return Math.floor(diskLimit / avgSize);
	  }

	  return null;
	}

});
