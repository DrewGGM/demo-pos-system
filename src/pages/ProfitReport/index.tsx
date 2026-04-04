import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TextField, Chip, LinearProgress, InputAdornment,
} from '@mui/material';
import {
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  AttachMoney as RevenueIcon,
  MoneyOff as CostIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { wailsSalesService } from '../../services/wailsSalesService';
import { toast } from 'react-toastify';

interface ProductProfit {
  product_id: number;
  product_name: string;
  category_name: string;
  unit_price: number;
  unit_cost: number;
  unit_margin: number;
  margin_pct: number;
  qty_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

type SortKey = 'product_name' | 'qty_sold' | 'total_revenue' | 'total_cost' | 'total_profit' | 'margin_pct';

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const ProfitReport: React.FC = () => {
  const [products, setProducts] = useState<ProductProfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('total_profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [totals, setTotals] = useState({ revenue: 0, cost: 0, profit: 0, qty: 0, margin: 0 });

  const loadReport = async () => {
    setLoading(true);
    try {
      const start = startDate ? startDate.toISOString().split('T')[0] : '';
      const end = endDate ? endDate.toISOString().split('T')[0] : '';
      const result = await wailsSalesService.getProfitReport(start, end);
      setProducts(result.products || []);
      setTotals({
        revenue: result.total_revenue || 0,
        cost: result.total_cost || 0,
        profit: result.total_profit || 0,
        qty: result.total_qty || 0,
        margin: result.overall_margin || 0,
      });
    } catch (err) {
      toast.error('Error al cargar reporte de ganancias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, []);
  useEffect(() => { loadReport(); }, [startDate, endDate]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const filtered = products
    .filter(p => !search || p.product_name.toLowerCase().includes(search.toLowerCase()) || p.category_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'product_name') return mul * a.product_name.localeCompare(b.product_name);
      return mul * ((a[sortBy] as number) - (b[sortBy] as number));
    });

  const noCost = products.filter(p => p.unit_cost === 0 && p.qty_sold > 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Costos y Ganancias</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => {
            if (!filtered.length) { toast.warning('No hay datos'); return; }
            const headers = ['Producto', 'Categoría', 'Precio', 'Costo', 'Margen %', 'Vendidos', 'Ingresos', 'Costo Total', 'Ganancia'];
            const rows = filtered.map(p => [p.product_name, p.category_name, p.unit_price, p.unit_cost, p.margin_pct.toFixed(1), p.qty_sold, p.total_revenue, p.total_cost, p.total_profit]);
            const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `costos-ganancias-${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(url);
            toast.success('Reporte exportado');
          }} disabled={loading || !filtered.length}>
            Exportar
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadReport} disabled={loading}>
            Actualizar
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <RevenueIcon color="primary" />
              <Typography variant="h6">{fmt(totals.revenue)}</Typography>
              <Typography variant="body2" color="text.secondary">Ingresos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CostIcon color="error" />
              <Typography variant="h6">{fmt(totals.cost)}</Typography>
              <Typography variant="body2" color="text.secondary">Costos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              {totals.profit >= 0 ? <ProfitIcon color="success" /> : <LossIcon color="error" />}
              <Typography variant="h6" color={totals.profit >= 0 ? 'success.main' : 'error.main'}>
                {fmt(totals.profit)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Ganancia Neta</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color={totals.margin >= 30 ? 'success.main' : totals.margin >= 15 ? 'warning.main' : 'error.main'}>
                {totals.margin.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">Margen Global</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {noCost.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <Typography variant="body2">
            {noCost.length} producto(s) sin costo configurado: {noCost.slice(0, 5).map(p => p.product_name).join(', ')}
            {noCost.length > 5 && ` y ${noCost.length - 5} más`}. Configura el costo en Productos para un cálculo preciso.
          </Typography>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar producto o categoría..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="Desde" value={startDate} onChange={setStartDate} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={6} sm={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="Hasta" value={endDate} onChange={setEndDate} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell>
                <TableSortLabel active={sortBy === 'product_name'} direction={sortBy === 'product_name' ? sortDir : 'asc'} onClick={() => handleSort('product_name')}>
                  Producto
                </TableSortLabel>
              </TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="right">Costo</TableCell>
              <TableCell align="right">
                <TableSortLabel active={sortBy === 'margin_pct'} direction={sortBy === 'margin_pct' ? sortDir : 'asc'} onClick={() => handleSort('margin_pct')}>
                  Margen
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={sortBy === 'qty_sold'} direction={sortBy === 'qty_sold' ? sortDir : 'asc'} onClick={() => handleSort('qty_sold')}>
                  Vendidos
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={sortBy === 'total_revenue'} direction={sortBy === 'total_revenue' ? sortDir : 'asc'} onClick={() => handleSort('total_revenue')}>
                  Ingresos
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={sortBy === 'total_cost'} direction={sortBy === 'total_cost' ? sortDir : 'asc'} onClick={() => handleSort('total_cost')}>
                  Costo Total
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={sortBy === 'total_profit'} direction={sortBy === 'total_profit' ? sortDir : 'asc'} onClick={() => handleSort('total_profit')}>
                  Ganancia
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.product_id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{p.product_name}</TableCell>
                <TableCell><Chip label={p.category_name || 'Sin cat.'} size="small" variant="outlined" /></TableCell>
                <TableCell align="right">{fmt(p.unit_price)}</TableCell>
                <TableCell align="right" sx={{ color: p.unit_cost === 0 ? 'text.disabled' : 'inherit' }}>
                  {p.unit_cost === 0 ? 'Sin costo' : fmt(p.unit_cost)}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${p.margin_pct.toFixed(1)}%`}
                    size="small"
                    color={p.margin_pct >= 40 ? 'success' : p.margin_pct >= 20 ? 'warning' : 'error'}
                    variant="filled"
                  />
                </TableCell>
                <TableCell align="right">{p.qty_sold}</TableCell>
                <TableCell align="right">{fmt(p.total_revenue)}</TableCell>
                <TableCell align="right">{fmt(p.total_cost)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: p.total_profit >= 0 ? 'success.main' : 'error.main' }}>
                  {fmt(p.total_profit)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No hay datos de ventas para este período</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ProfitReport;
