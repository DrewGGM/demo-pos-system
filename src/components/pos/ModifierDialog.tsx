import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  FormLabel,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { Product, Modifier, ModifierGroup } from '../../types/models';

export interface ModifierSelection {
  modifier: Modifier;
  quantity: number;
}

interface ModifierDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  onConfirm: (selections: ModifierSelection[]) => void;
  initialSelections?: ModifierSelection[];
}

// Quantities per group: groupId -> (modifierId -> quantity)
type GroupQuantities = Record<number, Record<number, number>>;

const ModifierDialog: React.FC<ModifierDialogProps> = ({
  open,
  onClose,
  product,
  onConfirm,
  initialSelections = [],
}) => {
  const getInitialQuantities = (): GroupQuantities => {
    const initial: GroupQuantities = {};
    initialSelections.forEach(sel => {
      const groupId = sel.modifier.group_id;
      if (!initial[groupId]) initial[groupId] = {};
      initial[groupId][sel.modifier.id!] = sel.quantity;
    });
    return initial;
  };

  const [quantities, setQuantities] = useState<GroupQuantities>(getInitialQuantities());
  const [error, setError] = useState('');

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setQuantities(getInitialQuantities());
      setError('');
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Group modifiers by their group
  const modifierGroups = product.modifiers?.reduce((groups, modifier) => {
    const groupId = modifier.group_id;
    if (!groups[groupId]) {
      groups[groupId] = { group: modifier.group!, modifiers: [] };
    }
    groups[groupId].modifiers.push(modifier);
    return groups;
  }, {} as Record<number, { group: ModifierGroup; modifiers: Modifier[] }>);

  const getQty = (groupId: number, modifierId: number): number =>
    quantities[groupId]?.[modifierId] || 0;

  const getGroupTotal = (groupId: number): number =>
    Object.values(quantities[groupId] || {}).reduce((s, q) => s + q, 0);

  const handleRadioChange = (groupId: number, modifierId: number) => {
    setQuantities({
      ...quantities,
      [groupId]: modifierId ? { [modifierId]: 1 } : {},
    });
    setError('');
  };

  const handleIncrement = (groupId: number, modifierId: number) => {
    const group = modifierGroups?.[groupId]?.group;
    const currentTotal = getGroupTotal(groupId);
    if (group && currentTotal >= group.max_select) {
      setError(`Máximo ${group.max_select} opciones para ${group.name}`);
      return;
    }
    setQuantities({
      ...quantities,
      [groupId]: {
        ...(quantities[groupId] || {}),
        [modifierId]: getQty(groupId, modifierId) + 1,
      },
    });
    setError('');
  };

  const handleDecrement = (groupId: number, modifierId: number) => {
    const current = getQty(groupId, modifierId);
    if (current <= 0) return;
    const groupMap = { ...(quantities[groupId] || {}) };
    if (current === 1) {
      delete groupMap[modifierId];
    } else {
      groupMap[modifierId] = current - 1;
    }
    setQuantities({ ...quantities, [groupId]: groupMap });
    setError('');
  };

  const validateSelection = (): boolean => {
    if (!modifierGroups) return true;
    for (const [groupId, data] of Object.entries(modifierGroups)) {
      const group = data.group;
      const total = getGroupTotal(parseInt(groupId));
      if (group.required && total < group.min_select) {
        setError(`Seleccione al menos ${group.min_select} opción(es) para ${group.name}`);
        return false;
      }
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validateSelection()) return;

    const selections: ModifierSelection[] = [];
    Object.entries(quantities).forEach(([_, groupMap]) => {
      Object.entries(groupMap).forEach(([modifierIdStr, qty]) => {
        const modifierId = parseInt(modifierIdStr);
        const modifier = product.modifiers?.find(m => m.id === modifierId);
        if (modifier && qty > 0) {
          selections.push({ modifier, quantity: qty });
        }
      });
    });

    onConfirm(selections);
  };

  const calculateTotalPrice = (): number => {
    let total = product.price;
    Object.values(quantities).forEach(groupMap => {
      Object.entries(groupMap).forEach(([modifierIdStr, qty]) => {
        const modifier = product.modifiers?.find(m => m.id === parseInt(modifierIdStr));
        if (modifier) {
          total += modifier.price_change * qty;
        }
      });
    });
    return total;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">{product.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          Personaliza tu orden
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {modifierGroups && Object.entries(modifierGroups).map(([groupIdStr, data]) => {
          const groupId = parseInt(groupIdStr);
          const group = data.group;
          const modifiers = data.modifiers;
          const selectedRadio = group.multiple
            ? 0
            : (Object.keys(quantities[groupId] || {}).map(Number)[0] || 0);

          return (
            <Box key={groupId} sx={{ mb: 3 }}>
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{group.name}</Typography>
                    {group.required && (
                      <Chip label="Requerido" color="error" size="small" />
                    )}
                    {group.min_select > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        (Mín: {group.min_select}, Máx: {group.max_select})
                      </Typography>
                    )}
                    {group.multiple && (
                      <Typography variant="caption" color="primary" sx={{ ml: 'auto' }}>
                        Total: {getGroupTotal(groupId)}
                      </Typography>
                    )}
                  </Box>
                </FormLabel>

                {group.multiple ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    {modifiers.map(modifier => {
                      const qty = getQty(groupId, modifier.id!);
                      const groupTotal = getGroupTotal(groupId);
                      const canIncrement = groupTotal < group.max_select;
                      return (
                        <Box
                          key={modifier.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            pl: 1.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: qty > 0 ? 'primary.main' : 'divider',
                            bgcolor: qty > 0 ? 'action.selected' : 'transparent',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Typography noWrap>{modifier.name}</Typography>
                            {modifier.price_change !== 0 && (
                              <Chip
                                label={`${modifier.price_change > 0 ? '+' : ''}$${Math.abs(modifier.price_change).toLocaleString('es-CO')}`}
                                color={modifier.price_change > 0 ? 'warning' : 'success'}
                                size="small"
                                sx={{ pointerEvents: 'none' }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleDecrement(groupId, modifier.id!)}
                              disabled={qty === 0}
                              color="primary"
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography
                              sx={{
                                minWidth: 28,
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {qty}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleIncrement(groupId, modifier.id!)}
                              disabled={!canIncrement}
                              color="primary"
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <RadioGroup
                    value={selectedRadio || ''}
                    onChange={(e) => handleRadioChange(groupId, parseInt(e.target.value))}
                  >
                    {modifiers.map(modifier => (
                      <FormControlLabel
                        key={modifier.id}
                        value={modifier.id}
                        sx={{
                          width: '100%',
                          mr: 0,
                          '& .MuiFormControlLabel-label': { flex: 1 }
                        }}
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 1 }}>
                            <Typography>{modifier.name}</Typography>
                            {modifier.price_change !== 0 && (
                              <Chip
                                label={`${modifier.price_change > 0 ? '+' : ''}$${Math.abs(modifier.price_change).toLocaleString('es-CO')}`}
                                color={modifier.price_change > 0 ? 'warning' : 'success'}
                                size="small"
                                sx={{ pointerEvents: 'none' }}
                              />
                            )}
                          </Box>
                        }
                      />
                    ))}
                    {!group.required && (
                      <FormControlLabel
                        value=""
                        control={<Radio />}
                        label="Ninguno"
                      />
                    )}
                  </RadioGroup>
                )}
              </FormControl>
            </Box>
          );
        })}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h5" color="primary">
            ${calculateTotalPrice().toLocaleString('es-CO')}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
        >
          Agregar al Pedido
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModifierDialog;
