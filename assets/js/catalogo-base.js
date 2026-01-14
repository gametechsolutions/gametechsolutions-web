document.addEventListener('DOMContentLoaded', () => {

  /* =============================
       VARIABLES BASE
    ============================== */
  
    let selectedGames = [];
    let totalSize = 0;
    let diskLimit = null;
    let diskLabel = '';
    let gamesData = [];
    let packagesData = [];
  
    const gameCountEl = document.getElementById('gameCount');
    const totalSizeEl = document.getElementById('totalSize');
    const catalogEl = document.querySelector('.selector-catalog');
  
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
        if (!res.ok) throw new Error('No se pudo cargar el JSON');
        return res.json();
      })
      .then(data => {
        gamesData = data;
        renderCatalog();
      })
      .catch(err => {
        console.error('Error cargando catálogo:', err);
        catalogEl.innerHTML = '<p>Error cargando el catálogo de juegos.</p>';
      });

    fetch('/assets/data/packages.json')
      .then(res => res.json())
      .then(data => {
        packagesData = data[CONSOLE_CONFIG.code] || [];
        renderPackages();
      })
      .catch(err => {
        console.warn('No se pudieron cargar los paquetes:', err);
      });
  
    function renderCatalog() {
      catalogEl.innerHTML += '';
  
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
          const id = Number(button.dataset.id);
          const size = Number(button.dataset.size);
  
          if (diskLimit === null) {
            alert('Primero selecciona el tamaño del disco duro.');
            return;
          }
  
          if (selectedGames.some(g => g.id === id)) return;
  
          if (totalSize + size > diskLimit) {
            showLimitWarning(
              '⚠️ No hay espacio suficiente para agregar más juegos.'
            );
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
       DISCO DURO
    ============================== */
  
    document.querySelectorAll('input[name="diskSize"]').forEach(radio => {
      radio.addEventListener('change', () => {
        diskLimit = Number(radio.dataset.limit);
        diskLabel = radio.value;
        resetSelection();
        updateSummary();
      });
    });
  
    /* =============================
       CONTROLES
    ============================== */
  
    document.getElementById('removeLast').addEventListener('click', () => {
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
  
    document.getElementById('clearAll').addEventListener('click', () => {
      resetSelection();
      updateSummary();
    });

    /* =============================
       GENERAR ID DE SELECCIÓN
    ============================= */
    
    function generateSelectionId(consoleCode) {
      const year = new Date().getFullYear();
      const storageKey = `selectionCounter_${consoleCode}_${year}`;
    
      let counter = Number(localStorage.getItem(storageKey)) || 0;
      counter += 1;
    
      localStorage.setItem(storageKey, counter);
    
      return `${consoleCode}-${year}-${String(counter).padStart(3, '0')}`;
    }

    /* =============================
       GUARDAR SELECCIÓN (Airtable)
    ============================= */
    
    const saveBtn = document.getElementById('saveSelection');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {

        // 1️⃣ Debe haber disco seleccionado
        if (diskLimit === null || Number.isNaN(diskLimit)) {
          alert('Selecciona primero el tamaño de la USB.');
          return;
        }
        
        // 2️⃣ Debe haber al menos un juego
        if (!selectedGames.length) {
          alert('Selecciona al menos un juego.');
          return;
        }
        
        // 3️⃣ Validación REAL de espacio
        if (totalSize > diskLimit) {
          alert(
            `❌ La selección excede el tamaño de la USB.\n\n` +
            `Espacio usado: ${totalSize.toFixed(2)} GB\n` +
            `Límite: ${diskLimit} GB\n\n` +
            `Elimina juegos para continuar.`
          );
          return;
        }

        const clientName = prompt('Nombre del cliente:');
        if (!clientName) return;
    
        const selectionId = generateSelectionId(CONSOLE_CONFIG.code);
    
        const payload = {
          selectionID: selectionId,
          clientName: clientName,
          console: CONSOLE_CONFIG.fullName,
          diskSize: Number(diskLabel),
          diskLimit: diskLimit,
          totalSize: Number(totalSize.toFixed(2)),
          CantidadJuegos: selectedGames.length,
    
          selectedGames: selectedGames
            .map(g => {
              const game = gamesData.find(x => Number(x.id) === g.id);
              return game ? game.name : null;
            })
            .filter(Boolean)
            .join('\n'),

          jsonGames: JSON.stringify(
            selectedGames
              .map(g => {
                const game = gamesData.find(x => Number(x.id) === Number(g.id));
          
                if (!game) {
                  console.warn('Juego no encontrado en gamesData:', g);
                  return null;
                }
          
                return {
                  id: game.id,
                  name: game.name,
                  size: game.size
                };
              })
              .filter(Boolean)
          ),

          status: 'Pendiente'
        };
    
        try {
          const res = await fetch('/api/save-selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const errorData = await res.json();
          
            if (errorData?.error === 'Disk limit exceeded') {
              alert(
                `❌ La selección excede el tamaño permitido.\n\n` +
                `Usado: ${totalSize.toFixed(2)} GB\n` +
                `Límite: ${diskLimit} GB`
              );
            } else {
              alert('❌ Error al guardar la selección');
              console.error(errorData);
            }
            return;
          }

          const result = await res.json();
    
          if (result.success) {
            alert(`✅ Selección guardada\nID: ${selectionId}`);
            resetAfterSuccess();
          } else {
            console.error(result);
            alert('❌ Error al guardar la selección');
          }
    
        } catch (err) {
          console.error(err);
          alert('❌ Error de conexión con el servidor');
        }
      });
    }
  
    /* =============================
       UTILIDADES
    ============================== */
  
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

    function resetAfterSuccess() {
      // 1. Limpiar selección interna
      selectedGames = [];
      totalSize = 0;
      diskLimit = null;
      diskLabel = '';
    
      // 2. Resetear radios de tamaño
      document.querySelectorAll('input[name="diskSize"]').forEach(radio => {
        radio.checked = false;
      });
    
      // 3. Resetear botones de juegos
      document.querySelectorAll('.add-game').forEach(btn => {
        btn.disabled = false;
        btn.textContent = 'Agregar';
        btn.classList.remove('added');
      });
    
      // 4. Resetear contadores visuales
      updateSummary();
      hideLimitWarning();
    }

    function canAddAnyMoreGames() {
      if (diskLimit === null) return true;
    
      return gamesData.some(game => {
        const size = Number(game.size);
        return totalSize + size <= diskLimit;
      });
    }
  
    function updateSummary() {
      gameCountEl.textContent = selectedGames.length;
      totalSizeEl.textContent = totalSize.toFixed(2);
    
      hideLimitWarning();
    
      // 🔴 NO cabe ningún juego más
      if (diskLimit !== null && !canAddAnyMoreGames()) {
        showLimitWarning(
          '⚠️ Ya no hay espacio suficiente para agregar más juegos.'
        );
      }

      document.querySelectorAll('.add-game:not(.added)').forEach(btn => {
        const size = Number(btn.dataset.size);
      
        if (diskLimit !== null && totalSize + size > diskLimit) {
          btn.disabled = true;
        } else {
          btn.disabled = false;
        }
      });
    
      // 🔒 Guardar selección (nivel PRO)
      if (saveBtn) {
        if (diskLimit !== null && totalSize > diskLimit) {
          saveBtn.disabled = true;
        } else {
          saveBtn.disabled = false;
        }
      }
    }
  
    function showLimitWarning(message = '⚠️ Has alcanzado el límite del disco.') {
      if (!document.getElementById('limitWarning')) {
        const p = document.createElement('p');
        p.id = 'limitWarning';
        p.className = 'limit-warning';
        p.textContent = message;
        document.querySelector('.selector-summary').appendChild(p);
      }
    }
  
    function hideLimitWarning() {
      const w = document.getElementById('limitWarning');
      if (w) w.remove();
    }
  
  });
