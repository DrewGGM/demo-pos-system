import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  ButtonGroup,
  Button,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Note as NoteIcon,
} from '@mui/icons-material';
import { OrderItem } from '../../types/models';

interface OrderListProps {
  items: OrderItem[];
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemoveItem: (itemId: number) => void;
  onEditItem?: (item: OrderItem) => void;
  onEditNotes?: (item: OrderItem) => void;
  editable?: boolean;
}

const OrderList: React.FC<OrderListProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onEditItem,
  onEditNotes,
  editable = true,
}) => {
  const handleQuantityChange = (item: OrderItem, delta: number) => {
    // Generate temporary ID for items without ID
    const itemId = item.id ?? Date.now();
    const newQuantity = item.quantity + delta;
    if (newQuantity > 0) {
      onUpdateQuantity(itemId, newQuantity);
    }
  };

  return (
    <List sx={{ width: '100%' }}>
      {items.map((item, index) => (
        <React.Fragment key={item.id || index}>
          <ListItem
            sx={{
              flexDirection: 'column',
              alignItems: 'stretch',
              py: 1,
              px: 0,
            }}
          >
            {/* Row 1: Product name + subtotal */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1, mb: 0.5 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, flex: 1, lineHeight: 1.3, wordBreak: 'break-word' }}
              >
                {item.product?.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                ${(item.subtotal || 0).toLocaleString('es-CO')}
              </Typography>
            </Box>

            {/* Row 2: Quantity controls + unit price + actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
              {editable && (
                <ButtonGroup size="small" sx={{ '& .MuiButton-root': { minWidth: 28, px: 0.5 } }}>
                  <Button
                    onClick={() => handleQuantityChange(item, -1)}
                    disabled={item.quantity <= 1}
                  >
                    <RemoveIcon sx={{ fontSize: 16 }} />
                  </Button>
                  <Button disabled sx={{ minWidth: '32px !important', fontSize: '0.8rem' }}>
                    {item.quantity}
                  </Button>
                  <Button onClick={() => handleQuantityChange(item, 1)}>
                    <AddIcon sx={{ fontSize: 16 }} />
                  </Button>
                </ButtonGroup>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: 1, ml: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                ${(item.unit_price || 0).toLocaleString('es-CO')} c/u
              </Typography>

              {editable && (
                <Box sx={{ display: 'flex', flexShrink: 0 }}>
                  {onEditNotes && (
                    <IconButton
                      size="small"
                      onClick={() => onEditNotes(item)}
                      sx={{ p: 0.5 }}
                      color={item.notes ? 'primary' : 'default'}
                      title="Agregar nota"
                    >
                      <NoteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                  {onEditItem && item.product?.modifiers && item.product.modifiers.length > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => onEditItem(item)}
                      sx={{ p: 0.5 }}
                      color={item.modifiers && item.modifiers.length > 0 ? 'primary' : 'default'}
                      title="Editar modificadores"
                    >
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      const itemId = item.id ?? Date.now();
                      onRemoveItem(itemId);
                    }}
                    sx={{ p: 0.5 }}
                    title="Eliminar"
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Modifiers */}
            {item.modifiers && item.modifiers.length > 0 && (
              <Box sx={{ pl: 2, mb: 0.5 }}>
                {item.modifiers.map((mod, idx) => {
                  const modQty = mod.quantity && mod.quantity > 0 ? mod.quantity : 1;
                  const totalChange = mod.price_change * modQty;
                  const qtyLabel = modQty > 1 ? ` x${modQty}` : '';
                  const priceLabel = totalChange > 0
                    ? ` +$${totalChange.toLocaleString('es-CO')}`
                    : (totalChange < 0 ? ` -$${Math.abs(totalChange).toLocaleString('es-CO')}` : '');
                  return (
                    <Chip
                      key={idx}
                      label={`${mod.modifier?.name}${qtyLabel}${priceLabel}`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  );
                })}
              </Box>
            )}

            {/* Notes */}
            {item.notes && (
              <Box sx={{ pl: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <NoteIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {item.notes}
                </Typography>
              </Box>
            )}

            {/* Kitchen status */}
            {item.status && item.status !== 'pending' && (
              <Box sx={{ pl: 2, mt: 0.5 }}>
                <Chip
                  label={getStatusLabel(item.status)}
                  size="small"
                  color={getStatusColor(item.status)}
                />
              </Box>
            )}
          </ListItem>
          
          {index < items.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  );
};

// Helper functions
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'preparing':
      return 'Preparando';
    case 'ready':
      return 'Listo';
    case 'delivered':
      return 'Entregado';
    default:
      return status;
  }
};

const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'info' => {
  switch (status) {
    case 'preparing':
      return 'warning';
    case 'ready':
      return 'success';
    case 'delivered':
      return 'info';
    default:
      return 'default';
  }
};

export default OrderList;