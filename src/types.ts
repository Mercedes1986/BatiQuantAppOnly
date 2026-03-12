// Compat: certains fichiers importent "../types" depuis /src/... 
// On ré-exporte la définition centrale située à la racine du projet.
export * from '../types';
export interface MeshType {
  id: string;
  label: string;
  weightKgM2: number;
  width: number;
  height: number;
  coverM2?: number;
  priceRef?: string; // ✅ clé vers DEFAULT_PRICES
}