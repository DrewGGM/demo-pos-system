import React, { useEffect, useState } from 'react';
import {
  Box,
  Fab,
  Drawer,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  alpha,
} from '@mui/material';
import {
  WorkspacePremium as PremiumIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import {
  DEMO_PLANS,
  DemoPlan,
  DemoPlanId,
  getCurrentDemoPlanId,
  setCurrentDemoPlan,
  DEMO_PLAN_CHANGED_EVENT,
} from '../services/demoPlans';

const formatCOP = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

// Lyroo brand palette: primary purple #5B2DC4, accent green #00D4AA.
// Each plan gets an accent that mirrors the website's hover treatment.
const LYROO_PRIMARY = '#5B2DC4';
const LYROO_ACCENT = '#00D4AA';

const planAccent: Record<DemoPlanId, string> = {
  esencial: '#90a4ae',
  comercio: '#3f51b5',
  restaurante: LYROO_PRIMARY,
  business: '#c2185b',
};

const DemoPlanSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DemoPlanId>(getCurrentDemoPlanId());

  useEffect(() => {
    const onPlanChange = () => setSelected(getCurrentDemoPlanId());
    window.addEventListener(DEMO_PLAN_CHANGED_EVENT, onPlanChange as EventListener);
    return () => window.removeEventListener(DEMO_PLAN_CHANGED_EVENT, onPlanChange as EventListener);
  }, []);

  const activate = (plan: DemoPlan) => {
    if (plan.id === selected) return;
    setCurrentDemoPlan(plan.id);
    setSelected(plan.id);
    // Hard reload so MainLayout/Settings re-fetch the license-gated module list
    setTimeout(() => window.location.reload(), 250);
  };

  const current = DEMO_PLANS.find(p => p.id === selected) || DEMO_PLANS[0];

  return (
    <>
      <Tooltip title={`Demo: Plan ${current.name} — toca para cambiar`} placement="left">
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            background: `linear-gradient(135deg, ${LYROO_PRIMARY} 0%, ${planAccent[selected]} 100%)`,
            boxShadow: `0 8px 24px ${alpha(LYROO_PRIMARY, 0.5)}`,
            '&:hover': {
              background: `linear-gradient(135deg, #4a1f9e 0%, ${planAccent[selected]} 100%)`,
            },
          }}
        >
          <PremiumIcon />
        </Fab>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 420 }, p: 0 },
        }}
      >
        <Box sx={{ p: 3, background: `linear-gradient(135deg, ${LYROO_PRIMARY} 0%, #4a1f9e 100%)`, color: '#fff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.5 }}>
                Modo Demo
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                Cambia entre planes
              </Typography>
            </Box>
            <IconButton onClick={() => setOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.85 }}>
            Cada plan habilita módulos distintos del sistema. Selecciona uno para ver cómo se
            comporta el POS en esa suscripción.
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {DEMO_PLANS.map(plan => {
              const isCurrent = plan.id === selected;
              const accent = planAccent[plan.id];
              return (
                <Box
                  key={plan.id}
                  sx={{
                    position: 'relative',
                    p: 2,
                    border: `2px solid ${isCurrent ? accent : alpha(accent, 0.2)}`,
                    borderRadius: 2,
                    bgcolor: isCurrent ? alpha(accent, 0.08) : 'background.paper',
                    transition: 'all 0.2s',
                  }}
                >
                  {plan.badge && (
                    <Chip
                      icon={<StarIcon sx={{ fontSize: 14 }} />}
                      label={plan.badge}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: 12,
                        bgcolor: accent,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        height: 20,
                      }}
                    />
                  )}

                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="h6" sx={{ color: accent, fontWeight: 700 }}>
                        {plan.name}
                      </Typography>
                      {plan.hasDian && (
                        <Chip
                          label="DIAN"
                          size="small"
                          sx={{
                            bgcolor: alpha(LYROO_ACCENT, 0.15),
                            color: LYROO_ACCENT,
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        />
                      )}
                    </Stack>
                    {isCurrent && (
                      <Chip
                        icon={<CheckIcon sx={{ fontSize: 14 }} />}
                        label="Activo"
                        size="small"
                        sx={{ bgcolor: accent, color: '#fff', height: 22, fontWeight: 600 }}
                      />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {plan.tagline}
                  </Typography>

                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
                    {formatCOP(plan.monthlyPrice)}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      / mes
                    </Typography>
                  </Typography>

                  <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                    {plan.highlights.map((h, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <CheckIcon sx={{ fontSize: 16, color: accent }} />
                        <Typography variant="body2" color="text.secondary">{h}</Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {plan.features.length} módulos habilitados
                  </Typography>

                  <Button
                    fullWidth
                    variant={isCurrent ? 'outlined' : 'contained'}
                    disabled={isCurrent}
                    onClick={() => activate(plan)}
                    sx={{
                      bgcolor: isCurrent ? 'transparent' : accent,
                      color: isCurrent ? accent : '#fff',
                      borderColor: accent,
                      '&:hover': {
                        bgcolor: isCurrent ? 'transparent' : alpha(accent, 0.85),
                      },
                    }}
                  >
                    {isCurrent ? 'Plan actual' : 'Probar este plan'}
                  </Button>
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ mt: 3, p: 2, bgcolor: alpha('#000', 0.04), borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              <strong>Nota:</strong> Esta selección solo afecta esta sesión de demo. La página se
              recargará al cambiar de plan para reflejar los módulos habilitados en el menú y en
              configuración.
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, color: LYROO_PRIMARY, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => window.open('https://lyroo.com.co/#precios', '_blank')}
            >
              ¿Necesitas un plan a la medida? Ver pack Custom →
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default DemoPlanSwitcher;
