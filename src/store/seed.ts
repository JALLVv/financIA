import type { Category, List } from '@/models/types';
import { uid } from '@/utils/id';

/** Lista y categorías iniciales para que la app sea usable desde el primer segundo. */
export function createSeed(): { lists: List[]; categories: Category[]; activeListId: string } {
  const list: List = { id: uid('list'), name: 'Personal', createdAt: Date.now() };

  const defaults: Array<[string, string, string]> = [
    ['Comida', '🍔', '#FF9F0A'],
    ['Transporte', '🚗', '#0A84FF'],
    ['Hogar', '🏠', '#A2845E'],
    ['Ocio', '🎬', '#BF5AF2'],
    ['Salud', '💊', '#66D4CF'],
    ['Compras', '🛍️', '#FF6482'],
    ['Sueldo', '💼', '#98989D'],
    ['Otros', '✨', '#FFD60A'],
  ];

  const categories: Category[] = defaults.map(([name, emoji, color], i) => ({
    id: uid('cat'),
    listId: list.id,
    name,
    emoji,
    color,
    createdAt: Date.now() + i,
  }));

  return { lists: [list], categories, activeListId: list.id };
}
