/* =========================================
   CONTEXT.JS — GameTechSolutions
   Estado global del flujo del cliente
========================================= */

(function () {
  const STORAGE_KEY = 'GTS_CONTEXT';

  function now() {
    return new Date().toISOString();
  }

  const DEFAULT_CONTEXT = {
    version: 1,
    status: 'draft',

    console: null,      // { code, name, brand }
    model: null,        // { id, description, notes }

    services: [],       // servicios seleccionados (futuro)
    storage: null,      // { label, usableGB }
    games: null,        // { selectionID, count, totalSizeGB, humanList }

    pricing: null,      // resumen de precios finales
    meta: {
      createdAt: now(),
      updatedAt: now(),
      source: null
    }
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_CONTEXT);

      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_CONTEXT),
        ...parsed,
        meta: {
          ...DEFAULT_CONTEXT.meta,
          ...parsed.meta
        }
      };
    } catch (e) {
      console.error('Error cargando GTS_CONTEXT:', e);
      return structuredClone(DEFAULT_CONTEXT);
    }
  }

  function save(partial) {
    const current = load();

    const merged = {
      ...current,
      ...partial,
      meta: {
        ...current.meta,
        ...partial.meta,
        updatedAt: now()
      }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function set(path, value) {
    const ctx = load();
    ctx[path] = value;
    ctx.meta.updatedAt = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    return ctx;
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function require(fields = []) {
    const ctx = load();
    const missing = fields.filter(f => !ctx[f]);
    return {
      ok: missing.length === 0,
      missing
    };
  }

  function debug() {
    console.table(load());
    return load();
  }

  // 🔒 API GLOBAL ÚNICA
  window.GTSContext = {
    load,
    save,
    set,
    clear,
    require,
    debug
  };
})();
