import { getAll } from '../../../src/services/mockBackend';
export async function GetPaymentMethods() { return getAll('payment_methods'); }

// Demo: a couple of fake "failed" sales so the pre-close validation has data to show.
const demoFailedSales = [
  {
    id: 9001,
    sale_number: 'V-2026-9001',
    total: 87500,
    created_at: new Date().toISOString(),
    electronic_invoice: {
      id: 1,
      invoice_number: 'FE-1245',
      status: 'rejected',
      last_error: 'NIT del adquirente con dígito de verificación inválido',
    },
  },
  {
    id: 9002,
    sale_number: 'V-2026-9002',
    total: 42000,
    created_at: new Date().toISOString(),
    electronic_invoice: {
      id: 2,
      invoice_number: 'FE-1246',
      status: 'error',
      last_error: 'Timeout al contactar al servicio DIAN',
    },
  },
];

let activeFailed = [...demoFailedSales];

export async function GetFailedInvoicesSince(_since: string) {
  return activeFailed;
}

export async function ResendElectronicInvoice(saleId: number) {
  // Demo: simulate a successful retry by removing it from the failed list.
  activeFailed = activeFailed.filter((s) => s.id !== saleId);
  return null;
}
