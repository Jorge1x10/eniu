export type BusinessType = 'taqueria' | 'cafeteria' | 'restaurante' | 'fonda' | 'bar' | 'otro';

export const businessTypes: { key: BusinessType; label: string }[] = [
  { key: 'taqueria', label: 'Taquería' },
  { key: 'cafeteria', label: 'Cafetería' },
  { key: 'restaurante', label: 'Restaurante' },
  { key: 'fonda', label: 'Fonda' },
  { key: 'bar', label: 'Bar' },
  { key: 'otro', label: 'Otro' },
];

export type StarterProduct = { name: string; description: string; price: number };
export type StarterMenu = { category: string; products: StarterProduct[] };

const starterMenus: Record<BusinessType, StarterMenu> = {
  taqueria: { category: 'Tacos', products: [
    { name: 'Taco de pastor', description: 'Con piña, cebolla y cilantro', price: 28 },
    { name: 'Taco de suadero', description: 'Doradito, con salsa verde', price: 26 },
    { name: 'Gringa', description: 'Tortilla de harina con queso', price: 75 },
  ] },
  cafeteria: { category: 'Bebidas calientes', products: [
    { name: 'Café americano', description: 'Grano de la casa, recién molido', price: 35 },
    { name: 'Cappuccino', description: 'Espuma cremosa, doble shot', price: 48 },
    { name: 'Chocolate caliente', description: 'Con leche entera', price: 42 },
  ] },
  restaurante: { category: 'Especialidades', products: [
    { name: 'Plato del día', description: 'Pregunta por la opción de hoy', price: 120 },
    { name: 'Ensalada de la casa', description: 'Mezcla de lechugas, aderezo especial', price: 95 },
    { name: 'Pasta al pesto', description: 'Con parmesano y piñones', price: 110 },
  ] },
  fonda: { category: 'Comida corrida', products: [
    { name: 'Guisado del día', description: 'Incluye arroz y frijoles', price: 85 },
    { name: 'Sopa de la casa', description: 'Receta de la abuela', price: 45 },
    { name: 'Agua fresca', description: 'Sabor del día', price: 25 },
  ] },
  bar: { category: 'Bebidas', products: [
    { name: 'Cerveza artesanal', description: 'Rotación de temporada', price: 65 },
    { name: 'Michelada', description: 'Con especias y limón', price: 70 },
    { name: 'Botana de la casa', description: 'Para compartir', price: 90 },
  ] },
  otro: { category: 'Menú', products: [
    { name: 'Platillo destacado', description: 'Edita el nombre y el precio', price: 99 },
    { name: 'Bebida', description: 'Edita el nombre y el precio', price: 35 },
    { name: 'Postre', description: 'Edita el nombre y el precio', price: 55 },
  ] },
};

export function getStarterMenu(type: BusinessType): StarterMenu {
  return starterMenus[type];
}
