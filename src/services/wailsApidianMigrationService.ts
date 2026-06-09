// Wrapper around the Go ApidianMigrationService. Imports the historical
// data from a `apirestdian` MySQL dump (companies, resolutions, certificates,
// documents) into the local PosApp Postgres.

const W = (window as any).go?.services?.ApidianMigrationService;

export interface ApidianCompany {
  id: number;
  identification_number: string;
  dv: string;
  type_document_id: number;
  type_organization_id: number;
  type_regime_id: number;
  type_liability_id: number;
  municipality_id: number;
  merchant_registration: string;
  address: string;
  phone: string;
}

export interface ApidianResolution {
  id: number;
  type_document_id: number;
  prefix: string;
  resolution: string;
  from: number;
  to: number;
  date_from: string;
  date_to: string;
  technical_key: string;
  next: number;
}

export interface ApidianCertificate {
  id: number;
  name: string;
  password: string;
  expires: string;
}

export interface ApidianDocumentCounts {
  invoices: number;
  credit_notes: number;
  debit_notes: number;
  other: number;
  accepted: number;
  rejected: number;
  pending: number;
}

export interface ApidianDocumentBrief {
  prefix: string;
  number: string;
  type_document_id: number;
  state_document_id: number;
  cufe: string;
  date_issue: string;
  total: number;
  matched_sale: boolean;
}

export interface MigrationPreview {
  dump_path: string;
  company?: ApidianCompany;
  resolutions: ApidianResolution[];
  certificate?: ApidianCertificate;
  document_counts: ApidianDocumentCounts;
  sample_documents: ApidianDocumentBrief[];
  unmatched_docs_count: number;
  matched_docs_count: number;
  warnings?: string[];
}

export interface ImportOptions {
  dump_path: string;
  overwrite_config: boolean;
  import_documents: boolean;
}

export interface MigrationSummary {
  started_at: string;
  finished_at: string;
  config_imported: boolean;
  resolutions_imported: number;
  certificate_imported: boolean;
  documents_scanned: number;
  invoices_upserted: number;
  credit_notes_upserted: number;
  debit_notes_upserted: number;
  skipped: number;
  errors?: string[];
}

class WailsApidianMigrationService {
  async preview(dumpPath: string): Promise<MigrationPreview> {
    if (!W) throw new Error('Servicio de migración no disponible en modo demo');
    return (await W.Preview(dumpPath)) as MigrationPreview;
  }

  async import(opts: ImportOptions): Promise<MigrationSummary> {
    if (!W) throw new Error('Servicio de migración no disponible en modo demo');
    return (await W.Import(opts)) as MigrationSummary;
  }

  async lastSummary(): Promise<MigrationSummary | null> {
    if (!W) return null;
    return (await W.LastSummary()) as MigrationSummary;
  }
}

export const wailsApidianMigrationService = new WailsApidianMigrationService();
