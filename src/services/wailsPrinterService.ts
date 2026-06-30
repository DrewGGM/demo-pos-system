// Mock printer service. En la demo invocamos window.print() para que el
// usuario al menos vea el diálogo de impresión nativo del navegador
// cuando pulsa "imprimir". Antes los toasts decían "impresión enviada" sin
// que pasara nada visible.

export interface DetectedPrinter {
  name: string;
  type: string;
  connection_type: string;
  address: string;
  port: number;
  is_default: boolean;
  status: string;
  model: string;
}

function tryBrowserPrint(): void {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}

export const wailsPrinterService = {
  async getAvailablePrinters(): Promise<DetectedPrinter[]> {
    return [
      {
        name: 'Impresora del navegador (demo)',
        type: 'browser',
        connection_type: 'browser',
        address: 'BROWSER',
        port: 0,
        is_default: true,
        status: 'online',
        model: 'Window.print()',
      },
    ];
  },

  async getAvailableSerialPorts(): Promise<string[]> {
    return [];
  },

  async printReceipt(_sale: any, _isElectronicInvoice: boolean): Promise<void> {
    tryBrowserPrint();
  },

  async printKitchenOrder(_order: any): Promise<void> {
    tryBrowserPrint();
  },

  async printOrder(_order: any): Promise<void> {
    tryBrowserPrint();
  },

  async printCashRegisterReport(_report: any): Promise<void> {
    tryBrowserPrint();
  },

  async testPrinter(_printerId: number): Promise<void> {
    // En demo no hay impresora térmica real; mostramos la página actual.
    tryBrowserPrint();
  },

  async printCustomerDataForm(): Promise<void> {
    tryBrowserPrint();
  },
};
