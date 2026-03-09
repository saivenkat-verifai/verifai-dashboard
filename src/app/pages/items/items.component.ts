import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ItemsModalComponent } from "./components/items-modal/items-modal.component";
import { ItemsAllTabComponent } from "./components/items-all-tab/items-all-tab.component";
import { ItemsMastersTabComponent } from "./components/items-masters-tab/items-masters-tab.component";
import { Item, AllItem } from "../../core/models/item.models";

@Component({
  selector: "app-items",
  standalone: true,
  imports: [
    CommonModule,
    ItemsModalComponent,
    ItemsAllTabComponent,
    ItemsMastersTabComponent
  ],
  providers: [],
  templateUrl: "./items.component.html",
  styleUrls: ["./items.component.css"],
})
export class ItemsComponent implements OnInit {
  activeTab: 'all' | 'masters' = 'all';
  showModal: boolean = false;
  modalMode: "create" | "view" | "addModel" | "listitem" = "create";
  selectedItem: any = {};
  reloadTrigger: number = 0;

  constructor() { }

  ngOnInit() { }

  switchTab(tab: 'all' | 'masters') {
    this.activeTab = tab;
  }

  // --- Modals ---
  openCreateModal() {
    this.modalMode = "create";
    this.selectedItem = {};
    this.showModal = true;
  }

  openAddModelModal() {
    this.modalMode = "addModel";
    this.selectedItem = {};
    this.showModal = true;
  }

  openViewModal(item: Item) {
    this.selectedItem = item;
    this.modalMode = "view";
    this.showModal = true;
  }

  openAllItemModal(item: any) {
    this.selectedItem = { ...item };
    this.modalMode = "listitem";
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.triggerReload();
  }

  triggerReload() {
    this.reloadTrigger++;
  }
}
