import { Component, OnInit, NgZone, inject, Output, EventEmitter, Input, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, GridOptions, themeQuartz } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { ItemsService } from '../../../../core/services/items.service';
import { Item } from '../../../../core/models/item.models';
import { UnifiedFilterPanelComponent, FilterField } from '../../../../shared/unified-filter-panel/unified-filter-panel.component';

@Component({
  selector: 'app-items-masters-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, PaginationComponent, UnifiedFilterPanelComponent],
  templateUrl: './items-masters-tab.component.html',
  styleUrls: ['./items-masters-tab.component.css']
})
export class ItemsMastersTabComponent implements OnInit, OnChanges {
  searchQuery: string = '';
  @Input() reloadTrigger: number = 0;
  @Output() viewItem = new EventEmitter<Item>();

  isLoading: boolean = false;
  items: Item[] = [];
  rowData: Item[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 15;
  totalItems: number = 0;

  // Filters
  showFilterPanel: boolean = false;
  units: string[] = [];
  makes: string[] = [];
  models: string[] = [];
  usedForOptions: string[] = [];
  natures: string[] = [];
  domains: string[] = [];
  categories: string[] = [];
  filterFields: FilterField[] = [];

  filterCriteria: any = {
    units: "All",
    make: "All",
    model: "All",
    usedFor: "All",
    nature: "All",
    domain: "All",
    category: "All",
  };

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

  private itemsService = inject(ItemsService);
  private ngZone = inject(NgZone);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.gridApi) {
      setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
  }

  constructor() {
    this.mastersColumnDefs = [
      { field: "id", headerName: "ITEM ID", flex: 0.8, minWidth: 100 },
      { field: "itemName", headerName: "ITEM NAME", flex: 1.8, minWidth: 200, cellStyle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      { field: "itemCode", headerName: "ITEM CODE", flex: 1.2, minWidth: 150, cellStyle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      { field: "units", headerName: "UNITS", flex: 0.8, minWidth: 90 },
      { field: "make", headerName: "MAKE", flex: 1, minWidth: 130, cellStyle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      { field: "model", headerName: "MODEL", flex: 1.5, minWidth: 200, cellStyle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      {
        field: "usedFor",
        headerName: "USE FOR",
        flex: 1.2,
        minWidth: 150,
        cellStyle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
      },
      {
        field: "action",
        headerName: "ACTION",
        sortable: false,
        flex: 0.6,
        minWidth: 90,
        suppressSizeToFit: false,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.classList.add('ag-cell-centered-flex');

          const img = document.createElement("img");
          img.src = "assets/icons/information-icon.svg";
          img.alt = "View";
          img.classList.add('ag-cell-action-icon');

          img.addEventListener("click", () => {
            this.ngZone.run(() => {
              this.viewItem.emit(params.data);
            });
          });

          container.appendChild(img);
          return container;
        },
      },
    ];
  }

  ngOnInit() {
    this.loadItems();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadTrigger'] && !changes['reloadTrigger'].firstChange) {
      this.loadItems();
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.updateGridData();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.updateGridData();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadItems();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    this.loadItems();
  }

  loadItems() {
    this.isLoading = true;
    this.itemsService.getItems(this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        if (response?.data && Array.isArray(response.data)) {
          this.items = response.data;
          this.rowData = this.items;
          this.totalItems = response.pagination?.totalRecords || response.totalCount || response.total || response.count || 0;

          this.populateFilterOptions();

          if (this.gridApi) {
            this.gridApi.setGridOption("rowData", this.rowData);
          }
        } else {
          this.items = [];
          this.rowData = [];
          this.totalItems = 0;
          if (this.gridApi) {
            this.gridApi.setGridOption("rowData", []);
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error("Error loading items:", err);
      },
    });
  }

  updateGridData() {
    let filtered = this.items;

    // Search filter (only for masters tab) - Applied to current page
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.id && i.id.toString().toLowerCase().includes(q)) ||
          (i.itemName && i.itemName.toLowerCase().includes(q)) ||
          (i.itemCode && i.itemCode.toLowerCase().includes(q)) ||
          (i.make && i.make.toLowerCase().includes(q)) ||
          (i.model && i.model.toLowerCase().includes(q)) ||
          (i.units && i.units.toLowerCase().includes(q)) ||
          (i.usedFor && i.usedFor.toLowerCase().includes(q)),
      );
    }

    filtered = this.applyFilterCriteria(filtered);
    this.rowData = filtered;

    if (this.gridApi) {
      this.gridApi.setGridOption("rowData", this.rowData);
    }
  }

  // --- Filter Logic ---
  populateFilterOptions() {
    const uniqueUnits = new Set<string>();
    const uniqueMakes = new Set<string>();
    const uniqueModels = new Set<string>();
    const uniqueUsedFor = new Set<string>();
    const uniqueNatures = new Set<string>();
    const uniqueDomains = new Set<string>();
    const uniquePartcodes = new Set<string>();

    this.items.forEach(item => {
      if (item.units) uniqueUnits.add(item.units);
      if (item.make) uniqueMakes.add(item.make);
      if (item.model) uniqueModels.add(item.model);
      if (item.usedFor) uniqueUsedFor.add(item.usedFor);
      if (item.inv_nature) uniqueNatures.add(item.inv_nature);
      if (item.inv_domain) uniqueDomains.add(item.inv_domain);
      if (item.inv_partcode) uniquePartcodes.add(item.inv_partcode);
    });

    this.units = Array.from(uniqueUnits).sort();
    this.makes = Array.from(uniqueMakes).sort();
    this.models = Array.from(uniqueModels).sort();
    this.usedForOptions = Array.from(uniqueUsedFor).sort();
    this.natures = Array.from(uniqueNatures).sort();
    this.domains = Array.from(uniqueDomains).sort();
    this.categories = Array.from(uniquePartcodes).sort();

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
        key: 'usedFor',
        label: 'Select Used For',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.usedForOptions.map(u => ({ label: u, value: u }))]
      },
      {
        key: 'nature',
        label: 'Select Nature',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.natures.map(n => ({ label: n, value: n }))]
      },
      {
        key: 'domain',
        label: 'Select Domain',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.domains.map(d => ({ label: d, value: d }))]
      },
      {
        key: 'category',
        label: 'Select Category',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.categories.map(c => ({ label: c, value: c }))]
      },
      {
        key: 'units',
        label: 'Select Units',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.units.map(u => ({ label: u, value: u }))]
      }
    ];
  }

  applyFilterCriteria(items: Item[]): Item[] {
    return items.filter((item) => {
      if (this.filterCriteria.units !== "All" && item.units !== this.filterCriteria.units) return false;
      if (this.filterCriteria.make !== "All" && item.make !== this.filterCriteria.make) return false;
      if (this.filterCriteria.model !== "All" && item.model !== this.filterCriteria.model) return false;
      if (this.filterCriteria.usedFor !== "All" && item.usedFor !== this.filterCriteria.usedFor) return false;
      if (this.filterCriteria.nature !== "All" && item.inv_nature !== this.filterCriteria.nature) return false;
      if (this.filterCriteria.domain !== "All" && item.inv_domain !== this.filterCriteria.domain) return false;
      if (this.filterCriteria.category !== "All" && item.inv_partcode !== this.filterCriteria.category) return false;
      return true;
    });
  }

  toggleFilterPanel() {
    this.showFilterPanel = !this.showFilterPanel;
  }

  onFilterClose() {
    this.showFilterPanel = false;
  }

  onFilterReset() {
    this.filterCriteria = {
      units: "All",
      make: "All",
      model: "All",
      usedFor: "All",
      nature: "All",
      domain: "All",
      category: "All",
    };
    this.currentPage = 1;
    this.updateGridData();
  }

  onFilterApply(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.currentPage = 1;
    this.updateGridData();
    this.showFilterPanel = false;
  }

  onFilterCriteriaChange(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.currentPage = 1;
    this.updateGridData();
  }
}
