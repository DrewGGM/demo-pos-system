import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Box,
  Typography,
  InputAdornment,
  Alert,
} from '@mui/material';
import { DiscountReason } from '../../types/models';
import { wailsDiscountService } from '../../services/wailsDiscountService';

interface DiscountDialogProps {
  open: boolean;
  subtotal: number;
  // Initial state when re-opening the dialog so the cashier sees what's applied.
  initialAmount: number;
  initialType: 'amount' | 'percentage';
  initialReasonId?: number;
  initialReasonText?: string;
  onClose: () => void;
  onApply: (payload: {
    amount: number;
    type: 'amount' | 'percentage';
    reasonId?: number;
    reasonText?: string;
  }) => void;
  onClear: () => void;
}

// DiscountDialog lets the cashier apply (or clear) a discount on the current
// order. The dialog itself does NOT mutate the cart; it returns the payload
// via onApply so the POS page can drive state and re-compute totals.
//
// The reasons dropdown is sourced from the discount_reasons table (seeded
// with DIAN catalog 9). When the selected reason has allow_custom_text=true
// the cashier sees an extra "Motivo (opcional)" field that overrides the
// label on the receipt and on allowance_charge_reason of the e-invoice.
const DiscountDialog: React.FC<DiscountDialogProps> = ({
  open,
  subtotal,
  initialAmount,
  initialType,
  initialReasonId,
  initialReasonText,
  onClose,
  onApply,
  onClear,
}) => {
  const [type, setType] = useState<'amount' | 'percentage'>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [reasons, setReasons] = useState<DiscountReason[]>([]);
  const [reasonId, setReasonId] = useState<number | undefined>(initialReasonId);
  const [reasonText, setReasonText] = useState<string>(initialReasonText || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load reasons once when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    wailsDiscountService
      .listActiveReasons()
      .then((rows) => {
        setReasons(rows);
        // Pre-select: incoming reasonId > default flag > first row.
        if (initialReasonId && rows.some((r) => r.id === initialReasonId)) {
          setReasonId(initialReasonId);
        } else {
          const def = rows.find((r) => r.is_default);
          setReasonId(def?.id ?? rows[0]?.id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, initialReasonId]);

  // Reset local state when re-opened with different initial values.
  useEffect(() => {
    if (!open) return;
    setType(initialType);
    setAmountStr(initialAmount > 0 ? String(initialAmount) : '');
    setReasonText(initialReasonText || '');
    setError(null);
  }, [open, initialType, initialAmount, initialReasonText]);

  const selectedReason = useMemo(
    () => reasons.find((r) => r.id === reasonId),
    [reasons, reasonId],
  );

  // Live preview of the absolute amount the discount would apply.
  const previewAmount = useMemo(() => {
    const raw = Number(amountStr || 0);
    if (Number.isNaN(raw) || raw <= 0) return 0;
    if (type === 'percentage') {
      const capped = Math.min(100, Math.max(0, raw));
      return Math.round(subtotal * (capped / 100));
    }
    return Math.min(raw, subtotal);
  }, [amountStr, type, subtotal]);

  const handleApply = () => {
    const raw = Number(amountStr || 0);
    if (Number.isNaN(raw) || raw <= 0) {
      setError('Ingresa un valor mayor a 0');
      return;
    }
    if (type === 'percentage' && raw > 100) {
      setError('El porcentaje no puede ser mayor a 100');
      return;
    }
    if (type === 'amount' && raw > subtotal) {
      setError('El descuento no puede ser mayor al subtotal');
      return;
    }
    if (!reasonId) {
      setError('Selecciona un motivo');
      return;
    }
    onApply({
      amount: raw,
      type,
      reasonId,
      reasonText: reasonText.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Aplicar Descuento</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Subtotal de la orden: <b>${subtotal.toLocaleString('es-CO')}</b>
        </Typography>

        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={(_, v) => v && setType(v)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="amount">Monto $</ToggleButton>
          <ToggleButton value="percentage">Porcentaje %</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          fullWidth
          autoFocus
          type="number"
          label={type === 'percentage' ? 'Porcentaje' : 'Monto'}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          InputProps={{
            startAdornment:
              type === 'amount' ? (
                <InputAdornment position="start">$</InputAdornment>
              ) : undefined,
            endAdornment:
              type === 'percentage' ? (
                <InputAdornment position="end">%</InputAdornment>
              ) : undefined,
          }}
          inputProps={{ min: 0, step: type === 'percentage' ? 1 : 100 }}
          sx={{ mb: 2 }}
        />

        {previewAmount > 0 && (
          <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Se descontará:
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              -${previewAmount.toLocaleString('es-CO')}
            </Typography>
          </Box>
        )}

        <TextField
          select
          fullWidth
          label="Motivo"
          value={reasonId ?? ''}
          onChange={(e) => setReasonId(Number(e.target.value))}
          disabled={loading || reasons.length === 0}
          sx={{ mb: 2 }}
        >
          {reasons.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}
            </MenuItem>
          ))}
        </TextField>

        {selectedReason?.allow_custom_text && (
          <TextField
            fullWidth
            label="Motivo personalizado (opcional)"
            placeholder="Ej: Cliente frecuente, promo Halloween…"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            helperText="Si se llena, este texto aparece en el recibo y en la factura electrónica"
            sx={{ mb: 1 }}
          />
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {initialAmount > 0 && (
          <Button color="error" onClick={onClear}>
            Quitar descuento
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleApply}>
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscountDialog;
