import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ItemsService } from '../../../../core/services/items.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { MetadataService } from '../../../../core/services/metadata.service';
import {
  ItemForIssue, ProductForIssue, MetadataResponse, MetadataItem, ReturnableStockItem, ReturnableStockProduct, ReturnableStockResponse,
  ReturnDetailsData
} from '../../../../core/models/inventory.models';
import { OverlayOptions, MessageService } from 'primeng/api';
import { FileUploadComponent } from '../../../../shared/file-upload/file-upload.component';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../login/login.service';
import { PurchaseItem } from '../../../../core/models/purchase.models';

export interface ViewPurchaseItem extends PurchaseItem {
  id?: number;
  purchaseItemId?: number;
  serialNo?: string;
  newSerialNumber?: string;
  barcodeNo?: string;
  newBarcode?: string;
  newStatus?: string;
  returnReason?: string;
  rate?: number;
  gst?: number;
  code?: string;
  totalPrice?: number | string;
  isModified?: boolean;
}

@Component({
  selector: 'app-inventory-actions-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DropdownModule, CalendarModule, FileUploadComponent],
  templateUrl: './inventory-actions-modal.component.html',
  styleUrls: ['./inventory-actions-modal.component.css']
})
export class InventoryActionsModalComponent implements OnInit, OnChanges {
  baseUrl: string = environment.apiBaseUrl;
  urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

  getFileUrl(filePath: string): string {
    if (!filePath) return 'assets/mock_cam_check.jpg';
    if (filePath.startsWith('http')) return filePath;
    const cleanBase = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${cleanBase}${cleanPath}`;
  }
  customOverlayOptions: OverlayOptions = {
    styleClass: 'dropdown-zindex-fix'
  };
  @Input() mode: 'add-purchase' | 'view-purchase' | 'stock-send' | 'view-stock-send' | 'stock-return' | 'closing-statement' | 'update-purchase' | 'view-return' = 'add-purchase';
  @Input() data: any = {};
  @Input() isLoading: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();
  @Output() openCreateItem = new EventEmitter<void>();
  @Output() openAddItemModel = new EventEmitter<void>();

  // Modal overlay click logic is below

  onOverlayClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('custom-modal-overlay')) {
      this.close.emit();
    }
  }

  isEditing: boolean = false;
  maxDate: Date = new Date();

  // PURCHASE FORM STATE
  addPurchaseForm!: FormGroup;
  isDeliveredSubmit: boolean = false;
  hasMissingSerials: boolean = false;

  get isPreorderUpdate(): boolean {
    return this.mode === 'update-purchase' &&
      (this.data?.status === 'pre-order' || this.data?.purchase?.status === 'pre-order');
  }

  get isDeliveredUpdate(): boolean {
    return this.mode === 'update-purchase' &&
      (this.data?.status?.toLowerCase() === 'delivered' || this.data?.purchase?.status?.toLowerCase() === 'delivered');
  }

  countries: string[] = ['India', 'USA', 'UK'];
  stores: string[] = [];
  onlinePlatforms: string[] = [];
  vendorNames: string[] = [];
  allPlatformsAndVendors: string[] = [...this.vendorNames, ...this.onlinePlatforms];

  newItem: any = {
    itemName: null,
    qty: null,
    cost: null,
    gst: null,
    total: null,
    link: '',
    serialDetails: [{ serialNo: '', barcodeNo: '' }]
  };

  // VIEW PURCHASE STATE
  viewPurchaseItems: ViewPurchaseItem[] = [];
  isBulkEditingStatus: boolean = false;
  isPreorderSubmitAttempted: boolean = false;
  isReturnSubmitAttempted: boolean = false;
  statusOptions: any[] = [
    { label: 'Pre-order', value: 'PREORDER' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Returned', value: 'RETURNED' }
  ];

  get isPreorderInvoice(): boolean {
    const status = this.data?.purchase?.status || this.data?.status || this.data?.purchase?.invoiceType || this.data?.invoiceType || '';
    return String(status).toUpperCase() === 'PREORDER' || String(status).toUpperCase() === 'PRE-ORDERED';
  }

  // STOCK SEND MODE STATE
  stockSend: any = {
    sendFrom: 'Store',
    site: null,
    category: null
  };

  transportation: any = {
    platform: 'Fedex',
    trackingId: '',
    shipmentDate: null,
    deliveredDate: null
  };

  newStockItem: any = {
    name: null,
    qty: null,
    billingStatus: null
  };
  addedStockItems: any[] = [];

  newStockProduct: any = {
    name: null,
    qty: null,
    billingStatus: null
  };
  addedStockProducts: any[] = [];

  // View Modes Data
  viewReturnData: ReturnDetailsData | null = null;
  isEditingReturnStatus: boolean = false;

  // DROPDOWN LISTS
  sendFromOptions: any[] = [];
  siteOptions: any[] = [];
  categoryOptions: any[] = [];
  billingStatuses: { label: string; value: any }[] = [];
  shippingPlatforms: { label: string; value: any }[] = [];
  returnToOptions: { label: string; value: any }[] = [];

  stockReturn: any = {
    returnFrom: 'Select',
    returnTo: 'Store'
  };

  newReturnItem: any = {
    name: 'Select',
    qty: null,
    condition: 'Select'
  };

  newReturnProduct: any = {
    name: 'Select',
    qty: null,
    condition: 'Select'
  };

  addedReturnItems: any[] = [];

  returnConditions: string[] = ['USED', 'SCRAP', 'NEW', 'DEFECTIVE'];

  // File Upload State
  invoiceFile: any = null;
  otherFiles: any[] = [];

  // ITEMS LIST from API (typed via ItemForIssue)
  itemsList: ItemForIssue[] = [];

  // PRODUCTS LIST from API (typed via ProductForIssue)
  productsList: ProductForIssue[] = [];

  // RETURNABLE LISTS from API (for Stock Return)
  returnableItemsList: ReturnableStockItem[] = [];
  returnableProductsList: ReturnableStockProduct[] = [];

  // --- REACTIVE FORMS ---
  stockSendForm!: FormGroup;
  stockReturnForm!: FormGroup;

  constructor(
    private itemsService: ItemsService,
    private inventoryService: InventoryService,
    private metadataService: MetadataService,
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService
  ) { }

  currentUser = this.authService.getStoredUser();
  userId = this.currentUser?.UserId || 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.addPurchaseForm) {
      if (this.mode === 'add-purchase' || this.mode === 'update-purchase') {
        this.patchForms();
      }
    }
    if (changes['data'] && this.mode === 'view-purchase') {
      this.initViewItems();
    }
    if (changes['data'] && this.mode === 'view-return') {
      this.fetchReturnDetails();
    }
  }

  ngOnInit() {
    this.initForms();
    this.isEditing = (this.mode === 'add-purchase' || this.mode === 'update-purchase' || this.mode === 'stock-send' || this.mode === 'stock-return');
    this.isEditingIssueStatus = false;
    this.isEditingReturnStatus = false;

    // Initialize defaults if not present
    if (!this.data.type) {
      this.data.type = 'Online';
    }

    // Load Items/Products
    if (this.mode === 'stock-send' || this.mode === 'stock-return') {
      this.loadStockSendItemsDropdown();
      this.loadProductsDropdown();
    } else if (this.mode === 'add-purchase' || this.mode === 'update-purchase') {
      this.loadPurchaseItemsDropdown();
    }

    // Load dropdowns for Stock Send and Stock Return (sendFromOptions needed for Return From)
    if (this.mode === 'stock-send' || this.mode === 'stock-return') {
      this.loadStockSendDropdowns();
    }

    // Set initial values from Input Data 
    this.patchForms();

    // For Stock Send/Return modes (legacy support if needed)
    if (this.mode === 'stock-send') {
      if (!this.data.items) this.data.items = [{}];
    }

    // Initialize mock data for Stock Send
    if (this.mode === 'stock-send') {
      // Start with empty lists
      this.addedStockItems = [];
      this.addedStockProducts = [];
    }

    if (this.mode === 'closing-statement') {
      this.initClosingStatementMockData();
    }
    if (this.mode === 'view-stock-send') {
      this.initViewStockSendData();
    }
    if (this.mode === 'view-purchase') {
      this.initViewItems();
    }
    if (this.mode === 'view-return') {
      this.fetchReturnDetails();
    }
  }

  private fetchReturnDetails() {
    if (this.data && this.data.id) {
      this.inventoryService.getReturnDetails(this.data.id).subscribe({
        next: (res) => {
          if (res.statusCode === 200 && res.data) {
            this.viewReturnData = res.data;
            this.isEditingReturnStatus = false;
          }
        },
        error: (err) => {
          console.error('Error fetching return details', err);
        }
      });
    }
  }

  // --------------------------------------------------------------------------------
  // INITIALIZERS
  // --------------------------------------------------------------------------------
  initForms() {
    this.addPurchaseForm = this.fb.group({
      purchaseForCountry: ['India', Validators.required],
      purchaseForStore: [null, Validators.required],
      invoiceNo: ['', Validators.required],
      invoiceDate: [null, Validators.required],
      vendorName: [''],
      purchaseVia: [null, Validators.required],
      platform: [null, Validators.required],
      purchaseItems: this.fb.array([])
    });

    this.addPurchaseForm.get('purchaseForCountry')?.valueChanges.subscribe(country => {
      this.loadPurchaseSources(country);
    });

    if (this.mode === 'add-purchase' || this.mode === 'update-purchase' || this.mode === 'view-purchase') {
      this.loadPurchaseSources(this.addPurchaseForm.get('purchaseForCountry')?.value);
    }

    this.stockSendForm = this.fb.group({
      sendFrom: ['Store', Validators.required],
      site: [null, Validators.required],
      category: [null, Validators.required],
      billingStatus: [null, Validators.required],
      transportationPlatform: [null],
      trackingId: [''],
      shipmentDate: [null],
      deliveredDate: [null],
      stockSendItems: this.fb.array([]),
      stockSendProducts: this.fb.array([])
    });

    this.stockReturnForm = this.fb.group({
      returnFrom: ['Select', Validators.required],
      returnTo: ['Store', Validators.required],
      stockReturnItems: this.fb.array([]),
      stockReturnProducts: this.fb.array([])
    });

    if (this.mode === 'stock-return') {
      this.stockReturnForm.get('returnFrom')?.valueChanges.subscribe(returnFromId => {
        if (returnFromId && returnFromId !== 'Select') {
          this.loadReturnableStock(returnFromId);
        } else {
          this.returnableItemsList = [];
          this.returnableProductsList = [];
        }
      });
    }
  }

  loadReturnableStock(returnFromId: number) {
    this.inventoryService.getReturnableStock(returnFromId).subscribe({
      next: (res: any) => {
        if (res?.status === 'Success' && res?.data) {
          this.returnableItemsList = res.data.items || [];
          this.returnableProductsList = res.data.products || [];
        }
      },
      error: (err: any) => {
        console.error('Failed to load returnable stock', err);
        this.returnableItemsList = [];
        this.returnableProductsList = [];
      }
    });
  }

  loadStockSendDropdowns() {
    // Load Inv_Category
    this.metadataService.getDropdownByTypeName('Inv_Category').subscribe({
      next: (res: MetadataResponse[]) => {
        const metadataArray: MetadataItem[] = res?.[0]?.metadata || [];
        this.categoryOptions = metadataArray.map((item: MetadataItem) => ({
          label: item.value,
          value: item.keyId
        }));
      },
      error: (err: any) => console.error('Failed to load categories', err)
    });

    // Load Inv_ShippingFlatform for Transportation dropdown
    this.metadataService.getDropdownByTypeName('Inv_ShippingFlatform').subscribe({
      next: (res: MetadataResponse[]) => {
        const metadataArray: MetadataItem[] = res?.[0]?.metadata || [];
        this.shippingPlatforms = metadataArray.map((item: MetadataItem) => ({
          label: item.value,
          value: item.keyId
        }));
      },
      error: (err: any) => console.error('Failed to load shipping platforms', err)
    });

    // Load Inv_BillingStatus for Item/Product Billing Status dropdowns
    this.metadataService.getDropdownByTypeName('Inv_BillingStatus').subscribe({
      next: (res: MetadataResponse[]) => {
        const metadataArray: MetadataItem[] = res?.[0]?.metadata || [];
        this.billingStatuses = metadataArray.map((item: MetadataItem) => ({
          label: item.value,
          value: item.keyId
        }));
      },
      error: (err: any) => console.error('Failed to load billing statuses', err)
    });

    // Load dropdown sources efficiently using backend filters
    if (this.mode === 'stock-return') {
      this.sendFromOptions = [];

      // Stores for 'Return To' and included in 'Return From'
      this.inventoryService.getPurchaseSources(undefined, 'Store').subscribe({
        next: (res: any) => {
          if (res?.status === 'Success' && res?.data) {
            const options = res.data.map((s: any) => ({ label: s.sourceName, value: s.sourceId }));
            this.sendFromOptions = [...this.sendFromOptions, ...options];
            this.returnToOptions = options;

            if (this.returnToOptions.length > 0) {
              if (!this.stockReturnForm.get('returnTo')?.value || this.stockReturnForm.get('returnTo')?.value === 'Store') {
                this.stockReturnForm.patchValue({ returnTo: this.returnToOptions[0].value }, { emitEvent: false });
              }
            }
          }
        },
        error: (err: any) => console.error('Failed to load store sources', err)
      });

      // Sites included in 'Return From'
      this.inventoryService.getPurchaseSources(undefined, 'Site').subscribe({
        next: (res: any) => {
          if (res?.status === 'Success' && res?.data) {
            const options = res.data.map((s: any) => ({ label: s.sourceName, value: s.sourceId }));
            this.sendFromOptions = [...this.sendFromOptions, ...options];
          }
        },
        error: (err: any) => console.error('Failed to load site sources', err)
      });

    } else if (this.mode === 'stock-send' || this.mode === 'view-stock-send') {
      // Send From (Stores)
      this.inventoryService.getPurchaseSources(undefined, 'Store').subscribe({
        next: (res: any) => {
          if (res?.status === 'Success' && res?.data) {
            this.sendFromOptions = res.data.map((s: any) => ({ label: s.sourceName, value: s.sourceId }));
          }
        },
        error: (err: any) => console.error('Failed to load store sources', err)
      });

      // Site (Sites)
      this.inventoryService.getPurchaseSources(undefined, 'Site').subscribe({
        next: (res: any) => {
          if (res?.status === 'Success' && res?.data) {
            this.siteOptions = res.data.map((s: any) => ({ label: s.sourceName, value: s.sourceId }));
          }
        },
        error: (err: any) => console.error('Failed to load site sources', err)
      });
    }
  }

  loadPurchaseSources(country?: string) {
    const countryParam = (country && country !== 'Select') ? country : '';
    this.inventoryService.getPurchaseSources(countryParam).subscribe({
      next: (res) => {
        if (res && res.status === 'Success' && res.data) {
          const sources = res.data;

          const storeSites = sources.filter((s: any) => s.sourceType === 'Store' || s.sourceType === 'Site');
          const vendors = sources.filter((s: any) => s.sourceType === 'Vendor');
          const onlines = sources.filter((s: any) => String(s.sourceType).toLowerCase().includes('online'));

          this.stores = [{ label: 'Select', value: null }, ...storeSites.map((s: any) => ({ label: s.sourceName, value: s.id || s.sourceId }))];
          this.vendorNames = vendors.map((s: any) => ({ label: s.sourceName, value: s.id || s.sourceId }));
          this.onlinePlatforms = onlines.map((s: any) => ({ label: s.sourceName, value: s.id || s.sourceId }));
          this.allPlatformsAndVendors = [...this.vendorNames, ...this.onlinePlatforms];
        }
      },
      error: (err) => console.error('Failed to load purchase sources:', err)
    });
  }

  patchForms() {
    // We will expand on this depending on how data is passed in 'mode'
    if (this.mode === 'stock-send') {
      this.stockSendForm.patchValue({
        sendFrom: this.stockSend.sendFrom || 'Store',
        site: this.stockSend.site || null,
        category: this.stockSend.category || null,
        transportationPlatform: this.transportation.platform || 'Fedex',
        trackingId: this.transportation.trackingId || '',
        shipmentDate: this.transportation.shipmentDate || null,
        deliveredDate: this.transportation.deliveredDate || null
      });
    } else if (this.mode === 'stock-return') {
      this.stockReturnForm.patchValue({
        returnFrom: this.stockReturn.returnFrom || 'Select',
        returnTo: this.stockReturn.returnTo || 'Store'
      });
    } else if (this.mode === 'add-purchase' || this.mode === 'update-purchase') {
      if (this.data && Object.keys(this.data).length > 0) {
        this.addPurchaseForm.patchValue({
          purchaseForCountry: this.data.purchaseForCountry || 'India',
          purchaseForStore: this.data.purchaseForStore || null,
          invoiceNo: this.data.invoiceNo || this.data?.purchase?.invoiceNumber || '',
          invoiceDate: (this.data.invoiceDate || this.data?.purchase?.invoiceDate) ? new Date(this.data.invoiceDate || this.data?.purchase?.invoiceDate) : null,
          vendorName: this.data.vendorName || '',
          purchaseVia: (this.data.purchaseVia === 'Select' || !this.data.purchaseVia) ? null : this.data.purchaseVia,
          platform: this.data.platform || this.data?.purchase?.purchaseFrom || null
        });

        const itemsArray = this.addPurchaseForm.get('purchaseItems') as FormArray;
        while (itemsArray.length !== 0) {
          itemsArray.removeAt(0);
        }

        const rawItems = this.data.itemsDetails || this.data.items || [];

        for (const item of rawItems) {
          const serialDetailsControls = [];
          let count = item.count || item.qty || 1;

          let existingSerials = item.serialDetails || [];
          for (let k = 0; k < count; k++) {
            const sd = existingSerials[k] || { serialNo: '', barcodeNo: '' };
            serialDetailsControls.push(this.fb.group({
              serialNo: [{ value: sd.serialNo || sd.serialNumber || '', disabled: this.isDeliveredUpdate }],
              barcodeNo: [{ value: sd.barcodeNo || sd.barcode || '', disabled: this.isDeliveredUpdate }]
            }));
          }

          const newGroup = this.fb.group({
            purchaseItemId: [item.purchaseItemId || item.id],
            itemName: [{ value: item.itemId || item.id, disabled: this.isPreorderUpdate || this.isDeliveredUpdate }, Validators.required],
            itemNameDisplay: [item.itemName || ''],
            qty: [{ value: count, disabled: this.isPreorderUpdate || this.isDeliveredUpdate }, [Validators.required, Validators.min(1)]],
            cost: [{ value: item.unitPrice || item.rate || 0, disabled: this.isPreorderUpdate || this.isDeliveredUpdate }, Validators.required],
            gst: [{ value: item.gstPercent || item.gst || 0, disabled: this.isPreorderUpdate || this.isDeliveredUpdate }, Validators.required],
            total: [item.totalPricePerUnit || item.totalPrice || 0],
            link: [{ value: item.link || '', disabled: this.isPreorderUpdate || this.isDeliveredUpdate }],
            serialDetails: this.fb.array(serialDetailsControls),
            expanded: [false]
          });

          this.setupItemCalculations(newGroup);
          itemsArray.push(newGroup);
        }
        this.calculateFormTotal();

        if (this.isPreorderUpdate || this.isDeliveredUpdate) {
          this.addPurchaseForm.get('purchaseForCountry')?.disable();
          this.addPurchaseForm.get('purchaseForStore')?.disable();
          this.addPurchaseForm.get('invoiceDate')?.disable();
          this.addPurchaseForm.get('vendorName')?.disable();
          this.addPurchaseForm.get('purchaseVia')?.disable();
          this.addPurchaseForm.get('platform')?.disable();
        }

        if (this.isDeliveredUpdate) {
          this.addPurchaseForm.get('invoiceNo')?.disable();
        }
      }
    }
  }



  get purchaseItemsControls() {
    return (this.addPurchaseForm.get('purchaseItems') as FormArray).controls;
  }

  getSerialDetailsControls(index: number) {
    const itemsArray = this.addPurchaseForm.get('purchaseItems') as FormArray;
    return (itemsArray.at(index).get('serialDetails') as FormArray).controls;
  }

  get stockSendItemsControls() {
    return (this.stockSendForm.get('stockSendItems') as FormArray).controls;
  }

  get stockSendProductsControls() {
    return (this.stockSendForm.get('stockSendProducts') as FormArray).controls;
  }

  get stockReturnItemsControls() {
    return (this.stockReturnForm.get('stockReturnItems') as FormArray).controls;
  }

  get stockReturnProductsControls() {
    return (this.stockReturnForm.get('stockReturnProducts') as FormArray).controls;
  }

  /** Shapes the raw ItemForIssue list into {label, value} objects for p-dropdown */
  get itemsDropdownOptions(): { label: string; value: any }[] {
    return this.itemsList.map(item => ({
      label: `${item.itemName} - ${item.make} - ${item.model} - ${item.serialNumber || 'No Serial'}`,
      value: item
    }));
  }

  get purchaseItemsDropdownOptions(): { label: string; value: number }[] {
    return this.itemsList.map((item: any) => ({
      label: `${item.itemName} - ${item.make} - ${item.model}`,
      value: item.id || item.itemId || 0
    }));
  }

  onItemNameChange(event: any) {
    const selectedId = event.value;
    const selectedItemObj = this.itemsList.find((i: any) => (i.id || i.itemId) === selectedId);
    if (selectedItemObj) {
      this.newItem.link = (selectedItemObj as any).purchaseItemLink || '';
    } else {
      this.newItem.link = '';
    }
  }

  calculateNewItemTotal() {
    if (this.newItem.qty && this.newItem.cost) {
      const qty = parseFloat(this.newItem.qty.toString()) || 0;
      const rate = parseFloat(this.newItem.cost.toString()) || 0;
      const gst = parseFloat(this.newItem.gst?.toString() || '0');
      const basePrice = qty * rate;
      const taxAmount = (basePrice * gst) / 100;
      this.newItem.total = (basePrice + taxAmount).toFixed(2);
    } else {
      this.newItem.total = null;
    }

    let qtyInt = parseInt(this.newItem.qty, 10);
    if (isNaN(qtyInt) || qtyInt < 1) {
      qtyInt = 1;
    }

    if (!this.newItem.serialDetails) {
      this.newItem.serialDetails = [{ serialNo: '', barcodeNo: '' }];
    }

    if (this.newItem.serialDetails.length < qtyInt) {
      for (let i = this.newItem.serialDetails.length; i < qtyInt; i++) {
        this.newItem.serialDetails.push({ serialNo: '', barcodeNo: '' });
      }
    } else if (this.newItem.serialDetails.length > qtyInt) {
      this.newItem.serialDetails.splice(qtyInt);
    }
  }

  calculateFormTotal() {
    let sum = 0;
    const itemsArray = this.addPurchaseForm.get('purchaseItems') as FormArray;

    itemsArray.controls.forEach(ctrl => {
      const total = parseFloat(ctrl.get('total')?.value) || 0;
      sum += total;
    });

    if (!this.data) this.data = {};
    this.data.totalPrice = sum.toFixed(2);
  }

  setupItemCalculations(group: FormGroup) {
    group.valueChanges.subscribe(val => {
      const qty = parseFloat(val.qty) || 0;
      const rate = parseFloat(val.cost) || 0;
      const gst = parseFloat(val.gst) || 0;
      const basePrice = qty * rate;
      const taxAmount = (basePrice * gst) / 100;
      const total = (basePrice + taxAmount).toFixed(2);

      if (group.get('total')?.value !== total) {
        group.patchValue({ total: total }, { emitEvent: false });
      }
      this.calculateFormTotal();
    });
  }

  addItemToInvoice() {
    if (this.validateNewItem()) {
      const selectedItemObj = this.itemsList.find((i: any) => (i.id || i.itemId) === this.newItem.itemName);
      let displayItemName = '';

      if (selectedItemObj) {
        displayItemName = selectedItemObj.itemName;
      } else {
        displayItemName = this.newItem.itemName;
      }

      const itemsArray = this.addPurchaseForm.get('purchaseItems') as FormArray;

      const parsedQty = parseInt(this.newItem.qty, 10) || 1;
      const serialDetailsControls = [];
      for (let k = 0; k < parsedQty; k++) {
        const sd = this.newItem.serialDetails[k] || { serialNo: '', barcodeNo: '' };
        serialDetailsControls.push(this.fb.group({
          serialNo: [sd.serialNo],
          barcodeNo: [sd.barcodeNo]
        }));
      }

      const newGroup = this.fb.group({
        itemName: [this.newItem.itemName, Validators.required],
        itemNameDisplay: [displayItemName],
        qty: [this.newItem.qty, [Validators.required, Validators.min(1)]],
        cost: [this.newItem.cost, Validators.required],
        gst: [this.newItem.gst, Validators.required],
        total: [this.newItem.total],
        link: [this.newItem.link],
        serialDetails: this.fb.array(serialDetailsControls),
        expanded: [false]
      });

      this.setupItemCalculations(newGroup);

      itemsArray.push(newGroup);
      this.calculateFormTotal();

      this.newItem = {
        itemName: null,
        qty: null,
        cost: null,
        gst: null,
        total: null,
        link: '',
        serialDetails: [{ serialNo: '', barcodeNo: '' }]
      };
    }
  }

  isValidUrl(url: string): boolean {
    return this.urlRegex.test(url);
  }

  preventNegative(event: KeyboardEvent) {
    if (['-', '+', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }

  validateNewItem(): boolean {
    if (!this.newItem.itemName) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please select an item name.' });
      return false;
    }
    if (!this.newItem.qty || this.newItem.qty < 1) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please enter a valid quantity.' });
      return false;
    }
    if (this.newItem.link && !this.isValidUrl(this.newItem.link)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid URL', detail: 'Please enter a valid link.' });
      return false;
    }

    // Duplicate Check
    const currentSerials = this.newItem.serialDetails.map((sd: any) => sd.serialNo?.trim()).filter((s: string) => s);
    const currentBarcodes = this.newItem.serialDetails.map((sd: any) => sd.barcodeNo?.trim()).filter((b: string) => b);

    // Internal duplicates in current entry
    if (new Set(currentSerials).size !== currentSerials.length || new Set(currentBarcodes).size !== currentBarcodes.length) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate Entry', detail: 'same numbers entered' });
      return false;
    }

    // Check against existing items in the invoice
    const itemsArray = this.addPurchaseForm?.get('purchaseItems') as FormArray;
    if (itemsArray) {
      for (const group of itemsArray.controls) {
        const existingSerials = (group.get('serialDetails') as FormArray).value.map((sd: any) => sd.serialNo?.trim()).filter((s: string) => s);
        const existingBarcodes = (group.get('serialDetails') as FormArray).value.map((sd: any) => sd.barcodeNo?.trim()).filter((b: string) => b);

        if (currentSerials.some((s: string) => existingSerials.includes(s)) || currentBarcodes.some((b: string) => existingBarcodes.includes(b))) {
          this.messageService.add({ severity: 'error', summary: 'Duplicate Entry', detail: 'same numbers entered' });
          return false;
        }
      }
    }

    return true;
  }

  removeItemFromInvoice(index: number) {
    const itemsArray = this.addPurchaseForm.get('purchaseItems') as FormArray;
    itemsArray.removeAt(index);
    this.calculateFormTotal();
  }

  toggleExpanded(index: number) {
    const itemsArray = this.addPurchaseForm.get('purchaseItems') as FormArray;
    const itemGroup = itemsArray.at(index);
    if (itemGroup) {
      itemGroup.patchValue({ expanded: !itemGroup.get('expanded')?.value });
    }
  }

  // ITEMS LIST from API for Stock Send/Return
  loadStockSendItemsDropdown() {
    this.inventoryService.getItemsForIssue().subscribe({
      next: (response) => {
        if (response?.data) {
          this.itemsList = response.data;
        }
      },
      error: (error: any) => {
        console.error('Failed to load items for issue', error);
      }
    });
  }

  // ITEMS LIST from API for Purchase Invoice
  loadPurchaseItemsDropdown() {
    this.itemsService.getItems(1, 1000).subscribe({
      next: (response: any) => {
        if (response && response.status === 'Success' && response.data) {
          // Map to match the options structure needed
          this.itemsList = response.data;
        }
      },
      error: (error: any) => console.error('Failed to load items list', error)
    });
  }

  // PRODUCTS LIST from API
  loadProductsDropdown() {
    this.inventoryService.getProductsForIssue().subscribe({
      next: (response) => {
        if (response?.data) {
          this.productsList = response.data;
        }
      },
      error: (error: any) => {
        console.error('Failed to load products for issue', error);
      }
    });
  }

  /** Shapes the raw ProductForIssue list into {label, value} objects for p-dropdown */
  get productsDropdownOptions(): { label: string; value: any }[] {
    return this.productsList.map(prod => ({
      label: `${prod.productName} - ${prod.make} - ${prod.model} - ${prod.serialNumber || 'No Serial'}`,
      value: prod
    }));
  }

  // RETURNABLE STOCK FORMATTERS
  get returnItemsDropdownOptions(): { label: string; value: number }[] {
    return this.returnableItemsList.map(item => ({
      label: `${item.itemName} - ${item.make} - ${item.model} - ${item.serialNumber}`,
      value: item.issueItemId
    }));
  }

  get returnProductsDropdownOptions(): { label: string; value: number }[] {
    return this.returnableProductsList.map(prod => ({
      label: `${prod.productName} - ${prod.make} - ${prod.model} - ${prod.serialNumber}`,
      value: prod.issueProductId || prod.productDetailsId
    }));
  }

  // VIEW STOCK SEND STATE
  viewStockSendData: any = {};
  isEditingIssueStatus: boolean = false;

  updateIssueStatus() {
    this.submitted = true;

    let deliveredDateStr = '';
    if (this.viewStockSendData.deliveredDateObj) {
      const d = this.viewStockSendData.deliveredDateObj;
      const pad = (n: number) => n < 10 ? '0' + n : n;
      deliveredDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // "2026-03-03"
    } else {
      deliveredDateStr = this.viewStockSendData.deliveredDate || '';
    }

    const payload = {
      status: this.viewStockSendData.status,
      deliveredDate: deliveredDateStr,
      modifiedBy: this.userId
    };

    const issueId = this.data?.header?.id || this.data?.id;

    if (!issueId) {
      this.messageService?.add({ severity: 'error', summary: 'Error', detail: 'Issue ID not found' });
      return;
    }

    this.inventoryService.updateIssueStatus_1_0(issueId, payload).subscribe({
      next: (res) => {
        this.messageService?.add({ severity: 'success', summary: 'Success', detail: res.message || 'Issue status updated successfully' });
        this.isEditingIssueStatus = false;
        setTimeout(() => {
          this.submit.emit(res);
          this.close.emit();
        }, 1000);
      },
      error: (err) => {
        this.messageService?.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to update issue status' });
      }
    });
  }

  // VIEW PURCHASE METHODS
  initViewItems() {
    let rawItems: any[] = [];
    if (this.data?.items) {
      rawItems = this.data.items;
    } else if (this.data?.itemsDetails) {
      rawItems = this.data.itemsDetails;
    }

    this.viewPurchaseItems = [];
    for (const item of rawItems) {
      if (item.serialDetails && item.serialDetails.length > 0) {
        for (const sd of item.serialDetails) {
          this.viewPurchaseItems.push({
            ...item,
            purchaseItemId: sd.id || sd.purchaseItemId || sd.itemId || item.id || item.purchaseItemId || item.itemId,
            count: 1,
            serialNo: sd.serialNumber || '-',
            barcodeNo: sd.barcode || '-',
            status: sd.status !== undefined && sd.status !== null ? String(sd.status).toUpperCase() : String(item.status || 'DELIVERED').toUpperCase(),
            returnReason: sd.returnReason || item.returnReason || ''
          });
        }
      } else {
        let count = 1;
        if (item.qty) {
          count = parseInt(item.qty, 10);
          if (isNaN(count) || count < 1) count = 1;
        } else if (item.count) {
          count = parseInt(item.count, 10);
          if (isNaN(count) || count < 1) count = 1;
        }

        for (let i = 0; i < count; i++) {
          this.viewPurchaseItems.push({
            ...item,
            purchaseItemId: item.id || item.purchaseItemId || item.itemId,
            count: 1,
            serialNo: '-',
            barcodeNo: '-',
            status: String(item.status || 'DELIVERED').toUpperCase(),
            returnReason: item.returnReason || ''
          });
        }
      }
    }
  }

  getItemStatusColor(status: string): string {
    const s = (status || '').toLowerCase().replace(/[_\s-]/g, '');
    if (s === 'delivered') return '#53BF8B';
    if (s === 'returned') return '#ED3237';
    if (s === 'preorder' || s === 'preordered' || s === 'preorder') return '#000000';
    return '#FF9800';
  }

  enableBulkEdit() {
    this.isBulkEditingStatus = true;
    this.isPreorderSubmitAttempted = false;
    this.isReturnSubmitAttempted = false;
    for (const item of this.viewPurchaseItems) {
      item.newStatus = String(item.status).toUpperCase();
      item.newSerialNumber = item.serialNo !== '-' ? item.serialNo : '';
      item.newBarcode = item.barcodeNo !== '-' ? item.barcodeNo : '';
      item.returnReason = item.returnReason || undefined;
    }
  }

  saveBulkStatus() {
    this.isPreorderSubmitAttempted = true;
    this.isReturnSubmitAttempted = true;

    let hasErrors = false;
    if (this.isPreorderInvoice) {
      const missingSerials = this.viewPurchaseItems.some(i => !i.newSerialNumber || i.newSerialNumber.trim() === '');
      if (missingSerials) hasErrors = true;
    } else {
      const missingReasons = this.viewPurchaseItems.some(i => i.newStatus === 'RETURNED' && (!i.returnReason || i.returnReason.trim() === ''));
      if (missingReasons) hasErrors = true;
    }

    if (hasErrors) return;

    const modifiedItems = this.viewPurchaseItems.filter(item => {
      const statusChanged = item.newStatus && item.newStatus !== String(item.status).toUpperCase();

      let serialChanged = false;
      let barcodeChanged = false;
      let reasonChanged = false;

      if (this.isPreorderInvoice) {
        const oldSerial = item.serialNo !== '-' ? item.serialNo : '';
        const newSerial = item.newSerialNumber || '';
        serialChanged = oldSerial !== newSerial;

        const oldBarcode = item.barcodeNo !== '-' ? item.barcodeNo : '';
        const newBarcode = item.newBarcode || '';
        barcodeChanged = oldBarcode !== newBarcode;
      } else {
        reasonChanged = item.newStatus === 'RETURNED' && !!item.returnReason;
      }

      const isModified = statusChanged || serialChanged || barcodeChanged || reasonChanged;
      if (isModified) {
        item.isModified = true;
      }
      return isModified;
    });

    if (modifiedItems.length === 0 && this.isPreorderInvoice) {
      this.isBulkEditingStatus = false;
      return;
    } else if (modifiedItems.length === 0 && !this.isPreorderInvoice) {
      this.isBulkEditingStatus = false;
      return;
    }

    const now = new Date();
    const modifiedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const purchaseId = this.data?.purchase?.id || this.data?.purchaseId || this.data?.id;

    const payload: any = {
      purchaseId: purchaseId,
      modifiedBy: this.userId,
      modifiedTime: modifiedTime
    };

    const payloadItems: any[] = [];

    const itemsToProcess = this.isPreorderInvoice ? this.viewPurchaseItems : modifiedItems;

    itemsToProcess.forEach(item => {
      const id = item.purchaseItemId || item.id || null;
      let targetStatus = item.newStatus || item.status;

      if (this.isPreorderInvoice) {
        targetStatus = 'DELIVERED';
      }

      let existing = payloadItems.find((p: any) => p.purchaseItemId === id && p.status === targetStatus);

      if (!existing) {
        existing = {
          purchaseItemId: id,
          serialNumbers: [],
          barcodes: [],
          status: targetStatus
        };
        if (targetStatus === 'RETURNED' && item.returnReason) {
          existing.returnReason = item.returnReason;
        }
        payloadItems.push(existing);
      }

      if (this.isPreorderInvoice) {
        if (item.newSerialNumber && item.newSerialNumber !== '-') {
          existing.serialNumbers.push(item.newSerialNumber);
        }
        if (item.newBarcode && item.newBarcode !== '-') {
          existing.barcodes.push(item.newBarcode);
        }
      } else {
        const serialToPass = item.serialNo !== '-' ? item.serialNo : null;
        const barcodeToPass = item.barcodeNo !== '-' ? item.barcodeNo : null;
        if (serialToPass && !existing.serialNumbers.includes(serialToPass)) existing.serialNumbers.push(serialToPass);
        if (barcodeToPass && !existing.barcodes.includes(barcodeToPass)) existing.barcodes.push(barcodeToPass);
      }
    });

    payload.items = payloadItems;

    console.log("Sending Bulk Update Payload:", payload);
    this.submit.emit({ isStatusUpdate: true, payload: payload });
  }

  initViewStockSendData() {
    const header = this.data?.header || {};
    const items = this.data?.items || [];
    const products = this.data?.products || [];

    this.viewStockSendData = {
      sendFrom: header.issuedFrom || '',
      sendTo: header.issuedTo || '',
      category: header.category || '',
      billing: header.billing || '',
      transportation: header.transportation || '',
      trackingId: header.trackingId || '',
      shipmentDate: header.shipmentDate || '',
      deliveredDate: header.deliveredDate || '',
      status: header.status || '',
      items: items.map((item: any) => ({
        id: item.id,
        name: item.itemName,
        qty: item.quantity,
        unit: item.units,
        billingStatus: item.billingStatus,
        serialNumber: item.serialNumber,
        barcode: item.barcode,
        assignSite: item.assignSite || header.issuedTo || '—',
        make: item.make || '',
        model: item.model || ''
      })),
      products: products.map((prod: any) => ({
        id: prod.id,
        name: prod.productName,
        qty: prod.quantity,
        unit: prod.units,
        billingStatus: prod.billingStatus,
        assignSite: prod.assignSite || header.issuedTo || '—',
        expanded: false,
        ingredients: (prod.hardware || []).map((hw: any) => ({
          name: hw.itemName,
          count: hw.itemsQuantity,
          unit: hw.units,
          make: hw.make || '',
          model: hw.model || ''
        }))
      }))
    };
  }


  getStatusClass(status: string): string {
    if (!status) return '';
    const lower = status.toLowerCase();
    if (lower === 'delivered' || lower === 'working') return 'status-badge-green';
    if (lower === 'returned' || lower === 'defect') return 'status-badge-red';
    if (lower === 'issued') return 'status-badge-black';
    if (lower === 'pre-order') return 'status-badge-black';
    return 'status-badge-gray';
  }

  // CLOSING STATEMENT STATE
  closingStatementData: any = {
    itemName: 'IP Bullet 1.3 MP Camera-IVIS-IPC-EJ5313PL-IR2',
    availableCount: 8,
    startDate: '07/30/2025',
    endDate: '13/01/2026',
    transactions: []
  };

  initClosingStatementMockData() {
    this.closingStatementData = {
      itemName: this.data.itemName || 'IP Bullet 1.3 MP Camera-IVIS-IPC-EJ5313PL-IR2',
      availableCount: this.data.closing || 8,
      startDate: '07/30/2025',
      endDate: '13/01/2026',
      transactions: [
        {
          date: '13/01/2026',
          availableCount: 8,
          records: [
            { from: 'Reliance Store - Tadepally', to: 'Store', status: 'Used', count: 1, type: 'Returned' },
            { from: 'Store', to: 'Bigbazar - Ammerpet', status: 'New', count: 1, type: 'Issued' }
          ]
        },
        {
          date: '10/09/2025',
          availableCount: 8,
          records: [
            { from: 'Store', to: 'Reliance Store - Tadepally', status: 'New', count: 2, type: 'Issued' }
          ]
        },
        {
          date: '01/09/2025',
          availableCount: 10,
          records: [
            { from: 'Amazon', to: 'Store', status: 'New', count: 10, type: 'Purchased' }
          ]
        }
      ]
    };
  }

  addStockItem() {
    if (this.newStockItem.name && this.newStockItem.qty) {
      const selectedItemObj = this.newStockItem.name; // Now holds the full item object
      const itemsArray = this.stockSendForm.get('stockSendItems') as FormArray;

      // Uniqueness check using ID and Serial Number to allow same item with different serials
      const alreadyAdded = itemsArray.controls.some(ctrl =>
        ctrl.get('itemId')?.value === selectedItemObj.id &&
        ctrl.get('serialNumber')?.value === selectedItemObj.serialNumber
      );

      if (alreadyAdded) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'This item with this serial number is already added.' });
        return;
      }

      const displayItemName = `${selectedItemObj.itemName} - ${selectedItemObj.make} - ${selectedItemObj.model}`;
      const details = `S.No. ${selectedItemObj.serialNumber || '-'} | Barcode: ${selectedItemObj.barcode || '-'}`;

      const selectedBilling = this.billingStatuses.find(b => b.value === this.newStockItem.billingStatus);
      const billingStatusName = selectedBilling ? selectedBilling.label : '';

      itemsArray.push(this.fb.group({
        name: [selectedItemObj.serialNumber || selectedItemObj.itemName],
        nameDisplay: [displayItemName],
        qty: [this.newStockItem.qty, [Validators.required, Validators.min(1)]],
        billingStatus: [this.newStockItem.billingStatus],
        billingStatusName: [billingStatusName],
        details: [details],
        itemId: [selectedItemObj.id || 0],
        serialNumber: [selectedItemObj.serialNumber || ''],
        barcode: [selectedItemObj.barcode || '']
      }));

      this.newStockItem = { name: null, qty: null, billingStatus: null };
    }
  }

  removeStockItem(index: number) {
    const itemsArray = this.stockSendForm.get('stockSendItems') as FormArray;
    itemsArray.removeAt(index);
  }

  addStockProduct() {
    if (this.newStockProduct.name && this.newStockProduct.qty) {
      const selectedProd = this.newStockProduct.name; // Now holds the full product object
      const productsArray = this.stockSendForm.get('stockSendProducts') as FormArray;

      // Uniqueness check
      const alreadyAdded = productsArray.controls.some(ctrl =>
        ctrl.get('productDetailsId')?.value === selectedProd.productDetailsId
      );

      if (alreadyAdded) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'This product is already added to the send list.' });
        return;
      }

      if (selectedProd && this.newStockProduct.qty > selectedProd.quantity) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Cannot send more than available quantity (${selectedProd.quantity}).` });
        return;
      }
      const displayItemName = `${selectedProd.productName} - ${selectedProd.make} - ${selectedProd.model}`;
      const details = `S.No. ${selectedProd.serialNumber || '-'} | Barcode: ${selectedProd.barCode || '-'}`;

      const selectedBilling = this.billingStatuses.find(b => b.value === this.newStockProduct.billingStatus);
      const billingStatusName = selectedBilling ? selectedBilling.label : '';

      productsArray.push(this.fb.group({
        name: [selectedProd.serialNumber || selectedProd.productName],
        nameDisplay: [displayItemName],
        qty: [this.newStockProduct.qty, [Validators.required, Validators.min(1)]],
        billingStatus: [this.newStockProduct.billingStatus],
        billingStatusName: [billingStatusName],
        details: [details],
        productDetailsId: [selectedProd.productDetailsId || 0],
        serialNumber: [selectedProd.serialNumber || '']
      }));

      this.newStockProduct = { name: null, qty: null, billingStatus: null };
    }
  }

  removeStockProduct(index: number) {
    const productsArray = this.stockSendForm.get('stockSendProducts') as FormArray;
    productsArray.removeAt(index);
  }

  toggleStockItemExpanded(index: number) {
    const itemsArray = this.stockSendForm.get('stockSendItems') as FormArray;
    const itemGroup = itemsArray.at(index);
    if (itemGroup) {
      itemGroup.patchValue({ expanded: !itemGroup.get('expanded')?.value });
    }
  }

  toggleStockProductExpanded(index: number) {
    const productsArray = this.stockSendForm.get('stockSendProducts') as FormArray;
    const itemGroup = productsArray.at(index);
    if (itemGroup) {
      itemGroup.patchValue({ expanded: !itemGroup.get('expanded')?.value });
    }
  }

  // Stock Return Methods
  addReturnItem() {
    if (this.newReturnItem.name && this.newReturnItem.qty && this.newReturnItem.condition) {
      const itemsArray = this.stockReturnForm.get('stockReturnItems') as FormArray;
      const alreadyAdded = itemsArray.controls.some(ctrl => ctrl.get('name')?.value === this.newReturnItem.name);

      if (alreadyAdded) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'This item is already added to the return list.' });
        return;
      }

      const selectedItemObj = this.returnableItemsList.find(i => i.issueItemId === this.newReturnItem.name);

      if (selectedItemObj && this.newReturnItem.qty > selectedItemObj.quantity) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Cannot return more than available quantity (${selectedItemObj.quantity}).` });
        return;
      }

      const displayItemName = selectedItemObj
        ? `${selectedItemObj.itemName} - ${selectedItemObj.make} - ${selectedItemObj.model}`
        : this.newReturnItem.name;
      const subtext = selectedItemObj
        ? `S.No. ${selectedItemObj.serialNumber} | Barcode: ${selectedItemObj.barcode}`
        : '';

      itemsArray.push(this.fb.group({
        name: [this.newReturnItem.name, Validators.required],
        nameDisplay: [displayItemName],
        qty: [this.newReturnItem.qty, [Validators.required, Validators.min(1)]],
        condition: [this.newReturnItem.condition],
        subtext: [subtext],
        issueItemId: [selectedItemObj?.issueItemId || 0],
        itemId: [selectedItemObj?.itemId || 0],
        serialNumber: [selectedItemObj?.serialNumber || ''],
        barcode: [selectedItemObj?.barcode || '']
      }));

      this.newReturnItem = { name: null, qty: null, condition: null };
    }
  }

  removeReturnItem(index: number) {
    const itemsArray = this.stockReturnForm.get('stockReturnItems') as FormArray;
    itemsArray.removeAt(index);
  }

  addReturnProduct() {
    if (this.newReturnProduct.name && this.newReturnProduct.qty && this.newReturnProduct.condition) {
      const productsArray = this.stockReturnForm.get('stockReturnProducts') as FormArray;
      const alreadyAdded = productsArray.controls.some(ctrl => ctrl.get('name')?.value === this.newReturnProduct.name);

      if (alreadyAdded) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'This product is already added to the return list.' });
        return;
      }

      const selectedProdObj = this.returnableProductsList.find(p => p.issueProductId === this.newReturnProduct.name);

      if (selectedProdObj && this.newReturnProduct.qty > selectedProdObj.quantity) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Cannot return more than available quantity (${selectedProdObj.quantity}).` });
        return;
      }

      const displayProductName = selectedProdObj
        ? `${selectedProdObj.productName} - ${selectedProdObj.make} - ${selectedProdObj.model}`
        : this.newReturnProduct.name;
      const subtext = selectedProdObj
        ? `S.No. ${selectedProdObj.serialNumber} | Barcode: ${selectedProdObj.barCode}` // API uses barCode
        : '';

      productsArray.push(this.fb.group({
        name: [this.newReturnProduct.name, Validators.required],
        nameDisplay: [displayProductName],
        qty: [this.newReturnProduct.qty, [Validators.required, Validators.min(1)]],
        condition: [this.newReturnProduct.condition],
        subtext: [subtext],
        issueProductId: [selectedProdObj?.issueProductId || 0],
        productDetailsId: [selectedProdObj?.productDetailsId || 0],
        serialNumber: [selectedProdObj?.serialNumber || ''],
        barCode: [selectedProdObj?.barCode || '']
      }));

      this.newReturnProduct = { name: null, qty: null, condition: null };
    }
  }

  removeReturnProduct(index: number) {
    const productsArray = this.stockReturnForm.get('stockReturnProducts') as FormArray;
    productsArray.removeAt(index);
  }

  submitted: boolean = false;

  getModalTitle(): string {
    switch (this.mode) {
      case 'view-purchase':
        return `${this.data?.invoiceNumber || ''} - ${this.formatDate(this.data?.invoiceDate) || ''}`;
      case 'add-purchase':
        return 'ADD PURCHASE INVOICE';
      case 'update-purchase':
        return 'UPDATE PURCHASE INVOICE';
      case 'stock-send':
        return 'STOCK SEND';
      case 'view-stock-send':
        return 'STOCK ISSUED INFO';
      case 'stock-return':
        return 'STOCK RETURN';
      case 'view-return':
        return 'RETURN DETAILS';
      case 'closing-statement':
        return 'CLOSING STATEMENT';
      default:
        return 'ADD PURCHASE INVOICE';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // File Upload Handlers (Used by stock-send)
  onInvoiceUpload(files: File[]) {
    if (files.length > 0) {
      this.invoiceFile = { name: files[0].name, progress: 100, file: files[0] };
    } else {
      this.invoiceFile = null;
    }
  }

  onOthersUpload(files: File[]) {
    this.otherFiles = files.map(f => ({ name: f.name, progress: 100, file: f }));
  }

  // Main Save/Submit Handlers
  handleSave() {
    this.submitted = true;
    let payload: any = {};

    switch (this.mode) {
      case 'add-purchase':
      case 'update-purchase':
        this.isDeliveredSubmit = true;
        this.addPurchaseForm.markAllAsTouched();
        const pdFormValue = this.addPurchaseForm.getRawValue();

        // Custom Validation for Delivered
        if (!pdFormValue.purchaseItems || pdFormValue.purchaseItems.length === 0) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please add at least one item to the invoice before saving.' });
          return;
        }

        // Validate Serials and Barcodes for Delivered
        this.hasMissingSerials = false;
        for (const item of pdFormValue.purchaseItems) {
          if (!item.serialDetails || item.serialDetails.length === 0) {
            this.hasMissingSerials = true;
            break;
          }
          for (const sd of item.serialDetails) {
            if (!sd.serialNo || sd.serialNo.trim() === '') {
              this.hasMissingSerials = true;
            }
          }
        }

        if (this.hasMissingSerials) {
          return;
        }

        if (this.addPurchaseForm.invalid) {
          return;
        }

        this.formatAndEmitPayload('delivered');
        break;

      case 'stock-send':
        if (this.stockSendForm.invalid) {
          this.stockSendForm.markAllAsTouched();
          return;
        }
        const sendFormValue = this.stockSendForm.getRawValue();

        // Helper to format date properly (YYYY-MM-DD or ISO matching local time)
        const formatYYYYMMDD = (dateVal: any) => {
          if (!dateVal) return null;
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) return null;
          const pad = (n: number) => n < 10 ? '0' + n : n;
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        };

        // Format createdTime as YYYY-MM-DD
        const now = new Date();
        const pad = (n: number) => n < 10 ? '0' + n : n;
        const createdTimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        // Validate at least one item or product is selected
        if (sendFormValue.stockSendItems.length === 0 && sendFormValue.stockSendProducts.length === 0) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please add at least one Item or Product to send.' });
          return;
        }

        // Map items securely from previously selected data
        const mappedItems = sendFormValue.stockSendItems.map((item: any) => ({
          itemId: item.itemId,
          quantity: Number(item.qty),
          serialNumber: item.serialNumber, // Use the stored serialNumber field
          barcode: item.barcode,
          billingTypeId: item.billingStatus || 1
        }));
        // Map items securely from previously selected data
        const requestPayload = {
          issueDate: formatYYYYMMDD(new Date()), // Assuming today's date for issueDate
          issuedFromId: Number(sendFormValue.sendFrom) || 0,
          issuedToId: Number(sendFormValue.site) || 0,
          categoryId: Number(sendFormValue.category) || 0,
          billingTypeId: Number(sendFormValue.billingStatus) || 0,
          transportationId: Number(sendFormValue.transportationPlatform) || 0,
          trackingId: sendFormValue.trackingId || "",
          shipmentDate: formatYYYYMMDD(sendFormValue.shipmentDate),
          deliveredDate: formatYYYYMMDD(sendFormValue.deliveredDate),
          remarks: "Stock issued to site",
          items: mappedItems,
          products: sendFormValue.stockSendProducts.map((prod: any) => ({
            productDetailsId: prod.productDetailsId,
            quantity: Number(prod.qty),
            billingTypeId: prod.billingStatus || 1
          })),
          createdBy: this.userId,
          createdTime: createdTimeStr
        };

        // Wrap in isStockSend so the inventory list captures it
        payload = { isStockSend: true, payload: requestPayload };
        this.submit.emit(payload);
        break;

      case 'stock-return':
        if (this.stockReturnForm.invalid) {
          this.stockReturnForm.markAllAsTouched();
          return;
        }

        const returnFormValue = this.stockReturnForm.getRawValue();

        if (returnFormValue.stockReturnItems.length === 0 && returnFormValue.stockReturnProducts.length === 0) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please add at least one Item or Product to return.' });
          return;
        }

        const formatReturnDate = (dateVal: any) => {
          if (!dateVal) return null;
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) return null;
          const pad = (n: number) => n < 10 ? '0' + n : n;
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        };

        const returnPayload = {
          returnDate: formatReturnDate(new Date()), // Defaulting to today as there's no returnDate field explicitly yet
          returnFromId: Number(returnFormValue.returnFrom) || 0,
          returnToId: Number(returnFormValue.returnTo) || 0,
          remarks: "Items returned from site",
          status: "IN_TRANSIT",
          items: returnFormValue.stockReturnItems.map((item: any) => ({
            issueItemId: item.issueItemId,
            itemId: item.itemId,
            conditionType: String(item.condition).toUpperCase()
          })),
          products: returnFormValue.stockReturnProducts.map((prod: any) => ({
            issueProductId: prod.issueProductId,
            productDetailsId: prod.productDetailsId,
            conditionType: String(prod.condition).toUpperCase()
          })),
          createdBy: this.userId
        };

        payload = { isStockReturn: true, payload: returnPayload };
        this.submit.emit(payload);
        break;

      default:
        payload = this.data;
        this.submit.emit(payload);
    }
  }

  handleSavePreOrder() {
    this.submitted = true;
    this.isDeliveredSubmit = false;

    this.addPurchaseForm.markAllAsTouched();
    const formValue = this.addPurchaseForm.getRawValue();

    // Strict Validation for PreOrder (Same as delivered, minus serials)
    if (!formValue.purchaseItems || formValue.purchaseItems.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please add at least one item to the invoice before saving.' });
      return;
    }

    if (this.addPurchaseForm.invalid) {
      return;
    }

    this.formatAndEmitPayload('preorder');
  }

  submitUpdateReturn() {
    if (!this.viewReturnData) return;

    this.submitted = true;

    const returnPayload: any = {
      status: this.viewReturnData.header.status,
      remarks: this.viewReturnData.header.remarks,
      modifiedBy: this.userId,
      items: (this.viewReturnData.items || []).map(item => ({
        returnItemId: item.id,
        conditionType: item.conditionType
      })),
      products: (this.viewReturnData.products || []).map(prod => ({
        returnProductId: prod.id,
        conditionType: prod.conditionType
      }))
    };

    const payload = {
      isUpdateReturn: true,
      returnId: this.viewReturnData.header.id,
      payload: returnPayload
    };

    this.submit.emit(payload);
  }

  private formatAndEmitPayload(statusString: 'delivered' | 'preorder') {
    const formValue = this.addPurchaseForm.getRawValue();

    const itemsPayload = (formValue.purchaseItems || []).map((item: any) => {
      const mappedItem: any = {
        itemId: item.itemName,
        quantity: typeof item.qty === 'string' ? parseInt(item.qty, 10) : item.qty,
        unitPrice: typeof item.cost === 'string' ? parseFloat(item.cost) : item.cost,
        gstPercent: typeof item.gst === 'string' ? parseFloat(item.gst) : item.gst
      };

      if (statusString === 'delivered') {
        mappedItem.serialNumbers = item.serialDetails.map((sd: any) => sd.serialNo).filter(Boolean);
        mappedItem.barcodes = item.serialDetails.map((sd: any) => sd.barcodeNo).filter(Boolean);
      }
      return mappedItem;
    });

    if (this.mode === 'add-purchase') {
      const purchasePayload: any = {
        invoiceNumber: formValue.invoiceNo,
        purchaseFromId: Number(formValue.platform) || null,
        purchaseToId: Number(formValue.purchaseForStore) || null,
        purchaseType: String(formValue.purchaseVia).toUpperCase() === 'ONLINE' ? 'ONLINE' : 'VENDOR',
        invoiceType: statusString === 'preorder' ? 'PREORDER' : 'DELIVERED',
        items: itemsPayload,
        createdBy: this.userId,
        createdTime: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
      };

      if (formValue.invoiceDate) {
        const d = formValue.invoiceDate;
        if (d instanceof Date) {
          purchasePayload.invoiceDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }

      const formData = new FormData();
      formData.append('purchase', JSON.stringify(purchasePayload));
      if (this.invoiceFile?.file) formData.append('InvoiceFiles', this.invoiceFile.file);
      if (this.otherFiles && this.otherFiles.length > 0) {
        this.otherFiles.forEach((f: any) => {
          if (f.file) formData.append('otherFiles', f.file);
        });
      }

      console.log('Emitting add-purchase FormData payload');
      this.submit.emit({ isAddPurchase: true, payload: formData });

    } else if (this.mode === 'update-purchase') {
      const now = new Date();
      const modifiedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Assemble specific items payload format for the Bulk Status / Edit API which expects:
      // { purchaseItemId, serialNumbers: [], barcodes: [], status }
      const updatePayloadItems = (formValue.purchaseItems || []).map((item: any) => {
        const updateItem: any = {
          purchaseItemId: item.purchaseItemId || item.id, // the ID of the line item
          status: statusString === 'preorder' ? 'PREORDER' : 'DELIVERED',
        };

        if (statusString === 'delivered') {
          updateItem.serialNumbers = (item.serialDetails || []).map((sd: any) => sd.serialNo).filter(Boolean);
          updateItem.barcodes = (item.serialDetails || []).map((sd: any) => sd.barcodeNo).filter(Boolean);
        } else {
          updateItem.serialNumbers = [];
          updateItem.barcodes = [];
        }
        return updateItem;
      });

      const updatePayload: any = {
        purchaseId: this.data?.purchase?.id || this.data?.id || this.data?.purchaseId,
        modifiedBy: this.userId,
        modifiedTime: modifiedTime,
        status: statusString === 'preorder' ? 'PREORDER' : 'DELIVERED',
        items: updatePayloadItems
      };
      if (formValue.invoiceNo) {
        updatePayload.invoiceNumber = formValue.invoiceNo;
      }

      console.log('Emitting update-purchase JSON payload:', updatePayload);
      this.submit.emit({ isUpdatePurchase: true, payload: updatePayload });
    }
  }

  // Legacy Methods for other modes (Stock Send/Return)
  isItemFilled(item: any) { return !!item?.name; }
  addItemRow() { if (this.data.items) this.data.items.push({}); }
  removeItemRow(index: number) { if (this.data.items) this.data.items.splice(index, 1); }
  onItemChange(item: any, index: number) { } // No-op
  getFilledItemsCount() { return 0; }

  calculateTotal() {
    // Trigger recalculation if needed, or just let the template call calculateItemTotal
  }

  calculateItemTotal(item: any): string {
    if (!item.cost || !item.qty) {
      return '0';
    }
    const cost = parseFloat(item.cost) || 0;
    const qty = parseInt(item.qty) || 0;
    const gst = parseFloat(item.gst) || 0;

    const subtotal = cost * qty;
    const gstAmount = subtotal * (gst / 100);
    const total = subtotal + gstAmount;

    return total.toFixed(2);
  }

  // Restore missing methods for Product rows (Stock Send mode)
  isProductFilled(product: any): boolean {
    return !!(product.name && product.name.trim());
  }

  getFilledProductsCount(): number {
    if (!this.data.products) return 0;
    return this.data.products.filter((p: any) => this.isProductFilled(p)).length;
  }

  onProductChange(product: any, index: number) {
    if (product.name && index === this.data.products.length - 1) {
      this.data.products.push({});
    }
  }

  addProductRow() {
    if (!this.data.products) {
      this.data.products = [];
    }
    this.data.products.push({});
  }

  removeProductRow(index: number) {
    if (this.data.products && this.data.products.length > 1) {
      this.data.products.splice(index, 1);
    }
  }

  getStatusColor(status: string | undefined | null): any {
    if (!status) return { background: '#999999', color: '#ffffff' };
    const s = status.toLowerCase();
    if (s === 'returned' || s === 'delivered' || s === 'success') return { background: '#53BF8B', color: '#ffffff' };
    if (s === 'in transit' || s === 'issued') return { background: '#FF9800', color: '#ffffff' };
    if (s === 'scraped' || s === 'scrap' || s === 'defective') return { background: '#F44336', color: '#ffffff' };
    return { background: '#999999', color: '#ffffff' };
  }

  getConditionColor(condition: string | undefined | null): any {
    if (!condition) return { background: '#999999', color: '#ffffff' };
    const c = condition.toLowerCase();
    if (c === 'new') return { background: '#53BF8B', color: '#ffffff' };
    if (c === 'used') return { background: '#FF9800', color: '#ffffff' };
    if (c === 'defective' || c === 'scrap') return { background: '#F44336', color: '#ffffff' };
    return { background: '#999999', color: '#ffffff' };
  }

  getSubmitButtonLabel(): string {
    if (!this.isLoading) {
      if (this.mode === 'stock-send') return 'SEND';
      if (this.mode === 'stock-return') return 'RETURN';
      if (this.mode === 'view-purchase' && this.isBulkEditingStatus) return 'SAVE CHANGES';
      return 'SUBMIT';
    }

    if (this.mode === 'stock-send') return 'SENDING...';
    if (this.mode === 'stock-return') return 'RETURNING...';
    if (this.mode === 'view-purchase' || this.mode === 'view-stock-send' || this.mode === 'view-return') return 'SAVING...';
    return 'SUBMITTING...';
  }
}
