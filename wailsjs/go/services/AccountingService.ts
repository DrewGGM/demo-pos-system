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

// Chart of Accounts
export async function GetAllAccounts() { return sampleAccounts; }
export async function GetAccounts() { return sampleAccounts; }
export async function CreateAccount(_a: any) { return _a; }
export async function DeleteAccount(_id: number) {}

// Journal Entries
export async function GetEntries(_start?: string, _end?: string, _q?: string, _limit?: number, _offset?: number) {
  return [sampleEntries, sampleEntries.length] as any;
}
export async function CreateEntry(_req: any, _ctx?: any) { return sampleEntries[0]; }
export async function VoidEntry(_id: number, _ctx?: any) {}

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
