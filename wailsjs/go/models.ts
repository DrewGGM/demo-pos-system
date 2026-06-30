// Shim: Wails model references resolve to passthrough in demo mode.
// BoldSettings (y otras pantallas) llaman `models.X.createFrom(obj)` o
// `new models.X()` para construir entidades — en producción el binding Wails
// expone clases reales; aquí basta con devolver el objeto tal cual.
const createFrom = (data: any) => ({ ...(data || {}) });

export const models = {
  RestaurantConfig: { createFrom },
  OrderType: { createFrom },
  BoldConfig: { createFrom },
  BoldPaymentRequest: { createFrom },
  BoldPendingPayment: { createFrom },
  BoldPaymentResponse: { createFrom },
  BoldTerminal: { createFrom },
  Product: { createFrom },
  Category: { createFrom },
  ModifierGroup: { createFrom },
  Modifier: { createFrom },
  Order: { createFrom },
  Sale: { createFrom },
  Customer: { createFrom },
  Employee: { createFrom },
  PaymentMethod: { createFrom },
  GoogleSheetsConfig: { createFrom },
  RappiConfig: { createFrom },
  RappiOrder: { createFrom },
  RappiStore: { createFrom },
} as any;
