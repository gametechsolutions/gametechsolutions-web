/* =========================================
   CONTEXT.JS — GameTechSolutions
   Estado global del flujo de cliente
========================================= */

(function () {

  const CONTEXT_KEY = 'GTS_CONTEXT';

  function getContext() {
    try {
      return JSON.parse(localStorage.getItem(CONTEXT_KEY)) || {
        version: 1,
        status: 'draft'
      };
    } catch {
      return { version: 1, status: 'draft' };
    }
  }

  function saveContext(partial) {
    const current = getContext();

    const merged = {
      ...current,
      ...partial,
      meta: {
        ...current.meta,
        ...partial.meta,
        updatedAt: new Date().toISOString()
      }
    };

    localStorage.setItem(CONTEXT_KEY, JSON.stringify(merged));
    return merged;
  }

  function resetContext() {
    localStorage.removeItem(CONTEXT_KEY);
  }

  function finalizeContext() {
    const ctx = getContext();
    ctx.status = 'finalized';
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
    return ctx;
  }

  // 🌍 Exponer API global
  window.GTSContext = {
    get: getContext,
    save: saveContext,
    reset: resetContext,
    finalize: finalizeContext
  };

})();