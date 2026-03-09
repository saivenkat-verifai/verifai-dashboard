import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ProductsModalComponent } from "./components/products-modal/products-modal.component";
import { ProductsAllTabComponent } from "./components/products-all-tab/products-all-tab.component";
import { ProductsMastersTabComponent } from "./components/products-masters-tab/products-masters-tab.component";
import { ProductListItem, MasterProduct } from "../../core/models/product.models";

@Component({
  selector: "app-products",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductsModalComponent,
    ProductsAllTabComponent,
    ProductsMastersTabComponent
  ],
  templateUrl: "./products.component.html",
  styleUrls: ["./products.component.css"],
})
export class ProductsComponent {
  activeTab: 'all' | 'masters' = 'all';

  searchQuery: string = "";
  showModal: boolean = false;
  modalMode: "create" | "view" | "addProduct" | "listitem" = "create";
  selectedProduct: any = {};
  reloadTrigger: number = 0;

  switchTab(tab: 'all' | 'masters') {
    this.activeTab = tab;
    this.searchQuery = "";
  }

  onSearchChange() {
    // Triggers ngOnChanges in the child components through input binding
  }

  openCreateModal() {
    this.modalMode = "create";
    this.selectedProduct = {};
    this.showModal = true;
  }

  openAddProductModal() {
    this.modalMode = "addProduct";
    this.selectedProduct = {};
    this.showModal = true;
  }

  openViewModal(product: MasterProduct) {
    this.selectedProduct = { ...product };
    this.modalMode = "view";
    this.showModal = true;
  }

  openAllProductModal(product: ProductListItem) {
    this.selectedProduct = { ...product };
    this.modalMode = "listitem";
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.reloadTrigger++;
  }
}
