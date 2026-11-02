import { PRODUCTS } from '../data/products';
import type { Product, ProductId } from './types';

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: ProductId): Product | undefined {
  return byId.get(id);
}

export function allProducts(): readonly Product[] {
  return PRODUCTS;
}

/** 實體商品：開箱後會放進房間（虛擬商品和養蠶用品不會） */
export function isPhysical(id: ProductId): boolean {
  const p = getProduct(id);
  return p !== undefined && !p.virtual && !p.silk;
}

export const round10 = (n: number): number => Math.round(n / 10) * 10;
