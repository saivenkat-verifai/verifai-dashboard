import { Component, OnInit, NgZone, inject, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, GridOptions, themeQuartz } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { ProductsService } from '../../../../core/services/products.service';
import { ProductListItem } from '../../../../core/models/product.models';

@Component({
  selector: 'app-products-all-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, PaginationComponent],
  templateUrl: './products-all-tab.component.html',
  styleUrls: ['./products-all-tab.component.css']
})
export class ProductsAllTabComponent implements OnInit, OnChanges {
  searchQuery: string = '';
  @Input() reloadTrigger: number = 0;
  @Output() viewProduct = new EventEmitter<ProductListItem>();

  isLoading: boolean = false;
  allProductsData: ProductListItem[] = [];
  allCurrentPage: number = 1;
  allPageSize: number = 10;
  allTotalRecords: number = 0;
  private allGridApi!: GridApi;

  theme: any = themeQuartz;
  gridOptions: GridOptions = {
    suppressCellFocus: true,
    suppressRowHoverHighlight: false,
    headerHeight: 40,
    rowHeight: 45,
    animateRows: false,
    theme: this.theme,
    suppressColumnVirtualisation: true,
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit();
    }
  };

  allColumnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    suppressMovable: true,
    sortable: true,
    filter: false,
  };

  private productsService = inject(ProductsService);
  private ngZone = inject(NgZone);

  constructor() {
    this.allColumnDefs = [
      {
        field: "productName",
        headerName: "PRODUCT",
        flex: 2,
        minWidth: 250,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.style.display = "flex";
          container.style.alignItems = "center";
          container.style.gap = "12px";
          container.style.width = "100%";
          container.style.height = "100%";

          const imgContainer = document.createElement("div");
          imgContainer.style.width = "35px";
          imgContainer.style.height = "35px";
          imgContainer.style.minWidth = "35px";
          imgContainer.style.minHeight = "35px";
          imgContainer.style.background = "#f0f0f0";
          imgContainer.style.borderRadius = "4px";
          imgContainer.style.display = "flex";
          imgContainer.style.alignItems = "center";
          imgContainer.style.justifyContent = "center";
          imgContainer.style.overflow = "hidden";
          imgContainer.style.flexShrink = "0";

          const img = document.createElement("img");
          img.src = "assets/ptz.jpg";
          img.alt = params.data?.productName || '';
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";
          imgContainer.appendChild(img);

          const nameSpan = document.createElement("span");
          nameSpan.textContent = params.data?.productName || '';
          if (params.data?.make && params.data?.model) {
            nameSpan.textContent += " | " + params.data.make + " - " + params.data.model;
          }
          nameSpan.style.fontWeight = "500";
          nameSpan.style.fontSize = "12px";
          nameSpan.style.color = "#000000";
          nameSpan.style.overflow = "hidden";
          nameSpan.style.textOverflow = "ellipsis";
          nameSpan.style.whiteSpace = "nowrap";
          nameSpan.style.flex = "1";

          container.appendChild(imgContainer);
          container.appendChild(nameSpan);
          return container;
        },
      },
      { field: "serialNumber", headerName: "SERIAL NUMBER", flex: 1.3, minWidth: 150 },
      { field: "barCode", headerName: "BARCODE NO.", flex: 1.2, minWidth: 140 },
      { field: "quantity", headerName: "QTY", flex: 0.6, minWidth: 70 },
      { field: "publishedDate", headerName: "PUBLISHED DATE", flex: 1.2, minWidth: 130 },
      {
        field: "currentLocation",
        headerName: "CURRENT LOCATION",
        flex: 1.8,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.style.width = "100%";
          container.style.overflow = "hidden";

          const span = document.createElement("span");
          span.textContent = params.value || '-';
          span.style.display = "block";
          span.style.width = "100%";
          span.style.whiteSpace = "nowrap";
          span.style.overflow = "hidden";
          span.style.textOverflow = "ellipsis";

          container.appendChild(span);
          return container;
        }
      },
      {
        field: "status",
        headerName: "STATUS",
        flex: 0.2,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams) => {
          const span = document.createElement("span");
          span.textContent = params.value;
          span.style.fontWeight = "600";
          span.style.fontSize = "11px";
          const statusColors: { [key: string]: string } = {
            New: "#000000", Used: "rgba(0, 0, 0, 0.5)", Sale: "#53BF8B", Lease: "#FFC400", Scrap: "#ED3237",
          };
          span.style.color = statusColors[params.value] || "#000000";
          return span;
        },
      },
      {
        field: "action",
        headerName: "MORE",
        sortable: false,
        flex: 0.6,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.style.display = "flex";
          container.style.alignItems = "center";
          container.style.justifyContent = "center";
          container.style.height = "100%";

          const img = document.createElement("img");
          img.src = "assets/icons/information-icon.svg";
          img.alt = "View";
          img.style.cursor = "pointer";
          img.style.width = "20px";
          img.style.height = "20px";

          img.addEventListener("click", () => {
            this.ngZone.run(() => {
              this.viewProduct.emit(params.data);
            });
          });

          container.appendChild(img);
          return container;
        }
      }
    ];
  }

  ngOnInit() {
    this.loadAllProducts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadTrigger'] && !changes['reloadTrigger'].firstChange) {
      this.loadAllProducts();
    }
  }

  onSearchChange() {
    this.allCurrentPage = 1;
    this.loadAllProducts();
  }

  onGridReady(params: GridReadyEvent) {
    this.allGridApi = params.api;
  }

  loadAllProducts() {
    this.isLoading = true;
    this.productsService.getAllProducts(this.allCurrentPage, this.allPageSize, this.searchQuery).subscribe({
      next: (response: any) => {
        if (response?.data && Array.isArray(response.data)) {
          this.allProductsData = response.data;
          this.allTotalRecords = response.pagination?.totalRecords || response.data.length;
        } else {
          this.allProductsData = [];
          this.allTotalRecords = 0;
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading all products:', err);
        this.allProductsData = [];
        this.allTotalRecords = 0;
        this.isLoading = false;
      }
    });
  }

  get allTotalPages() {
    return Math.ceil(this.allTotalRecords / this.allPageSize) || 1;
  }

  onPageSizeChange(size: number) {
    this.allPageSize = size;
    this.allCurrentPage = 1;
    this.loadAllProducts();
  }

  onPageChange(page: number) {
    this.allCurrentPage = page;
    this.loadAllProducts();
  }

  resizeGrid() {
    if (this.allGridApi) {
      this.allGridApi.sizeColumnsToFit();
    }
  }
}
