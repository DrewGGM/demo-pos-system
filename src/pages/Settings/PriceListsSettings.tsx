import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Inventory as InventoryIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useConfirm } from '../../contexts/ConfirmContext';

// PriceList row shape — mirrors the Go model field-for-field. We keep this
// inline (instead of importing from wailsjs/go/models) to avoid coupling the
// Settings UI to wails type-gen drift between builds.
interface PriceList {
  id: number;
  name: string;
  description: string;
  markup_pct: number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
}

// One row from PriceListService.GetProductPricesForList — base price comes
// from products.price; override_price is the value stored in
// product_price_list_prices for this (product, list) pair, or undefined if
// the cart should fall back to markup math.
interface ProductPriceRow {
  product_id: number;
  name: string;
  base_price: number;
  override_price?: number;
}

// Wails binding accessor. Demo-frontend won't have the service exposed; in
// that case we fall back to a stub so the page renders an explanatory alert
// instead of crashing.
const svc = () => (window as any)?.go?.services?.PriceListService;

const PriceListsSettings: React.FC = () => {
  const confirm = useConfirm();
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PriceList | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Per-product price grid state. priceGridList is the list being edited;
  // priceGridRows is the editable copy of what came back from the backend.
  // Edits live in priceGridRows until the operator hits Guardar — they're
  // not persisted incrementally, so cancelling abandons everything.
  const [priceGridList, setPriceGridList] = useState<PriceList | null>(null);
  const [priceGridRows, setPriceGridRows] = useState<ProductPriceRow[]>([]);
  const [priceGridLoading, setPriceGridLoading] = useState(false);
  const [priceGridSaving, setPriceGridSaving] = useState(false);
  const [priceGridSearch, setPriceGridSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = svc();
      if (!s?.ListAll) {
        setLists([]);
        return;
      }
      const data = (await s.ListAll()) || [];
      setLists(data as PriceList[]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudieron cargar las listas de precios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing({
      id: 0,
      name: '',
      description: '',
      markup_pct: 0,
      is_default: false,
      is_active: true,
      display_order: lists.length,
    });
    setEditorOpen(true);
  };

  const openEdit = (list: PriceList) => {
    setEditing({ ...list });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      const s = svc();
      if (!s) throw new Error('Servicio no disponible');
      if (editing.id === 0) {
        await s.Create(editing);
        toast.success('Lista creada');
      } else {
        await s.Update(editing.id, editing);
        toast.success('Lista actualizada');
      }
      setEditorOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la lista');
    }
  };

  const handleSetDefault = async (list: PriceList) => {
    if (list.is_default) return;
    try {
      const s = svc();
      if (!s?.SetDefault) throw new Error('Servicio no disponible');
      await s.SetDefault(list.id);
      toast.success(`"${list.name}" establecida como default`);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo establecer la default');
    }
  };

  // Open the per-product price editor for a list. Fetches the product
  // catalog + any existing overrides in a single round-trip via
  // GetProductPricesForList.
  const openPriceGrid = async (list: PriceList) => {
    setPriceGridList(list);
    setPriceGridLoading(true);
    setPriceGridSearch('');
    try {
      const s = svc();
      if (!s?.GetProductPricesForList) throw new Error('Servicio no disponible');
      const rows = (await s.GetProductPricesForList(list.id)) || [];
      setPriceGridRows(rows as ProductPriceRow[]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar el catálogo');
      setPriceGridList(null);
    } finally {
      setPriceGridLoading(false);
    }
  };

  // Edit a single product's override. `value` is the string from the
  // TextField — empty / NaN clears the override so the cart falls back to
  // the list's markup. We only mutate the in-memory grid here; persistence
  // happens on Guardar so the operator can mass-edit without N writes.
  const handleGridEdit = (productId: number, value: string) => {
    setPriceGridRows((rows) =>
      rows.map((r) => {
        if (r.product_id !== productId) return r;
        if (value === '') return { ...r, override_price: undefined };
        const num = parseFloat(value);
        if (Number.isNaN(num)) return r;
        return { ...r, override_price: num };
      }),
    );
  };

  // Save all per-product changes. We compare each row to its original to
  // decide whether to write or clear — sending only the deltas keeps the
  // network round-trip count proportional to what the operator actually
  // edited, not to the catalog size.
  const savePriceGrid = async () => {
    if (!priceGridList) return;
    setPriceGridSaving(true);
    try {
      const s = svc();
      if (!s?.SetProductPriceForList) throw new Error('Servicio no disponible');
      // Re-fetch the canonical state so the "did this row change?" check
      // doesn't drift if the admin re-opens the dialog after Cancel.
      const baseline = ((await s.GetProductPricesForList(priceGridList.id)) || []) as ProductPriceRow[];
      const baselineByID = new Map(baseline.map((r) => [r.product_id, r.override_price]));
      let writes = 0;
      for (const row of priceGridRows) {
        const before = baselineByID.get(row.product_id);
        const after = row.override_price;
        // No-op rows are skipped; both undefined or both equal numbers.
        if (before === after) continue;
        if (after === undefined) {
          await s.SetProductPriceForList(row.product_id, priceGridList.id, 0, true);
        } else {
          await s.SetProductPriceForList(row.product_id, priceGridList.id, after, false);
        }
        writes++;
      }
      toast.success(writes === 0 ? 'Sin cambios para guardar' : `${writes} precio(s) guardado(s)`);
      setPriceGridList(null);
      setPriceGridRows([]);
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar los precios');
    } finally {
      setPriceGridSaving(false);
    }
  };

  const handleDelete = async (list: PriceList) => {
    if (list.is_default) {
      toast.error('Promueve otra lista como default antes de eliminar esta');
      return;
    }
    if (!(await confirm({ message: `¿Eliminar la lista "${list.name}"? Los precios personalizados de productos en esta lista también se eliminarán.`, variant: 'danger' }))) {
      return;
    }
    try {
      const s = svc();
      if (!s?.Delete) throw new Error('Servicio no disponible');
      await s.Delete(list.id);
      toast.success('Lista eliminada');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar la lista');
    }
  };

  if (!svc()) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          El servicio de listas de precios no está disponible en este entorno
          (modo demo). Esta sección requiere la app instalada.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">Listas de Precios</Typography>
          <Typography variant="body2" color="text.secondary">
            Define esquemas de precios (Mayorista, Empleado, Happy Hour, etc.). El cajero
            cambia entre ellas desde el carrito del POS. El porcentaje de ajuste se aplica
            sobre el precio base de cada producto; usa valores negativos para descuento
            global y positivos para recargo.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Nueva lista
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Ajuste</TableCell>
                <TableCell align="center">Activa</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && lists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                    No hay listas de precios. La lista default se crea automáticamente al iniciar.
                  </TableCell>
                </TableRow>
              )}
              {lists.map((list) => (
                <TableRow key={list.id} hover>
                  <TableCell sx={{ width: 40 }}>
                    <Tooltip title={list.is_default ? 'Lista default' : 'Marcar como default'}>
                      <IconButton size="small" onClick={() => handleSetDefault(list)}>
                        {list.is_default ? (
                          <StarIcon fontSize="small" color="warning" />
                        ) : (
                          <StarBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {list.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{list.description}</TableCell>
                  <TableCell align="right">
                    {list.markup_pct === 0 ? (
                      <Chip label="Sin ajuste" size="small" />
                    ) : (
                      <Chip
                        label={list.markup_pct > 0 ? `+${list.markup_pct}%` : `${list.markup_pct}%`}
                        size="small"
                        color={list.markup_pct > 0 ? 'warning' : 'success'}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={list.is_active ? 'Sí' : 'No'}
                      size="small"
                      color={list.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Precios por producto (overrides específicos)">
                      <IconButton size="small" onClick={() => openPriceGrid(list)}>
                        <InventoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(list)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={list.is_default ? 'No se puede eliminar la default' : 'Eliminar'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(list)}
                          disabled={list.is_default}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Editor dialog — single form for both create and edit. */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editing?.id === 0 ? 'Nueva lista de precios' : 'Editar lista de precios'}</DialogTitle>
        <DialogContent>
          {editing && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                  helperText='Ejemplos: "Mayorista", "Empleado", "Happy Hour"'
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción (opcional)"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Ajuste %"
                  value={editing.markup_pct}
                  onChange={(e) =>
                    setEditing({ ...editing, markup_pct: parseFloat(e.target.value) || 0 })
                  }
                  helperText="Positivo recarga, negativo descuenta"
                  inputProps={{ step: '0.5' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Orden"
                  value={editing.display_order}
                  onChange={(e) =>
                    setEditing({ ...editing, display_order: parseInt(e.target.value, 10) || 0 })
                  }
                  helperText="Posición en el selector del cajero"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  <Typography variant="body2">
                    Activa (visible para el cajero en el carrito)
                  </Typography>
                </Box>
              </Grid>
              {editing.id !== 0 && editing.is_default && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Esta es la lista <strong>default</strong> — usa el icono de estrella
                    desde la tabla para cambiar cuál lista es la default del sistema.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            {editing?.id === 0 ? 'Crear' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Per-product price override grid. The list-level markup_pct stays
          the cart's default; this dialog lets the admin pin specific
          products to fixed prices that win over the markup math. */}
      <Dialog
        open={!!priceGridList}
        onClose={() => !priceGridSaving && setPriceGridList(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Precios por producto — {priceGridList?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Deja un precio en blanco para usar el ajuste % de la lista
            ({priceGridList?.markup_pct ?? 0}%). Un valor explícito tiene
            prioridad sobre el ajuste.
          </Alert>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar producto..."
            value={priceGridSearch}
            onChange={(e) => setPriceGridSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
          {priceGridLoading ? (
            <Typography variant="body2" align="center" sx={{ py: 4 }}>
              Cargando catálogo...
            </Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Precio base</TableCell>
                    <TableCell align="right">Precio en esta lista</TableCell>
                    <TableCell align="center" sx={{ width: 60 }}>
                      Quitar
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {priceGridRows
                    .filter((r) =>
                      priceGridSearch.trim() === ''
                        ? true
                        : r.name.toLowerCase().includes(priceGridSearch.toLowerCase()),
                    )
                    .map((row) => {
                      const hasOverride = row.override_price !== undefined;
                      return (
                        <TableRow key={row.product_id} hover>
                          <TableCell>{row.name}</TableCell>
                          <TableCell align="right" sx={{ color: 'text.secondary' }}>
                            ${row.base_price.toLocaleString('es-CO')}
                          </TableCell>
                          <TableCell align="right" sx={{ width: 180 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={row.override_price ?? ''}
                              onChange={(e) => handleGridEdit(row.product_id, e.target.value)}
                              placeholder={`Auto (${priceGridList?.markup_pct ?? 0}%)`}
                              inputProps={{ min: 0, style: { textAlign: 'right' } }}
                              sx={{
                                bgcolor: hasOverride ? 'warning.lighter' : 'transparent',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Quitar precio personalizado">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={!hasOverride}
                                  onClick={() => handleGridEdit(row.product_id, '')}
                                >
                                  <ClearIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriceGridList(null)} disabled={priceGridSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={savePriceGrid} disabled={priceGridSaving}>
            {priceGridSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PriceListsSettings;
