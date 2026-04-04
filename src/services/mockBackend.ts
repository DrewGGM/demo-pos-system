import imgEmpanadas from '../assets/products/empanadas.jpg'
import imgPatacones from '../assets/products/patacones.jpg'
import imgBandejaPaisa from '../assets/products/bandeja-paisa.jpg'
import imgLomoRes from '../assets/products/lomo-res.jpg'
import imgPolloPlancha from '../assets/products/pollo-plancha.jpg'
import imgCazuelaMariscos from '../assets/products/cazuela-mariscos.jpg'
import imgHamburguesa from '../assets/products/hamburguesa.jpg'
import imgLimonada from '../assets/products/limonada.jpg'
import imgJugoMango from '../assets/products/jugo-mango.jpg'
import imgCocaCola from '../assets/products/coca-cola.jpg'
import imgCerveza from '../assets/products/cerveza.jpg'
import imgAguaMineral from '../assets/products/agua-mineral.jpg'
import imgTresLeches from '../assets/products/tres-leches.jpg'
import imgBrownieHelado from '../assets/products/brownie-helado.jpg'
import imgArroz from '../assets/products/arroz.jpg'
import imgEnsalada from '../assets/products/ensalada.jpg'

const STORAGE_PREFIX = 'pos_demo_'

function getStore<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(STORAGE_PREFIX + key)
  return raw ? JSON.parse(raw) : fallback
}

function setStore<T>(key: string, data: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
}

let nextId = Date.now()
function genId(): number { return ++nextId }

const SEED_CATEGORIES = [
  { id: 1, name: 'Entradas', description: 'Appetizers', icon: '🥗', color: '#4CAF50', display_order: 1, is_active: true },
  { id: 2, name: 'Platos Principales', description: 'Main dishes', icon: '🍽️', color: '#2196F3', display_order: 2, is_active: true },
  { id: 3, name: 'Bebidas', description: 'Drinks', icon: '🥤', color: '#FF9800', display_order: 3, is_active: true },
  { id: 4, name: 'Postres', description: 'Desserts', icon: '🍰', color: '#E91E63', display_order: 4, is_active: true },
  { id: 5, name: 'Adicionales', description: 'Extras', icon: '➕', color: '#9C27B0', display_order: 5, is_active: true },
]

const SEED_MODIFIER_GROUPS = [
  { id: 1, name: 'Término de Carne', required: true, multiple: false, min_select: 1, max_select: 1, modifiers: [
    { id: 1, name: 'Término medio', price_change: 0, modifier_group_id: 1 },
    { id: 2, name: 'Tres cuartos', price_change: 0, modifier_group_id: 1 },
    { id: 3, name: 'Bien asado', price_change: 0, modifier_group_id: 1 },
  ]},
  { id: 2, name: 'Adiciones', required: false, multiple: true, min_select: 0, max_select: 5, modifiers: [
    { id: 4, name: 'Queso extra', price_change: 3000, modifier_group_id: 2 },
    { id: 5, name: 'Tocineta', price_change: 4000, modifier_group_id: 2 },
    { id: 6, name: 'Huevo frito', price_change: 2500, modifier_group_id: 2 },
    { id: 7, name: 'Aguacate', price_change: 3500, modifier_group_id: 2 },
  ]},
  { id: 3, name: 'Tamaño Bebida', required: true, multiple: false, min_select: 1, max_select: 1, modifiers: [
    { id: 8, name: 'Personal', price_change: 0, modifier_group_id: 3 },
    { id: 9, name: 'Mediano', price_change: 2000, modifier_group_id: 3 },
    { id: 10, name: 'Grande', price_change: 4000, modifier_group_id: 3 },
  ]},
]

const SEED_PRODUCTS = [
  { id: 1, name: 'Empanadas (3 unidades)', price: 12000, category_id: 1, stock: 50, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Empanadas de carne con ají', image: imgEmpanadas, modifiers: [] },
  { id: 2, name: 'Patacones con Hogao', price: 15000, category_id: 1, stock: 30, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Patacones fritos con hogao casero', image: imgPatacones, modifiers: [] },
  { id: 3, name: 'Bandeja Paisa', price: 32000, category_id: 2, stock: 25, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Arroz, frijoles, carne molida, chicharrón, huevo, plátano, arepa, aguacate', image: imgBandejaPaisa, modifiers: [SEED_MODIFIER_GROUPS[0], SEED_MODIFIER_GROUPS[1]] },
  { id: 4, name: 'Lomo de Res a la Parrilla', price: 38000, category_id: 2, stock: 20, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: '350g de lomo con papas y ensalada', image: imgLomoRes, modifiers: [SEED_MODIFIER_GROUPS[0], SEED_MODIFIER_GROUPS[1]] },
  { id: 5, name: 'Pollo a la Plancha', price: 28000, category_id: 2, stock: 30, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Pechuga a la plancha con arroz y ensalada', image: imgPolloPlancha, modifiers: [SEED_MODIFIER_GROUPS[1]] },
  { id: 6, name: 'Cazuela de Mariscos', price: 42000, category_id: 2, stock: 15, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Arroz de coco con cazuela', image: imgCazuelaMariscos, modifiers: [] },
  { id: 7, name: 'Hamburguesa Clásica', price: 22000, category_id: 2, stock: 40, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Carne 200g, lechuga, tomate, cebolla', image: imgHamburguesa, modifiers: [SEED_MODIFIER_GROUPS[0], SEED_MODIFIER_GROUPS[1]] },
  { id: 8, name: 'Limonada Natural', price: 6000, category_id: 3, stock: 100, is_active: true, track_inventory: false, has_variable_price: false, tax_type_id: 1, description: 'Limonada fresca natural', image: imgLimonada, modifiers: [SEED_MODIFIER_GROUPS[2]] },
  { id: 9, name: 'Jugo de Mango', price: 7000, category_id: 3, stock: 100, is_active: true, track_inventory: false, has_variable_price: false, tax_type_id: 1, description: 'Jugo natural de mango', image: imgJugoMango, modifiers: [SEED_MODIFIER_GROUPS[2]] },
  { id: 10, name: 'Coca-Cola', price: 5000, category_id: 3, stock: 80, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: '', image: imgCocaCola, modifiers: [SEED_MODIFIER_GROUPS[2]] },
  { id: 11, name: 'Cerveza Club Colombia', price: 8000, category_id: 3, stock: 60, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: '', image: imgCerveza, modifiers: [] },
  { id: 12, name: 'Agua Mineral', price: 3500, category_id: 3, stock: 100, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: '', image: imgAguaMineral, modifiers: [] },
  { id: 13, name: 'Tres Leches', price: 12000, category_id: 4, stock: 20, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Pastel tres leches tradicional', image: imgTresLeches, modifiers: [] },
  { id: 14, name: 'Brownie con Helado', price: 14000, category_id: 4, stock: 15, is_active: true, track_inventory: true, has_variable_price: false, tax_type_id: 1, description: 'Brownie caliente con helado de vainilla', image: imgBrownieHelado, modifiers: [] },
  { id: 15, name: 'Arroz Extra', price: 4000, category_id: 5, stock: 100, is_active: true, track_inventory: false, has_variable_price: false, tax_type_id: 1, description: 'Porción extra de arroz blanco', image: imgArroz, modifiers: [] },
  { id: 16, name: 'Ensalada Extra', price: 5000, category_id: 5, stock: 100, is_active: true, track_inventory: false, has_variable_price: false, tax_type_id: 1, description: 'Ensalada fresca del día', image: imgEnsalada, modifiers: [] },
]

const SEED_ORDER_TYPES = [
  { id: 1, code: 'dine_in', name: 'Para Comer Aquí', description: 'Servicio en mesa', icon: '🍽️', display_color: '#4CAF50', is_active: true },
  { id: 2, code: 'takeout', name: 'Para Llevar', description: 'Orden para llevar', icon: '🥡', display_color: '#FF9800', is_active: true },
  { id: 3, code: 'delivery', name: 'Domicilio', description: 'Entrega a domicilio', icon: '🚚', display_color: '#2196F3', is_active: true },
]

const SEED_PAYMENT_METHODS = [
  { id: 1, name: 'Efectivo', type: 'cash', icon: '💵', is_active: true, is_system: true },
  { id: 2, name: 'Tarjeta Débito', type: 'debit_card', icon: '💳', is_active: true, is_system: true },
  { id: 3, name: 'Tarjeta Crédito', type: 'credit_card', icon: '💳', is_active: true, is_system: true },
  { id: 4, name: 'Transferencia', type: 'transfer', icon: '📱', is_active: true, is_system: true },
  { id: 5, name: 'Nequi', type: 'digital_wallet', icon: '📲', is_active: true, is_system: false },
]

const SEED_TABLE_AREAS = [
  { id: 1, name: 'Salón Principal', description: 'Área principal del restaurante', color: '#1976d2', is_active: true },
  { id: 2, name: 'Terraza', description: 'Mesas al aire libre', color: '#2e7d32', is_active: true },
  { id: 3, name: 'Salón VIP', description: 'Área privada para eventos', color: '#9c27b0', is_active: true },
  { id: 4, name: 'Barra', description: 'Mesas junto a la barra', color: '#e65100', is_active: true },
]

const SEED_TABLES = [
  { id: 1, number: '1', name: 'Mesa 1', capacity: 4, status: 'available', area_id: 1, position_x: 0, position_y: 0, shape: 'square' },
  { id: 2, number: '2', name: 'Mesa 2', capacity: 4, status: 'available', area_id: 1, position_x: 1, position_y: 0, shape: 'square' },
  { id: 3, number: '3', name: 'Mesa 3', capacity: 6, status: 'available', area_id: 1, position_x: 2, position_y: 0, shape: 'rectangle' },
  { id: 4, number: '4', name: 'Mesa 4', capacity: 2, status: 'available', area_id: 1, position_x: 0, position_y: 1, shape: 'round' },
  { id: 5, number: '5', name: 'Mesa 5', capacity: 2, status: 'available', area_id: 1, position_x: 1, position_y: 1, shape: 'round' },
  { id: 6, number: '6', name: 'Mesa 6', capacity: 8, status: 'available', area_id: 1, position_x: 2, position_y: 1, shape: 'rectangle' },
  { id: 7, number: '7', name: 'Mesa 7', capacity: 4, status: 'available', area_id: 1, position_x: 0, position_y: 2, shape: 'square' },
  { id: 8, number: '8', name: 'Mesa 8', capacity: 4, status: 'available', area_id: 1, position_x: 1, position_y: 2, shape: 'square' },
  { id: 9, number: 'T1', name: 'Terraza 1', capacity: 4, status: 'available', area_id: 2, position_x: 0, position_y: 0, shape: 'round' },
  { id: 10, number: 'T2', name: 'Terraza 2', capacity: 4, status: 'available', area_id: 2, position_x: 1, position_y: 0, shape: 'round' },
  { id: 11, number: 'T3', name: 'Terraza 3', capacity: 6, status: 'available', area_id: 2, position_x: 2, position_y: 0, shape: 'round' },
  { id: 12, number: 'T4', name: 'Terraza 4', capacity: 2, status: 'available', area_id: 2, position_x: 0, position_y: 1, shape: 'round' },
  { id: 13, number: 'T5', name: 'Terraza 5', capacity: 2, status: 'available', area_id: 2, position_x: 1, position_y: 1, shape: 'round' },
  { id: 14, number: 'V1', name: 'VIP 1', capacity: 8, status: 'available', area_id: 3, position_x: 0, position_y: 0, shape: 'rectangle' },
  { id: 15, number: 'V2', name: 'VIP 2', capacity: 10, status: 'available', area_id: 3, position_x: 1, position_y: 0, shape: 'rectangle' },
  { id: 16, number: 'V3', name: 'VIP 3', capacity: 6, status: 'available', area_id: 3, position_x: 0, position_y: 1, shape: 'square' },
  { id: 17, number: 'B1', name: 'Barra 1', capacity: 2, status: 'available', area_id: 4, position_x: 0, position_y: 0, shape: 'round' },
  { id: 18, number: 'B2', name: 'Barra 2', capacity: 2, status: 'available', area_id: 4, position_x: 1, position_y: 0, shape: 'round' },
  { id: 19, number: 'B3', name: 'Barra 3', capacity: 2, status: 'available', area_id: 4, position_x: 2, position_y: 0, shape: 'round' },
  { id: 20, number: 'B4', name: 'Barra 4', capacity: 2, status: 'available', area_id: 4, position_x: 3, position_y: 0, shape: 'round' },
]

const SEED_EMPLOYEES = [
  { id: 1, name: 'Administrador', username: 'admin', password: 'admin', pin: '12345', role: 'admin', email: 'admin@demo.com', is_active: true },
  { id: 2, name: 'Cajero Demo', username: 'cajero', password: 'cajero', pin: '11111', role: 'cashier', email: 'cajero@demo.com', is_active: true },
]

const SEED_RESTAURANT_CONFIG = {
  name: 'Restaurant Demo POS',
  business_name: 'Demo Restaurant S.A.S',
  nit: '900123456',
  address: 'Calle 10 #15-20, Armenia, Quindío',
  phone: '3001234567',
  email: 'demo@restaurantpos.co',
  logo: '',
}

export function initDemoData() {
  if (localStorage.getItem(STORAGE_PREFIX + 'initialized')) {
    const products = getStore<any[]>('products', [])
    if (products.length > 0 && (!products[0].image || products[0].image.startsWith('http'))) {
      setStore('products', SEED_PRODUCTS)
    }
    const areas = getStore<any[]>('table_areas', [])
    if (areas.length === 0) {
      setStore('table_areas', SEED_TABLE_AREAS)
      setStore('tables', SEED_TABLES)
      initGridLayouts()
    }
    return
  }
  setStore('categories', SEED_CATEGORIES)
  setStore('products', SEED_PRODUCTS)
  setStore('modifier_groups', SEED_MODIFIER_GROUPS)
  setStore('order_types', SEED_ORDER_TYPES)
  setStore('payment_methods', SEED_PAYMENT_METHODS)
  setStore('table_areas', SEED_TABLE_AREAS)
  setStore('tables', SEED_TABLES)
  setStore('employees', SEED_EMPLOYEES)
  setStore('restaurant_config', SEED_RESTAURANT_CONFIG)
  setStore('orders', [])
  setStore('sales', [])
  setStore('customers', [{ id: 1, name: 'CONSUMIDOR FINAL', identification_type: 'RC', identification_number: '222222222222', email: '', phone: '', address: '', is_active: true }])
  setStore('cash_registers', [{
    id: 1,
    employee_id: 1,
    employee: { id: 1, name: 'Administrador', email: 'admin@demo.com' },
    opening_amount: 200000,
    closing_amount: 0,
    expected_amount: 200000,
    difference: 0,
    status: 'open',
    notes: 'Apertura demo',
    opened_at: new Date().toISOString(),
    movements: [],
  }])
  setStore('combos', [])
  initGridLayouts()
  localStorage.setItem(STORAGE_PREFIX + 'initialized', 'true')
}

function initGridLayouts() {
  // Salón Principal: 8 mesas en grid 3x3
  localStorage.setItem('table_grid_layout_1', JSON.stringify({
    rows: 4, columns: 4,
    positions: {
      '0_0': 1, '0_1': 2, '0_3': 3,
      '1_0': 4, '1_1': 5, '1_3': 6,
      '3_0': 7, '3_1': 8,
    }
  }))
  // Terraza: 5 mesas en fila y segunda fila
  localStorage.setItem('table_grid_layout_2', JSON.stringify({
    rows: 3, columns: 4,
    positions: {
      '0_0': 9, '0_1': 10, '0_2': 11,
      '1_0': 12, '1_1': 13,
    }
  }))
  // Salón VIP: 3 mesas espaciadas
  localStorage.setItem('table_grid_layout_3', JSON.stringify({
    rows: 3, columns: 3,
    positions: {
      '0_0': 14, '0_2': 15,
      '2_1': 16,
    }
  }))
  // Barra: 4 mesas en línea
  localStorage.setItem('table_grid_layout_4', JSON.stringify({
    rows: 2, columns: 4,
    positions: {
      '0_0': 17, '0_1': 18, '0_2': 19, '0_3': 20,
    }
  }))
}

export function getAll<T>(collection: string): T[] {
  return getStore<T[]>(collection, [])
}

export function getById<T extends { id?: number }>(collection: string, id: number): T | null {
  return getAll<T>(collection).find(item => item.id === id) || null
}

export function create<T extends { id?: number }>(collection: string, item: T): T {
  const items = getAll<T>(collection)
  const newItem = { ...item, id: genId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  items.push(newItem)
  setStore(collection, items)
  return newItem
}

export function update<T extends { id?: number }>(collection: string, id: number, updates: Partial<T>): T {
  const items = getAll<T>(collection)
  const idx = items.findIndex(item => item.id === id)
  if (idx === -1) throw new Error('Not found')
  items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() }
  setStore(collection, items)
  return items[idx]
}

export function remove(collection: string, id: number): void {
  const items = getAll<any>(collection).filter(item => item.id !== id)
  setStore(collection, items)
}

export function generateOrderNumber(): string {
  const now = new Date()
  return `ORD-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`
}

export function generateSaleNumber(): string {
  const now = new Date()
  return `SALE-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}${String(now.getMilliseconds()).padStart(3,'0')}`
}

export { getStore, setStore }
