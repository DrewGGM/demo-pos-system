export const wailsDianService = {
  async getConfig(): Promise<any> {
    return {
      enabled: false,
      environment: 'test',
      company_configured: false,
      software_configured: false,
      certificate_configured: false,
      resolution_configured: false,
      nit: '',
      business_name: '',
    };
  },

  async updateConfig(_config: any): Promise<void> {

  },

  async configureCompany(): Promise<any> {

    return { success: true };
  },

  async configureSoftware(): Promise<void> {

  },

  async configureCertificate(): Promise<void> {

  },

  async configureLogo(): Promise<void> {

  },

  async configureResolution(): Promise<void> {

  },

  async configureCreditNoteResolution(): Promise<void> {

  },

  async configureDebitNoteResolution(): Promise<void> {

  },

  async changeEnvironment(_environment: 'test' | 'production'): Promise<void> {

  },

  async getNumberingRanges(): Promise<any> {
    return { ranges: [] };
  },

  async migrateToProduction(): Promise<void> {

  },

  async testConnection(): Promise<void> {

  },

  async resetConfigurationSteps(): Promise<void> {

  },

  async resendInvoiceEmail(_prefix: string, _invoiceNumber: string): Promise<void> {

  },

  async resetTestResolution(): Promise<void> {

  },

  async registerNewResolution(): Promise<void> {

  },

  async getResolutionLimitStatus(): Promise<{
    remaining_invoices: number;
    alert_threshold: number;
    is_near_limit: boolean;
    current_number: number;
    end_number: number;
  }> {
    return {
      remaining_invoices: 1000,
      alert_threshold: 100,
      is_near_limit: false,
      current_number: 1,
      end_number: 1000,
    };
  },

  async updateAlertThreshold(_threshold: number): Promise<void> {
  },

  async getNextConsecutive(_typeDocumentId: number, _prefix: string): Promise<{
    success: boolean;
    type_document_id: number;
    prefix: string;
    number: number;
  }> {
    return {
      success: true,
      type_document_id: _typeDocumentId,
      prefix: _prefix,
      number: 1,
    };
  },
};
