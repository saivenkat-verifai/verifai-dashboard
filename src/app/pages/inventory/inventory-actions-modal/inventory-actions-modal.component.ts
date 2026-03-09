import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory-actions-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-actions-modal.component.html',
  styleUrls: ['./inventory-actions-modal.component.css']
})
export class InventoryActionsModalComponent implements OnInit {
  @Input() mode: 'add-purchase' | 'view-purchase' | 'stock-send' | 'stock-return' = 'add-purchase';
  @Input() data: any = {};
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();

  isEditing: boolean = false;

  ngOnInit() {
    this.isEditing = (this.mode !== 'view-purchase');
    
    // Initialize items array - start with one empty row
    if (!this.data.items || this.data.items.length === 0) {
      this.data.items = [{}]; 
    }

    // Initialize products array for stock-send mode
    if (this.mode === 'stock-send') {
      if (!this.data.products || this.data.products.length === 0) {
        this.data.products = [{}];
      }
    }

    // Set default type for purchase
    if (this.mode === 'add-purchase' && !this.data.type) {
      this.data.type = 'Online';
    }

    // Set default values for stock-send
    if (this.mode === 'stock-send') {
      if (!this.data.sendFrom) {
        this.data.sendFrom = 'Store';
      }
    }

    // Set default values for stock-return
    if (this.mode === 'stock-return') {
      if (!this.data.returnTo) {
        this.data.returnTo = 'Store';
      }
    }
  }

  getModalTitle(): string {
    switch (this.mode) {
      case 'add-purchase': 
        return 'ADD PURCHASE INVOICE';
      case 'view-purchase': 
        return `INVOICE: ${this.data.invoiceNo || ''}`;
      case 'stock-send': 
        return 'STOCK SEND';
      case 'stock-return': 
        return 'STOCK RETURN';
      default: 
        return 'INVENTORY ACTION';
    }
  }

  // Auto-add new row when user selects an item
  onItemChange(item: any, index: number) {
    if (item.name && index === this.data.items.length - 1) {
      // User filled the last row, add new empty row
      this.data.items.push({});
    }
  }

  onProductChange(product: any, index: number) {
    if (product.name && index === this.data.products.length - 1) {
      this.data.products.push({});
    }
  }

  isItemFilled(item: any): boolean {
    return !!(item.name && item.name.trim());
  }

  isProductFilled(product: any): boolean {
    return !!(product.name && product.name.trim());
  }

  getFilledItemsCount(): number {
    if (!this.data.items) return 0;
    return this.data.items.filter((item: any) => this.isItemFilled(item)).length;
  }

  getFilledProductsCount(): number {
    if (!this.data.products) return 0;
    return this.data.products.filter((p: any) => this.isProductFilled(p)).length;
  }

  addItemRow() {
    if (!this.data.items) {
      this.data.items = [];
    }
    this.data.items.push({});
  }

  removeItemRow(index: number) {
    if (this.data.items && this.data.items.length > 1) {
      this.data.items.splice(index, 1);
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

  calculateTotal(item: any) {
    // Trigger recalculation
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

  // Validation functions
  validatePurchaseForm(): string[] {
    const errors: string[] = [];
    
    if (!this.data.platform || this.data.platform === '') {
      errors.push('Please select ' + (this.data.type === 'Online' ? 'online platform' : 'vendor'));
    }
    
    if (!this.data.invoiceNo || this.data.invoiceNo.trim() === '') {
      errors.push('Please enter invoice number');
    }
    
    if (!this.data.invoiceDate) {
      errors.push('Please select invoice date');
    }
    
    const filledItems = this.data.items.filter((item: any) => this.isItemFilled(item));
    if (filledItems.length === 0) {
      errors.push('Please add at least one item');
    }
    
    // Validate each filled item
    filledItems.forEach((item: any, idx: number) => {
      if (!item.qty || item.qty <= 0) {
        errors.push(`Item ${idx + 1}: Please enter valid quantity`);
      }
      if (this.mode === 'add-purchase') {
        if (!item.cost || item.cost <= 0) {
          errors.push(`Item ${idx + 1}: Please enter valid cost`);
        }
      }
    });
    
    return errors;
  }

  validateStockSendForm(): string[] {
    const errors: string[] = [];
    
    if (!this.data.site || this.data.site === '') {
      errors.push('Please select a site');
    }
    
    const filledItems = this.data.items.filter((item: any) => this.isItemFilled(item));
    if (filledItems.length === 0) {
      errors.push('Please add at least one item');
    }
    
    filledItems.forEach((item: any, idx: number) => {
      if (!item.qty || item.qty <= 0) {
        errors.push(`Item ${idx + 1}: Please enter valid quantity`);
      }
    });
    
    return errors;
  }

  validateStockReturnForm(): string[] {
    const errors: string[] = [];
    
    if (!this.data.returnFrom || this.data.returnFrom === '') {
      errors.push('Please select return from location');
    }
    
    const filledItems = this.data.items.filter((item: any) => this.isItemFilled(item));
    if (filledItems.length === 0) {
      errors.push('Please add at least one item');
    }
    
    filledItems.forEach((item: any, idx: number) => {
      if (!item.qty || item.qty <= 0) {
        errors.push(`Item ${idx + 1}: Please enter valid quantity`);
      }
    });
    
    return errors;
  }

  handleSave() {
    let errors: string[] = [];
    
    // Validate based on mode
    if (this.mode === 'add-purchase') {
      errors = this.validatePurchaseForm();
    } else if (this.mode === 'stock-send') {
      errors = this.validateStockSendForm();
    } else if (this.mode === 'stock-return') {
      errors = this.validateStockReturnForm();
    }
    
    if (errors.length > 0) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return;
    }

    // Remove empty rows before submitting
    this.data.items = this.data.items.filter((item: any) => this.isItemFilled(item));
    if (this.data.products) {
      this.data.products = this.data.products.filter((p: any) => this.isProductFilled(p));
    }

    this.submit.emit({ ...this.data, status: 'submitted' });
    this.close.emit();
  }

  handleSavePreOrder() {
    const errors = this.validatePurchaseForm();
    
    if (errors.length > 0) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return;
    }

    // Remove empty rows
    this.data.items = this.data.items.filter((item: any) => this.isItemFilled(item));

    this.submit.emit({ ...this.data, status: 'pre-order' });
    this.close.emit();
  }
}
