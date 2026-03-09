import { Component, ChangeDetectorRef, NgZone, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InventoryActionsModalComponent } from "./components/inventory-actions-modal/inventory-actions-modal.component";
import { ItemsModalComponent } from "../items/components/items-modal/items-modal.component";
import { OverlayOptions, MessageService } from 'primeng/api';
import { InventoryService } from '../../core/services/inventory.service';
import { InventoryStockTabComponent } from "./components/inventory-stock-tab/inventory-stock-tab.component";
import { InventoryPurchaseTabComponent } from "./components/inventory-purchase-tab/inventory-purchase-tab.component";
import { InventoryIssuedTabComponent } from "./components/inventory-issued-tab/inventory-issued-tab.component";
import { InventoryReturnTabComponent } from "./components/inventory-return-tab/inventory-return-tab.component";

@Component({
  selector: "app-inventory",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InventoryActionsModalComponent,
    ItemsModalComponent,
    DropdownModule,
    ToastModule,
    InventoryStockTabComponent,
    InventoryPurchaseTabComponent,
    InventoryIssuedTabComponent,
    InventoryReturnTabComponent
  ],
  templateUrl: "./inventory.component.html",
  styleUrl: "./inventory.component.css",
})
export class InventoryComponent {
  activeTab: "stock" | "purchase" | "issued" | "return" = "stock";
  isLoading = false;
  reloadTrigger: number = 0;

  showActionModal = false;
  modalMode: "add-purchase" | "view-purchase" | "stock-send" | "view-stock-send" | "stock-return" | "closing-statement" | "update-purchase" | "view-return" = "add-purchase";
  selectedActionData: any = {};

  // Item Modal State
  showItemModal = false;
  itemModalMode: "create" | "view" | "addModel" | "listitem" = "create";

  // Store Dropdown
  selectedStore: any = { name: 'All Stores', code: 'all' };
  stores: any[] = [{ name: 'All Stores', code: 'all' }];

  customOverlayOptions: OverlayOptions = {
    styleClass: 'dropdown-zindex-fix'
  };

  constructor(
    private inventoryService: InventoryService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.inventoryService.getPurchaseSources(undefined, 'Store').subscribe({
      next: (res: any) => {
        if (res && res.status === 'Success' && res.data) {
          const apiStores = res.data.map((s: any) => ({
            name: s.sourceName,
            code: s.sourceId
          }));
          this.stores = [{ name: 'All Stores', code: 'all' }, ...apiStores];
        }
      },
      error: (err: any) => console.error('Failed to load stores', err)
    });
  }

  setActiveTab(tab: "stock" | "purchase" | "issued" | "return") {
    this.activeTab = tab;
  }

  onLoadingChange(status: boolean) {
    this.isLoading = status;
    this.cdr.detectChanges();
  }

  openActionModal(mode: "add-purchase" | "view-purchase" | "stock-send" | "view-stock-send" | "stock-return" | "closing-statement" | "update-purchase" | "view-return", data: any = {}) {
    this.modalMode = mode;
    this.selectedActionData = data;
    this.showActionModal = true;
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedActionData = {};
  }

  handleModalSubmit(payload: any) {
    if (this.isLoading) return;

    if (payload && payload.isStatusUpdate) {
      this.isLoading = true;
      this.inventoryService.updatePurchase_1_0(payload.payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.messageService.clear();
          if (res && res.status === 'Success') {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Item status updated successfully.' });
            this.closeActionModal();
            this.reloadTrigger++;
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.message || 'Failed to update item status.' });
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          this.messageService.clear();
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update item status.' });
        }
      });
      return;
    }

    if (payload && payload.isUpdateReturn) {
      this.isLoading = true;
      this.inventoryService.updateReturn(payload.returnId, payload.payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.messageService.clear();
          if (res && res.status === 'Success') {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Return details updated successfully.' });
            this.closeActionModal();
            this.reloadTrigger++;
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.message || 'Failed to update return details.' });
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          this.messageService.clear();
          console.error('Error updating return details', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update return details.' });
        }
      });
      return;
    }

    if (payload && payload.isUpdatePurchase) {
      this.isLoading = true;
      this.inventoryService.updatePurchase_1_0(payload.payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.messageService.clear();
          if (res && res.status === 'Success') {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Purchase invoice updated successfully.' });
            this.closeActionModal();
            this.reloadTrigger++;
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.message || 'Failed to update purchase invoice.' });
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          this.messageService.clear();
          console.error('Error updating purchase invoice', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update purchase invoice.' });
        }
      });
      return;
    }

    if (payload && payload.isAddPurchase) {
      this.isLoading = true;
      this.inventoryService.createPurchaseInvoice(payload.payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.messageService.clear();
          if (res && res.status === 'Success') {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Purchase invoice created successfully' });
            this.closeActionModal();
            this.reloadTrigger++;
          } else {
            const errorMsg = res?.message || "Failed to create purchase invoice";
            console.error("Failed to create purchase invoice", res);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          this.messageService.clear();
          console.error("Error creating purchase invoice", err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create purchase invoice.' });
        }
      });
      return;
    }

    if (payload && payload.isStockSend) {
      this.isLoading = true;
      this.inventoryService.createIssue_1_0(payload.payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.messageService.clear();
          if (res && res.status === 'Success') {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Stock send submitted successfully' });
            this.closeActionModal();
            this.reloadTrigger++;
          } else {
            const errorMsg = res?.message || "Failed to submit stock send";
            console.error("Failed to submit stock send", res);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          this.messageService.clear();
          console.error("Error submitting stock send", err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit stock send.' });
        }
      });
      return;
    }

    if (payload && payload.isStockReturn) {
      this.isLoading = true;
      this.inventoryService.createReturn(payload.payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.messageService.clear();
          if (res && res.status === 'Success') {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Stock return submitted successfully' });
            this.closeActionModal();
            this.reloadTrigger++;
          } else {
            const errorMsg = res?.message || "Failed to submit stock return";
            console.error("Failed to submit stock return", res);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
          }
        },
        error: (err: any) => {
          this.isLoading = false;
          this.messageService.clear();
          console.error("Error submitting stock return", err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit stock return.' });
        }
      });
      return;
    }

    this.closeActionModal();
  }

  openItemModal(mode: "create" | "addModel") {
    this.itemModalMode = mode;
    this.showItemModal = true;
  }

  closeItemModal() {
    this.showItemModal = false;
  }

  openClosingStatementModal(data: any) {
    this.openActionModal('closing-statement', data);
  }

  openPurchaseViewModal(data: any) {
    if (!data.purchase_id) {
      console.error("No purchase_id found for this row");
      return;
    }
    this.isLoading = true;
    this.inventoryService.getPurchaseDetails(data.purchase_id).subscribe({
      next: (res) => {
        if (res && res.status === 'Success' && res.data) {
          const details = res.data;
          const actionData = {
            ...details.purchase,
            itemsDetails: details.items || [],
            files: details.files || []
          };
          this.openActionModal('view-purchase', actionData);
        } else {
          this.messageService.clear();
          console.error("Failed to load purchase details", res);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error loading purchase details", err);
        this.isLoading = false;
      }
    });
  }

  openUpdatePurchaseModal(data: any) {
    this.openActionModal('update-purchase', data);
  }

  openStockSendViewModal(data: any) {
    if (!data?.id) {
      console.error('No issue id found for this row');
      return;
    }
    this.isLoading = true;
    this.inventoryService.getIssueDetails(data.id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.status === 'Success' && res.data) {
          this.openActionModal('view-stock-send', res.data);
        } else {
          console.error('Failed to load issue details', res);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading issue details', err);
      }
    });
  }

  openReturnViewModal(data: any) {
    this.openActionModal('view-return', data);
  }
}
