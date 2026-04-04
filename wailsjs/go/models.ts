// Shim: Wails model references resolve to passthrough in demo mode
const createFrom = (data: any) => data;

export const models = {
  RestaurantConfig: { createFrom },
  OrderType: { createFrom },
  BoldConfig: { createFrom },
  BoldPaymentRequest: { createFrom },
  BoldPendingPayment: { createFrom },
  BoldPaymentResponse: { createFrom },
  Product: { createFrom },
  Category: { createFrom },
  ModifierGroup: { createFrom },
  Modifier: { createFrom },
  Order: { createFrom },
  Sale: { createFrom },
  Customer: { createFrom },
  Employee: { createFrom },
  PaymentMethod: { createFrom },
} as any;
