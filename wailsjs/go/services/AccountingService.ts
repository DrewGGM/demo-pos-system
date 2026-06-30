// Mock AccountingService for demo build. Returns sample data so the UI is explorable
// without a real backend. All mutations are no-ops.

const sampleAccounts = [
  { id: 1, code: '1', name: 'ACTIVO', class: 1, nature: 'D', level: 1, is_active: true, is_system: true },
  { id: 2, code: '11', name: 'DISPONIBLE', class: 1, nature: 'D', level: 2, is_active: true, is_system: true },
  { id: 3, code: '1105', name: 'Caja', class: 1, nature: 'D', level: 3, is_active: true, is_system: true },
  { id: 4, code: '110505', name: 'Caja General', class: 1, nature: 'D', level: 4, is_active: true, is_system: true },
  { id: 5, code: '1110', name: 'Bancos', class: 1, nature: 'D', level: 3, is_active: true, is_system: true },
  { id: 6, code: '111005', name: 'Banco Nacional', class: 1, nature: 'D', level: 4, is_active: true, is_system: true },
  { id: 7, code: '14', name: 'INVENTARIOS', class: 1, nature: 'D', level: 2, is_active: true, is_system: true },
  { id: 8, code: '1435', name: 'Mercancias no fabricadas', class: 1, nature: 'D', level: 3, is_active: true, is_system: true },
  { id: 9, code: '2', name: 'PASIVO', class: 2, nature: 'A', level: 1, is_active: true, is_system: true },
  { id: 10, code: '22', name: 'PROVEEDORES', class: 2, nature: 'A', level: 2, is_active: true, is_system: true },
  { id: 11, code: '2205', name: 'Nacionales', class: 2, nature: 'A', level: 3, is_active: true, is_system: true },
  { id: 12, code: '3', name: 'PATRIMONIO', class: 3, nature: 'A', level: 1, is_active: true, is_system: true },
  { id: 13, code: '31', name: 'CAPITAL SOCIAL', class: 3, nature: 'A', level: 2, is_active: true, is_system: true },
  { id: 14, code: '3115', name: 'Aportes sociales', class: 3, nature: 'A', level: 3, is_active: true, is_system: true },
  { id: 15, code: '4', name: 'INGRESOS', class: 4, nature: 'A', level: 1, is_active: true, is_system: true },
  { id: 16, code: '41', name: 'OPERACIONALES', class: 4, nature: 'A', level: 2, is_active: true, is_system: true },
  { id: 17, code: '4135', name: 'Comercio al por menor', class: 4, nature: 'A', level: 3, is_active: true, is_system: true },
  { id: 18, code: '5', name: 'GASTOS', class: 5, nature: 'D', level: 1, is_active: true, is_system: true },
  { id: 19, code: '51', name: 'OPERACIONALES DE ADMINISTRACION', class: 5, nature: 'D', level: 2, is_active: true, is_system: true },
  { id: 20, code: '5120', name: 'Arrendamientos', class: 5, nature: 'D', level: 3, is_active: true, is_system: true },
  { id: 21, code: '5135', name: 'Servicios', class: 5, nature: 'D', level: 3, is_active: true, is_system: true },
  { id: 22, code: '6', name: 'COSTO DE VENTAS', class: 6, nature: 'D', level: 1, is_active: true, is_system: true },
  { id: 23, code: '61', name: 'COSTO DE VENTAS Y PRESTACION DE SERVICIOS', class: 6, nature: 'D', level: 2, is_active: true, is_system: true },
  { id: 24, code: '6135', name: 'Comercio al por menor', class: 6, nature: 'D', level: 3, is_active: true, is_system: true },
];

const sampleEntries = [
  {
    id: 1, entry_number: 1, date: '2026-04-01', description: 'Cierre de caja diaria',
    reference: 'CC-001', status: 'active', source: 'cash_close',
    total_debit: 850000, total_credit: 850000,
    lines: [
      { id: 1, entry_id: 1, account_id: 4, account: sampleAccounts[3], debit: 850000, credit: 0, notes: 'Efectivo' },
      { id: 2, entry_id: 1, account_id: 17, account: sampleAccounts[16], debit: 0, credit: 850000, notes: 'Ventas del dia' },
    ],
    created_at: '2026-04-01T22:00:00Z',
  },
  {
    id: 2, entry_number: 2, date: '2026-04-02', description: 'Pago arriendo local',
    reference: 'GAS-001', status: 'active', source: 'manual',
    total_debit: 1500000, total_credit: 1500000,
    lines: [
      { id: 3, entry_id: 2, account_id: 20, account: sampleAccounts[19], debit: 1500000, credit: 0, notes: '' },
      { id: 4, entry_id: 2, account_id: 4, account: sampleAccounts[3], debit: 0, credit: 1500000, notes: '' },
    ],
    created_at: '2026-04-02T10:30:00Z',
  },
];

const sampleProviders = [
  { id: 1, name: 'Carnes Premium SAS', nit: '900123456-7', person_type: 'Juridica', phone: '3201234567', product_type: 'Carnes', balance: 450000 },
  { id: 2, name: 'Juan Perez', nit: '1234567890', person_type: 'Natural', phone: '3105551234', product_type: 'Verduras', balance: 120000 },
];

// Helpers para construir entries derivadas de las ventas reales del demo.
// Antes el módulo era 100% estático y nadie podía ver cómo cambiaba el
// libro al hacer una venta nueva.
function loadStoredEntries(): any[] {
  try {
    const raw = localStorage.getItem('pos_demo_journal_entries');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveStoredEntries(entries: any[]) {
  try { localStorage.setItem('pos_demo_journal_entries', JSON.stringify(entries)); } catch {}
}

function localDay(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Construye asientos sintéticos para las ventas (uno por día) + el seed.
function buildEntriesFromSales(start?: string, end?: string): any[] {
  let sales: any[] = [];
  try {
    const raw = localStorage.getItem('pos_demo_sales');
    if (raw) sales = JSON.parse(raw);
  } catch {}
  const byDay = new Map<string, number>();
  for (const s of sales) {
    const day = localDay(s.created_at);
    if (!day) continue;
    if (start && day < start) continue;
    if (end && day > end) continue;
    byDay.set(day, (byDay.get(day) || 0) + (s.total || 0));
  }
  const generated: any[] = [];
  let nextId = 1000;
  for (const [day, total] of byDay) {
    if (total <= 0) continue;
    generated.push({
      id: nextId,
      entry_number: nextId,
      date: day,
      description: `Ventas del día ${day}`,
      reference: `VTA-${day}`,
      status: 'active',
      source: 'sales_aggregate',
      total_debit: total,
      total_credit: total,
      lines: [
        { id: nextId * 10 + 1, entry_id: nextId, account_id: 4, account: sampleAccounts[3], debit: total, credit: 0, notes: 'Efectivo / bancos' },
        { id: nextId * 10 + 2, entry_id: nextId, account_id: 17, account: sampleAccounts[16], debit: 0, credit: total, notes: 'Ventas del día' },
      ],
      created_at: `${day}T22:00:00Z`,
    });
    nextId++;
  }
  return generated;
}

// Chart of Accounts
export async function GetAllAccounts() { return sampleAccounts; }
export async function GetAccounts() { return sampleAccounts; }
export async function CreateAccount(a: any) {
  const accounts = loadStoredAccounts();
  const next = { ...a, id: Date.now() };
  accounts.push(next);
  saveStoredAccounts(accounts);
  return next;
}
export async function DeleteAccount(id: number) {
  const accounts = loadStoredAccounts().filter((a: any) => a.id !== id);
  saveStoredAccounts(accounts);
}

function loadStoredAccounts(): any[] {
  try {
    const raw = localStorage.getItem('pos_demo_accounting_accounts');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveStoredAccounts(accounts: any[]) {
  try { localStorage.setItem('pos_demo_accounting_accounts', JSON.stringify(accounts)); } catch {}
}

// Journal Entries — devuelve seed + asientos generados a partir de ventas
// + entries manuales creadas por el usuario en la sesión, filtrados por rango.
export async function GetEntries(start?: string, end?: string, q?: string, limit?: number, offset?: number) {
  const stored = loadStoredEntries();
  const generated = buildEntriesFromSales(start, end);
  const seeded = sampleEntries.filter((e: any) => {
    if (start && e.date < start) return false;
    if (end && e.date > end) return false;
    return true;
  });
  let combined = [...seeded, ...generated, ...stored.filter((e: any) => {
    if (start && e.date < start) return false;
    if (end && e.date > end) return false;
    return true;
  })];
  if (q) {
    const ql = q.toLowerCase();
    combined = combined.filter((e: any) =>
      (e.description || '').toLowerCase().includes(ql) ||
      (e.reference || '').toLowerCase().includes(ql)
    );
  }
  combined.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = combined.length;
  const off = offset || 0;
  const lim = limit || combined.length;
  return [combined.slice(off, off + lim), total] as any;
}

export async function CreateEntry(req: any, _ctx?: any) {
  const stored = loadStoredEntries();
  const next = {
    ...req,
    id: Date.now(),
    entry_number: stored.length + 100,
    status: 'active',
    source: req.source || 'manual',
    created_at: new Date().toISOString(),
  };
  stored.push(next);
  saveStoredEntries(stored);
  return next;
}

export async function VoidEntry(id: number, _ctx?: any) {
  const stored = loadStoredEntries();
  const idx = stored.findIndex((e: any) => e.id === id);
  if (idx >= 0) {
    stored[idx].status = 'voided';
    stored[idx].voided_at = new Date().toISOString();
    saveStoredEntries(stored);
  }
}

// Ledger
export async function GetLedger(_year: number, _month: number) {
  return sampleAccounts.filter(a => a.level >= 3).map(a => ({
    account_code: a.code,
    account_name: a.name,
    nature: a.nature,
    open_balance: 0,
    total_debit: a.class === 1 ? 850000 : a.class === 5 ? 1500000 : 0,
    total_credit: a.class === 4 ? 850000 : a.class === 1 ? 1500000 : 0,
    close_balance: a.class === 1 ? -650000 : a.class === 4 ? 850000 : a.class === 5 ? 1500000 : 0,
  }));
}

// Financial Statements
export async function GetBalanceSheet(_date: string) {
  return {
    type: 'balance_sheet',
    date: _date,
    total: 0,
    sections: [
      { name: 'ACTIVO', accounts: [{ code: '1105', name: 'Caja', balance: -650000 }], subtotal: -650000 },
      { name: 'PASIVO', accounts: [], subtotal: 0 },
      { name: 'PATRIMONIO', accounts: [{ code: '3605', name: 'Utilidad del ejercicio', balance: -650000 }], subtotal: -650000 },
    ],
  };
}

export async function GetIncomeStatement(_start: string, _end: string) {
  return {
    type: 'income_statement',
    date: _end,
    total: -650000,
    sections: [
      { name: 'INGRESOS', accounts: [{ code: '4135', name: 'Comercio al por menor', balance: 850000 }], subtotal: 850000 },
      { name: 'GASTOS', accounts: [{ code: '5120', name: 'Arrendamientos', balance: 1500000 }], subtotal: 1500000 },
    ],
  };
}

export async function GetFinancialNotes(_year: number) {
  return [
    { id: 1, year: _year, note_number: 1, title: 'Informacion general de la empresa', content: 'Restaurante demostrativo, NIIF Grupo 3.' },
    { id: 2, year: _year, note_number: 2, title: 'Politicas contables', content: 'Base de acumulacion, moneda COP.' },
    { id: 3, year: _year, note_number: 3, title: 'Efectivo y equivalentes', content: 'Caja y bancos.' },
    { id: 4, year: _year, note_number: 4, title: 'Ingresos operacionales', content: 'Ventas al publico en general.' },
    { id: 5, year: _year, note_number: 5, title: 'Gastos operacionales', content: 'Arriendo, servicios publicos, personal.' },
  ];
}

export async function CloseYear(_year: number, _ctx?: any) {}

// Demo: simulates discovering 3 historical cash closes that lack journal entries.
let demoSyncRemaining = 3;
export async function SyncHistoricalEntries(_since: string) {
  const created = demoSyncRemaining;
  const report = {
    closes_scanned: 5,
    closes_entered: created,
    closes_skipped: 5 - created,
    movements_scanned: 2,
    movements_entered: 0,
    movements_skipped: 2,
    errors: [],
  };
  demoSyncRemaining = 0; // second run shows everything already synced
  return report;
}

// Quick Entry
export async function RegisterDailySales(_amount: number, _desc: string, _ctx?: any) { return sampleEntries[0]; }
export async function RegisterExpense(_type: string, _amount: number, _desc: string, _ctx?: any) { return sampleEntries[1]; }

// Providers
export async function GetProviders() { return sampleProviders; }
export async function CreateProvider(p: any) { return { ...p, id: Date.now() }; }
export async function UpdateProvider(p: any) { return p; }
export async function DeleteProvider(_id: number) {}

// Exports (no-op in demo)
export async function ExportLibroDiarioPDF(_start: string, _end: string) { return 'demo.pdf'; }
export async function ExportLibroMayorPDF(_year: number, _month: number) { return 'demo.pdf'; }
export async function ExportBalanceSheetPDF(_date: string) { return 'demo.pdf'; }
export async function ExportIncomeStatementPDF(_start: string, _end: string) { return 'demo.pdf'; }
export async function ExportNotesPDF(_year: number) { return 'demo.pdf'; }
export async function ExportAccountingCSV(_year: number) { return 'demo.csv'; }
export async function OpenPDF(_path: string) {}
