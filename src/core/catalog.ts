import { PRODUCTS } from '../data/products';
import type { Product, ProductId } from './types';

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: ProductId): Product | undefined {
  return byId.get(id);
}

export function allProducts(): readonly Product[] {
  return PRODUCTS;
}

export const round10 = (n: number): number => Math.round(n / 10) * 10;
