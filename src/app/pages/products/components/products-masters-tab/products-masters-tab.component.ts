import { Component, OnInit, NgZone, inject, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, GridOptions, themeQuartz } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { ProductsService } from '../../../../core/services/products.service';
import { MasterProduct } from '../../../../core/models/product.models';
import { UnifiedFilterPanelComponent, FilterField } from '../../../../shared/unified-filter-panel/unified-filter-panel.component';

@Component({
  selector: 'app-products-masters-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, PaginationComponent, UnifiedFilterPanelComponent],
  templateUrl: './products-masters-tab.component.html',
  styleUrls: ['./products-masters-tab.component.css']
})
export class ProductsMastersTabComponent implements OnInit, OnChanges {
  searchQuery: string = '';
  @Input() reloadTrigger: number = 0;
  @Output() viewProduct = new EventEmitter<MasterProduct>();

  isLoading: boolean = false;
  mastersData: MasterProduct[] = [];
  mastersFilteredData: MasterProduct[] = [];
  currentPage: number = 1;
  pageSize: number = 15;

  // Filter Props
  showFilterPanel: boolean = false;
  filterFields: FilterField[] = [];
  filterCriteria: any = {
    make: 'All',
    model: 'All',
    units: 'All'
  };

  makes: string[] = [];
  models: string[] = [];
  units: string[] = [];

  private gridApi!: GridApi;

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

  mastersColumnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    suppressMovable: true,
    sortable: true,
    filter: false,
  };

  private productsService = inject(ProductsService);
  private ngZone = inject(NgZone);

  constructor() {
    this.mastersColumnDefs = [
      { field: "productId", headerName: "ID", flex: 0.7, minWidth: 80 },
      { field: "productName", headerName: "PRODUCT NAME", flex: 1.8, minWidth: 200 },
      { field: "units", headerName: "UNITS", flex: 0.8, minWidth: 90 },
      { field: "make", headerName: "MAKE", flex: 1, minWidth: 130 },
      { field: "model", headerName: "MODEL", flex: 1.5, minWidth: 200 },
      { field: "productCode", headerName: "PRODUCT CODE", flex: 1.2, minWidth: 150 },
      { field: "publishedDate", headerName: "PUBLISHED DATE", flex: 1.2, minWidth: 140 },
      { field: "useFor", headerName: "USE FOR", flex: 1.2, minWidth: 150 },
      {
        field: "action",
        headerName: "ACTION",
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
    this.loadMastersProducts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadTrigger'] && !changes['reloadTrigger'].firstChange) {
      this.loadMastersProducts();
    }
  }

  onSearchChange() {
    this.applyMastersSearchAndFilters();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  loadMastersProducts() {
    this.isLoading = true;
    this.productsService.getMastersProducts().subscribe({
      next: (response: any) => {
        if (response?.data && Array.isArray(response.data)) {
          this.mastersData = response.data.map((p: any) => ({
            ...p,
            productId: p.productId || p.id
          }));
          this.populateFilterOptions();
          this.applyMastersSearchAndFilters();
        } else {
          this.mastersData = [];
          this.mastersFilteredData = [];
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading masters products:', err);
        this.mastersData = [];
        this.mastersFilteredData = [];
        this.isLoading = false;
      }
    });
  }

  applyMastersSearchAndFilters() {
    let filtered = [...this.mastersData];

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.productId && p.productId.toString().toLowerCase().includes(q)) ||
          (p.productName && p.productName.toLowerCase().includes(q)) ||
          (p.make && p.make.toLowerCase().includes(q)) ||
          (p.model && p.model.toLowerCase().includes(q)) ||
          (p.productCode && p.productCode.toLowerCase().includes(q)) ||
          (p.useFor && p.useFor.toLowerCase().includes(q)),
      );
    }

    // Filters
    filtered = filtered.filter(p => {
      if (this.filterCriteria.make !== 'All' && p.make !== this.filterCriteria.make) return false;
      if (this.filterCriteria.model !== 'All' && p.model !== this.filterCriteria.model) return false;
      if (this.filterCriteria.units !== 'All' && p.units !== this.filterCriteria.units) return false;
      return true;
    });

    this.mastersFilteredData = filtered;
    this.currentPage = 1;

    if (this.gridApi) {
      this.gridApi.setGridOption("rowData", this.paginatedData);
    }
  }

  populateFilterOptions() {
    const uniqueMakes = new Set<string>();
    const uniqueModels = new Set<string>();
    const uniqueUnits = new Set<string>();

    this.mastersData.forEach(p => {
      if (p.make) uniqueMakes.add(p.make);
      if (p.model) uniqueModels.add(p.model);
      if (p.units) uniqueUnits.add(p.units);
    });

    this.makes = Array.from(uniqueMakes).sort();
    this.models = Array.from(uniqueModels).sort();
    this.units = Array.from(uniqueUnits).sort();

    this.setupFilterFields();
  }

  setupFilterFields() {
    this.filterFields = [
      {
        key: 'make',
        label: 'Select Make',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.makes.map(m => ({ label: m, value: m }))]
      },
      {
        key: 'model',
        label: 'Select Model',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.models.map(m => ({ label: m, value: m }))]
      },
      {
        key: 'units',
        label: 'Select Units',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.units.map(u => ({ label: u, value: u }))]
      }
    ];
  }

  toggleFilterPanel() {
    this.showFilterPanel = !this.showFilterPanel;
  }

  onFilterClose() {
    this.showFilterPanel = false;
  }

  onFilterReset() {
    this.filterCriteria = {
      make: 'All',
      model: 'All',
      units: 'All'
    };
    this.applyMastersSearchAndFilters();
  }

  onFilterApply(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.applyMastersSearchAndFilters();
    this.showFilterPanel = false;
  }

  onFilterCriteriaChange(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.applyMastersSearchAndFilters();
  }

  get totalPages() {
    return Math.ceil(this.mastersFilteredData.length / this.pageSize) || 1;
  }

  get paginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.mastersFilteredData.slice(start, start + this.pageSize);
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  resizeGrid() {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit();
    }
  }
}
