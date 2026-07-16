import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import {
  DeleteOutline as DeleteIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';

// Branded confirmation dialog to replace native window.confirm() everywhere.
// window.confirm blocks the WebView event loop and looks unstyled; this gives a
// consistent, theme-aware, keyboard-accessible dialog with a destructive variant.

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 'danger' → red confirm button + delete icon; 'default' → primary. */
  variant?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ message: '' });
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    setOpen(false);
    resolver.current?.(result);
    resolver.current = null;
  };

  const isDanger = opts.variant === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={open}
        onClose={() => close(false)}
        maxWidth="xs"
        fullWidth
        // Sit above any standard MUI dialog so confirmations triggered from
        // inside another dialog (split-payment cancel, pre-close delete) render
        // on top instead of behind.
        sx={{ zIndex: (t) => t.zIndex.modal + 10 }}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: isDanger ? 'error.main' : 'primary.main',
              bgcolor: (t) => `${isDanger ? t.palette.error.main : t.palette.primary.main}18`,
            }}
          >
            {isDanger ? <DeleteIcon /> : <HelpIcon />}
          </Box>
          {opts.title || (isDanger ? 'Confirmar eliminación' : 'Confirmar')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ color: 'text.secondary' }}>
            {opts.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => close(false)} color="inherit">
            {opts.cancelText || 'Cancelar'}
          </Button>
          <Button
            onClick={() => close(true)}
            variant="contained"
            color={isDanger ? 'error' : 'primary'}
            startIcon={isDanger ? <DeleteIcon /> : undefined}
            autoFocus
          >
            {opts.confirmText || (isDanger ? 'Eliminar' : 'Confirmar')}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
};
