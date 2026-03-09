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
import { ItemsService } from "../../../../core/services/items.service";
import { MetadataService } from "../../../../core/services/metadata.service";
import { AuthService } from "../../../../login/login.service";
import { MessageService, OverlayOptions } from "primeng/api";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { FileUploadComponent } from "../../../../shared/file-upload/file-upload.component";
import { ItemDetail, InventoryItemData } from "../../../../core/models/item.models";
import { environment } from "../../../../../environments/environment";

@Component({
  selector: "app-items-modal",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    DropdownModule,
    MultiSelectModule,
    FileUploadComponent
  ],
  templateUrl: "./items-modal.component.html",
  styleUrl: "./items-modal.component.css",
})
export class ItemsModalComponent implements OnInit {
  customOverlayOptions: OverlayOptions = {
    styleClass: 'dropdown-zindex-fix'
  };
  @Input() mode: "create" | "view" | "addModel" | "listitem" = "create";
  @Input() item: any = {};
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

    // Using simple concatenation (since API URL ends with /verifai-inventory/api)
    // You might need to adjust baseUrl based on where static assets are served from
    return `${baseUrl}/${cleanPath}`;
  }

  isEditing: boolean = false;
  itemForm!: FormGroup;
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

  itemsList: any[] = [];
  distinctItemsDropdownList: any[] = [];
  isLoading: boolean = false;

  // Edit state for purchase links and usedFor
  editPurchaseLinks: string[] = [];
  newPurchaseLink: string = '';
  editUsedForIds: number[] = [];

  constructor(
    private itemsService: ItemsService,
    private metadataService: MetadataService,
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService
  ) { }

  currentUser = this.authService.getStoredUser();
  userId = this.currentUser?.UserId || 0;
  urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

  ngOnInit() {
    this.initializeForm();
    this.setupItemCodeListener();
    if (this.mode === "addModel") {
      this.getItemsName();
    }
    this.isEditing = this.mode === "create" || this.mode === "addModel";

    if (this.isEditing) {
      this.loadDropdowns(); // Load all metadata for Create/Add
    }
    // Metadata for Edit mode will be loaded lazily in enableEdit()

    if (!this.item) {
      this.item = {};
    }

    if (this.mode === "create") {
      this.resetFormFields();
    }

    // Fetch full item details from API when in masters view mode
    if (this.mode === "view" && this.item?.id) {
      this.fetchItemDetails(this.item.id);
    }

    // Fetch full inventory details for listitem mode
    if (this.mode === "listitem" && this.item?.purchaseItemId) {
      this.fetchInventoryItemDetails(this.item.purchaseItemId);
    }
  }

  inventoryItemDetails: InventoryItemData | null = null;

  fetchInventoryItemDetails(purchaseItemId: number) {
    this.isLoading = true;
    this.itemsService.getInventoryItemDetails(purchaseItemId).subscribe({
      next: (res) => {
        if (res?.data) {
          this.inventoryItemDetails = res.data;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load inventory item details' });
      }
    });
  }

  fetchItemDetails(itemId: number) {
    this.isLoading = true;
    this.itemsService.getItemDetails(itemId).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.item = { ...this.item, ...res.data };
          this.editPurchaseLinks = res.data.purchaseLinks ? [...res.data.purchaseLinks] : [];
          this.mapUsedForToIds();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  setupItemCodeListener() {
    const triggerFields = [
      "itemName",
      "natureCodeId",
      "domainCodeId",
      "partCodeId",
      "madeCodeId",
    ];

    triggerFields.forEach((field) => {
      this.itemForm.get(field)?.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe((currentValue) => {
          if (this.mode === "addModel" && field === "itemName") {
            if (currentValue) {
              // 1. Item Code fetch cheyali
              this.executeGetCodeApi({ itemName: currentValue });

              // 2. Units ni background lo select cheyali (UI lo chupinchamu)
              const selectedItem = this.itemsList.find(
                (i) => i.itemName === currentValue,
              );
              if (selectedItem) {
                const unitName = selectedItem.units;
                const foundUnit = this.dropdownArrays.units.find((u: any) => u.name === unitName);
                if (foundUnit) {
                  this.itemForm.patchValue(
                    { unitCodeId: foundUnit.id },
                    { emitEvent: false },
                  );
                }
              }
            }
          } else if (this.mode === "create") {
            this.fetchSuggestedCode();
          }
        });
    });
  }

  autoPopulateUnits(selectedName: string) {
    const selectedItem = this.itemsList.find(
      (i) => i.itemName === selectedName,
    );
    if (selectedItem) {
      // Since dropdown uses ID, we need to find ID corresponding to unit name
      const unitName = selectedItem.units; // Assuming this is name
      const foundUnit = this.dropdownArrays.units.find((u: any) => u.name === unitName);

      if (foundUnit) {
        this.itemForm.patchValue(
          { unitCodeId: foundUnit.id },
          { emitEvent: false },
        );
      }
    }
  }

  fetchSuggestedCode() {
    const formVal = this.itemForm.getRawValue();
    const payload = {
      itemName: formVal.itemName || "",
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
      this.itemForm.patchValue({
        itemCode: ""
      }, { emitEvent: false });
    }
  }

  executeGetCodeApi(payload: any) {
    this.itemsService.getItemCode(payload).subscribe({
      next: (res) => {
        console.log(res);
        const generatedCode = res.itemCode || "";
        this.itemForm.patchValue(
          {
            itemCode: generatedCode
          },
          { emitEvent: false },
        );
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Item code fetch failed' });
      },
    });
  }

  onItemSelect(selectedItemName: string) {
    const selectedItem = this.itemsList.find(
      (i) => i.itemName === selectedItemName,
    );
    if (selectedItem) {
      // Manually construct the payload from the existing item data
      const payload = {
        itemName: selectedItem.itemName,
        nature: selectedItem.invNature, // Use mapped invNature
        domain: selectedItem.invDomain,
        partCode: selectedItem.invPartCode,
        made: selectedItem.invMade,
      };

      this.itemsService.getItemCode(payload).subscribe({
        next: (res) => {
          // Update item_code
          this.itemForm.patchValue(
            {
              itemCode: res.itemCode || res.data || ""
            },
            { emitEvent: false },
          );
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch item code' });
        }
      });
    }
  }

  getDropdownLabel(category: string, id: number): string {
    const list = this.dropdownArrays[category];
    if (!list || !id) return "";
    const found = list.find((item: any) => item.id == id);
    const result = found ? found.name : "";
    return result;
  }

  getUsedForLabels(): string {
    if (typeof this.item?.usedFor === 'string' && this.item.usedFor) {
      return this.item.usedFor;
    }
    return '';
  }

  initializeForm() {
    if (this.mode === "addModel") {
      this.itemForm = this.fb.group({
        itemName: ["", Validators.required],
        itemCode: [""],
        make: ["", Validators.required],
        model: ["", Validators.required],
        usedFor: [[]],
        purchaseItemLink: ["", [Validators.pattern(this.urlRegex)]]
      });
    } else if (this.mode === "create") {
      this.itemForm = this.fb.group({
        itemName: ["", Validators.required],
        unitCodeId: [null, Validators.required],
        natureCodeId: [null, Validators.required],
        domainCodeId: [null, Validators.required],
        partCodeId: [null, Validators.required],
        madeCodeId: [null, Validators.required],
        itemCode: ["", Validators.required],
        make: ["", Validators.required],
        model: ["", Validators.required],
        usedFor: [[]],
        serialNumberMandatory: ["T", Validators.required],
        barcodeMandatory: ["T", Validators.required],
        purchaseItemLink: ["", [Validators.pattern(this.urlRegex)]]
      });
    } else {
      this.itemForm = this.fb.group({
        remarks: [""],
      });
    }
  }

  resetFormFields() {
    this.itemForm.reset({
      itemName: "",
      unitCodeId: null,
      natureCodeId: null,
      domainCodeId: null,
      partCodeId: null,
      madeCodeId: null,
      itemCode: "",
      make: "",
      model: "",
      usedFor: [],
      serialNumberMandatory: "T",
      barcodeMandatory: "T",
      purchaseItemLink: ""
    });
    this.submitted = false;
  }

  loadDropdowns(onlyUsedFor: boolean = false) {
    if (!onlyUsedFor && this.dropdownArrays.units.length > 0) {
      return;
    }

    this.isLoading = true;

    if (onlyUsedFor) {
      this.metadataService.getDropdownByTypeName("Inv_UsedFor").subscribe({
        next: (response: any) => {
          // Handle both direct array or wrapped data response
          const metadataResponse = Array.isArray(response) ? response : (response?.data || []);
          if (metadataResponse?.[0]?.metadata) {
            this.dropdownArrays.usedFor = this.processMetadata(metadataResponse[0].metadata, "usedFor");
            this.mapUsedForToIds();
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load Used For metadata' });
        }
      });
      return;
    }

    this.metadataService.getAllItemDropdowns().subscribe({
      next: (response: any) => {
        const keys = [
          "units",
          "nature",
          "domain",
          "partcodes",
          "made",
          "usedFor",
        ];

        keys.forEach((key) => {
          if (response[key]?.[0]?.metadata) {
            this.dropdownArrays[key] = this.processMetadata(response[key][0].metadata, key);
          }
        });

        this.isLoading = false;
        this.mapUsedForToIds();
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load dropdowns' });
      },
    });

    if (this.mode === "addModel") {
      this.itemsService.getDistinctItemsList().subscribe({
        next: (res: any) => {
          this.itemsList = this.mapApiItems(res.data || []);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load items list' });
        },
      });
    }
  }

  processMetadata(metadata: any[], key: string): any[] {
    return metadata.map((item) => {
      let idValue;
      // Units and UsedFor use ID (integer keyId)
      if (key === 'units' || key === 'usedFor') {
        idValue = item.keyId;
      } else {
        // Others use the value/name itself as the ID (string)
        idValue = item.value;
      }

      return {
        id: idValue || null,
        name: item.value || "---",
      };
    });
  }

  getItemsName() {
    this.isLoading = true;
    this.itemsService.getDistinctItemsList().subscribe({
      next: (res: any) => {
        // New API returns data as a string array of distinct item names
        const itemsData: string[] = res.data || [];
        this.distinctItemsDropdownList = itemsData.map((name: string) => ({
          label: name,
          value: name,
        }));
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load items list' });
      },
    });
  }
  mapApiItems(data: any[]): any[] {
    return data.map((item) => ({
      ...item,
      itemName: item.itemName,
      itemCode: item.itemCode,
      invNature: item.inv_nature,
      invDomain: item.inv_domain,
      invPartCode: item.inv_partcode,
      invMade: item.inv_made,
      units: item.units
    }));
  }

  patchFormWithItemData() {
    if (!this.item) return;
    this.itemForm.patchValue({
      itemName: this.item.itemName,
      itemCode: this.item.itemCode,
      unitCodeId: this.item.units,
      natureCodeId: this.item.natureCodeId, // using snake_case from API
      domainCodeId: this.item.domainCodeId,
      partCodeId: this.item.partCodeId,
      madeCodeId: this.item.madeCodeId,
      make: this.item.make,
      model: this.item.model,
      remarks: this.item.remarks || "",
      serialNumberMandatory: this.item.serial_number_flag || "T",
      barcodeMandatory: this.item.barcode_flag || "T",
      purchaseItemLink: this.item.purchase_item_link || ""
    });
  }

  get isAddModelMode(): boolean {
    return this.mode === "addModel";
  }

  enableEdit() {
    this.isEditing = true;
    this.loadDropdowns(true); // Load only Used For metadata when entering edit mode
    if (this.mode === 'view' && this.item) {
      this.itemForm.patchValue({
        remarks: this.item.remarks || ''
      });
      const links = this.item.purchaseItemLinks || this.item.purchaseLinks || [];
      this.editPurchaseLinks = Array.isArray(links) ? [...links] : [];
      this.mapUsedForToIds();
    }
  }

  mapUsedForToIds() {
    if (typeof this.item?.usedFor === 'string' && this.item.usedFor.trim() && this.dropdownArrays.usedFor?.length > 0) {
      const names = this.item.usedFor.split(',').map((s: string) => s.trim().toLowerCase());
      this.editUsedForIds = this.dropdownArrays.usedFor
        .filter((opt: any) => names.includes((opt.name || '').toLowerCase()))
        .map((opt: any) => opt.id);
    }
  }
  isValidUrl(url: string): boolean {
    return this.urlRegex.test(url);
  }

  addPurchaseLink() {
    const link = this.newPurchaseLink?.trim();
    if (link) {
      if (!this.isValidUrl(link)) {
        this.messageService.add({ severity: 'error', summary: 'Invalid URL', detail: 'Please enter a valid link.' });
        return;
      }
      if (!this.editPurchaseLinks.includes(link)) {
        this.editPurchaseLinks = [...this.editPurchaseLinks, link];
      }
      this.newPurchaseLink = '';
    }
  }

  removePurchaseLink(index: number) {
    this.editPurchaseLinks = this.editPurchaseLinks.filter((_, i) => i !== index);
  }

  getFieldError(fieldName: string): string {
    const control = this.itemForm.get(fieldName);
    const shouldShowError =
      this.submitted || control?.touched;

    if (control && control.invalid && shouldShowError) {
      if (control.errors?.["required"]) {
        const fieldLabel = this.getFriendlyFieldName(fieldName);
        return `${fieldLabel} is required`;
      }
      if (control.errors?.["min"]) {
        return "Value must be at least 1";
      }
      if (control.errors?.["max"]) {
        return "Value must not exceed 99999";
      }
      if (control.errors?.["minlength"]) {
        const minLength = control.errors["minlength"].requiredLength;
        return `Minimum ${minLength} characters required`;
      }
      if (control.errors?.["maxlength"]) {
        const maxLength = control.errors["maxlength"].requiredLength;
        return `Maximum ${maxLength} characters allowed`;
      }
      if (control.errors?.["pattern"]) {
        return "Invalid format";
      }
    }
    return "";
  }


  private getFriendlyFieldName(fieldName: string): string {
    const fieldLabels: { [key: string]: string } = {
      itemName: "Item Name",
      unitCodeId: "Units",
      natureCodeId: "Nature",
      domainCodeId: "Domain",
      partCodeId: "Part Code",
      madeCodeId: "Made",
      make: "Make",
      model: "Model",
      remarks: "Remarks",
      usedFor: "Used For",
      serialNumberMandatory: "Serial Number Mandatory",
      barcodeMandatory: "Barcode Mandatory",
      itemCode: "Item Code",
      purchaseItemLink: "Purchase Item Link",
    };
    return fieldLabels[fieldName] || fieldName;
  }

  hasFieldError(fieldName: string): boolean {
    return this.getFieldError(fieldName) !== "";
  }

  isFieldTouched(fieldName: string): boolean {
    const control = this.itemForm.get(fieldName);
    return control?.touched || this.submitted;
  }


  isFieldInvalid(fieldName: string): boolean {
    const control = this.itemForm.get(fieldName);
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

  async handleSave() {
    this.submitted = true;

    if (this.itemForm.invalid) {
      Object.keys(this.itemForm.controls).forEach(key => {
        const control = this.itemForm.get(key);
        if (control && control.invalid) {
          console.error(`Invalid field: ${key}`, control.errors);
        }
      });
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill all required fields correctly.' });
      return;
    }

    this.isLoading = true;
    const formValue = this.itemForm.value;

    if (this.mode === 'view' && this.isEditing) {
      const now = new Date();
      const pad = (n: number) => n < 10 ? '0' + n : n;
      const modifiedTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const updatePayload: any = {
        itemId: this.item.itemId || this.item.id,
        usedForIds: this.editUsedForIds.map((id: any) => Number(id)),
        purchaseItemLinks: this.editPurchaseLinks,
        remarks: this.item.remarks || '',
        modifiedBy: this.userId,
        modifiedTime: modifiedTime
      };

      this.itemsService.updateItem(updatePayload.itemId, updatePayload).subscribe({
        next: (res) => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Item updated successfully!' });
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


    // --- Create Item or Add Model logic ---
    const usedForIds = Array.isArray(formValue.usedFor)
      ? formValue.usedFor.map((id: any) => Number(id))
      : [];

    let requestBody: any;

    // Helper to format date as YYYY-MM-DD HH:mm:ss
    const formatDate = (date: Date) => {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      return date.getFullYear() + '-' +
        pad(date.getMonth() + 1) + '-' +
        pad(date.getDate()) + ' ' +
        pad(date.getHours()) + ':' +
        pad(date.getMinutes()) + ':' +
        pad(date.getSeconds());
    };

    const currentDateTime = formatDate(new Date());

    if (this.mode === "addModel") {
      const itemCode = formValue.itemCode?.trim() || "";

      requestBody = {
        itemName: formValue.itemName?.trim() || "",
        itemCode: itemCode,
        make: formValue.make?.trim() || "",
        model: formValue.model?.trim() || "",
        usedForIds: usedForIds,
        serialNumberFlag: "T",
        barcodeFlag: "T",
        purchaseItemLinks: formValue.purchaseItemLink ? [formValue.purchaseItemLink] : [],
        createdBy: this.userId || 0,
        createdTime: currentDateTime
      };

    } else {
      const itemCode = formValue.itemCode?.trim() || "";

      if (!itemCode) {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Item code is required.' });
        return;
      }

      requestBody = {
        itemName: formValue.itemName?.trim() || "",
        itemCode: itemCode,
        units: formValue.unitCodeId.toString(),
        make: formValue.make?.trim() || "",
        model: formValue.model?.trim() || "",
        usedForIds: usedForIds,
        serialNumberFlag: formValue.serialNumberMandatory || "T",
        barcodeFlag: formValue.barcodeMandatory || "F",
        purchaseItemLinks: formValue.purchaseItemLink ? [formValue.purchaseItemLink] : [],
        createdBy: this.userId || 0,
        createdTime: currentDateTime
      };
    }

    this.itemsService.createItem(requestBody, this.selectedFile || undefined).subscribe({
      next: (res: any) => {
        if (res.status === 'failed') {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Creation failed' });
          return;
        }

        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: res.message || `${requestBody.itemName} added successfully!` });
        setTimeout(() => {
          this.save.emit(res);
          this.close.emit();
        }, 1000);
      },
      error: (err) => {
        this.isLoading = false;
        // Show detailed error message
        const errorMsg = err.error?.message || err.message || "Error saving item";
        this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
      },
    });
  }

}
