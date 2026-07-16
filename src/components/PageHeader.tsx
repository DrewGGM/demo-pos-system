import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  /** Main page title. */
  title: string;
  /** Optional one-line description shown under the title. */
  subtitle?: string;
  /** Leading icon, rendered inside a brand-tinted rounded square. */
  icon?: React.ReactNode;
  /** Right-aligned slot for action buttons/filters. */
  actions?: React.ReactNode;
  /** Bottom margin (theme spacing units). Defaults to 3. */
  mb?: number;
}

/**
 * Consistent page header used across all module screens: a brand-tinted icon
 * tile, a tight title with an optional muted subtitle, and a right-aligned
 * action slot. Centralizing this keeps every screen visually in sync — style
 * tweaks happen here, not in 20 pages.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, actions, mb = 3 }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 2,
      mb,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      {icon && (
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            bgcolor: (t) => `${t.palette.primary.main}18`,
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" sx={{ lineHeight: 1.1 }}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    {actions && (
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {actions}
      </Box>
    )}
  </Box>
);

export default PageHeader;
