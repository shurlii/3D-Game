const KEY = 'meow-bakery-3d.v1';

export function defaultState() {
  return { wallet: 0, lifetime: 0, inventory: {}, goods: {}, history: [] };
}

const clean = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const cleanMap = (m) => Object.fromEntries(Object.entries(m && typeof m === 'object' ? m : {}).map(([k, v]) => [k, clean(v)]));

export function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return defaultState();
    return {
      wallet: clean(raw.wallet),
      lifetime: clean(raw.lifetime),
      inventory: cleanMap(raw.inventory),
      goods: cleanMap(raw.goods),
      history: Array.isArray(raw.history) ? raw.history.slice(0, 10) : [],
    };
  } catch (e) {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) { /* 저장 공간을 못 쓰는 환경 */ }
}
