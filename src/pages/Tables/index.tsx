import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Card,
  useMediaQuery,
  useTheme,
  Slider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Restaurant as RestaurantIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as WaitingIcon,
  Block as BlockedIcon,
  Settings as SettingsIcon,
  GridOn as GridIcon,
  CropSquare as SquareIcon,
  Circle as CircleIcon,
  Rectangle as RectangleIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  DragIndicator as DragIcon,
  CleaningServices as CleaningIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { wailsOrderService } from '../../services/wailsOrderService';
import { Table, TableArea } from '../../types/models';
import { toast } from 'react-toastify';

// --- Grid Layout Types ---

interface TableGridLayout {
  rows: number;
  columns: number;
  positions: { [key: string]: number }; // "row_col" -> tableId
}

const DEFAULT_ROWS = 3;
const DEFAULT_COLUMNS = 6;

function getGridLayoutKey(areaId: number): string {
  return `table_grid_layout_${areaId}`;
}

function loadGridLayout(areaId: number): TableGridLayout {
  try {
    const raw = localStorage.getItem(getGridLayoutKey(areaId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return { rows: DEFAULT_ROWS, columns: DEFAULT_COLUMNS, positions: {} };
}

function saveGridLayout(areaId: number, layout: TableGridLayout) {
  localStorage.setItem(getGridLayoutKey(areaId), JSON.stringify(layout));
  // Sync all layouts to backend for mobile apps
  syncAllLayoutsToBackend();
}

function syncAllLayoutsToBackend() {
  try {
    const allLayouts: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('table_grid_layout_')) {
        const areaId = key.replace('table_grid_layout_', '');
        allLayouts[areaId] = JSON.parse(localStorage.getItem(key) || '{}');
      }
    }
    fetch('http://localhost:8082/api/v1/tables/grid-layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allLayouts),
    }).catch(() => {}); // Best-effort, don't block UI
  } catch (e) {
    // ignore
  }
}

// --- Status Style Helpers ---

interface StatusStyle {
  background: string;
  color: string;
  label: string;
}

function getStatusStyle(status: string): StatusStyle {
  switch (status) {
    case 'available':
      return { background: '#C8E6C9', color: '#2E7D32', label: 'Disponible' };
    case 'occupied':
      return { background: '#FFE0B2', color: '#E65100', label: 'Ocupada' };
    case 'reserved':
      return { background: '#BBDEFB', color: '#1565C0', label: 'Reservada' };
    case 'cleaning':
      return { background: '#CFD8DC', color: '#546E7A', label: 'Limpiando' };
    case 'blocked':
      return { background: '#FFCDD2', color: '#C62828', label: 'Bloqueada' };
    default:
      return { background: '#E0E0E0', color: '#616161', label: status };
  }
}

function getStatusChipColor(status: string): 'success' | 'warning' | 'info' | 'default' | 'error' {
  switch (status) {
    case 'available': return 'success';
    case 'occupied': return 'warning';
    case 'reserved': return 'info';
    case 'cleaning': return 'default';
    case 'blocked': return 'error';
    default: return 'default';
  }
}

function getTableStatusIcon(status: string) {
  switch (status) {
    case 'available': return <CheckIcon />;
    case 'occupied': return <RestaurantIcon />;
    case 'reserved': return <WaitingIcon />;
    case 'cleaning': return <CleaningIcon />;
    case 'blocked': return <BlockedIcon />;
    default: return null;
  }
}

// --- Components ---

const SIDEBAR_WIDTH = 300;

const Tables: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Responsive column count for the grid
  const responsiveColumns = isMobile ? 3 : isTablet ? 4 : 6;

  // State
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(() => {
    const saved = localStorage.getItem('tables_selectedArea');
    return saved ? Number(saved) : null;
  });
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Grid layout state
  const [gridLayout, setGridLayout] = useState<TableGridLayout>({
    rows: DEFAULT_ROWS,
    columns: DEFAULT_COLUMNS,
    positions: {},
  });

  // Edit layout mode (drag tables into grid)
  const [editLayoutMode, setEditLayoutMode] = useState(false);
  const [draggedTableId, setDraggedTableId] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Dialogs
  const [tableDialog, setTableDialog] = useState(false);
  const [areaDialog, setAreaDialog] = useState(false);
  const [areaManageDialog, setAreaManageDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<TableArea | null>(null);
  const [tableDetailDialog, setTableDetailDialog] = useState(false);
  const [detailTable, setDetailTable] = useState<Table | null>(null);
  const [gridSettingsDialog, setGridSettingsDialog] = useState(false);

  // Grid settings temp state
  const [tempRows, setTempRows] = useState(DEFAULT_ROWS);
  const [tempColumns, setTempColumns] = useState(DEFAULT_COLUMNS);

  // Forms
  const [tableForm, setTableForm] = useState<Partial<Table>>({
    number: '',
    area_id: undefined,
    capacity: 4,
    status: 'available',
    position_x: 0,
    position_y: 0,
    shape: 'square',
  });

  const [areaForm, setAreaForm] = useState<Partial<TableArea>>({
    name: '',
    description: '',
    color: '#1976d2',
    is_active: true,
  });

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTables();
    loadAreas();
  }, []);

  // Load grid layout when area changes
  useEffect(() => {
    if (selectedArea) {
      const layout = loadGridLayout(selectedArea);
      setGridLayout(layout);
    }
  }, [selectedArea]);

  // Silent refresh without toast errors (for auto-refresh)
  const loadTablesSilent = useCallback(async () => {
    try {
      const data = await wailsOrderService.getTables();
      setTables(data);
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    }
  }, []);

  const loadTables = async () => {
    try {
      const data = await wailsOrderService.getTables();
      setTables(data);
    } catch (error) {
      toast.error('Error al cargar mesas');
    }
  };

  const loadAreas = async () => {
    try {
      const data = await wailsOrderService.getTableAreas();
      setAreas(data);
      if (data.length > 0) {
        const savedAreaExists = selectedArea && data.some(a => a.id === selectedArea);
        if (!savedAreaExists) {
          const firstAreaId = data[0].id || null;
          setSelectedArea(firstAreaId);
          if (firstAreaId) {
            localStorage.setItem('tables_selectedArea', String(firstAreaId));
          }
        }
      }
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  // Auto-refresh tables every 5 seconds
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      loadTablesSilent();
    }, 5000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [loadTablesSilent]);

  // --- Table dialog handlers ---
  const handleOpenTableDialog = (table?: Table) => {
    if (table) {
      setSelectedTable(table);
      setTableForm({
        ...table,
        area_id: table.area_id,
      });
    } else {
      setSelectedTable(null);
      setTableForm({
        number: '',
        area_id: selectedArea || (areas.length > 0 ? areas[0].id : undefined),
        capacity: 4,
        status: 'available',
        position_x: 0,
        position_y: 0,
        shape: 'square',
      });
    }
    setTableDialog(true);
  };

  const handleCloseTableDialog = () => {
    setTableDialog(false);
    setSelectedTable(null);
  };

  const handleSaveTable = async () => {
    if (!tableForm.number) {
      toast.error('El numero de mesa es requerido');
      return;
    }
    if (!tableForm.area_id) {
      toast.error('Debe seleccionar un area');
      return;
    }

    try {
      const cleanTableData = {
        number: tableForm.number,
        name: tableForm.name || '',
        capacity: tableForm.capacity || 4,
        area_id: tableForm.area_id,
        status: tableForm.status || 'available',
        position_x: tableForm.position_x || 0,
        position_y: tableForm.position_y || 0,
        shape: tableForm.shape || 'square',
        is_active: tableForm.is_active !== false,
      };

      if (selectedTable && selectedTable.id) {
        const tableData = {
          ...cleanTableData,
          id: selectedTable.id,
        };
        await wailsOrderService.updateTable(selectedTable.id, tableData);
        toast.success('Mesa actualizada');
      } else {
        await wailsOrderService.createTable(cleanTableData);
        toast.success('Mesa creada');
      }
      handleCloseTableDialog();
      loadTables();
    } catch (error: any) {
      const errorMsg = error.message || 'Error al guardar mesa';
      if (errorMsg.includes('duplicate key') || errorMsg.includes('unique constraint')) {
        toast.error('Ya existe una mesa con ese numero');
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (window.confirm('Esta seguro de eliminar esta mesa?')) {
      try {
        await wailsOrderService.deleteTable(id);
        toast.success('Mesa eliminada');
        // Remove from grid layout if present
        if (selectedArea) {
          const newPositions = { ...gridLayout.positions };
          for (const key of Object.keys(newPositions)) {
            if (newPositions[key] === id) {
              delete newPositions[key];
            }
          }
          const newLayout = { ...gridLayout, positions: newPositions };
          setGridLayout(newLayout);
          saveGridLayout(selectedArea, newLayout);
        }
        const data = await wailsOrderService.getTables();
        setTables(data);
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar mesa');
      }
    }
  };

  // --- Area dialog handlers ---
  const handleOpenAreaDialog = (area?: TableArea) => {
    if (area) {
      setEditingArea(area);
      setAreaForm(area);
    } else {
      setEditingArea(null);
      setAreaForm({
        name: '',
        description: '',
        color: '#1976d2',
        is_active: true,
      });
    }
    setAreaDialog(true);
  };

  const handleCloseAreaDialog = () => {
    setAreaDialog(false);
    setEditingArea(null);
  };

  const handleSaveArea = async () => {
    if (!areaForm.name) {
      toast.error('El nombre del area es requerido');
      return;
    }

    try {
      if (editingArea && editingArea.id) {
        await wailsOrderService.updateTableArea({ ...areaForm, id: editingArea.id });
        toast.success('Area actualizada');
      } else {
        await wailsOrderService.createTableArea(areaForm);
        toast.success('Area creada');
      }
      handleCloseAreaDialog();
      loadAreas();
    } catch (error) {
      toast.error('Error al guardar area');
    }
  };

  const handleDeleteArea = async (id: number) => {
    const tablesInArea = tables.filter(t => t.area_id === id);
    if (tablesInArea.length > 0) {
      toast.error(`No se puede eliminar el area porque tiene ${tablesInArea.length} mesa(s) asignadas`);
      return;
    }
    if (window.confirm('Esta seguro de eliminar esta area?')) {
      try {
        await wailsOrderService.deleteTableArea(id);
        toast.success('Area eliminada');
        // Clear grid layout for deleted area
        localStorage.removeItem(getGridLayoutKey(id));
        if (selectedArea === id) {
          const newAreaId = areas.find(a => a.id !== id)?.id || null;
          setSelectedArea(newAreaId);
          if (newAreaId) {
            localStorage.setItem('tables_selectedArea', String(newAreaId));
          } else {
            localStorage.removeItem('tables_selectedArea');
          }
        }
        loadAreas();
      } catch (error) {
        toast.error('Error al eliminar area');
      }
    }
  };

  // --- Table click handler ---
  const handleTableClick = async (table: Table) => {
    if (editLayoutMode) return;

    if (editMode) {
      handleOpenTableDialog(table);
      return;
    }

    if (table.status === 'occupied') {
      const order = await wailsOrderService.getOrderByTable(table.id!);
      if (order) {
        navigate(`/pos?orderId=${order.id}`);
      }
    } else if (table.status === 'available') {
      navigate(`/pos?tableId=${table.id}`);
    } else {
      // Show detail dialog for non-available/non-occupied tables
      setDetailTable(table);
      setTableDetailDialog(true);
    }
  };

  const handleToggleTableStatus = async (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = table.status === 'available' ? 'reserved' :
                     table.status === 'reserved' ? 'blocked' :
                     table.status === 'blocked' ? 'cleaning' :
                     'available';

    try {
      await wailsOrderService.updateTableStatus(table.id!, newStatus);
      toast.success('Estado actualizado');
      loadTables();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  // --- Grid layout drag handlers ---
  const handleDragStart = (tableId: number) => {
    if (!editLayoutMode) return;
    setDraggedTableId(tableId);
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    if (!editLayoutMode || draggedTableId === null) return;
    e.preventDefault();
    setDragOverCell(cellKey);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (!editLayoutMode || draggedTableId === null || !selectedArea) return;

    const cellKey = `${row}_${col}`;

    // Remove the table from its old position
    const newPositions = { ...gridLayout.positions };
    for (const key of Object.keys(newPositions)) {
      if (newPositions[key] === draggedTableId) {
        delete newPositions[key];
      }
    }

    // If a different table already occupies this cell, swap or remove it
    const existingTableId = newPositions[cellKey];
    if (existingTableId && existingTableId !== draggedTableId) {
      // Remove the existing table from this cell (it becomes unassigned)
      delete newPositions[cellKey];
    }

    // Place the dragged table in the new cell
    newPositions[cellKey] = draggedTableId;

    const newLayout = { ...gridLayout, positions: newPositions };
    setGridLayout(newLayout);
    saveGridLayout(selectedArea, newLayout);
    setDraggedTableId(null);
    setDragOverCell(null);
  };

  const handleRemoveFromGrid = (tableId: number) => {
    if (!selectedArea) return;
    const newPositions = { ...gridLayout.positions };
    for (const key of Object.keys(newPositions)) {
      if (newPositions[key] === tableId) {
        delete newPositions[key];
      }
    }
    const newLayout = { ...gridLayout, positions: newPositions };
    setGridLayout(newLayout);
    saveGridLayout(selectedArea, newLayout);
  };

  // --- Filter tables by area ---
  const filteredTables = tables.filter(table =>
    selectedArea === null || table.area_id === selectedArea
  );

  // Tables assigned to grid positions
  const assignedTableIds = useMemo(() => {
    return new Set(Object.values(gridLayout.positions));
  }, [gridLayout.positions]);

  // Unassigned tables (in this area but not placed in the grid)
  const unassignedTables = useMemo(() => {
    return filteredTables.filter(t => t.id && !assignedTableIds.has(t.id));
  }, [filteredTables, assignedTableIds]);

  // Table map for quick lookup
  const tableMap = useMemo(() => {
    const map: { [id: number]: Table } = {};
    for (const t of tables) {
      if (t.id) map[t.id] = t;
    }
    return map;
  }, [tables]);

  // Stats
  const tableStats = {
    total: filteredTables.length,
    available: filteredTables.filter(t => t.status === 'available').length,
    occupied: filteredTables.filter(t => t.status === 'occupied').length,
    reserved: filteredTables.filter(t => t.status === 'reserved').length,
    cleaning: filteredTables.filter(t => t.status === 'cleaning').length,
    blocked: filteredTables.filter(t => t.status === 'blocked').length,
  };

  // Determine columns to use: in edit layout mode use the layout columns, otherwise responsive
  const displayColumns = editLayoutMode ? gridLayout.columns : Math.min(responsiveColumns, gridLayout.columns);
  const displayRows = gridLayout.rows;

  // --- Grid Settings ---
  const handleOpenGridSettings = () => {
    setTempRows(gridLayout.rows);
    setTempColumns(gridLayout.columns);
    setGridSettingsDialog(true);
  };

  const handleSaveGridSettings = () => {
    if (!selectedArea) return;
    // If we shrink the grid, remove positions that are out of bounds
    const newPositions: { [key: string]: number } = {};
    for (const [key, tableId] of Object.entries(gridLayout.positions)) {
      const [r, c] = key.split('_').map(Number);
      if (r < tempRows && c < tempColumns) {
        newPositions[key] = tableId;
      }
    }
    const newLayout: TableGridLayout = {
      rows: tempRows,
      columns: tempColumns,
      positions: newPositions,
    };
    setGridLayout(newLayout);
    saveGridLayout(selectedArea, newLayout);
    setGridSettingsDialog(false);
  };

  // --- Render a table card ---
  const renderTableCard = (table: Table, inGrid: boolean = true) => {
    const style = getStatusStyle(table.status);
    const orderTotal = table.current_order?.total;
    const isDragging = draggedTableId === table.id;

    const cardContent = (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 1,
          position: 'relative',
        }}
      >
        {/* Table number */}
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ color: style.color, lineHeight: 1.1 }}
        >
          {table.number}
        </Typography>

        {/* Table name */}
        {table.name && (
          <Typography
            variant="caption"
            sx={{ color: style.color, opacity: 0.8, mt: 0.25 }}
          >
            {table.name}
          </Typography>
        )}

        {/* Capacity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <PeopleIcon sx={{ fontSize: 14, color: style.color }} />
          <Typography variant="caption" sx={{ color: style.color, fontWeight: 500 }}>
            {table.capacity}
          </Typography>
        </Box>

        {/* Status chip */}
        <Chip
          label={style.label}
          size="small"
          sx={{
            mt: 0.5,
            height: 20,
            fontSize: 10,
            fontWeight: 'bold',
            backgroundColor: style.color,
            color: 'white',
            '& .MuiChip-label': { px: 1 },
          }}
        />

        {/* Order total badge for occupied tables */}
        {table.status === 'occupied' && orderTotal != null && (
          <Chip
            label={`$${orderTotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            size="small"
            sx={{
              mt: 0.5,
              height: 20,
              fontSize: 11,
              fontWeight: 'bold',
              backgroundColor: '#4caf50',
              color: 'white',
              '& .MuiChip-label': { px: 1 },
            }}
          />
        )}

        {/* Edit mode: edit/delete icons */}
        {editMode && !editLayoutMode && (
          <Box sx={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 0.25 }}>
            <IconButton
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                width: 22,
                height: 22,
                '&:hover': { backgroundColor: 'white' },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTableDialog(table);
              }}
            >
              <EditIcon sx={{ fontSize: 13 }} />
            </IconButton>
            <IconButton
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                width: 22,
                height: 22,
                '&:hover': { backgroundColor: '#ffebee' },
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (table.id) handleDeleteTable(table.id);
              }}
            >
              <DeleteIcon sx={{ fontSize: 13, color: 'error.main' }} />
            </IconButton>
          </Box>
        )}

        {/* Edit layout mode: remove from grid */}
        {editLayoutMode && inGrid && (
          <Box sx={{ position: 'absolute', top: 2, right: 2 }}>
            <IconButton
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                width: 20,
                height: 20,
                '&:hover': { backgroundColor: '#ffebee' },
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (table.id) handleRemoveFromGrid(table.id);
              }}
            >
              <CloseIcon sx={{ fontSize: 12, color: 'error.main' }} />
            </IconButton>
          </Box>
        )}

        {/* Non-edit mode: status toggle icon */}
        {!editMode && !editLayoutMode && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              backgroundColor: style.color,
              borderRadius: '50%',
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 },
            }}
            onClick={(e) => handleToggleTableStatus(table, e)}
          >
            {React.cloneElement(getTableStatusIcon(table.status) as React.ReactElement, {
              sx: { fontSize: 13, color: 'white' },
            })}
          </Box>
        )}
      </Box>
    );

    return (
      <Card
        draggable={editLayoutMode}
        onDragStart={() => table.id && handleDragStart(table.id)}
        sx={{
          aspectRatio: '1 / 1',
          backgroundColor: style.background,
          border: `2px solid ${style.color}40`,
          borderRadius: 2,
          cursor: editLayoutMode ? 'grab' : (table.status === 'blocked' ? 'not-allowed' : 'pointer'),
          opacity: isDragging ? 0.5 : 1,
          transition: 'box-shadow 0.2s, opacity 0.2s',
          '&:hover': {
            boxShadow: editLayoutMode ? 4 : 3,
            border: `2px solid ${style.color}`,
          },
          overflow: 'hidden',
        }}
        onClick={() => !editLayoutMode && handleTableClick(table)}
        elevation={2}
      >
        {cardContent}
      </Card>
    );
  };

  // --- Render empty/placeholder cell ---
  const renderEmptyCell = (row: number, col: number) => {
    const cellKey = `${row}_${col}`;
    const isOver = dragOverCell === cellKey;

    return (
      <Box
        onDragOver={(e) => handleDragOver(e, cellKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, row, col)}
        sx={{
          aspectRatio: '1 / 1',
          border: editLayoutMode
            ? (isOver ? '2px dashed #1976d2' : '2px dashed #bdbdbd')
            : '2px dashed transparent',
          borderRadius: 2,
          backgroundColor: editLayoutMode
            ? (isOver ? '#e3f2fd' : '#fafafa')
            : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {editLayoutMode && (
          <Typography variant="caption" color="text.disabled">
            {row + 1},{col + 1}
          </Typography>
        )}
      </Box>
    );
  };

  // --- Render the grid ---
  const renderGrid = () => {
    const rows: React.ReactNode[] = [];

    for (let r = 0; r < displayRows; r++) {
      const cells: React.ReactNode[] = [];
      for (let c = 0; c < gridLayout.columns; c++) {
        const cellKey = `${r}_${c}`;
        const tableId = gridLayout.positions[cellKey];
        const table = tableId ? tableMap[tableId] : null;

        // In non-edit-layout mode, only show up to displayColumns
        if (!editLayoutMode && c >= displayColumns) continue;

        cells.push(
          <Box
            key={cellKey}
            onDragOver={(e) => handleDragOver(e, cellKey)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, r, c)}
            sx={{
              flex: editLayoutMode
                ? `0 0 calc(${100 / gridLayout.columns}% - 8px)`
                : `0 0 calc(${100 / displayColumns}% - 8px)`,
              maxWidth: editLayoutMode
                ? `calc(${100 / gridLayout.columns}% - 8px)`
                : `calc(${100 / displayColumns}% - 8px)`,
              mx: '4px',
              mb: '8px',
              maxHeight: 140,
            }}
          >
            {table ? renderTableCard(table, true) : renderEmptyCell(r, c)}
          </Box>
        );
      }

      rows.push(
        <Box key={`row-${r}`} sx={{ display: 'flex', flexWrap: 'nowrap' }}>
          {cells}
        </Box>
      );
    }

    return rows;
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Main Grid Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Grid content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Grid */}
          {filteredTables.length === 0 && !editMode ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 300,
              }}
            >
              <Typography color="text.secondary">
                No hay mesas en esta area
              </Typography>
            </Box>
          ) : (
            <>
              {/* Edit layout mode banner */}
              {editLayoutMode && (
                <Alert
                  severity="info"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => setEditLayoutMode(false)}
                    >
                      Listo
                    </Button>
                  }
                >
                  Arrastra las mesas a las celdas de la cuadricula para organizar el layout. Las mesas no asignadas aparecen abajo.
                </Alert>
              )}

              {/* The grid */}
              <Box sx={{ mb: 2 }}>
                {renderGrid()}
              </Box>

              {/* Unassigned tables */}
              {unassignedTables.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {editLayoutMode ? (
                      <>
                        <DragIcon fontSize="small" />
                        Mesas sin asignar (arrastra al grid)
                      </>
                    ) : (
                      'Otras Mesas'
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {unassignedTables.map(table => (
                      <Box
                        key={table.id}
                        sx={{
                          flex: `0 0 calc(${100 / displayColumns}% - 8px)`,
                          maxWidth: `calc(${100 / displayColumns}% - 8px)`,
                        }}
                      >
                        {renderTableCard(table, false)}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Empty state for edit mode */}
              {editMode && filteredTables.length === 0 && (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenTableDialog()}
                  >
                    Agregar Mesa
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Right Sidebar */}
      <Paper
        sx={{
          width: SIDEBAR_WIDTH,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          borderLeft: '1px solid #e0e0e0',
          overflow: 'auto',
          flexShrink: 0,
        }}
        elevation={0}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" gutterBottom>Gestion de Mesas</Typography>

          {/* Edit Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={editMode}
                onChange={() => {
                  setEditMode(!editMode);
                  if (editLayoutMode) setEditLayoutMode(false);
                }}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {editMode ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                <span>{editMode ? 'Modo Edicion' : 'Modo Vista'}</span>
              </Box>
            }
          />
        </Box>

        {/* Area Selector */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Area</Typography>
            <IconButton size="small" onClick={() => setAreaManageDialog(true)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>

          {areas.length === 0 ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Button size="small" onClick={() => handleOpenAreaDialog()}>Crear area</Button>
            </Alert>
          ) : (
            <FormControl fullWidth size="small">
              <Select
                value={selectedArea || ''}
                onChange={(e) => {
                  const newValue = e.target.value ? Number(e.target.value) : null;
                  setSelectedArea(newValue);
                  if (newValue) {
                    localStorage.setItem('tables_selectedArea', String(newValue));
                  } else {
                    localStorage.removeItem('tables_selectedArea');
                  }
                }}
                displayEmpty
              >
                {areas.map(area => (
                  <MenuItem key={area.id} value={area.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: area.color }} />
                      {area.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Stats */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" gutterBottom>Resumen</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Total:</Typography>
              <Chip label={tableStats.total} size="small" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#2E7D32' }}>Disponibles:</Typography>
              <Chip label={tableStats.available} size="small" color="success" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#E65100' }}>Ocupadas:</Typography>
              <Chip label={tableStats.occupied} size="small" color="warning" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#1565C0' }}>Reservadas:</Typography>
              <Chip label={tableStats.reserved} size="small" color="info" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#546E7A' }}>Limpiando:</Typography>
              <Chip label={tableStats.cleaning} size="small" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#C62828' }}>Bloqueadas:</Typography>
              <Chip label={tableStats.blocked} size="small" color="error" variant="outlined" />
            </Box>
          </Box>
        </Box>

        {/* Grid Layout Options */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" gutterBottom>Layout de Cuadricula</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {gridLayout.rows} filas x {gridLayout.columns} columnas
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<GridIcon />}
              onClick={handleOpenGridSettings}
            >
              Configurar
            </Button>
            {editMode && (
              <Button
                size="small"
                variant={editLayoutMode ? 'contained' : 'outlined'}
                color={editLayoutMode ? 'secondary' : 'primary'}
                startIcon={<DragIcon />}
                onClick={() => setEditLayoutMode(!editLayoutMode)}
              >
                {editLayoutMode ? 'Listo' : 'Editar Layout'}
              </Button>
            )}
          </Box>
        </Box>

        {/* Actions */}
        {editMode && (
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" gutterBottom>Acciones</Typography>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenTableDialog()}
              sx={{ mb: 1 }}
            >
              Nueva Mesa
            </Button>
            {editLayoutMode && (
              <Typography variant="caption" color="text.secondary">
                Arrastra las mesas a las celdas de la cuadricula
              </Typography>
            )}
          </Box>
        )}

        {/* Legend */}
        <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" gutterBottom>Leyenda</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {['available', 'occupied', 'reserved', 'cleaning', 'blocked'].map(status => {
              const s = getStatusStyle(status);
              return (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '4px',
                      backgroundColor: s.background,
                      border: `2px solid ${s.color}`,
                    }}
                  />
                  <Typography variant="caption">{s.label}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* Table Create/Edit Dialog */}
      <Dialog open={tableDialog} onClose={handleCloseTableDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTable ? 'Editar Mesa' : 'Nueva Mesa'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Numero de Mesa"
                value={tableForm.number}
                onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
              />
              <TextField
                fullWidth
                label="Nombre (opcional)"
                value={tableForm.name || ''}
                onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Capacidad"
                type="number"
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
              />
              <FormControl fullWidth required>
                <InputLabel>Area</InputLabel>
                <Select
                  value={tableForm.area_id || ''}
                  onChange={(e) => setTableForm({ ...tableForm, area_id: e.target.value ? Number(e.target.value) : undefined })}
                  label="Area"
                >
                  {areas.map(area => (
                    <MenuItem key={area.id} value={area.id}>
                      {area.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={tableForm.status}
                onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as any })}
                label="Estado"
              >
                <MenuItem value="available">Disponible</MenuItem>
                <MenuItem value="reserved">Reservada</MenuItem>
                <MenuItem value="cleaning">Limpiando</MenuItem>
                <MenuItem value="blocked">Bloqueada</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Forma de la Mesa</Typography>
              <ToggleButtonGroup
                value={tableForm.shape}
                exclusive
                onChange={(_, value) => value && setTableForm({ ...tableForm, shape: value })}
              >
                <ToggleButton value="square">
                  <Tooltip title="Cuadrada">
                    <SquareIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="round">
                  <Tooltip title="Redonda">
                    <CircleIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="rectangle">
                  <Tooltip title="Rectangular">
                    <RectangleIcon />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTableDialog}>Cancelar</Button>
          <Button onClick={handleSaveTable} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Area Dialog */}
      <Dialog open={areaDialog} onClose={handleCloseAreaDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingArea ? 'Editar Area' : 'Nueva Area'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Nombre del Area"
              value={areaForm.name}
              onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Descripcion"
              value={areaForm.description}
              onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>Color</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1', '#7b1fa2'].map(color => (
                  <Box
                    key={color}
                    onClick={() => setAreaForm({ ...areaForm, color })}
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: color,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: areaForm.color === color ? '3px solid #000' : '1px solid #ccc',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAreaDialog}>Cancelar</Button>
          <Button onClick={handleSaveArea} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Area Management Dialog */}
      <Dialog open={areaManageDialog} onClose={() => setAreaManageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gestionar Areas</DialogTitle>
        <DialogContent>
          {areas.length === 0 ? (
            <Alert severity="info">No hay areas configuradas</Alert>
          ) : (
            <List>
              {areas.map(area => (
                <ListItem
                  key={area.id}
                  sx={{
                    borderLeft: `4px solid ${area.color}`,
                    mb: 1,
                    backgroundColor: '#f9f9f9',
                    borderRadius: 1,
                  }}
                >
                  <ListItemText
                    primary={area.name}
                    secondary={`${tables.filter(t => t.area_id === area.id).length} mesa(s) - ${area.description || 'Sin descripcion'}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleOpenAreaDialog(area)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => area.id && handleDeleteArea(area.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAreaManageDialog(false)}>Cerrar</Button>
          <Button
            onClick={() => {
              setAreaManageDialog(false);
              handleOpenAreaDialog();
            }}
            variant="contained"
            startIcon={<AddIcon />}
          >
            Nueva Area
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table Detail Dialog */}
      <Dialog open={tableDetailDialog} onClose={() => setTableDetailDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Mesa {detailTable?.number}
        </DialogTitle>
        <DialogContent>
          {detailTable && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {detailTable.name && (
                <Typography variant="body2"><strong>Nombre:</strong> {detailTable.name}</Typography>
              )}
              <Typography variant="body2">
                <strong>Capacidad:</strong> {detailTable.capacity} personas
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <strong>Estado:</strong>
                <Chip
                  label={getStatusStyle(detailTable.status).label}
                  size="small"
                  color={getStatusChipColor(detailTable.status)}
                />
              </Box>
              {detailTable.area && (
                <Typography variant="body2"><strong>Area:</strong> {detailTable.area.name}</Typography>
              )}
              {detailTable.current_order && (
                <Typography variant="body2">
                  <strong>Orden:</strong> ${detailTable.current_order.total?.toLocaleString('es-CO') || '0'}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {detailTable && detailTable.status !== 'available' && detailTable.status !== 'occupied' && (
            <Button
              onClick={async () => {
                try {
                  await wailsOrderService.updateTableStatus(detailTable.id!, 'available');
                  toast.success('Mesa liberada');
                  setTableDetailDialog(false);
                  loadTables();
                } catch (error) {
                  toast.error('Error al actualizar estado');
                }
              }}
              color="success"
            >
              Marcar Disponible
            </Button>
          )}
          <Button onClick={() => setTableDetailDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Grid Settings Dialog */}
      <Dialog open={gridSettingsDialog} onClose={() => setGridSettingsDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Configurar Cuadricula</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Filas: {tempRows}
              </Typography>
              <Slider
                value={tempRows}
                onChange={(_, v) => setTempRows(v as number)}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Columnas: {tempColumns}
              </Typography>
              <Slider
                value={tempColumns}
                onChange={(_, v) => setTempColumns(v as number)}
                min={1}
                max={12}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Si reduces el tamano de la cuadricula, las mesas en celdas fuera de rango se desasignaran.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGridSettingsDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveGridSettings} variant="contained" startIcon={<SaveIcon />}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tables;
