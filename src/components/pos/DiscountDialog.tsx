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
  Chip,
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
  // Max % from pos.discount.max_percent. 0 means no cap. Used to validate
  // before submitting; backend re-validates so this is a UX nicety.
  maxPercent?: number;
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
  maxPercent = 0,
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
    // Permission cap. Backend re-validates with the same rule.
    if (maxPercent > 0) {
      const effectivePct =
        type === 'percentage' ? raw : (subtotal > 0 ? (raw / subtotal) * 100 : 0);
      if (effectivePct > maxPercent) {
        setError(
          `Tu rol solo puede aplicar hasta ${maxPercent}% (${effectivePct.toFixed(1)}% solicitado)`,
        );
        return;
      }
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
      <DialogTitle sx={{ pb: 1 }}>Aplicar Descuento</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Subtotal de la orden:&nbsp;
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              ${subtotal.toLocaleString('es-CO')}
            </Box>
          </Typography>
          {maxPercent > 0 && (
            <Chip
              label={`Máx ${maxPercent}%`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>

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
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApply();
          }}
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
          sx={{ mb: 1 }}
        />

        {/* Quick % shortcuts. Visible only when in percentage mode; the
            cashier's cap (maxPercent) hides options above the limit. */}
        {type === 'percentage' && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
            {[5, 10, 15, 20, 30, 50].map((pct) => {
              if (maxPercent > 0 && pct > maxPercent) return null;
              return (
                <Chip
                  key={pct}
                  label={`${pct}%`}
                  size="small"
                  onClick={() => setAmountStr(String(pct))}
                  variant={amountStr === String(pct) ? 'filled' : 'outlined'}
                  color={amountStr === String(pct) ? 'primary' : 'default'}
                  clickable
                />
              );
            })}
          </Box>
        )}

        {previewAmount > 0 && (
          <Box
            sx={{
              mb: 2,
              p: 1.25,
              bgcolor: 'success.light',
              color: 'success.contrastText',
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">Subtotal</Typography>
              <Typography variant="caption">
                ${subtotal.toLocaleString('es-CO')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">
                Descuento{type === 'percentage' ? ` (${Math.min(100, Number(amountStr || 0))}%)` : ''}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                -${previewAmount.toLocaleString('es-CO')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderTop: '1px solid rgba(255,255,255,0.4)',
                pt: 0.5,
                mt: 0.25,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Total
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                ${(subtotal - previewAmount).toLocaleString('es-CO')}
              </Typography>
            </Box>
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
