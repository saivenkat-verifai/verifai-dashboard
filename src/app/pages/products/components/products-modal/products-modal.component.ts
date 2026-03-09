import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Component, EventEmitter, Input, Output, OnInit } from "@angular/core";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { DropdownModule } from "primeng/dropdown";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from "primeng/calendar";
import { ProductsService } from "../../../../core/services/products.service";
import { ItemsService } from "../../../../core/services/items.service";
import { MetadataService } from "../../../../core/services/metadata.service";
import { InventoryService } from "../../../../core/services/inventory.service";
import { AuthService } from "../../../../login/login.service";
import { MessageService, OverlayOptions } from "primeng/api";
import { FileUploadComponent } from "../../../../shared/file-upload/file-upload.component";
import { ProductAllDetails } from "../../../../core/models/product.models";
import { environment } from "../../../../../environments/environment";

@Component({
  selector: "app-products-modal",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    DropdownModule,
    MultiSelectModule,
    MultiSelectModule,
    CalendarModule,
    FileUploadComponent
  ],
  templateUrl: "./products-modal.component.html",
  styleUrl: "./products-modal.component.css",
})
export class ProductsModalComponent implements OnInit {
  customOverlayOptions: OverlayOptions = {
    styleClass: 'dropdown-zindex-fix'
  };
  @Input() mode: "create" | "view" | "addProduct" | "listitem" = "create";
  @Input() product: any = {};
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  onOverlayClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('custom-modal-overlay')) {
      this.close.emit();
    }
  }

  getImageUrl(path: string | null | undefined): string {
    if (!path) return 'assets/image-placeholder.svg';
    if (path.startsWith('http')) return path; // Already absolute URL

    // Remove './' if it exists at the start of the path
    const cleanPath = path.startsWith('./') ? path.substring(2) : path;
    const baseUrl = environment.apiBaseUrl;

    // Using simple concatenation 
    return `${baseUrl}/${cleanPath}`;
  }

  isEditing: boolean = false;
  productForm!: FormGroup;
  submitted: boolean = false;
  selectedFile: File | null = null;
  uploadProgress: number = 0;

  uploadedServerPath: string = "";
  dropdownArrays: any = {
    units: [],
    nature: [],
    domain: [],
    partcodes: [],
    made: [],
    usedFor: [],
  };

  productsList: any[] = [];
  distinctProductsDropdownList: any[] = [];
  storesDropdown: any[] = [];
  isLoading: boolean = false;
  maxDate: Date = new Date();

  // Hardware Selection Properties for Add Product Mode
  selectedHardware: any[] = [];
  availableHardware: any[] = []; // Load from API
  availableItemsMap: Map<number, any[]> = new Map(); // itemId -> dropdown options
  hardwareDropdown: number | null = null;
  hardwareQuantity: number | null = null;

  // List Item All Details State
  allDetails: ProductAllDetails | null = null;

  // More Info Tab State
  activeInfoTab: 'progress' | 'hardware' = 'progress';

  setActiveInfoTab(tab: 'progress' | 'hardware') {
    this.activeInfoTab = tab;
  }

  constructor(
    private productsService: ProductsService,
    private itemsService: ItemsService,
    private metadataService: MetadataService,
    private inventoryService: InventoryService,
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService
  ) { }

  currentUser = this.authService.getStoredUser();
  userId = this.currentUser?.UserId || 0;

  ngOnInit() {
    this.initializeForm();
    this.loadDropdowns();

    if (this.mode === "addProduct") {
      this.loadStores();
      this.getProductsName();
    }

    this.setupProductCodeListener();
    this.loadHardwareItems(); // Load live items

    if (this.mode === "view") {
      if (this.product?.productId) {
        this.fetchProductDetails(this.product.productId);
      }
    } else if (this.mode === "listitem") {
      if (this.product?.productId || this.product?.id) { // id or productId might be passed
        this.fetchAllProductDetails(this.product.productId || this.product.id);
      }
    }

    this.isEditing = this.mode === "create" || this.mode === "addProduct";

    if (!this.product) {
      this.product = {};
    }

    if (this.mode === "create") {
      this.resetFormFields();
    }
  }

  get isAddProductMode(): boolean {
    return this.mode === "addProduct";
  }

  loadHardwareItems() {
    this.isLoading = true;
    this.itemsService.getItems().subscribe({
      next: (res: any) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.availableHardware = res.data.map((item: any) => ({
            id: item.id || item.itemId,
            label: `${item.itemName} - ${item.make || ''} - ${item.model || ''}`,
            name: item.itemName,
            itemCode: item.itemCode,
            units: item.units,
            unitId: item.unitId,
            value: item.id || item.itemId
          }));
        } else {
          console.warn("=== API: No items data found or incorrect structure ===", res);
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
      }
    });
  }

  fetchProductDetails(productId: number) {
    if (!productId) return;
    this.isLoading = true;
    this.productsService.getProductDetails(productId).subscribe({
      next: (res: any) => {
        if (res?.data) {
          const productInfo = res.data;
          this.product = { ...this.product, ...productInfo };
          if (productInfo.itemsList && Array.isArray(productInfo.itemsList)) {
            this.selectedHardware = productInfo.itemsList.map((item: any) => ({
              id: item.itemId,
              itemName: item.itemName || 'Unknown Item',
              make: item.make || '',
              model: item.model || '',
              quantity: item.quantity || 1,
              units: item.units || "No's"
            }));
            if (this.mode === 'addProduct') {
              this.fetchAvailableItemsForHardware();
            }
          } else {
            this.selectedHardware = [];
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Failed fetching product details:", err);
        this.isLoading = false;
        this.selectedHardware = [];
      }
    });
  }

  fetchAllProductDetails(productId: number) {
    if (!productId) return;
    this.isLoading = true;
    this.productsService.getProductAllDetails(productId).subscribe({
      next: (res: any) => {

        if (res?.data) {
          const data = res.data;

          if (data.hardware && Array.isArray(data.hardware)) {
            const grouped = new Map<string, any>();
            data.hardware.forEach((hw: any) => {
              const key = `${hw.itemName}|${hw.make}|${hw.model}`;
              if (grouped.has(key)) {
                const existing = grouped.get(key);
                existing.qty = (existing.qty || 1) + 1;
                existing.cost += hw.cost;
              } else {
                grouped.set(key, { ...hw, qty: 1 });
              }
            });
            data.hardware = Array.from(grouped.values());
          }

          this.allDetails = data;

        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Failed fetching all product details:", err);
        this.isLoading = false;
        this.allDetails = null;
      }
    });
  }

  copyPurchaseLink(link: string | undefined | null) {
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'Link copied to clipboard' });
      }).catch(err => {
        console.error('Failed to copy: ', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to copy link' });
      });
    } else {
      this.messageService.add({ severity: 'warn', summary: 'No Link', detail: 'No purchase link available' });
    }
  }

  openPurchaseLink(link: string | undefined | null) {
    if (link) {
      window.open(link, '_blank');
    } else {
      this.messageService.add({ severity: 'warn', summary: 'No Link', detail: 'No purchase link available' });
    }
  }

  fetchAvailableItemsForHardware() {
    this.availableItemsMap = new Map();
    this.selectedHardware.forEach(hw => {
      this.itemsService.getAvailableItems(hw.id).subscribe({
        next: (res: any) => {
          if (res?.data && Array.isArray(res.data)) {
            const options = res.data.map((item: any) => ({
              label: `${item.serialNumber} - ${item.barcode}`,
              value: item.id,
              unitPrice: item.total_value,
              unitId: item.unitId
            }));
            this.availableItemsMap = new Map(this.availableItemsMap).set(hw.id, options);
          }
        },
        error: () => { }
      });
    });
  }

  getOptionsForHardware(itemId: number): any[] {
    return this.availableItemsMap.get(itemId) || [];
  }

  onHardwareStockSelect(event: any, hw: any) {
    const selectedIds: any[] = event.value || [];
    if (!selectedIds.length) {
      hw.unitPrice = null;
      return;
    }
    const opts = this.getOptionsForHardware(hw.id);
    const total = selectedIds.reduce((sum: number, id: any) => {
      const found = opts.find((o: any) => o.value === id);
      return sum + (found?.unitPrice ?? 0);
    }, 0);
    hw.unitPrice = total;
  }

  setupProductCodeListener() {
    const triggerFields = [
      "productName",
      "natureCodeId",
      "domainCodeId",
      "partCodeId",
      "madeCodeId",
    ];

    triggerFields.forEach((field) => {
      this.productForm.get(field)?.valueChanges.subscribe((currentValue) => {
        if (this.mode === "addProduct" && field === "productName") {
          if (currentValue) {
            const selectedProduct = this.productsList.find(
              (p) => p.productId === currentValue,
            );

            if (selectedProduct && selectedProduct.productId) {
              this.productForm.patchValue(
                { unitCodeId: selectedProduct.units },
                { emitEvent: false },
              );

              // Fetch nested hardware details mapped to this product
              this.isLoading = true;
              this.productsService.getProductDetails(selectedProduct.productId).subscribe({
                next: (res: any) => {
                  if (res?.data) {
                    const productInfo = res.data;
                    if (productInfo.itemsList && Array.isArray(productInfo.itemsList)) {
                      this.selectedHardware = productInfo.itemsList.map((item: any) => ({
                        id: item.itemId,
                        itemName: item.itemName || 'Unknown Item',
                        make: item.make || '',
                        model: item.model || '',
                        quantity: item.quantity || 0,
                        units: item.units || "No's"
                      }));
                      this.fetchAvailableItemsForHardware();
                    } else {
                      this.selectedHardware = [];
                    }
                  }
                  this.isLoading = false;
                },
                error: (err) => {
                  this.isLoading = false;
                  this.selectedHardware = [];
                }
              });

            }
          }
        } else if (this.mode === "create") {
          this.fetchSuggestedCode();
        }
      });
    });
  }

  fetchSuggestedCode() {
    const formVal = this.productForm.getRawValue();
    const payload = {
      productName: formVal.productName || "",
      nature: formVal.natureCodeId || "",
      domain: formVal.domainCodeId || "",
      partCode: formVal.partCodeId || "",
      made: formVal.madeCodeId || "",
    };

    const isAllFilled = Object.values(payload).every(
      (val) => val && val.trim() !== "",
    );

    if (isAllFilled) {
      this.executeGetCodeApi(payload);
    } else {
      this.productForm.patchValue({
        productCode: ""
      }, { emitEvent: false });
    }
  }

  executeGetCodeApi(payload: any) {
    this.productsService.getProductCode(payload).subscribe({
      next: (res) => {
        let generatedCode = "";

        if (res) {
          generatedCode = res.productCode || (res.data && res.data.productCode) || "";
        }

        this.productForm.patchValue(
          {
            productCode: generatedCode
          },
          { emitEvent: false },
        );
      },
      error: (err) => console.error("Product code fetch failed", err),
    });
  }

  // getDropdownLabel(category: string, id: number): string {
  //   const list = this.dropdownArrays[category];
  //   if (!list || !id) return "";
  //   const found = list.find((product: any) => product.id === id);
  //   return found ? found.name : "";
  // }

  initializeForm() {
    if (this.mode === "addProduct") {
      this.productForm = this.fb.group({
        productName: ["", Validators.required],
        productCode: [""],
        serialNumber: ["", Validators.required],
        barCode: [""],
        currentLocationId: [null, Validators.required],
        remarks: [""]
      });
    } else if (this.mode === "create") {
      this.productForm = this.fb.group({
        productName: ["", Validators.required],
        unitCodeId: [null, Validators.required],
        natureCodeId: [null, Validators.required],
        domainCodeId: [null, Validators.required],
        partCodeId: [null, Validators.required],
        madeCodeId: [null, Validators.required],
        productCode: [""],
        make: ["", Validators.required],
        model: ["", Validators.required],
        publishedDate: [""],
        usedFor: [[]],
      });
    } else {
      this.productForm = this.fb.group({
        remarks: [""],
      });
    }
  }

  resetFormFields() {
    if (this.mode === "create") {
      this.productForm.reset({
        productName: "",
        unitCodeId: null,
        productCode: "",
        make: "",
        model: "",
        publishedDate: "",
        usedFor: [],
      });
    }
    this.submitted = false;
  }

  loadDropdowns() {
    this.isLoading = true;
    this.metadataService.getAllItemDropdowns().subscribe({
      next: (response: any) => {
        const keys = [
          "units",
          "nature",
          "domain",
          "partcodes",
          "made",
          "productStatus",
        ];

        keys.forEach((key) => {
          if (response[key] && Array.isArray(response[key]) && response[key].length > 0) {
            const metadataArray = response[key][0].metadata;
            if (metadataArray && Array.isArray(metadataArray)) {
              this.dropdownArrays[key] = this.processMetadata(metadataArray, key);
            }
          }
        });

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
      },
    });
  }

  processMetadata(metadata: any[], key: string): any[] {
    return metadata.map((item) => {
      let idValue;
      if (key === 'units' || key === 'productStatus') {
        idValue = item.keyId;
      } else {
        idValue = item.value;
      }

      return {
        id: idValue || null,
        name: item.value || "---",
      };
    });
  }

  loadStores() {
    this.inventoryService.getPurchaseSources().subscribe({
      next: (response: any) => {
        if (response?.data && Array.isArray(response.data)) {
          this.storesDropdown = response.data.map((s: any) => ({
            value: s.sourceId,
            label: s.sourceName
          }));
        }
      },
      error: (err) => console.error("Error fetching stores:", err),
    });
  }

  getProductsName() {
    this.productsService.getMastersProducts().subscribe({
      next: (response: any) => {
        if (response?.data && Array.isArray(response.data)) {
          this.productsList = response.data.map((p: any) => ({
            ...p,
            productId: p.productId || p.id
          }));

          this.distinctProductsDropdownList = this.productsList.map(p => ({
            label: p.productName,
            value: p.productId
          }));
        }
      },
      error: (err) => console.error("Error fetching products list:", err),
    });
  }

  enableEdit() {
    this.isEditing = true;
  }

  getFieldError(fieldName: string): string {
    const control = this.productForm.get(fieldName);
    if (control && control.invalid && (control.touched || this.submitted)) {
      if (control.errors?.['required']) {
        return `${this.getFriendlyFieldName(fieldName)} is required`;
      }
    }
    return "";
  }

  private getFriendlyFieldName(fieldName: string): string {
    const fieldLabels: { [key: string]: string } = {
      productName: "Product Name",
      unitCodeId: "Units",
      make: "Make",
      model: "Model",
      remarks: "Remarks",
      usedFor: "Used For",
      serialNumberMandatory: "Serial Number Mandatory",
      barcodeMandatory: "Barcode Mandatory",
      productCode: "Product Code",
      serialNumber: "Serial Number",
      barcode: "Barcode",
      natureCodeId: "Nature",
      domainCodeId: "Domain",
      partCodeId: "Part Code",
      madeCodeId: "Made",
      currentLocationId: "Location / Store"
    };
    return fieldLabels[fieldName] || fieldName;
  }

  hasFieldError(fieldName: string): boolean {
    return this.getFieldError(fieldName) !== "";
  }

  isFieldTouched(fieldName: string): boolean {
    const control = this.productForm.get(fieldName);
    return control?.touched || this.submitted;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.productForm.get(fieldName);
    return !!(control && control.invalid && (control.touched || this.submitted));
  }

  onFileUploadChange(files: File[]) {
    if (files.length > 0) {
      this.selectedFile = files[0];
      this.uploadProgress = 100;
    } else {
      this.selectedFile = null;
      this.uploadProgress = 0;
      this.uploadedServerPath = "";
    }
  }

  showPreview: boolean = false;

  cancelPreview() {
    this.showPreview = false;
  }

  get previewProductName(): string {
    if (this.mode === "addProduct") {
      const val = this.productForm.get('productName')?.value;
      const prod = this.productsList.find(p => p.productId === val);
      return prod?.productName || "-";
    }
    return this.productForm.get('productName')?.value || "-";
  }

  get previewProductCode(): string {
    if (this.mode === "addProduct") {
      const val = this.productForm.get('productName')?.value;
      const prod = this.productsList.find(p => p.productId === val);
      return prod?.productCode || "-";
    }
    return this.productForm.get('productCode')?.value || "-";
  }

  getDropdownName(key: string, id: any): string {
    if (!id || !this.dropdownArrays[key]) return "";

    if (Array.isArray(id)) {
      return id.map(singleId => {
        const item = this.dropdownArrays[key].find((i: any) => i.id == singleId);
        return item ? item.name : singleId;
      }).join(', ');
    }

    const item = this.dropdownArrays[key].find((i: any) => i.id == id);
    return item ? item.name : id;
  }

  openPreview() {
    this.submitted = true;

    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        if (control && control.invalid) {
          console.error(`Invalid field: ${key}`, control.errors);
        }
      });
      // Validation error toast
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill all required fields correctly.' });
      return;
    }

    // Additional validation used in original handleSave
    const formValue = this.productForm.value;
    if (this.mode === "addProduct") {
      const selectedProduct = this.productsList.find(
        (p) => p.productId === formValue.productName
      );
      if (!selectedProduct) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please select a product.' });
        return;
      }
      const productCode = selectedProduct.productCode?.trim() || "";
      if (!productCode) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Selected product is missing Product Code.' });
        return;
      }
    } else {
      const productCode = formValue.productCode?.trim() || "";
      if (!productCode) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Product code is required.' });
        return;
      }
    }

    // Check if hardware is defined for 'create' mode
    if (this.mode === 'create' && (!this.selectedHardware || this.selectedHardware.length === 0)) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please add at least one hardware item.' });
      return;
    }

    this.showPreview = true;
  }

  async confirmSave() {
    this.submitted = true;
    this.isLoading = true;
    const formValue = this.productForm.value;

    if (this.mode === 'view' && this.isEditing) {
      const now = new Date();
      const pad = (n: number) => n < 10 ? '0' + n : n;
      const modifiedTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const updatePayload = {
        productId: this.product.productId,
        remarks: this.product.remarks || "",
        modifiedBy: this.userId || 0,
        modifiedTime: modifiedTime
      };

      this.productsService.updateProduct(this.product.productId, updatePayload).subscribe({
        next: (res) => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Remarks updated successfully!' });
          setTimeout(() => {
            this.save.emit(res);
            this.close.emit();
          }, 1000);
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Update failed' });
        }
      });
      return;
    }

    const usedForIds = Array.isArray(formValue.usedFor)
      ? formValue.usedFor.map((id: any) => Number(id))
      : [];

    // Helper to format date as YYYY-MM-DD HH:mm:ss using local time
    const formatDate = (date: Date) => {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      return date.getFullYear() + '-' +
        pad(date.getMonth() + 1) + '-' +
        pad(date.getDate()) + ' ' +
        pad(date.getHours()) + ':' +
        pad(date.getMinutes()) + ':' +
        pad(date.getSeconds());
    };

    if (this.mode === "addProduct") {
      const selectedProduct = this.productsList.find(
        (p) => p.productId === formValue.productName
      );

      if (!selectedProduct) {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please select a product.' });
        return;
      }

      // Build itemsUsed from each hardware row's multi-selected stock items
      const itemsUsed: any[] = [];
      for (const hw of this.selectedHardware) {
        const selectedIds: number[] = hw.selectedStockIds || [];

        // --- Validation: Ensure selected options match the required quantity ---
        if (selectedIds.length !== hw.quantity) {
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Validation Error',
            detail: `Please select exactly ${hw.quantity} unit(s) for ${hw.itemName}.`
          });
          return;
        }

        const opts = this.getOptionsForHardware(hw.id);
        for (const stockId of selectedIds) {
          const opt = opts.find((o: any) => o.value === stockId);
          let matchedUnitId = opt?.unitId ? Number(opt.unitId) : 0;
          if (!matchedUnitId && hw.units && this.dropdownArrays.units?.length) {
            const foundUnit = this.dropdownArrays.units.find((u: any) => u.name === hw.units);
            if (foundUnit) {
              matchedUnitId = Number(foundUnit.id);
            }
          }
          itemsUsed.push({
            itemId: hw.id,
            purchaseItemId: stockId,
            itemUnitId: matchedUnitId,
            cost: opt?.unitPrice ?? 0
          });
        }
      }

      const addProductPayload = {
        productId: selectedProduct.productId,
        serialNumber: formValue.serialNumber?.trim() || "",
        barCode: formValue.barCode?.trim() || "",
        currentLocationId: formValue.currentLocationId ? Number(formValue.currentLocationId) : 0,
        remarks: formValue.remarks?.trim() || "",
        itemsUsed: itemsUsed,
        createdBy: this.userId ? Number(this.userId) : 0,
        createdTime: formatDate(new Date())
      };

      this.productsService.addNewProduct(addProductPayload).subscribe({
        next: (res: any) => {
          if (res.status === 'failed' || res.statusCode === 500) {
            this.isLoading = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Failed to add product' });
            return;
          }
          this.isLoading = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: res.message || 'Product added successfully!' });
          setTimeout(() => {
            this.save.emit(res);
            this.close.emit();
          }, 1000);
        },
        error: (err) => {
          this.isLoading = false;
          const errorMsg = err.error?.message || err.message || 'Error adding product';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
        }
      });
      return;
    }

    // --- CREATE mode ---
    let unitName = "";

    if (typeof formValue.unitCodeId === 'string') {
      unitName = formValue.unitCodeId;
    } else if (typeof formValue.unitCodeId === 'number' || formValue.unitCodeId) {
      const selectedUnit = this.dropdownArrays.units.find(
        (u: any) => u.id === formValue.unitCodeId
      );
      unitName = selectedUnit?.name || "";
    }

    if (!unitName && this.dropdownArrays.units && this.dropdownArrays.units.length > 0) {
      unitName = formValue.unitCodeId || "";
    }

    const productCode = formValue.productCode?.trim() || "";

    if (!productCode) {
      this.isLoading = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Product code is required.' });
      return;
    }

    // Safeguard: Ensure hardware is defined in CREATE mode
    if (this.mode === 'create' && (!this.selectedHardware || this.selectedHardware.length === 0)) {
      this.isLoading = false;
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please add at least one hardware item.' });
      return;
    }

    const requestBody = {
      productName: formValue.productName?.trim() || "",
      productCode: productCode,
      ProductUnitId: formValue.unitCodeId ? Number(formValue.unitCodeId) : 0,
      make: formValue.make?.trim() || "",
      model: formValue.model?.trim() || "",
      description: formValue.remarks || "",
      publishedDate: formValue.publishedDate ? formatDate(new Date(formValue.publishedDate)) : formatDate(new Date()),
      useForIds: usedForIds,
      itemsList: this.selectedHardware.map(h => {
        let matchedUnitId = h.unitId ? Number(h.unitId) : 0;
        if (!matchedUnitId && h.units && this.dropdownArrays.units?.length) {
          const foundUnit = this.dropdownArrays.units.find((u: any) => u.name === h.units);
          if (foundUnit) {
            matchedUnitId = Number(foundUnit.id);
          }
        }
        return {
          itemId: h.id ? Number(h.id) : 0,
          itemsQuantity: h.quantity ? Number(h.quantity) : 0,
          itemUnitId: matchedUnitId
        };
      }),
      createdBy: this.userId ? Number(this.userId) : 0,
      createdTime: formatDate(new Date())
    };

    this.productsService.createProduct(requestBody, this.selectedFile || undefined).subscribe({
      next: (res: any) => {
        if (res.status === 'failed' || res.statusCode === 500) {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Creation failed' });
          return;
        }

        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: res.message });
        setTimeout(() => {
          this.save.emit(res);
          this.close.emit();
        }, 1000);
      },
      error: (err) => {
        this.isLoading = false;
        const errorMsg = err.error?.message || err.message || "Error saving product";
        this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
      },
    });
  }


  addHardwareItem() {
    if (this.hardwareDropdown !== null && this.hardwareDropdown !== undefined) {
      // Use loose equality to avoid string/number mismatch
      const selectedHardware = this.availableHardware.find(h => h.id == this.hardwareDropdown || h.value == this.hardwareDropdown);

      if (selectedHardware) {
        const alreadyExists = this.selectedHardware.some(h => h.id == selectedHardware.id);

        if (!alreadyExists) {
          const qty = this.hardwareQuantity ? Number(this.hardwareQuantity) : 1;
          const newItem = {
            id: selectedHardware.id,
            name: selectedHardware.name,
            itemName: selectedHardware.name,
            itemCode: selectedHardware.itemCode,
            label: selectedHardware.label,
            value: 0,
            quantity: qty,
            units: selectedHardware.units || 'No\'s',
            unitId: selectedHardware.unitId
          };
          this.selectedHardware = [...this.selectedHardware, newItem];
        } else {
          this.messageService.add({ severity: 'warn', summary: 'Duplicate', detail: 'Item already added.' });
        }
      } else {
        console.error("Could not find hardware with id/value:", this.hardwareDropdown);
      }
      this.hardwareDropdown = null;
      this.hardwareQuantity = null;
    } else {
      console.warn("hardwareDropdown is null/undefined!");
    }
  }

  updateHardwareValue(index: number, value: number) {
    if (this.selectedHardware[index]) {
      this.selectedHardware[index].value = value;
    }
  }

  updateHardwareQuantity(index: number, quantity: number) {
    if (this.selectedHardware[index]) {
      this.selectedHardware[index].quantity = quantity;
    }
  }

  removeHardwareItem(index: number) {
    this.selectedHardware.splice(index, 1);
  }

  preventNegative(event: KeyboardEvent) {
    if (['-', '+', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }
}
