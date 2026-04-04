import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Alert,
  Collapse,
  Tooltip,
  LinearProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Lock as LockIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  RemoveCircleOutline as RemoveLineIcon,
  AddCircleOutline as AddLineIcon,
  Block as VoidIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  FileDownload as CsvIcon,
  Edit as EditIcon,
  Close as CloseYearIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
  Note as NoteIcon,
  HelpOutline as HelpIcon,
  ExpandMore as AccordionExpandIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'react-toastify';

// ---------------------------------------------------------------------------
// Types mirroring Go models / service return types
// ---------------------------------------------------------------------------

interface Account {
  id: number;
  code: string;
  name: string;
  class: number;
  nature: string;
  parent_id?: number;
  level: number;
  is_active: boolean;
  is_system: boolean;
}

interface JournalEntryLine {
  id: number;
  entry_id: number;
  account_id: number;
  account?: Account;
  debit: number;
  credit: number;
  notes: string;
}

interface JournalEntry {
  id: number;
  entry_number: number;
  date: string;
  description: string;
  reference: string;
  status: string;
  voided_by_id?: number;
  voids_id?: number;
  source: string;
  total_debit: number;
  total_credit: number;
  lines: JournalEntryLine[];
  created_at: string;
}

interface LedgerRow {
  account_code: string;
  account_name: string;
  nature: string;
  open_balance: number;
  total_debit: number;
  total_credit: number;
  close_balance: number;
}

interface StatementRow {
  code: string;
  name: string;
  balance: number;
}

interface StatementSection {
  name: string;
  accounts: StatementRow[] | null;
  subtotal: number;
}

interface FinancialStatement {
  type: string;
  date: string;
  sections: StatementSection[];
  total: number;
}

interface Provider {
  id: number;
  name: string;
  nit: string;
  person_type: string;
  phone: string;
  product_type: string;
  balance: number;
}

interface FinancialNote {
  id: number;
  year: number;
  note_number: number;
  title: string;
  content: string;
}

interface CreateEntryLine {
  account_id: number;
  debit: number;
  credit: number;
  notes: string;
}

interface CreateEntryRequest {
  date: string;
  description: string;
  reference: string;
  source: string;
  lines: CreateEntryLine[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const svc = () => import('../../../wailsjs/go/services/AccountingService');

const fmtCOP = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const classLabel: Record<number, string> = {
  1: 'Activo',
  2: 'Pasivo',
  3: 'Patrimonio',
  4: 'Ingreso',
  5: 'Gasto',
  6: 'Costo',
};

const classColor: Record<number, 'primary' | 'error' | 'secondary' | 'success' | 'warning' | 'default'> = {
  1: 'primary',   // blue
  2: 'error',     // red
  3: 'secondary', // purple
  4: 'success',   // green
  5: 'warning',   // orange
  6: 'default',   // brown-ish
};

const classChipSx: Record<number, object> = {
  6: { backgroundColor: '#795548', color: '#fff' },
};

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const dateStr = (d: Date | null) => (d ? d.toISOString().split('T')[0] : '');

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Accounting: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Contabilidad
        </Typography>
        <Paper sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Plan de Cuentas" />
            <Tab label="Libro Diario" />
            <Tab label="Libro Mayor" />
            <Tab label="Estados Financieros" />
            <Tab label="Ingreso Rapido" />
            <Tab label="Proveedores" />
            <Tab icon={<HelpIcon />} iconPosition="start" label="Guía de Uso" />
          </Tabs>
        </Paper>

        {tab === 0 && <ChartOfAccounts />}
        {tab === 1 && <JournalEntries />}
        {tab === 2 && <GeneralLedger />}
        {tab === 3 && <FinancialStatements />}
        {tab === 4 && <QuickEntry />}
        {tab === 5 && <Providers />}
        {tab === 6 && <AccountingGuide />}
      </Box>
    </LocalizationProvider>
  );
};

// ===========================================================================
// Tab 1: Plan de Cuentas
// ===========================================================================

const ChartOfAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', nature: 'D' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { GetAllAccounts } = await svc();
      const data = await GetAllAccounts();
      setAccounts(data || []);
    } catch (e: any) {
      toast.error('Error cargando cuentas: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    try {
      const { CreateAccount } = await svc();
      await CreateAccount({
        code: form.code,
        name: form.name,
        nature: form.nature,
        class: 0,
        level: form.code.length <= 1 ? 1 : form.code.length <= 2 ? 2 : form.code.length <= 4 ? 3 : 4,
        is_active: true,
        is_system: false,
      } as any);
      toast.success('Cuenta creada');
      setDialogOpen(false);
      setForm({ code: '', name: '', nature: 'D' });
      load();
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    }
  };

  const handleDelete = async (acc: Account) => {
    if (acc.is_system) return;
    if (!window.confirm(`Eliminar cuenta ${acc.code} - ${acc.name}?`)) return;
    try {
      const { DeleteAccount } = await svc();
      await DeleteAccount(acc.id);
      toast.success('Cuenta eliminada');
      load();
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Buscar por codigo o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 280 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nueva Cuenta
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Codigo</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Clase</TableCell>
              <TableCell>Naturaleza</TableCell>
              <TableCell>Nivel</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((acc) => (
              <TableRow key={acc.id} hover>
                <TableCell
                  sx={{
                    pl: acc.level * 2,
                    fontWeight: acc.level === 1 ? 'bold' : acc.level === 2 ? 600 : 'normal',
                  }}
                >
                  {acc.code}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: acc.level === 1 ? 'bold' : acc.level === 2 ? 600 : 'normal',
                  }}
                >
                  {acc.name}
                </TableCell>
                <TableCell>
                  <Chip
                    label={classLabel[acc.class] || acc.class}
                    color={classColor[acc.class] || 'default'}
                    size="small"
                    sx={classChipSx[acc.class] || {}}
                  />
                </TableCell>
                <TableCell>{acc.nature === 'D' ? 'Debito' : 'Credito'}</TableCell>
                <TableCell>{acc.level}</TableCell>
                <TableCell>
                  <Chip
                    label={acc.is_active ? 'Activa' : 'Inactiva'}
                    color={acc.is_active ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  {acc.is_system ? (
                    <Tooltip title="Cuenta del sistema">
                      <LockIcon fontSize="small" color="disabled" />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(acc)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No se encontraron cuentas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog: Nueva Cuenta */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Cuenta</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Codigo"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            fullWidth
            size="small"
            helperText="Ej: 110510 (la clase se detecta del primer digito)"
          />
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            size="small"
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Naturaleza</InputLabel>
            <Select
              value={form.nature}
              label="Naturaleza"
              onChange={(e) => setForm({ ...form, nature: e.target.value })}
            >
              <MenuItem value="D">Debito (D)</MenuItem>
              <MenuItem value="A">Credito (A)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.code || !form.name}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// ===========================================================================
// Tab 2: Libro Diario (Journal Entries)
// ===========================================================================

const emptyLine = (): CreateEntryLine => ({ account_id: 0, debit: 0, credit: 0, notes: '' });

const JournalEntries: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStart, setFilterStart] = useState<Date | null>(null);
  const [filterEnd, setFilterEnd] = useState<Date | null>(null);

  // New entry dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entryDate, setEntryDate] = useState<Date | null>(new Date());
  const [entryDesc, setEntryDesc] = useState('');
  const [entryRef, setEntryRef] = useState('');
  const [lines, setLines] = useState<CreateEntryLine[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { GetEntries } = await svc();
      const result: any = await GetEntries(
        dateStr(filterStart),
        dateStr(filterEnd),
        '',
        rowsPerPage,
        page * rowsPerPage,
      );
      // GetEntries returns ([]JournalEntry, int64, error) — Wails wraps as array
      if (Array.isArray(result)) {
        setEntries(result[0] || []);
        setTotal(result[1] || 0);
      } else {
        setEntries([]);
        setTotal(0);
      }
    } catch (e: any) {
      toast.error('Error cargando asientos: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterStart, filterEnd]);

  const loadAccounts = useCallback(async () => {
    try {
      const { GetAccounts } = await svc();
      const data = await GetAccounts();
      setAccounts((data || []).filter((a: Account) => a.level >= 3));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01;
  const hasMinLines = lines.filter((l) => l.account_id > 0 && (l.debit > 0 || l.credit > 0)).length >= 2;

  const handleSave = async () => {
    if (!isBalanced || !hasMinLines) return;
    setSaving(true);
    try {
      const { CreateEntry } = await svc();
      const req: CreateEntryRequest = {
        date: dateStr(entryDate),
        description: entryDesc,
        reference: entryRef,
        source: 'manual',
        lines: lines.filter((l) => l.account_id > 0 && (l.debit > 0 || l.credit > 0)),
      };
      await CreateEntry(req as any, null as any);
      toast.success('Asiento creado');
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEntryDate(new Date());
    setEntryDesc('');
    setEntryRef('');
    setLines([emptyLine(), emptyLine()]);
  };

  const handleVoid = async (entry: JournalEntry) => {
    if (!window.confirm(`Anular asiento #${entry.entry_number}?`)) return;
    try {
      const { VoidEntry } = await svc();
      await VoidEntry(entry.id, null as any);
      toast.success('Asiento anulado');
      load();
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    }
  };

  const updateLine = (idx: number, field: keyof CreateEntryLine, value: any) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  return (
    <Paper sx={{ p: 2 }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <DatePicker
            label="Desde"
            value={filterStart}
            onChange={setFilterStart}
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
          />
          <DatePicker
            label="Hasta"
            value={filterEnd}
            onChange={setFilterEnd}
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
          />
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={async () => {
              try {
                const s = (window as any).go?.services?.AccountingService;
                const path = await s.ExportLibroDiarioPDF(dateStr(filterStart), dateStr(filterEnd));
                await s.OpenPDF(path);
                toast.success('PDF generado');
              } catch (e: any) {
                toast.error('Error exportando PDF: ' + (e?.message || e));
              }
            }}
          >
            Exportar PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<CsvIcon />}
            onClick={async () => {
              try {
                const s = (window as any).go?.services?.AccountingService;
                const csvData = await s.ExportAccountingCSV(filterStart ? filterStart.getFullYear() : new Date().getFullYear());
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `libro_diario_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('CSV descargado');
              } catch (e: any) {
                toast.error('Error exportando CSV: ' + (e?.message || e));
              }
            }}
          >
            Exportar CSV
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Nuevo Asiento
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Entries table */}
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>#</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Descripcion</TableCell>
              <TableCell>Referencia</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <React.Fragment key={e.id}>
                <TableRow
                  hover
                  sx={e.status === 'voided' ? { textDecoration: 'line-through', opacity: 0.6 } : {}}
                  onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    {expandedId === e.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </TableCell>
                  <TableCell>{e.entry_number}</TableCell>
                  <TableCell>{e.date?.split('T')[0]}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{e.reference}</TableCell>
                  <TableCell align="right">{fmtCOP(e.total_debit)}</TableCell>
                  <TableCell>
                    <Chip
                      label={e.status === 'active' ? 'Activo' : 'Anulado'}
                      color={e.status === 'active' ? 'success' : 'error'}
                      size="small"
                      variant={e.status === 'voided' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {e.status === 'active' && (
                      <Tooltip title="Anular asiento">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(ev) => { ev.stopPropagation(); handleVoid(e); }}
                        >
                          <VoidIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
                {/* Expanded detail */}
                <TableRow>
                  <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                    <Collapse in={expandedId === e.id} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Cuenta</TableCell>
                              <TableCell>Nombre</TableCell>
                              <TableCell align="right">Debito</TableCell>
                              <TableCell align="right">Credito</TableCell>
                              <TableCell>Notas</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(e.lines || []).map((l, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{l.account?.code || l.account_id}</TableCell>
                                <TableCell>{l.account?.name || ''}</TableCell>
                                <TableCell align="right">{l.debit > 0 ? fmtCOP(l.debit) : ''}</TableCell>
                                <TableCell align="right">{l.credit > 0 ? fmtCOP(l.credit) : ''}</TableCell>
                                <TableCell>{l.notes}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {entries.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay asientos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        labelRowsPerPage="Filas:"
      />

      {/* Dialog: Nuevo Asiento */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Asiento Contable</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <DatePicker
              label="Fecha"
              value={entryDate}
              onChange={setEntryDate}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
            />
            <TextField
              label="Descripcion"
              value={entryDesc}
              onChange={(e) => setEntryDesc(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
              label="Referencia"
              value={entryRef}
              onChange={(e) => setEntryRef(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            />
          </Box>

          <Divider />

          {/* Lines */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 250 }}>Cuenta</TableCell>
                  <TableCell sx={{ width: 140 }}>Debito</TableCell>
                  <TableCell sx={{ width: 140 }}>Credito</TableCell>
                  <TableCell>Notas</TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={accounts}
                        getOptionLabel={(o) => `${o.code} - ${o.name}`}
                        value={accounts.find((a) => a.id === line.account_id) || null}
                        onChange={(_, v) => updateLine(idx, 'account_id', v?.id || 0)}
                        renderInput={(params) => <TextField {...params} placeholder="Buscar cuenta..." />}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={line.notes}
                        onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      {lines.length > 2 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <RemoveLineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            startIcon={<AddLineIcon />}
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          >
            Agregar linea
          </Button>

          <Divider />

          {/* Totals */}
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'flex-end', alignItems: 'center' }}>
            <Typography variant="body2">
              <strong>Total Debito:</strong> {fmtCOP(totalDebit)}
            </Typography>
            <Typography variant="body2">
              <strong>Total Credito:</strong> {fmtCOP(totalCredit)}
            </Typography>
            <Typography variant="body2" color={isBalanced ? 'success.main' : 'error.main'} fontWeight="bold">
              Diferencia: {fmtCOP(diff)}
            </Typography>
          </Box>

          {!isBalanced && (
            <Alert severity="error">El asiento no esta balanceado. Debito y Credito deben ser iguales.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!isBalanced || !hasMinLines || !entryDesc || saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// ===========================================================================
// Tab 3: Libro Mayor (General Ledger)
// ===========================================================================

const GeneralLedger: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [classFilter, setClassFilter] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { GetLedger } = await svc();
      const data = await GetLedger(year, month);
      setRows(data || []);
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const filtered = classFilter > 0
    ? rows.filter((r) => r.account_code.startsWith(String(classFilter)))
    : rows;

  const totals = filtered.reduce(
    (acc, r) => ({
      open: acc.open + r.open_balance,
      debit: acc.debit + r.total_debit,
      credit: acc.credit + r.total_credit,
      close: acc.close + r.close_balance,
    }),
    { open: 0, debit: 0, credit: 0, close: 0 },
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Mes</InputLabel>
          <Select value={month} label="Mes" onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map((m, i) => (
              <MenuItem key={i} value={i + 1}>{m}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Ano"
          type="number"
          size="small"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ width: 100 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Clase</InputLabel>
          <Select value={classFilter} label="Clase" onChange={(e) => setClassFilter(Number(e.target.value))}>
            <MenuItem value={0}>Todas</MenuItem>
            {[1, 2, 3, 4, 5, 6].map((c) => (
              <MenuItem key={c} value={c}>{classLabel[c]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={load}><RefreshIcon /></IconButton>
        <Button
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={async () => {
            try {
              const s = (window as any).go?.services?.AccountingService;
              const path = await s.ExportLibroMayorPDF(year, month);
              await s.OpenPDF(path);
              toast.success('PDF generado');
            } catch (e: any) {
              toast.error('Error exportando PDF: ' + (e?.message || e));
            }
          }}
        >
          Exportar PDF
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer sx={{ maxHeight: 550 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Codigo</TableCell>
              <TableCell>Cuenta</TableCell>
              <TableCell align="right">Saldo Inicial</TableCell>
              <TableCell align="right">Debitos</TableCell>
              <TableCell align="right">Creditos</TableCell>
              <TableCell align="right">Saldo Final</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={i} hover>
                <TableCell>{r.account_code}</TableCell>
                <TableCell>{r.account_name}</TableCell>
                <TableCell align="right">{fmtCOP(r.open_balance)}</TableCell>
                <TableCell align="right">{fmtCOP(r.total_debit)}</TableCell>
                <TableCell align="right">{fmtCOP(r.total_credit)}</TableCell>
                <TableCell align="right">{fmtCOP(r.close_balance)}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Sin movimientos en este periodo
                </TableCell>
              </TableRow>
            )}
            {filtered.length > 0 && (
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: 2 } }}>
                <TableCell colSpan={2}>TOTALES</TableCell>
                <TableCell align="right">{fmtCOP(totals.open)}</TableCell>
                <TableCell align="right">{fmtCOP(totals.debit)}</TableCell>
                <TableCell align="right">{fmtCOP(totals.credit)}</TableCell>
                <TableCell align="right">{fmtCOP(totals.close)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

// ===========================================================================
// Tab 4: Estados Financieros
// ===========================================================================

const FinancialStatements: React.FC = () => {
  const [subTab, setSubTab] = useState(0);
  const currentYear = new Date().getFullYear();

  const handleCloseYear = async () => {
    if (!window.confirm(`Esta seguro de realizar el Cierre Anual ${currentYear}? Esta operacion no se puede deshacer.`)) return;
    try {
      const s = (window as any).go?.services?.AccountingService;
      const result = await s.CloseYear(currentYear);
      toast.success('Cierre anual completado: ' + (result || ''));
    } catch (e: any) {
      toast.error('Error en cierre anual: ' + (e?.message || e));
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Tabs value={subTab} onChange={(_, v) => setSubTab(v)}>
          <Tab label="Balance General" />
          <Tab label="Estado de Resultados" />
          <Tab label="Notas" />
        </Tabs>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<CloseYearIcon />}
          onClick={handleCloseYear}
        >
          Cierre Anual {currentYear}
        </Button>
      </Box>
      {subTab === 0 && <BalanceSheet />}
      {subTab === 1 && <IncomeStatement />}
      {subTab === 2 && <FinancialNotes />}
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Balance General
// ---------------------------------------------------------------------------

const BalanceSheet: React.FC = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<FinancialStatement | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { GetBalanceSheet } = await svc();
      const result = await GetBalanceSheet(dateStr(date));
      setData(result);
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const assets = data?.sections?.[0];
  const liabilities = data?.sections?.[1];
  const equity = data?.sections?.[2];
  const equation = (liabilities?.subtotal || 0) + (equity?.subtotal || 0);
  const balanced = data ? Math.abs((assets?.subtotal || 0) - equation) < 1 : true;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <DatePicker
          label="Fecha de corte"
          value={date}
          onChange={setDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <IconButton onClick={load}><RefreshIcon /></IconButton>
        <Button
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={async () => {
            try {
              const s = (window as any).go?.services?.AccountingService;
              const path = await s.ExportBalanceSheetPDF(dateStr(date));
              await s.OpenPDF(path);
              toast.success('PDF generado');
            } catch (e: any) {
              toast.error('Error exportando PDF: ' + (e?.message || e));
            }
          }}
        >
          Exportar PDF
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {data && (
        <>
          <Alert severity={balanced ? 'success' : 'error'} sx={{ mb: 2 }}>
            Activo ({fmtCOP(assets?.subtotal || 0)}) {balanced ? '=' : '!='} Pasivo ({fmtCOP(liabilities?.subtotal || 0)}) + Patrimonio ({fmtCOP(equity?.subtotal || 0)}) = {fmtCOP(equation)}
          </Alert>

          <Grid container spacing={2}>
            {(data.sections || []).map((section, si) => (
              <Grid item xs={12} md={4} key={si}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {section.name}
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      {(section.accounts || []).map((acc, ai) => (
                        <TableRow key={ai}>
                          <TableCell sx={{ py: 0.5 }}>{acc.code}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{acc.name}</TableCell>
                          <TableCell align="right" sx={{ py: 0.5 }}>{fmtCOP(acc.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: 2 } }}>
                        <TableCell colSpan={2}>Subtotal</TableCell>
                        <TableCell align="right">{fmtCOP(section.subtotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Estado de Resultados
// ---------------------------------------------------------------------------

const IncomeStatement: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<FinancialStatement | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { GetIncomeStatement } = await svc();
      const result = await GetIncomeStatement(dateStr(startDate), dateStr(endDate));
      setData(result);
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const income = data?.sections?.[0];
  const costs = data?.sections?.[1];
  const expenses = data?.sections?.[2];
  const netProfit = data?.total || 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <DatePicker
          label="Desde"
          value={startDate}
          onChange={setStartDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="Hasta"
          value={endDate}
          onChange={setEndDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <IconButton onClick={load}><RefreshIcon /></IconButton>
        <Button
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={async () => {
            try {
              const s = (window as any).go?.services?.AccountingService;
              const path = await s.ExportIncomeStatementPDF(dateStr(startDate), dateStr(endDate));
              await s.OpenPDF(path);
              toast.success('PDF generado');
            } catch (e: any) {
              toast.error('Error exportando PDF: ' + (e?.message || e));
            }
          }}
        >
          Exportar PDF
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {data && (
        <>
          {[income, costs, expenses].filter(Boolean).map((section, si) => (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }} key={si}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {section!.name}
              </Typography>
              <Table size="small">
                <TableBody>
                  {(section!.accounts || []).map((acc, ai) => (
                    <TableRow key={ai}>
                      <TableCell sx={{ py: 0.5 }}>{acc.code}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>{acc.name}</TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>{fmtCOP(acc.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: 2 } }}>
                    <TableCell colSpan={2}>Subtotal {section!.name}</TableCell>
                    <TableCell align="right">{fmtCOP(section!.subtotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          ))}

          <Alert severity={netProfit >= 0 ? 'success' : 'error'} sx={{ mt: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Utilidad Neta: {fmtCOP(netProfit)}
            </Typography>
            <Typography variant="body2">
              Ingresos ({fmtCOP(income?.subtotal || 0)}) - Costos ({fmtCOP(costs?.subtotal || 0)}) - Gastos ({fmtCOP(expenses?.subtotal || 0)})
            </Typography>
          </Alert>
        </>
      )}
    </Box>
  );
};

// ===========================================================================
// Financial Notes (sub-tab inside Estados Financieros)
// ===========================================================================

const FinancialNotes: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = (window as any).go?.services?.AccountingService;
      const data = await s.GetFinancialNotes(year);
      setNotes(data || []);
    } catch (e: any) {
      toast.error('Error cargando notas: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          label="Ano"
          type="number"
          size="small"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ width: 100 }}
        />
        <IconButton onClick={load}><RefreshIcon /></IconButton>
        <Button
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={async () => {
            try {
              const s = (window as any).go?.services?.AccountingService;
              const path = await s.ExportNotesPDF(year);
              await s.OpenPDF(path);
              toast.success('PDF generado');
            } catch (e: any) {
              toast.error('Error exportando PDF: ' + (e?.message || e));
            }
          }}
        >
          Exportar Notas PDF
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {notes.length === 0 && !loading && (
        <Alert severity="info">No hay notas para el ano {year}</Alert>
      )}

      {notes.map((note) => (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }} key={note.id}>
          <Typography variant="subtitle1" fontWeight="bold">
            <NoteIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Nota {note.note_number}: {note.title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
            {note.content}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};

// ===========================================================================
// Tab 5: Ingreso Rapido
// ===========================================================================

const QuickEntry: React.FC = () => {
  // Daily sales form
  const [salesAmount, setSalesAmount] = useState<number | ''>('');
  const [salesDate, setSalesDate] = useState<Date | null>(new Date());
  const [salesRef, setSalesRef] = useState('');
  const [savingSales, setSavingSales] = useState(false);

  // Expense form
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expCode, setExpCode] = useState('5195');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState<Date | null>(new Date());
  const [savingExp, setSavingExp] = useState(false);

  const expenseTypes = [
    { code: '5120', label: 'Arriendo' },
    { code: '5135', label: 'Servicios' },
    { code: '6205', label: 'Compras' },
    { code: '5195', label: 'Otros Gastos' },
  ];

  const handleSales = async () => {
    if (!salesAmount) return;
    setSavingSales(true);
    try {
      const s = (window as any).go?.services?.AccountingService;
      await s.RegisterDailySales(Number(salesAmount), dateStr(salesDate), salesRef);
      toast.success('Venta diaria registrada');
      setSalesAmount('');
      setSalesRef('');
      setSalesDate(new Date());
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    } finally {
      setSavingSales(false);
    }
  };

  const handleExpense = async () => {
    if (!expAmount) return;
    setSavingExp(true);
    try {
      const s = (window as any).go?.services?.AccountingService;
      await s.RegisterExpense(Number(expAmount), expCode, expDesc, null, dateStr(expDate));
      toast.success('Gasto registrado');
      setExpAmount('');
      setExpDesc('');
      setExpDate(new Date());
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    } finally {
      setSavingExp(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader
            avatar={<MoneyIcon color="success" />}
            title="Registrar Venta Diaria"
            titleTypographyProps={{ fontWeight: 'bold' }}
          />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Monto"
              type="number"
              size="small"
              value={salesAmount}
              onChange={(e) => setSalesAmount(e.target.value ? Number(e.target.value) : '')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              fullWidth
            />
            <DatePicker
              label="Fecha"
              value={salesDate}
              onChange={setSalesDate}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <TextField
              label="Referencia"
              size="small"
              value={salesRef}
              onChange={(e) => setSalesRef(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              color="success"
              onClick={handleSales}
              disabled={!salesAmount || savingSales}
              startIcon={<ReceiptIcon />}
            >
              {savingSales ? 'Registrando...' : 'Registrar Venta'}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader
            avatar={<ReceiptIcon color="warning" />}
            title="Registrar Gasto"
            titleTypographyProps={{ fontWeight: 'bold' }}
          />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Monto"
              type="number"
              size="small"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value ? Number(e.target.value) : '')}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo de Gasto</InputLabel>
              <Select value={expCode} label="Tipo de Gasto" onChange={(e) => setExpCode(e.target.value)}>
                {expenseTypes.map((t) => (
                  <MenuItem key={t.code} value={t.code}>{t.code} - {t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Descripcion"
              size="small"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              fullWidth
            />
            <DatePicker
              label="Fecha"
              value={expDate}
              onChange={setExpDate}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <Button
              variant="contained"
              color="warning"
              onClick={handleExpense}
              disabled={!expAmount || savingExp}
              startIcon={<ReceiptIcon />}
            >
              {savingExp ? 'Registrando...' : 'Registrar Gasto'}
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// ===========================================================================
// Tab 6: Proveedores
// ===========================================================================

const Providers: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState({
    name: '',
    nit: '',
    person_type: 'natural',
    phone: '',
    product_type: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = (window as any).go?.services?.AccountingService;
      const data = await s.GetProviders();
      setProviders(data || []);
    } catch (e: any) {
      toast.error('Error cargando proveedores: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ name: '', nit: '', person_type: 'natural', phone: '', product_type: '' });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: Provider) => {
    setEditing(p);
    setForm({
      name: p.name,
      nit: p.nit,
      person_type: p.person_type,
      phone: p.phone,
      product_type: p.product_type,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const s = (window as any).go?.services?.AccountingService;
      if (editing) {
        await s.UpdateProvider({ ...form, id: editing.id });
        toast.success('Proveedor actualizado');
      } else {
        await s.CreateProvider(form);
        toast.success('Proveedor creado');
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    }
  };

  const handleDelete = async (p: Provider) => {
    if (!window.confirm(`Eliminar proveedor ${p.name}?`)) return;
    try {
      const s = (window as any).go?.services?.AccountingService;
      await s.DeleteProvider(p.id);
      toast.success('Proveedor eliminado');
      load();
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || e));
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          <StoreIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Proveedores
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo Proveedor
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer sx={{ maxHeight: 550 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>NIT</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Telefono</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Saldo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.nit}</TableCell>
                <TableCell>
                  <Chip
                    label={p.person_type === 'natural' ? 'Natural' : 'Juridica'}
                    size="small"
                    color={p.person_type === 'natural' ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{p.product_type}</TableCell>
                <TableCell align="right">{fmtCOP(p.balance || 0)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => handleDelete(p)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {providers.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay proveedores registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog: Crear/Editar Proveedor */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Nombre"
            size="small"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="NIT"
            size="small"
            value={form.nit}
            onChange={(e) => setForm({ ...form, nit: e.target.value })}
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo de Persona</InputLabel>
            <Select
              value={form.person_type}
              label="Tipo de Persona"
              onChange={(e) => setForm({ ...form, person_type: e.target.value })}
            >
              <MenuItem value="natural">Natural</MenuItem>
              <MenuItem value="juridica">Juridica</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Telefono"
            size="small"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
          />
          <TextField
            label="Tipo de Producto"
            size="small"
            value={form.product_type}
            onChange={(e) => setForm({ ...form, product_type: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.nit}>
            {editing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// ===========================================================================
// Tab 7: Guía de Uso
// ===========================================================================

const GuideSection: React.FC<{ title: string; defaultExpanded?: boolean; children: React.ReactNode }> = ({
  title,
  defaultExpanded,
  children,
}) => (
  <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 1 }}>
    <AccordionSummary expandIcon={<AccordionExpandIcon />}>
      <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
    </AccordionSummary>
    <AccordionDetails>{children}</AccordionDetails>
  </Accordion>
);

const AccountingGuide: React.FC = () => {
  return (
    <Paper sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <HelpIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">Guía de Uso del Módulo de Contabilidad</Typography>
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Este módulo implementa <strong>Contabilidad Simplificada NIIF Grupo 3</strong> (Decreto 2420/2015 de Colombia),
        diseñada para microempresas como restaurantes. No reemplaza a un contador, pero genera todos los libros
        y reportes que él necesita.
      </Alert>

      <GuideSection title="📘 Conceptos Básicos" defaultExpanded>
        <Typography variant="body2" paragraph>
          <strong>Partida Doble:</strong> Toda operación afecta al menos 2 cuentas. Lo que entra por un lado
          (<em>Débito</em>) debe salir por otro (<em>Crédito</em>). La suma de débitos siempre es igual a la
          suma de créditos. Es el principio fundamental de la contabilidad.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Ejemplo:</strong> Vendes $50.000 en efectivo →
          <br />• <strong>Débito</strong> a "Caja General" $50.000 (entra dinero)
          <br />• <strong>Crédito</strong> a "Comercio al por menor" $50.000 (registras la venta)
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Naturaleza de las cuentas:</strong>
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="Activos (Clase 1) — Naturaleza Débito" secondary="Lo que tienes: Caja, Bancos, Inventario, Equipos. Aumenta con débito." /></ListItem>
          <ListItem><ListItemText primary="Pasivos (Clase 2) — Naturaleza Crédito" secondary="Lo que debes: Proveedores, Préstamos, Impuestos por pagar. Aumenta con crédito." /></ListItem>
          <ListItem><ListItemText primary="Patrimonio (Clase 3) — Naturaleza Crédito" secondary="Tu capital y utilidades. Aumenta con crédito." /></ListItem>
          <ListItem><ListItemText primary="Ingresos (Clase 4) — Naturaleza Crédito" secondary="Lo que ganas: Ventas. Aumenta con crédito." /></ListItem>
          <ListItem><ListItemText primary="Gastos (Clase 5) — Naturaleza Débito" secondary="Lo que gastas: Arriendo, servicios, sueldos. Aumenta con débito." /></ListItem>
          <ListItem><ListItemText primary="Costos (Clase 6) — Naturaleza Débito" secondary="Costo directo de lo vendido: ingredientes, materia prima. Aumenta con débito." /></ListItem>
        </List>
        <Alert severity="success" sx={{ mt: 1 }}>
          <strong>Ecuación contable:</strong> Activo = Pasivo + Patrimonio. Siempre debe cumplirse.
        </Alert>
      </GuideSection>

      <GuideSection title="📋 Plan de Cuentas (PUC)">
        <Typography variant="body2" paragraph>
          Es el catálogo de todas las cuentas que puedes usar. El sistema viene con <strong>55 cuentas
          preconfiguradas</strong> según el PUC colombiano (Decreto 2650/1993) adaptado a un restaurante
          (CIIU 5619).
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Estructura del código:</strong>
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="1 dígito = Clase" secondary="Ej: 1 = Activo" /></ListItem>
          <ListItem><ListItemText primary="2 dígitos = Grupo" secondary="Ej: 11 = Disponible" /></ListItem>
          <ListItem><ListItemText primary="4 dígitos = Cuenta" secondary="Ej: 1105 = Caja" /></ListItem>
          <ListItem><ListItemText primary="6 dígitos = Subcuenta" secondary="Ej: 110505 = Caja General" /></ListItem>
        </List>
        <Typography variant="body2" paragraph>
          <strong>Cómo usar esta pestaña:</strong>
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="Buscar cuentas existentes por código o nombre antes de crear nuevas." /></ListItem>
          <ListItem><ListItemText primary="Crear cuentas auxiliares (nivel 4) si necesitas más detalle. Ej: 110506 'Caja Domicilios'." /></ListItem>
          <ListItem><ListItemText primary="Las cuentas marcadas con 🔒 son del sistema y no se pueden eliminar." /></ListItem>
          <ListItem><ListItemText primary="No puedes eliminar una cuenta que ya tiene movimientos." /></ListItem>
        </List>
      </GuideSection>

      <GuideSection title="📒 Libro Diario (Asientos Contables)">
        <Typography variant="body2" paragraph>
          Es el registro cronológico de <strong>todas las operaciones</strong> del negocio. Cada operación
          se llama <em>asiento contable</em> y tiene un número consecutivo.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Reglas estrictas:</strong>
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="✅ Total Débitos = Total Créditos (siempre)" /></ListItem>
          <ListItem><ListItemText primary="✅ Mínimo 2 líneas por asiento" /></ListItem>
          <ListItem><ListItemText primary="❌ Los asientos NO se eliminan, solo se anulan con uno inverso" secondary="Por ley, en contabilidad oficial nunca se borra, solo se reversa." /></ListItem>
          <ListItem><ListItemText primary="❌ No se permiten fechas futuras" /></ListItem>
          <ListItem><ListItemText primary="❌ No se permiten asientos en períodos cerrados" /></ListItem>
        </List>
        <Typography variant="body2" paragraph sx={{ mt: 2 }}>
          <strong>Cómo crear un asiento manual:</strong>
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Click en 'Nuevo Asiento'" /></ListItem>
          <ListItem><ListItemText primary="2. Selecciona la fecha y escribe una descripción clara" /></ListItem>
          <ListItem><ListItemText primary="3. Agrega líneas: cuenta + débito o crédito" /></ListItem>
          <ListItem><ListItemText primary="4. Verifica que el total cuadre (indicador verde)" /></ListItem>
          <ListItem><ListItemText primary="5. Guardar" /></ListItem>
        </List>
        <Alert severity="warning" sx={{ mt: 1 }}>
          Si te equivocaste, usa el botón <VoidIcon fontSize="small" sx={{ verticalAlign: 'middle' }} />
          para anular. Esto crea un asiento inverso que cancela el original — ambos quedan en el libro
          como evidencia.
        </Alert>
      </GuideSection>

      <GuideSection title="📊 Libro Mayor">
        <Typography variant="body2" paragraph>
          Muestra el <strong>movimiento de cada cuenta</strong> durante un período. Para cada cuenta verás:
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="Saldo Anterior" secondary="Lo que tenía la cuenta al iniciar el período" /></ListItem>
          <ListItem><ListItemText primary="Total Débitos del período" /></ListItem>
          <ListItem><ListItemText primary="Total Créditos del período" /></ListItem>
          <ListItem><ListItemText primary="Saldo Final" secondary="Saldo Anterior ± movimientos según naturaleza" /></ListItem>
        </List>
        <Typography variant="body2" paragraph>
          <strong>Para qué sirve:</strong> Saber cuánto tienes en Caja, cuánto debes a Proveedores, cuánto
          ganaste en Ventas, etc., todo en un solo vistazo. Es la fuente para los Estados Financieros.
        </Typography>
      </GuideSection>

      <GuideSection title="📈 Estados Financieros">
        <Typography variant="body2" paragraph>
          Son los <strong>3 reportes oficiales</strong> que resumen la situación del negocio. Se generan
          automáticamente del Libro Mayor.
        </Typography>
        <Typography variant="body2" paragraph><strong>1. Balance General (Estado de Situación Financiera):</strong></Typography>
        <Typography variant="body2" paragraph sx={{ pl: 2 }}>
          Foto del negocio en un momento específico. Muestra: <strong>Activos = Pasivos + Patrimonio</strong>.
          Si no cuadra, hay un error en algún asiento.
        </Typography>
        <Typography variant="body2" paragraph><strong>2. Estado de Resultados (PYG):</strong></Typography>
        <Typography variant="body2" paragraph sx={{ pl: 2 }}>
          Muestra si ganaste o perdiste en un período. Fórmula:
          <br /><strong>Ingresos − Costos − Gastos = Utilidad o Pérdida Neta</strong>
        </Typography>
        <Typography variant="body2" paragraph><strong>3. Notas a los Estados Financieros:</strong></Typography>
        <Typography variant="body2" paragraph sx={{ pl: 2 }}>
          Las 5 notas obligatorias por NIIF Grupo 3: información de la empresa, políticas contables,
          desgloses de cuentas importantes, etc. Se autogeneran.
        </Typography>
        <Alert severity="info" sx={{ mt: 1 }}>
          Todos los estados se exportan a PDF con formato legal (folios, encabezado, espacios para firma)
          listos para entregar al contador o a la DIAN.
        </Alert>
      </GuideSection>

      <GuideSection title="⚡ Ingreso Rápido">
        <Typography variant="body2" paragraph>
          Para no tener que crear asientos manualmente todos los días, esta pestaña tiene <strong>2
          atajos</strong> que generan los asientos automáticamente:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><MoneyIcon color="success" /></ListItemIcon>
            <ListItemText
              primary="Venta Diaria"
              secondary="Escribes el monto vendido del día → genera asiento: Débito Caja / Crédito Ventas"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><ReceiptIcon color="warning" /></ListItemIcon>
            <ListItemText
              primary="Registrar Gasto"
              secondary="Eliges el tipo (arriendo, servicios, compras, otros) y monto → genera asiento: Débito Gasto / Crédito Caja"
            />
          </ListItem>
        </List>
        <Alert severity="success" sx={{ mt: 1 }}>
          <strong>Tip:</strong> El POS ya genera el asiento de ventas <em>automáticamente</em> cuando cierras
          caja registradora. No necesitas usar "Venta Diaria" si ya cierras caja desde el POS.
        </Alert>
      </GuideSection>

      <GuideSection title="🏪 Proveedores">
        <Typography variant="body2" paragraph>
          Registro de las personas/empresas a quienes le compras (carnes, verduras, bebidas, etc.).
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="Datos: NIT, tipo de persona (Natural/Jurídica), teléfono, qué te suministra" /></ListItem>
          <ListItem><ListItemText primary="Balance de cuentas por pagar: cuánto le debes a cada proveedor" /></ListItem>
          <ListItem><ListItemText primary="Útil para el reporte de IVA y declaraciones tributarias" /></ListItem>
        </List>
      </GuideSection>

      <GuideSection title="🔄 Integración Automática con el POS">
        <Typography variant="body2" paragraph>
          Si activas <strong>"Auto-entry on close"</strong> en la configuración, cada vez que cierres
          la caja registradora desde el POS, el sistema:
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Lee el reporte de cierre (ventas por método de pago)" /></ListItem>
          <ListItem><ListItemText primary="2. Genera un asiento contable automático" secondary="Débito a Caja/Bancos según el método (efectivo, tarjeta, transferencia) y Crédito a Ventas" /></ListItem>
          <ListItem><ListItemText primary="3. Lo registra con source='cash_close' para identificarlo" /></ListItem>
        </List>
        <Alert severity="info" sx={{ mt: 1 }}>
          Esto significa que <strong>no tienes que registrar las ventas manualmente</strong>. Solo cierras
          caja en el POS y la contabilidad se actualiza sola.
        </Alert>
      </GuideSection>

      <GuideSection title="🔒 Cierre Contable">
        <Typography variant="body2" paragraph>
          <strong>Cierre Mensual:</strong> "Congela" un mes para que nadie pueda modificar asientos
          de ese período. Útil después de entregar reportes al contador.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Cierre Anual:</strong> Es el más importante. Al final del año:
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Calcula la utilidad/pérdida del año (Ingresos − Costos − Gastos)" /></ListItem>
          <ListItem><ListItemText primary="2. Genera un asiento de cierre que pone en cero las cuentas de Ingresos, Costos y Gastos" /></ListItem>
          <ListItem><ListItemText primary="3. Transfiere el resultado a Patrimonio (cuenta 3705 utilidad o 3710 pérdida)" /></ListItem>
          <ListItem><ListItemText primary="4. Cierra los 12 meses del año (read-only)" /></ListItem>
        </List>
        <Alert severity="warning" sx={{ mt: 1 }}>
          El cierre anual es <strong>irreversible</strong>. Hazlo solo cuando estés seguro de que todos
          los asientos del año están correctos. Idealmente con tu contador presente.
        </Alert>
      </GuideSection>

      <GuideSection title="📤 Exportaciones">
        <Typography variant="body2" paragraph>
          Todos los libros y estados se pueden exportar:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><PdfIcon color="error" /></ListItemIcon>
            <ListItemText
              primary="PDF (formato legal)"
              secondary="Con folios numerados, encabezado del negocio (NIT), formato moneda COP, espacios para firma. Listos para imprimir y archivar."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CsvIcon color="primary" /></ListItemIcon>
            <ListItemText
              primary="CSV (para contador externo)"
              secondary="Datos planos del libro diario completo. Tu contador los puede importar a su software (Siigo, World Office, Helisa, etc.)."
            />
          </ListItem>
        </List>
      </GuideSection>

      <GuideSection title="❓ Flujo Recomendado para Restaurantes">
        <Typography variant="body2" paragraph><strong>Día a día:</strong></Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Trabajas normal en el POS (toma de pedidos, ventas)" /></ListItem>
          <ListItem><ListItemText primary="2. Cierras caja al final del turno → asiento se genera solo" /></ListItem>
          <ListItem><ListItemText primary="3. Si pagas un gasto (mercado, servicios), lo registras en 'Ingreso Rápido → Gasto'" /></ListItem>
        </List>
        <Typography variant="body2" paragraph sx={{ mt: 2 }}><strong>Cada mes:</strong></Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Revisas el Libro Diario del mes" /></ListItem>
          <ListItem><ListItemText primary="2. Generas el Estado de Resultados → ves si ganaste o perdiste" /></ListItem>
          <ListItem><ListItemText primary="3. Exportas PDFs y los envías al contador" /></ListItem>
          <ListItem><ListItemText primary="4. Cuando el contador confirme, haces 'Cierre Mensual'" /></ListItem>
        </List>
        <Typography variant="body2" paragraph sx={{ mt: 2 }}><strong>Cada año (diciembre/enero):</strong></Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Generas Balance General y Estado de Resultados anual" /></ListItem>
          <ListItem><ListItemText primary="2. Exportas las Notas a los Estados Financieros" /></ListItem>
          <ListItem><ListItemText primary="3. Entregas todo al contador" /></ListItem>
          <ListItem><ListItemText primary="4. Después de declarar renta → 'Cierre Anual'" /></ListItem>
        </List>
      </GuideSection>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <strong>Importante:</strong> Este módulo te ayuda a llevar la contabilidad ordenada, pero
        <strong> no reemplaza a un contador titulado</strong>. La firma de un contador público sigue
        siendo obligatoria para declaraciones tributarias y estados financieros oficiales en Colombia.
      </Alert>
    </Paper>
  );
};

export default Accounting;
