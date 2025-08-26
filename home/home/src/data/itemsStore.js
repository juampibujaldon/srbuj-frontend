// src/data/itemsStore.js
const LS_KEY = "srbuj_items";

export function loadItems(seed = []) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed;
}

export function saveItems(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}
