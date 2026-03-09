import { Component, OnInit, NgZone, inject, HostListener, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, GridOptions, themeQuartz } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { CalendarComponent } from '../../../../shared/calendar/calendar.component';
import { InventoryService } from '../../../../core/services/inventory.service';
import { StockItem } from '../../../../core/models/inventory.models';
import { UnifiedFilterPanelComponent, FilterField } from '../../../../shared/unified-filter-panel/unified-filter-panel.component';

@Component({
  selector: 'app-inventory-stock-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, PaginationComponent, CalendarComponent, UnifiedFilterPanelComponent],
  templateUrl: './inventory-stock-tab.component.html',
  styleUrls: ['./inventory-stock-tab.component.css']
})
export class InventoryStockTabComponent implements OnInit, OnChanges {
  @Input() selectedStore: any;
  searchText: string = '';
  startDate?: string;
  endDate?: string;

  currentPage: number = 1;
  pageSize: number = 15;
  totalRecords: number = 0;
  isLoading: boolean = false;

  // Filter Props
  showFilterPanel: boolean = false;
  filterFields: FilterField[] = [];
  filterCriteria: any = {
    make: 'All',
    model: 'All',
    unitsName: 'All'
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
    defaultColDef: {
      sortable: true,
      filter: false,
      resizable: true,
      suppressMovable: true,
    },
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit();
    }
  };

  columnDefs: ColDef[] = [];
  stockData: StockItem[] = [];

  @Output() viewClosingStatement = new EventEmitter<any>();

  private ngZone = inject(NgZone);
  private inventoryService = inject(InventoryService);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.gridApi) {
      setTimeout(() => this.gridApi.sizeColumnsToFit(), 100);
    }
  }

  constructor() {
    this.columnDefs = [
      { field: 'itemId', headerName: 'ITEM ID', flex: 1, minWidth: 80 },
      {
        field: 'itemName',
        headerName: 'ITEM NAME',
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams) => {
          const wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.alignItems = 'center';
          wrapper.style.height = '100%';
          wrapper.style.width = '100%';
          wrapper.style.overflow = 'hidden';

          const name = document.createElement('span');
          const make = params.data?.make || '';
          const model = params.data?.model || '';
          const suffix = [make, model].filter(Boolean).join(' - ');
          name.innerText = suffix ? `${params.value || ''} - ${suffix}` : (params.value || '');
          name.style.overflow = 'hidden';
          name.style.textOverflow = 'ellipsis';
          name.style.whiteSpace = 'nowrap';
          name.style.width = '100%';
          name.style.fontSize = '13px';
          wrapper.appendChild(name);

          return wrapper;
        }
      },
      {
        field: 'itemCode',
        headerName: 'ITEM CODE',
        flex: 1.5,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams) => {
          const span = document.createElement('span');
          span.innerText = params.value || '';
          span.style.overflow = 'hidden';
          span.style.textOverflow = 'ellipsis';
          span.style.whiteSpace = 'nowrap';
          span.style.display = 'block';
          span.style.width = '100%';
          return span;
        }
      },
      { field: 'unitsName', headerName: 'UNITS', flex: 0.7, minWidth: 70 },
      { field: 'opening', headerName: 'OPENING', flex: 0.8, minWidth: 80 },
      { field: 'purchase', headerName: 'PURCHASE', flex: 0.8, minWidth: 80 },
      { field: 'issued', headerName: 'ISSUED', flex: 0.8, minWidth: 80 },
      { field: 'returned', headerName: 'RETURNED', flex: 0.8, minWidth: 90 },
      {
        field: 'closing',
        headerName: 'CLOSING',
        flex: 0.8,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams) => {
          const span = document.createElement('span');
          span.innerText = String(params.value ?? 0);
          span.style.display = 'inline-flex';
          span.style.alignItems = 'center';
          span.style.justifyContent = 'center';
          span.style.padding = '8px 8px';
          span.style.borderRadius = '4px';
          span.style.fontSize = '12px';
          span.style.fontWeight = '500';
          span.style.width = '50px';
          span.style.height = '30px';
          span.style.background = '#53BF8B1A';
          span.style.color = '#53BF8B';
          span.style.cursor = 'pointer';
          span.onclick = () => {
            this.ngZone.run(() => this.viewClosingStatement.emit(params.data));
          };
          if (!params.value || params.value === 0) {
            span.style.background = '#ED32371A';
            span.style.color = '#ED3237';
          }
          return span;
        }
      },
      {
        field: 'preorder',
        headerName: 'PRE-ORDER',
        flex: 0.8,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.value > 0) {
            const span = document.createElement('span');
            span.innerText = String(params.value);
            span.style.padding = '8px 8px';
            span.style.height = '30px';
            span.style.width = '50px';
            span.style.display = 'inline-flex';
            span.style.alignItems = 'center';
            span.style.justifyContent = 'center';
            span.style.borderRadius = '4px';
            span.style.fontSize = '12px';
            span.style.fontWeight = '500';
            span.style.background = 'transparent linear-gradient(180deg, #FFFFFF 0%, #EEEEEE 100%)';
            span.style.color = '#000000';
            return span;
          }
          return '';
        }
      }
    ];
  }

  ngOnInit() {
    // Data load is triggered by the calendar's initial dateRangeSelected emission
    // to avoid a double call (once without dates, once with dates)
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedStore'] && !changes['selectedStore'].firstChange) {
      this.currentPage = 1;
      this.loadStockData();
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi.sizeColumnsToFit(), 0);
  }

  onDateRangeChange(payload: any) {
    if (payload?.startDate && payload?.endDate) {
      const start = new Date(payload.startDate);
      const end = new Date(payload.endDate);

      // Construct UTC midnight dates: YYYY-MM-DDT00:00:00.000Z
      this.startDate = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())).toISOString();
      this.endDate = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())).toISOString();
    } else {
      this.startDate = undefined;
      this.endDate = undefined;
    }
    this.currentPage = 1;
    this.loadStockData();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  applyLocalFilters() {
    let filtered = [...this.stockData];

    // Note: The API already handles search and date range.
    // We are applying filters (Make, Model, Units) locally on the current page's data 
    // unless the API supports these as parameters.

    filtered = filtered.filter(item => {
      if (this.filterCriteria.make !== 'All' && item.make !== this.filterCriteria.make) return false;
      if (this.filterCriteria.model !== 'All' && item.model !== this.filterCriteria.model) return false;
      if (this.filterCriteria.unitsName !== 'All' && item.unitsName !== this.filterCriteria.unitsName) return false;
      return true;
    });

    if (this.gridApi) {
      this.gridApi.setGridOption("rowData", filtered);
    }
  }

  populateFilterOptions() {
    const uniqueMakes = new Set<string>();
    const uniqueModels = new Set<string>();
    const uniqueUnits = new Set<string>();

    this.stockData.forEach(item => {
      if (item.make) uniqueMakes.add(item.make);
      if (item.model) uniqueModels.add(item.model);
      if (item.unitsName) uniqueUnits.add(item.unitsName);
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
        key: 'unitsName',
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
      unitsName: 'All'
    };
    this.applyLocalFilters();
  }

  onFilterApply(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.applyLocalFilters();
    this.showFilterPanel = false;
  }

  onFilterCriteriaChange(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.applyLocalFilters();
  }

  loadStockData() {
    this.isLoading = true;
    this.inventoryService.getStockSummary(
      this.currentPage,
      this.pageSize,
      this.searchText,
      this.startDate,
      this.endDate,
      this.selectedStore?.code
    ).subscribe({
      next: (res: any) => {
        this.stockData = res?.data || [];
        this.totalRecords = res?.pagination?.totalRecords ?? this.stockData.length;

        this.populateFilterOptions();
        this.applyLocalFilters();

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadStockData();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadStockData();
  }
}
