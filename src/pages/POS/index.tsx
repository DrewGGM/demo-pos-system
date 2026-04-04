import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Divider,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  TableChart as TableIcon,
  Restaurant as RestaurantIcon,
  LocalOffer as DiscountIcon,
  Payment as PaymentIcon,
  Clear as ClearIcon,
  Fastfood as FastfoodIcon,
  Save as SaveIcon,
  DeliveryDining as DeliveryIcon,
  SplitscreenOutlined as SplitIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import { useAuth, useWebSocket, useDIANMode } from '../../hooks';
import { wailsProductService } from '../../services/wailsProductService';
import { wailsCustomPageService } from '../../services/wailsCustomPageService';
import { wailsOrderService, CreateOrderData } from '../../services/wailsOrderService';
import { wailsSalesService } from '../../services/wailsSalesService';
import { wailsConfigService } from '../../services/wailsConfigService';
import { GetRestaurantConfig } from '../../../wailsjs/go/services/ConfigService';
import { GetActiveOrderTypes } from '../../../wailsjs/go/services/OrderTypeService';
import { Category, Product, Order, OrderItem, Table, Customer, PaymentMethod } from '../../types/models';
import { models } from '../../../wailsjs/go/models';

import PaymentDialog from '../../components/pos/PaymentDialog';
import CustomerDialog from '../../components/pos/CustomerDialog';
import ModifierDialog from '../../components/pos/ModifierDialog';
import PriceInputDialog from '../../components/pos/PriceInputDialog';
import TableSelector from '../../components/pos/TableSelector';
import OrderList from '../../components/pos/OrderList';
import DeliveryInfoDialog, { DeliveryInfo } from '../../components/pos/DeliveryInfoDialog';
import SplitBillDialog, { BillSplit, UnallocatedItem } from '../../components/pos/SplitBillDialog';
import { wailsInvoiceLimitService, InvoiceLimitStatus } from '../../services/wailsInvoiceLimitService';
import { wailsComboService } from '../../services/wailsComboService';
import { Combo } from '../../types/models';

const POS: React.FC = () => {
  const { user, cashRegisterId } = useAuth();
  const { sendMessage, subscribe } = useWebSocket();
  const { isDIANMode, isElectronicInvoicingEnabled } = useDIANMode();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    const saved = localStorage.getItem('pos_selected_category');
    return saved ? Number(saved) : null;
  });
  const [customPages, setCustomPages] = useState<any[]>([]);
  const [selectedCustomPage, setSelectedCustomPage] = useState<number | null>(() => {
    const saved = localStorage.getItem('pos_selected_custom_page');
    return saved ? Number(saved) : null;
  });
  const [combos, setCombos] = useState<Combo[]>([]);
  const [showCombosTab, setShowCombosTab] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orderTypes, setOrderTypes] = useState<models.OrderType[]>([]);
  const [selectedOrderType, setSelectedOrderType] = useState<models.OrderType | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [defaultConsumerEmail, setDefaultConsumerEmail] = useState('');

  const loadedOrderIdRef = useRef<number | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [modifierDialogOpen, setModifierDialogOpen] = useState(false);
  const [priceInputDialogOpen, setPriceInputDialogOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [orderTypeDialogOpen, setOrderTypeDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [splitBillDialogOpen, setSplitBillDialogOpen] = useState(false);
  const [billSplits, setBillSplits] = useState<BillSplit[]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState(0);
  const [originalOrderIdForSplit, setOriginalOrderIdForSplit] = useState<number | null>(null);
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<Product | null>(null);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<Product | null>(null);
  const [selectedItemForModifierEdit, setSelectedItemForModifierEdit] = useState<OrderItem | null>(null);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<OrderItem | null>(null);
  const [itemNotes, setItemNotes] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({ customerName: '', address: '', phone: '' });

  const [needsElectronicInvoice, setNeedsElectronicInvoice] = useState(false);
  const effectiveNeedsElectronicInvoice = isDIANMode || needsElectronicInvoice;
  const [invoiceLimitStatus, setInvoiceLimitStatus] = useState<InvoiceLimitStatus | null>(null);
  const [companyLiabilityId, setCompanyLiabilityId] = useState<number | null>(null);

  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargePercent, setServiceChargePercent] = useState(10);
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);

  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // Synchronous guard: React state updates are async and can't prevent rapid double-clicks
  const isProcessingPaymentRef = useRef(false);

  // Wait for Wails bindings to be ready before loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategories();
      loadPaymentMethods();
      loadOrderTypes();
      loadCompanyConfig();
      loadCustomPages();
      loadPrinterSettings();
      loadInvoiceLimitStatus();
      loadCombos();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadInvoiceLimitStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInvoiceLimitStatus = async () => {
    try {
      const status = await wailsInvoiceLimitService.getStatus();
      setInvoiceLimitStatus(status);

      if (!status || !status.enabled) return;

      // `available` already factors in alternating turn, daily limits, and time intervals
      setNeedsElectronicInvoice(status.available);
    } catch (error) {
      // Ignore errors - service might not be ready
    }
  };

  useEffect(() => {
    if (selectedCategory !== null) {
      localStorage.setItem('pos_selected_category', String(selectedCategory));
      localStorage.removeItem('pos_selected_custom_page');
    } else {
      localStorage.removeItem('pos_selected_category');
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCustomPage !== null) {
      localStorage.setItem('pos_selected_custom_page', String(selectedCustomPage));
      localStorage.removeItem('pos_selected_category');
    } else {
      localStorage.removeItem('pos_selected_custom_page');
    }
  }, [selectedCustomPage]);

  useEffect(() => {
    if (selectedCustomPage !== null && customPages.length > 0) {
      const pageExists = customPages.some(p => p.id === selectedCustomPage);
      if (!pageExists) {
        setSelectedCustomPage(null);
        localStorage.removeItem('pos_selected_custom_page');
      }
    }
  }, [customPages, selectedCustomPage]);

  useEffect(() => {
    const loadPageProducts = async () => {
      if (selectedCustomPage) {
        if (customPages.length > 0) {
          const pageExists = customPages.some(p => p.id === selectedCustomPage);
          if (pageExists) {
            try {
              const pageProducts = await wailsCustomPageService.getPageWithProducts(selectedCustomPage);
              setProducts(pageProducts as any);
            } catch (error) {
              toast.error('Error al cargar productos de la página');
            }
          }
        }
      } else {
        loadProducts();
      }
    };
    loadPageProducts();
  }, [selectedCustomPage, customPages]);

  useEffect(() => {
    const unsubscribeOrderReady = subscribe('order_ready', (data) => {
      toast.success(`Orden ${data.order_number} está lista!`, {
        position: 'top-center',
        autoClose: false,
      });
    });

    return () => {
      unsubscribeOrderReady();
    };
  }, [subscribe]);

  useEffect(() => {
    const state = location.state as { continueOrder?: Order; editOrder?: Order };
    const order = state?.continueOrder || state?.editOrder;

    if (order) {
      // Prevent double-load in React Strict Mode
      if (loadedOrderIdRef.current === order.id) {
        return;
      }

      const isEditing = !!state?.editOrder;

      loadedOrderIdRef.current = order.id ?? null;

      // Set currentOrder FIRST to prevent auto-switch useEffect from changing order type
      setCurrentOrder(order);

      if (order.order_type_id && order.order_type) {
        setSelectedOrderType(order.order_type as unknown as models.OrderType);
      }

      setOrderItems(order.items || []);
      setSelectedTable(order.table || null);
      setSelectedCustomer(order.customer || null);

      if (order.delivery_customer_name || order.delivery_address || order.delivery_phone) {
        setDeliveryInfo({
          customerName: order.delivery_customer_name || '',
          address: order.delivery_address || '',
          phone: order.delivery_phone || ''
        });
      }

      toast.info(`Orden ${order.order_number} ${isEditing ? 'lista para editar' : 'cargada'}`);

      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Set default order type for brand new orders
  useEffect(() => {
    if (orderTypes.length > 0 && !selectedOrderType && !currentOrder && orderItems.length === 0) {
      const takeoutType = orderTypes.find(ot => ot.code === 'takeout');
      setSelectedOrderType(takeoutType || orderTypes[0]);
    }
  }, [orderTypes, selectedOrderType, currentOrder, orderItems]);

  // Auto-switch order type when table is selected/deselected (new orders only)
  useEffect(() => {
    if (currentOrder && currentOrder.id) {
      return;
    }

    if (orderItems.length > 0) {
      return;
    }

    if (selectedTable && selectedOrderType?.code !== 'dine-in') {
      const dineInType = orderTypes.find(ot => ot.code === 'dine-in');
      if (dineInType) {
        setSelectedOrderType(dineInType);
      }
    } else if (!selectedTable && selectedOrderType?.code === 'dine-in') {
      if (orderTypes.length > 0) {
        setSelectedOrderType(orderTypes[0]);
      }
    } else {
    }
  }, [selectedTable, orderTypes, currentOrder, orderItems]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const tableId = searchParams.get('tableId');

    const loadFromParams = async () => {
      try {
        if (orderId) {
          const order = await wailsOrderService.getOrder(Number(orderId));
          if (order) {
            setCurrentOrder(order);

            if (order.order_type_id && order.order_type) {
              setSelectedOrderType(order.order_type as unknown as models.OrderType);
            }

            setOrderItems(order.items || []);
            setSelectedTable(order.table || null);
            setSelectedCustomer(order.customer || null);

            if (order.delivery_customer_name || order.delivery_address || order.delivery_phone) {
              setDeliveryInfo({
                customerName: order.delivery_customer_name || '',
                address: order.delivery_address || '',
                phone: order.delivery_phone || ''
              });
            }

            toast.info(`Orden ${order.order_number} cargada`);
          }
        } else if (tableId) {
          const tables = await wailsOrderService.getTables();
          const table = tables.find(t => t.id === Number(tableId));

          if (table) {
            const existingOrder = await wailsOrderService.getOrderByTable(Number(tableId));

            if (existingOrder) {
              setCurrentOrder(existingOrder);

              if (existingOrder.order_type_id && existingOrder.order_type) {
                setSelectedOrderType(existingOrder.order_type as unknown as models.OrderType);
              }

              setSelectedTable(table);
              setOrderItems(existingOrder.items || []);
              setSelectedCustomer(existingOrder.customer || null);

              if (existingOrder.delivery_customer_name || existingOrder.delivery_address || existingOrder.delivery_phone) {
                setDeliveryInfo({
                  customerName: existingOrder.delivery_customer_name || '',
                  address: existingOrder.delivery_address || '',
                  phone: existingOrder.delivery_phone || ''
                });
              }

              toast.info(`Orden de mesa ${table.number} cargada`);
            } else {
              setSelectedTable(table);
              toast.info(`Nueva orden para mesa ${table.number}`);
            }
          }
        }
      } catch (error) {
        toast.error('Error al cargar datos');
      }
    };

    if (orderId || tableId) {
      loadFromParams();
    }
  }, [searchParams]);

  const loadCategories = async () => {
    try {
      const data = await wailsProductService.getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    }
  };

  const loadProducts = async () => {
    try {
      const data = await wailsProductService.getProducts();
      setProducts(data);
    } catch (error) {
      toast.error('Error al cargar productos');
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const data = await wailsSalesService.getPaymentMethods();
      setPaymentMethods(data);
    } catch (error) {
      toast.error('Error al cargar métodos de pago');
    }
  };

  const loadOrderTypes = async () => {
    try {
      const data = await GetActiveOrderTypes();
      setOrderTypes(data);
    } catch (error) {
      toast.error('Error al cargar tipos de pedido');
    }
  };

  const loadCompanyConfig = async () => {
    try {
      const config = await GetRestaurantConfig();
      if (config) {
        setCompanyLiabilityId(config.type_liability_id || null);
        setDefaultConsumerEmail(config.default_consumer_email || config.email || '');
        setServiceChargeEnabled((config as any).service_charge_enabled || false);
        setServiceChargePercent((config as any).service_charge_percent || 10);
      }
    } catch (error) {
    }
  };

  const loadCustomPages = async () => {
    try {
      const data = await wailsCustomPageService.getAllPages();
      setCustomPages(data);
      // Reset selected custom page if it no longer exists
      if (selectedCustomPage !== null && !data.find((p: any) => p.id === selectedCustomPage)) {
        setSelectedCustomPage(null);
        setSelectedCategory(null);
      }
    } catch (error) {
      setSelectedCustomPage(null);
    }
  };

  const loadCombos = async () => {
    try {
      const data = await wailsComboService.getAllCombos();
      setCombos(data);
    } catch (error) {
    }
  };

  const loadPrinterSettings = async () => {
    try {
      const autoPrintValue = await wailsConfigService.getSystemConfig('printer_auto_print');
      if (autoPrintValue) {
        setAutoPrintReceipt(autoPrintValue === 'true');
      }
    } catch (error) {
    }
  };

  const areItemsIdentical = (item1: OrderItem, item2: OrderItem): boolean => {
    if (item1.product_id !== item2.product_id) return false;
    if ((item1.notes || '') !== (item2.notes || '')) return false;

    const mods1 = item1.modifiers || [];
    const mods2 = item2.modifiers || [];
    if (mods1.length !== mods2.length) return false;

    const modIds1 = mods1.map(m => m.modifier_id).sort();
    const modIds2 = mods2.map(m => m.modifier_id).sort();

    return modIds1.every((id, index) => id === modIds2[index]);
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCustomPage) {
      // Products already filtered by the custom page useEffect
      filtered = products;
    } else if (selectedCategory) {
      filtered = products.filter(product => product.category_id === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [products, selectedCategory, selectedCustomPage, searchQuery]);

  const removeItem = useCallback((itemId: number) => {
    setOrderItems(items => items.filter(item => {
      const currentItemId = item.id ?? Date.now();
      return currentItemId !== itemId;
    }));
  }, []);

  const updateItemQuantity = useCallback((itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setOrderItems(items =>
      items.map(item => {
        const currentItemId = item.id ?? Date.now();
        if (currentItemId === itemId) {
          const basePrice = item.unit_price || 0;
          const modifiersPrice = item.modifiers?.reduce((sum, mod) => sum + mod.price_change, 0) || 0;
          const newSubtotal = (basePrice + modifiersPrice) * newQuantity;

          return { ...item, quantity: newQuantity, subtotal: newSubtotal };
        }
        return item;
      })
    );
  }, []);

  const addProductToOrder = useCallback((product: Product) => {
    if (!cashRegisterId) {
      toast.error('Debe abrir la caja antes de realizar ventas');
      return;
    }

    if (product.track_inventory !== false && product.stock <= 0) {
      toast.warning('Producto sin stock - Se agregará con stock negativo', {
        position: 'bottom-center',
        autoClose: 2000,
      });
    }

    if (product.has_variable_price === true) {
      setSelectedProductForPrice(product);
      setPriceInputDialogOpen(true);
      return;
    }

    if (product.modifiers && product.modifiers.length > 0) {
      setSelectedProductForModifier(product);
      setModifierDialogOpen(true);
      return;
    }

    const newItem: OrderItem = {
      id: Date.now(),
      product_id: product.id!,
      product: product,
      quantity: 1,
      unit_price: product.price,
      subtotal: product.price,
      notes: '',
      modifiers: [],
    };

    const existingItem = orderItems.find(item => areItemsIdentical(item, newItem));

    if (existingItem) {
      updateItemQuantity(existingItem.id!, existingItem.quantity + 1);
    } else {
      setOrderItems([...orderItems, newItem]);
    }

    toast.success(`${product.name} añadido`, {
      position: 'bottom-center',
      autoClose: 1000,
    });
  }, [cashRegisterId, orderItems]);

  const addComboToOrder = useCallback((combo: Combo) => {
    if (!cashRegisterId) {
      toast.error('Debe abrir la caja antes de realizar ventas');
      return;
    }

    const comboAsProduct: Product = {
      id: combo.id,
      name: combo.name,
      description: combo.description || `Combo: ${combo.items?.map(i => i.product?.name).filter(Boolean).join(', ')}`,
      price: combo.price,
      image: combo.image || '',
      category_id: combo.category_id,
      stock: 999,
      is_active: combo.is_active,
      track_inventory: false,
      is_combo: true,
    };

    const newItem: OrderItem = {
      id: Date.now(),
      product_id: combo.id!,
      product: comboAsProduct,
      quantity: 1,
      unit_price: combo.price,
      subtotal: combo.price,
      notes: '',
      modifiers: [],
      is_combo: true,
    };

    const existingItem = orderItems.find(item =>
      item.product_id === combo.id && item.is_combo === true
    );

    if (existingItem) {
      updateItemQuantity(existingItem.id!, existingItem.quantity + 1);
    } else {
      setOrderItems([...orderItems, newItem]);
    }

    toast.success(`Combo "${combo.name}" añadido`, {
      position: 'bottom-center',
      autoClose: 1000,
    });
  }, [cashRegisterId, orderItems, updateItemQuantity]);

  const orderTotals = useMemo(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    // ID 117 = "No responsable" (R-99-PN) - does NOT charge IVA
    const isIVAResponsible = companyLiabilityId !== null && companyLiabilityId !== 117;
    const tax = 0; // Backend calculates the correct tax

    const serviceCharge = (serviceChargeEnabled && includeServiceCharge)
      ? Math.round(subtotal * (serviceChargePercent / 100))
      : 0;

    const total = subtotal + serviceCharge;

    return {
      subtotal,
      tax,
      serviceCharge,
      total,
      itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      isIVAResponsible,
    };
  }, [orderItems, companyLiabilityId, serviceChargeEnabled, includeServiceCharge, serviceChargePercent]);

  const clearOrder = useCallback(async (skipDelete = false) => {
    try {
      if (currentOrder && currentOrder.id && !skipDelete && currentOrder.status !== 'paid') {
        await wailsOrderService.deleteOrder(currentOrder.id);

        if (selectedTable && selectedTable.id) {
          await wailsOrderService.updateTableStatus(selectedTable.id, 'available');
        }

        toast.success('Pedido eliminado y mesa liberada');
      } else if (!skipDelete && currentOrder?.status === 'paid') {
      } else if (!skipDelete) {
        toast.info('Orden cancelada');
      }
    } catch (error: any) {
      toast.error('Error al eliminar pedido: ' + (error.message || 'Error desconocido'));
    }

    setOrderItems([]);
    setCurrentOrder(null);
    setSelectedTable(null);
    setSelectedCustomer(null);
    setNeedsElectronicInvoice(false);
    setIncludeServiceCharge(false);
    setDeliveryInfo({ customerName: '', address: '', phone: '' });
    loadedOrderIdRef.current = null;
  }, [currentOrder, selectedTable]);

  const saveOrder = useCallback(async (): Promise<Order | null> => {
    if (orderItems.length === 0) {
      toast.error('Agrega productos a la orden');
      return null;
    }

    if (selectedOrderType?.code === 'dine-in' && !selectedTable) {
      toast.error('Debes seleccionar una mesa para pedidos "Para Comer Aquí"');
      return null;
    }


    setIsSavingOrder(true);
    try {
      const orderData: CreateOrderData = {
        type: selectedOrderType?.code as 'dine_in' | 'takeout' | 'delivery' || 'takeout',
        order_type_id: selectedOrderType?.id as unknown as number,
        table_id: selectedTable?.id,
        customer_id: selectedCustomer?.id,
        employee_id: user?.id,
        items: orderItems,
        notes: '',
        source: 'pos',
        service_charge: orderTotals.serviceCharge,
        ...((deliveryInfo.customerName || deliveryInfo.address || deliveryInfo.phone) && {
          delivery_customer_name: deliveryInfo.customerName,
          delivery_address: deliveryInfo.address,
          delivery_phone: deliveryInfo.phone,
        }),
      };

      let resultOrder: Order;
      const isNewOrder = !currentOrder || !currentOrder.id;

      if (currentOrder && currentOrder.id) {
        resultOrder = await wailsOrderService.updateOrder(currentOrder.id, orderData);
        toast.success('Orden actualizada exitosamente');
      } else {
        resultOrder = await wailsOrderService.createOrder(orderData);
        toast.success('Orden guardada exitosamente');
      }

      // Only send to kitchen for NEW orders (updates are handled by backend)
      if (selectedTable && isNewOrder) {
        sendMessage({
          type: 'kitchen_order',
          timestamp: new Date().toISOString(),
          data: {
            order: resultOrder,
            table: selectedTable,
          },
        });
      }

      if (selectedTable && selectedTable.status === 'available') {
        await wailsOrderService.updateTableStatus(selectedTable.id!, 'occupied');
      }

      setOrderItems([]);
      setCurrentOrder(null);
      setSelectedTable(null);
      setSelectedCustomer(null);
      setNeedsElectronicInvoice(false);
      setDeliveryInfo({ customerName: '', address: '', phone: '' });
      loadedOrderIdRef.current = null;
      return resultOrder;
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la orden');
      return null;
    } finally {
      setIsSavingOrder(false);
    }
  }, [selectedTable, selectedCustomer, orderItems, user, sendMessage, currentOrder, selectedOrderType, deliveryInfo]);

  const processPayment = useCallback(async (paymentData: any, splitItems?: { itemId: number; quantity: number }[]) => {
    if (isProcessingPaymentRef.current) return;
    isProcessingPaymentRef.current = true;

    if (!cashRegisterId) {
      isProcessingPaymentRef.current = false;
      toast.error('No hay caja abierta');
      return;
    }

    if (selectedOrderType?.code === 'dine-in' && !selectedTable) {
      isProcessingPaymentRef.current = false;
      toast.error('Debes seleccionar una mesa para pedidos "Para Comer Aquí"');
      return;
    }

    setIsProcessingPayment(true);
    try {
      let orderToProcess: Order;

      let itemsToProcess = orderItems;
      if (splitItems && splitItems.length > 0) {
        itemsToProcess = splitItems.map(splitItem => {
          const originalItem = orderItems.find(item => item.id === splitItem.itemId);
          if (!originalItem) throw new Error('Item not found');

          const unitPrice = (originalItem.subtotal || 0) / originalItem.quantity;
          return {
            ...originalItem,
            quantity: splitItem.quantity,
            subtotal: unitPrice * splitItem.quantity,
            id: undefined,
          };
        });
      }

      if (currentOrder && currentOrder.id && !splitItems) {
        const itemsChanged = JSON.stringify(currentOrder.items) !== JSON.stringify(orderItems);

        if (itemsChanged) {
          const orderData: CreateOrderData = {
            type: selectedOrderType?.code as 'dine_in' | 'takeout' | 'delivery' || 'takeout',
            order_type_id: selectedOrderType?.id as unknown as number,
            table_id: selectedTable?.id,
            customer_id: selectedCustomer?.id,
            employee_id: user?.id,
            items: orderItems,
            notes: '',
            source: 'pos',
            service_charge: orderTotals.serviceCharge,
            ...((deliveryInfo.customerName || deliveryInfo.address || deliveryInfo.phone) && {
              delivery_customer_name: deliveryInfo.customerName,
              delivery_address: deliveryInfo.address,
              delivery_phone: deliveryInfo.phone,
            }),
          };

          orderToProcess = await wailsOrderService.updateOrder(currentOrder.id, orderData);
          setCurrentOrder(orderToProcess);
        } else {
          orderToProcess = currentOrder;
        }
      } else {
        const orderData: CreateOrderData = {
          type: selectedOrderType?.code as 'dine_in' | 'takeout' | 'delivery' || 'takeout',
          order_type_id: selectedOrderType?.id as unknown as number,
          table_id: selectedTable?.id,
          customer_id: selectedCustomer?.id,
          employee_id: user?.id,
          items: itemsToProcess,
          notes: splitItems ? 'Cuenta dividida' : '',
          source: splitItems ? 'split' : 'pos', // 'split' prevents sending to kitchen
          service_charge: splitItems ? 0 : orderTotals.serviceCharge,
          // Include delivery info if exists (check for actual data, not just order type)
          ...((deliveryInfo.customerName || deliveryInfo.address || deliveryInfo.phone) && {
            delivery_customer_name: deliveryInfo.customerName,
            delivery_address: deliveryInfo.address,
            delivery_phone: deliveryInfo.phone,
          }),
        };

        orderToProcess = await wailsOrderService.createOrder(orderData);
      }

      await wailsSalesService.processSale({
        order_id: orderToProcess.id!,
        customer_id: selectedCustomer?.id,
        payment_methods: paymentData.payment_data || [],
        discount: 0,
        notes: '',
        employee_id: user?.id!,
        cash_register_id: cashRegisterId!,
        needs_electronic_invoice: paymentData.needsInvoice || false,
        send_email_to_customer: paymentData.sendByEmail || false,
        print_receipt: paymentData.printReceipt !== undefined ? paymentData.printReceipt : true,
      });

      if (selectedTable) {
        try {
          await wailsOrderService.updateTableStatus(selectedTable.id!, 'available');
        } catch (error) {
        }
      }

      toast.success('Venta procesada exitosamente');

      if (!splitItems) {
        clearOrder(true);
        setPaymentDialogOpen(false);
      }

    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la venta');
    } finally {
      isProcessingPaymentRef.current = false;
      setIsProcessingPayment(false);
    }
  }, [cashRegisterId, selectedTable, selectedCustomer, orderItems, orderTotals, user, clearOrder, currentOrder, selectedOrderType, deliveryInfo]);

  const handlePaymentClick = useCallback(() => {
    if (selectedOrderType?.skip_payment_dialog && selectedOrderType?.default_payment_method_id) {
      const paymentData = {
        payment_data: [{
          payment_method_id: selectedOrderType.default_payment_method_id,
          amount: orderTotals.total,
        }],
        needsInvoice: false,
        sendByEmail: false,
        printReceipt: selectedOrderType.auto_print_receipt !== false, // Use configured value, default to true
      };

      processPayment(paymentData);
    } else {
      setPaymentDialogOpen(true);
    }
  }, [selectedOrderType, orderTotals.total, processPayment]);

  const handleEditNotes = useCallback((item: OrderItem) => {
    setSelectedItemForNotes(item);
    setItemNotes(item.notes || '');
    setNotesDialogOpen(true);
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (selectedItemForNotes) {
      setOrderItems(items =>
        items.map(item => {
          const currentItemId = item.id ?? Date.now();
          const selectedItemId = selectedItemForNotes.id ?? Date.now();
          return currentItemId === selectedItemId
            ? { ...item, notes: itemNotes }
            : item;
        })
      );
    }
    setNotesDialogOpen(false);
    setSelectedItemForNotes(null);
    setItemNotes('');
  }, [selectedItemForNotes, itemNotes]);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, minWidth: 0, overflow: 'hidden' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Tabs
          value={
            showCombosTab ? 'combos' :
            selectedCustomPage !== null ? `page-${selectedCustomPage}` :
            selectedCategory !== null ? `cat-${selectedCategory}` :
            'all'
          }
          onChange={(_, value) => {
            if (value === 'all') {
              setSelectedCategory(null);
              setSelectedCustomPage(null);
              setShowCombosTab(false);
            } else if (value === 'combos') {
              setShowCombosTab(true);
              setSelectedCategory(null);
              setSelectedCustomPage(null);
            } else if (value.startsWith('page-')) {
              const pageId = Number(value.replace('page-', ''));
              setSelectedCustomPage(pageId);
              setSelectedCategory(null);
              setShowCombosTab(false);
            } else if (value.startsWith('cat-')) {
              const categoryId = Number(value.replace('cat-', ''));
              setSelectedCategory(categoryId);
              setSelectedCustomPage(null);
              setShowCombosTab(false);
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            mb: 2,
            flexShrink: 0,
            minHeight: 72,
            maxHeight: 72,
            '& .MuiTabs-flexContainer': { flexWrap: 'nowrap' },
          }}
        >
          <Tab
            value="all"
            label="Todos"
            icon={<FastfoodIcon />}
          />
          {combos.length > 0 && (
            <Tab
              value="combos"
              label={`Combos (${combos.length})`}
              icon={<FastfoodIcon />}
              sx={{
                backgroundColor: showCombosTab ? '#FF9800' : 'transparent',
                color: showCombosTab ? '#fff' : 'inherit',
                '&:hover': {
                  backgroundColor: '#FF9800',
                  opacity: 0.8,
                  color: '#fff',
                },
              }}
            />
          )}
          {customPages.map((page) => (
            <Tab
              key={`page-${page.id}`}
              value={`page-${page.id}`}
              label={page.name}
              icon={<FastfoodIcon />}
              sx={{
                backgroundColor: selectedCustomPage === page.id ? page.color : 'transparent',
                color: selectedCustomPage === page.id ? '#fff' : 'inherit',
                '&:hover': {
                  backgroundColor: page.color,
                  opacity: 0.8,
                  color: '#fff',
                },
              }}
            />
          ))}
          {categories.map((category) => (
            <Tab
              key={`cat-${category.id}`}
              value={`cat-${category.id}`}
              label={category.name}
              icon={<FastfoodIcon />}
              sx={{
                backgroundColor: selectedCategory === category.id ? category.color : 'transparent',
                color: selectedCategory === category.id ? '#fff' : 'inherit',
                '&:hover': {
                  backgroundColor: category.color,
                  opacity: 0.8,
                  color: '#fff',
                },
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Grid container spacing={2}>
            {showCombosTab ? (
              combos.map((combo) => (
                <Grid item xs={6} sm={4} md={3} key={`combo-${combo.id}`}>
                  <Card
                    sx={{
                      height: '100%',
                      border: '2px solid #FF9800',
                      boxShadow: '0 0 8px rgba(255, 152, 0, 0.3)',
                    }}
                  >
                    <CardActionArea onClick={() => addComboToOrder(combo)}>
                      {combo.image ? (
                        <CardMedia
                          component="img"
                          height="120"
                          image={combo.image}
                          alt={combo.name}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 120,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FFF3E0',
                          }}
                        >
                          <FastfoodIcon sx={{ fontSize: 48, color: '#FF9800' }} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Chip
                            label="COMBO"
                            size="small"
                            sx={{
                              backgroundColor: '#FF9800',
                              color: '#fff',
                              fontSize: '0.65rem',
                              height: 18,
                            }}
                          />
                        </Box>
                        <Typography variant="body2" noWrap fontWeight="bold">
                          {combo.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '2.5em',
                          }}
                        >
                          {combo.items?.map(i => i.product?.name).filter(Boolean).join(', ') || combo.description}
                        </Typography>
                        <Typography variant="h6" color="warning.main" fontWeight="bold">
                          ${combo.price.toLocaleString('es-CO')}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))
            ) : (
              // Show Products Grid
              filteredProducts.map((product) => (
                <Grid item xs={6} sm={4} md={3} key={product.id}>
                  <Card
                    sx={{
                      height: '100%',
                      // Only show red border/glow for products with inventory tracking enabled
                      border: product.track_inventory !== false && product.stock <= 0 ? '3px solid #d32f2f' : 'none',
                      boxShadow: product.track_inventory !== false && product.stock <= 0 ? '0 0 10px rgba(211, 47, 47, 0.5)' : undefined,
                    }}
                  >
                    <CardActionArea
                      onClick={() => addProductToOrder(product)}
                    >
                      {product.image && (
                        <CardMedia
                          component="img"
                          height="120"
                          image={product.image}
                          alt={product.name}
                        />
                      )}
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="body2" noWrap>
                          {product.name}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          ${product.price.toLocaleString('es-CO')}
                        </Typography>
                        {/* Only show stock warning for products with inventory tracking enabled */}
                        {product.track_inventory !== false && product.stock <= 5 && (
                          <Chip
                            size="small"
                            label={`Stock: ${product.stock}`}
                            color={product.stock <= 0 ? 'error' : 'warning'}
                          />
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      </Box>

      {/* Right Panel - Order */}
      <Paper sx={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column' }} elevation={3}>
        {/* Order Header */}
        <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">Orden Actual</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {selectedTable && (
              <Chip
                icon={<TableIcon />}
                label={`Mesa ${selectedTable.number}`}
                color="secondary"
                size="small"
              />
            )}
            {selectedCustomer && (
              <Chip
                icon={<PersonIcon />}
                label={selectedCustomer.name}
                color="secondary"
                size="small"
              />
            )}
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ p: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            startIcon={<TableIcon />}
            onClick={() => setTableDialogOpen(true)}
            variant={selectedTable ? 'contained' : 'outlined'}
            size="small"
          >
            Mesa
          </Button>
          <Button
            startIcon={<PersonIcon />}
            onClick={() => setCustomerDialogOpen(true)}
            variant={selectedCustomer ? 'contained' : 'outlined'}
            size="small"
            color={selectedCustomer ? 'primary' : 'inherit'}
          >
            {selectedCustomer ? selectedCustomer.name : 'Cliente'}
          </Button>
          <Button
            startIcon={<DiscountIcon />}
            size="small"
            variant="outlined"
          >
            Descuento
          </Button>
          <Button
            startIcon={
              selectedOrderType?.code === 'dine-in' ? <RestaurantIcon /> :
              selectedOrderType?.code === 'delivery' ? <DeliveryIcon /> :
              <FastfoodIcon />
            }
            onClick={() => setOrderTypeDialogOpen(true)}
            variant="contained"
            size="small"
            color={selectedOrderType?.code === 'dine-in' ? 'info' : selectedOrderType?.code === 'delivery' ? 'warning' : 'success'}
            style={{ backgroundColor: selectedOrderType?.display_color }}
          >
            {selectedOrderType?.name || 'Tipo'}
          </Button>
          {/* Delivery Info Button - Show when delivery type is selected */}
          {(selectedOrderType?.code === 'delivery' || selectedOrderType?.code === 'domicilio') && (
            <IconButton
              onClick={() => setDeliveryDialogOpen(true)}
              size="small"
              color="warning"
              title="Información de Domicilio"
              sx={{
                border: (deliveryInfo.customerName || deliveryInfo.address || deliveryInfo.phone) ? '2px solid' : '1px dashed',
                borderColor: 'warning.main'
              }}
            >
              <DeliveryIcon />
            </IconButton>
          )}
          {orderItems.length > 0 && (
            <>
              <IconButton
                onClick={() => setSplitBillDialogOpen(true)}
                size="small"
                color="info"
                title="Dividir Cuenta"
                disabled={isSavingOrder || isProcessingPayment}
              >
                <SplitIcon />
              </IconButton>
              <IconButton
                onClick={() => {
                  if (window.confirm('¿Vaciar el carrito? Esto eliminará todos los productos.')) {
                    setOrderItems([]);
                    setCurrentOrder(null);
                    setSelectedTable(null);
                    setSelectedCustomer(null);
                    toast.info('Carrito vaciado');
                  }
                }}
                size="small"
                color="error"
                title="Vaciar carrito"
              >
                <ClearIcon />
              </IconButton>
            </>
          )}
        </Box>

        <Divider />

        {/* Order Items */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {orderItems.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}>
              <RestaurantIcon sx={{ fontSize: 64, mb: 2 }} />
              <Typography>No hay productos en la orden</Typography>
            </Box>
          ) : (
            <OrderList
              items={orderItems}
              onUpdateQuantity={updateItemQuantity}
              onRemoveItem={removeItem}
              onEditNotes={handleEditNotes}
              onEditItem={(item) => {
                const product = products.find(p => p.id === item.product_id);
                if (product) {
                  setSelectedItemForModifierEdit(item);
                  setSelectedProductForModifier(product);
                  setModifierDialogOpen(true);
                }
              }}
            />
          )}
        </Box>

        <Divider />

        {/* Order Totals */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Subtotal:</Typography>
            <Typography>${orderTotals.subtotal.toLocaleString('es-CO')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>
              {orderTotals.isIVAResponsible ? 'IVA (19%):' : 'IVA (N/A):'}
            </Typography>
            <Typography>${orderTotals.tax.toLocaleString('es-CO')}</Typography>
          </Box>
          {/* Service Charge - only show when enabled in config and checkbox is checked */}
          {serviceChargeEnabled && includeServiceCharge && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="success.main">
                Servicio ({serviceChargePercent}%):
              </Typography>
              <Typography color="success.main">
                ${orderTotals.serviceCharge.toLocaleString('es-CO')}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" color="primary">
              ${orderTotals.total.toLocaleString('es-CO')}
            </Typography>
          </Box>

          {/* Service Charge Checkbox - only visible when enabled in config */}
          {serviceChargeEnabled && (
            <Box sx={{ mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeServiceCharge}
                    onChange={(e) => setIncludeServiceCharge(e.target.checked)}
                    color="success"
                    size="small"
                  />
                }
                label={`Incluir Servicio (${serviceChargePercent}%)`}
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            </Box>
          )}

          {!isDIANMode && isElectronicInvoicingEnabled && (
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={needsElectronicInvoice}
                    onChange={(e) => setNeedsElectronicInvoice(e.target.checked)}
                    disabled={invoiceLimitStatus?.alternating_enabled || false}
                    color="primary"
                  />
                }
                label={
                  invoiceLimitStatus?.alternating_enabled
                    ? `Factura Electrónica (${invoiceLimitStatus?.message || ''})`
                    : 'Factura Electrónica'
                }
              />
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Row 1: Management Actions */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={() => clearOrder(false)}
                disabled={orderItems.length === 0}
              >
                Cancelar
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={isSavingOrder ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={saveOrder}
                disabled={orderItems.length === 0 || isSavingOrder || isProcessingPayment}
              >
                {isSavingOrder ? 'Guardando...' : 'Guardar'}
              </Button>
            </Box>

            {/* Payment Action (Primary) */}
            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              startIcon={isProcessingPayment ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
              onClick={handlePaymentClick}
              disabled={orderItems.length === 0 || !cashRegisterId || isSavingOrder || isProcessingPayment}
            >
              {isProcessingPayment ? 'Procesando...' : 'Pagar'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Dialogs */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        total={orderTotals.total}
        paymentMethods={paymentMethods}
        onConfirm={processPayment}
        customer={selectedCustomer}
        needsElectronicInvoice={effectiveNeedsElectronicInvoice}
        defaultPrintReceipt={autoPrintReceipt}
        defaultConsumerEmail={defaultConsumerEmail}
      />

      <CustomerDialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        onSelectCustomer={setSelectedCustomer}
        selectedCustomer={selectedCustomer}
      />

      {selectedProductForModifier && (
        <ModifierDialog
          open={modifierDialogOpen}
          onClose={() => {
            setModifierDialogOpen(false);
            setSelectedProductForModifier(null);
            setSelectedItemForModifierEdit(null);
          }}
          product={selectedProductForModifier}
          initialModifiers={selectedItemForModifierEdit?.modifiers?.map(m => m.modifier!).filter(Boolean) || []}
          onConfirm={(modifiers) => {
            // IMPORTANT: unit_price should always be base product price (no modifiers)
            // Modifiers are added to subtotal calculation only
            // This matches backend calculation in order_service.go:659-669
            const basePrice = selectedProductForModifier.price;
            const modifiersPriceChange = modifiers.reduce((sum, mod) => sum + mod.price_change, 0);

            if (selectedItemForModifierEdit) {
              // Editing existing item - update it
              const quantity = selectedItemForModifierEdit.quantity;
              const subtotal = (basePrice * quantity) + (modifiersPriceChange * quantity);

              const updatedItem: OrderItem = {
                ...selectedItemForModifierEdit,
                unit_price: basePrice, // Base product price only (no modifiers)
                subtotal: subtotal, // Base + modifiers
                modifiers: modifiers.map(mod => ({
                  order_item_id: selectedItemForModifierEdit.id || 0,
                  modifier_id: mod.id!,
                  modifier: mod,
                  price_change: mod.price_change,
                })),
              };

              setOrderItems(orderItems.map(item =>
                item.id === selectedItemForModifierEdit.id ? updatedItem : item
              ));
            } else {
              // Adding new product with modifiers
              const subtotal = basePrice + modifiersPriceChange;

              const newItem: OrderItem = {
                id: Date.now(),
                product_id: selectedProductForModifier.id!,
                product: selectedProductForModifier,
                quantity: 1,
                unit_price: basePrice, // Base product price only (no modifiers)
                subtotal: subtotal, // Base + modifiers
                modifiers: modifiers.map(mod => ({
                  order_item_id: 0, // Will be set when order is created
                  modifier_id: mod.id!,
                  modifier: mod,
                  price_change: mod.price_change,
                })),
                notes: '',
              };

              setOrderItems([...orderItems, newItem]);
            }

            setModifierDialogOpen(false);
            setSelectedProductForModifier(null);
            setSelectedItemForModifierEdit(null);
          }}
        />
      )}

      {selectedProductForPrice && (
        <PriceInputDialog
          open={priceInputDialogOpen}
          onClose={() => {
            setPriceInputDialogOpen(false);
            setSelectedProductForPrice(null);
          }}
          productName={selectedProductForPrice.name}
          suggestedPrice={selectedProductForPrice.price}
          onConfirm={(customPrice) => {
            // Create item with custom price
            const newItem: OrderItem = {
              id: Date.now(),
              product_id: selectedProductForPrice.id!,
              product: selectedProductForPrice,
              quantity: 1,
              unit_price: customPrice,
              subtotal: customPrice,
              notes: '',
              modifiers: [],
            };

            setOrderItems([...orderItems, newItem]);
            setPriceInputDialogOpen(false);
            setSelectedProductForPrice(null);

            toast.success(`${selectedProductForPrice.name} añadido con precio $${customPrice.toLocaleString('es-CO')}`, {
              position: 'bottom-center',
              autoClose: 1500,
            });
          }}
        />
      )}

      <TableSelector
        open={tableDialogOpen}
        onClose={() => setTableDialogOpen(false)}
        onSelectTable={setSelectedTable}
        selectedTable={selectedTable}
        onlyAvailable={!!(currentOrder && currentOrder.id && currentOrder.table_id)}
      />

      {/* Notes Dialog */}
      <Dialog
        open={notesDialogOpen}
        onClose={() => {
          setNotesDialogOpen(false);
          setSelectedItemForNotes(null);
          setItemNotes('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Agregar Comentario
        </DialogTitle>
        <DialogContent>
          {selectedItemForNotes && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {selectedItemForNotes.product?.name}
              </Typography>
            </Box>
          )}
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Comentario"
            placeholder="Ej: Sin cebolla, sin tomate, etc."
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setNotesDialogOpen(false);
              setSelectedItemForNotes(null);
              setItemNotes('');
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveNotes}
            variant="contained"
            color="primary"
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Type Selection Dialog */}
      <Dialog
        open={orderTypeDialogOpen}
        onClose={() => setOrderTypeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Seleccionar Tipo de Pedido</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {orderTypes.map((orderType) => {
              const isSelected = selectedOrderType?.id === orderType.id;
              const IconComponent =
                orderType.code === 'dine-in' ? RestaurantIcon :
                orderType.code === 'delivery' ? DeliveryIcon :
                FastfoodIcon;

              return (
                <Button
                  key={orderType.id}
                  variant={isSelected ? 'contained' : 'outlined'}
                  size="large"
                  startIcon={<IconComponent />}
                  onClick={() => {
                    setSelectedOrderType(orderType);
                    setOrderTypeDialogOpen(false);
                    // Open delivery dialog if this is a delivery order (check multiple codes)
                    if (orderType.code === 'delivery' || orderType.code === 'domicilio') {
                      setDeliveryDialogOpen(true);
                    }
                  }}
                  sx={{
                    justifyContent: 'flex-start',
                    py: 2,
                    ...(isSelected && orderType.display_color && {
                      backgroundColor: orderType.display_color,
                      '&:hover': {
                        backgroundColor: orderType.display_color,
                        opacity: 0.9,
                      }
                    })
                  }}
                >
                  {orderType.name}
                </Button>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderTypeDialogOpen(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Info Dialog */}
      <DeliveryInfoDialog
        open={deliveryDialogOpen}
        onClose={() => setDeliveryDialogOpen(false)}
        onConfirm={(info) => {
          setDeliveryInfo(info);
          setDeliveryDialogOpen(false);
        }}
        initialData={deliveryInfo}
      />

      {/* Split Bill Dialog */}
      <SplitBillDialog
        open={splitBillDialogOpen}
        onClose={() => setSplitBillDialogOpen(false)}
        orderItems={orderItems}
        onProcessSplit={(splits) => {
          // Save the original order ID before processing splits
          // This order will be cancelled after all splits are paid
          if (currentOrder?.id) {
            setOriginalOrderIdForSplit(currentOrder.id);
          }
          setBillSplits(splits);
          setSplitBillDialogOpen(false);
          setActiveSplitIndex(0);
          // Open payment dialog for the first split
          if (splits.length > 0) {
            toast.info(`Procesando pago de ${splits[0].name} ($${splits[0].total.toLocaleString('es-CO')})`);
            setPaymentDialogOpen(true);
          }
        }}
        onSaveSplit={async (splits: BillSplit[], unallocatedItems: UnallocatedItem[]) => {
          try {
            setSplitBillDialogOpen(false);
            setIsSavingOrder(true);

            // Step 1: If original order is unsaved, save it first so we have a DB record to work with
            let originalOrderId = currentOrder?.id;
            if (!originalOrderId) {
              const savedOrder = await saveOrder();
              if (!savedOrder?.id) {
                throw new Error('No se pudo guardar la orden original antes de dividir');
              }
              originalOrderId = savedOrder.id;
            }

            // Step 2: Delete the original order FIRST to avoid duplicates.
            // The split orders will contain all the items, so the original is no longer needed.
            // If there are unallocated items, update the original instead of deleting.
            if (unallocatedItems.length === 0) {
              await wailsOrderService.deleteOrder(originalOrderId);
            } else {
              const remainingItems = unallocatedItems.map(unalloc => {
                const originalItem = orderItems.find(item => item.id === unalloc.itemId);
                if (!originalItem) throw new Error('Item not found');
                const unitPrice = (originalItem.subtotal || 0) / originalItem.quantity;
                const productId = originalItem.product_id || originalItem.product?.id;
                if (!productId) throw new Error('Product ID not found');
                return {
                  product_id: productId,
                  quantity: unalloc.quantity,
                  unit_price: unitPrice,
                  subtotal: unitPrice * unalloc.quantity,
                  notes: originalItem.notes,
                  modifiers: originalItem.modifiers,
                };
              });

              await wailsOrderService.updateOrder(originalOrderId, {
                type: selectedOrderType?.code as 'dine_in' | 'takeout' | 'delivery' || 'takeout',
                order_type_id: selectedOrderType?.id as unknown as number,
                table_id: selectedTable?.id,
                customer_id: selectedCustomer?.id,
                employee_id: user?.id,
                items: remainingItems,
                notes: currentOrder?.notes || '',
                source: 'pos',
                service_charge: 0,
              });
            }

            // Step 3: Create split orders AFTER original is handled (no duplicates possible)
            for (const split of splits) {
              const splitOrderItems = split.items.map(splitItem => {
                const originalItem = orderItems.find(item => item.id === splitItem.itemId);
                if (!originalItem) throw new Error('Item not found');
                const unitPrice = (originalItem.subtotal || 0) / originalItem.quantity;
                const productId = originalItem.product_id || originalItem.product?.id;
                if (!productId) throw new Error('Product ID not found');
                return {
                  product_id: productId,
                  quantity: splitItem.quantity,
                  unit_price: unitPrice,
                  subtotal: unitPrice * splitItem.quantity,
                  notes: originalItem.notes,
                  modifiers: originalItem.modifiers,
                };
              });

              const newOrder = await wailsOrderService.createOrder({
                type: selectedOrderType?.code as 'dine_in' | 'takeout' | 'delivery' || 'takeout',
                order_type_id: selectedOrderType?.id as unknown as number,
                table_id: unallocatedItems.length > 0 ? undefined : selectedTable?.id,
                customer_id: selectedCustomer?.id,
                employee_id: user?.id,
                items: splitOrderItems,
                notes: `${split.name} - Cuenta dividida`,
                source: 'split',
                service_charge: 0,
                ...((deliveryInfo.customerName || deliveryInfo.address || deliveryInfo.phone) && {
                  delivery_customer_name: deliveryInfo.customerName,
                  delivery_address: deliveryInfo.address,
                  delivery_phone: deliveryInfo.phone,
                }),
              });
              toast.success(`${split.name} guardada como orden #${newOrder.order_number || newOrder.id}`);
            }

            clearOrder(true);
            toast.success(`División guardada: ${splits.length} cuenta(s) creadas`);

          } catch (error: any) {
            console.error('Error saving split:', error);
            toast.error('Error al guardar la división: ' + (error.message || 'Error desconocido'));
          } finally {
            setIsSavingOrder(false);
          }
        }}
      />

      {/* Payment Dialog for Split Bill */}
      {billSplits.length > 0 && activeSplitIndex < billSplits.length && (
        <Dialog
          open={paymentDialogOpen && billSplits.length > 0}
          onClose={() => {
            // When closing split payment dialog, ask for confirmation
            if (window.confirm('¿Cancelar división de cuentas? Se perderá el progreso de los pagos.')) {
              setPaymentDialogOpen(false);
              setBillSplits([]);
              setActiveSplitIndex(0);
              setOriginalOrderIdForSplit(null);
            }
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PaymentIcon />
              <Typography variant="h6">
                Pago de {billSplits[activeSplitIndex]?.name}
              </Typography>
              <Chip
                label={`${activeSplitIndex + 1} de ${billSplits.length}`}
                color="primary"
              />
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Procesando pagos divididos. Productos incluidos en esta cuenta:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                {billSplits[activeSplitIndex]?.items.map(splitItem => {
                  const orderItem = orderItems.find(item => item.id === splitItem.itemId);
                  if (!orderItem) return null;
                  const unitPrice = (orderItem.subtotal || 0) / orderItem.quantity;
                  const itemTotal = unitPrice * splitItem.quantity;
                  return (
                    <li key={splitItem.itemId}>
                      {splitItem.quantity}x {orderItem.product?.name || 'Producto'} - ${itemTotal.toLocaleString('es-CO')}
                    </li>
                  );
                })}
              </Box>
            </Alert>

            <PaymentDialog
              open={true}
              onClose={() => {
                // Same confirmation as outer dialog
                if (window.confirm('¿Cancelar división de cuentas? Se perderá el progreso de los pagos.')) {
                  setPaymentDialogOpen(false);
                  setBillSplits([]);
                  setActiveSplitIndex(0);
                  setOriginalOrderIdForSplit(null);
                }
              }}
              total={billSplits[activeSplitIndex]?.total || 0}
              paymentMethods={paymentMethods}
              onConfirm={async (paymentData) => {
                try {
                  // Get items for current split
                  const currentSplit = billSplits[activeSplitIndex];

                  // Process payment for this split with specific items
                  await processPayment(paymentData, currentSplit.items);

                  // Move to next split
                  const nextIndex = activeSplitIndex + 1;
                  if (nextIndex < billSplits.length) {
                    setActiveSplitIndex(nextIndex);
                    toast.info(`Procesando pago de ${billSplits[nextIndex].name} ($${billSplits[nextIndex].total.toLocaleString('es-CO')})`);
                  } else {
                    // All splits paid - cancel/delete the original order if it exists
                    if (originalOrderIdForSplit) {
                      try {
                        await wailsOrderService.deleteOrder(originalOrderIdForSplit);
                      } catch (deleteError) {
                        console.error('Error deleting original order:', deleteError);
                        // Don't fail the whole operation if delete fails
                      }
                    }
                    // Clear everything
                    setBillSplits([]);
                    setActiveSplitIndex(0);
                    setOriginalOrderIdForSplit(null);
                    setPaymentDialogOpen(false);
                    clearOrder(true); // Clear local state after all splits are paid
                    toast.success('¡Todos los pagos divididos procesados correctamente!');
                  }
                } catch (error) {
                  console.error('Error processing split payment:', error);
                  toast.error('Error al procesar el pago');
                }
              }}
              customer={selectedCustomer}
              needsElectronicInvoice={effectiveNeedsElectronicInvoice}
              defaultPrintReceipt={autoPrintReceipt}
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default POS;