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

export const wailsPrinterService = {
  async getAvailablePrinters(): Promise<DetectedPrinter[]> {
    return [
      {
        name: 'Demo Printer',
        type: 'usb',
        connection_type: 'usb',
        address: 'USB001',
        port: 0,
        is_default: true,
        status: 'online',
        model: 'Demo POS Printer',
      },
    ];
  },

  async getAvailableSerialPorts(): Promise<string[]> {
    return ['COM1', 'COM3'];
  },

  async printReceipt(_sale: any, _isElectronicInvoice: boolean): Promise<void> {
  },

  async printKitchenOrder(_order: any): Promise<void> {
  },

  async printOrder(_order: any): Promise<void> {
  },

  async printCashRegisterReport(_report: any): Promise<void> {
  },

  async testPrinter(_printerId: number): Promise<void> {
  },

  async printCustomerDataForm(): Promise<void> {
  },
};
