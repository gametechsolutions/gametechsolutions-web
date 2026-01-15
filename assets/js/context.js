const CONTEXT_KEY = 'GTS_CONTEXT';

export function getContext() {
  try {
    return JSON.parse(localStorage.getItem(CONTEXT_KEY)) || {
      version: 1,
      status: 'draft'
    };
  } catch {
    return { version: 1, status: 'draft' };
  }
}

export function saveContext(partial) {
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

export function resetContext() {
  localStorage.removeItem(CONTEXT_KEY);
}

export function finalizeContext() {
  const ctx = getContext();
  ctx.status = 'finalized';
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
}
