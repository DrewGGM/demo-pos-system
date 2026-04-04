import { getAll } from '../../../src/services/mockBackend';
export async function GetPaymentMethods() { return getAll('payment_methods'); }
