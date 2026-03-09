import { Component, OnInit, NgZone, inject, HostListener, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, GridOptions, themeQuartz } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { CalendarComponent } from '../../../../shared/calendar/calendar.component';
import { PurchaseItem } from '../../../../core/models/inventory.models';
import { InventoryService } from '../../../../core/services/inventory.service';
import { UnifiedFilterPanelComponent, FilterField } from '../../../../shared/unified-filter-panel/unified-filter-panel.component';

@Component({
  selector: 'app-inventory-purchase-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, PaginationComponent, CalendarComponent, UnifiedFilterPanelComponent],
  templateUrl: './inventory-purchase-tab.component.html',
  styleUrls: ['./inventory-purchase-tab.component.css']
})
export class InventoryPurchaseTabComponent implements OnInit, OnChanges {
  searchText: string = '';
  startDate?: string;
  endDate?: string;

  currentPage: number = 1;
  pageSize: number = 15;
  totalRecords: number = 0;
  totalPages: number = 0;
  isLoading: boolean = false;

  // Filter Props
  showFilterPanel: boolean = false;
  filterFields: FilterField[] = [];
  filterCriteria: any = {
    purchaseType: 'All',
    status: 'All'
  };

  types: string[] = [];
  statuses: string[] = [];

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
  purchaseData: PurchaseItem[] = [];
  allFilteredData: PurchaseItem[] = [];

  @Input() reloadTrigger: number = 0;
  @Output() viewPurchase = new EventEmitter<PurchaseItem>();
  @Output() loadingChange = new EventEmitter<boolean>();

  private ngZone = inject(NgZone);
  private inventoryService = inject(InventoryService);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.gridApi) {
      setTimeout(() => {
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
  }

  constructor() {
    this.columnDefs = [
      { field: 'purchase_id', headerName: 'ID', flex: 0.8, minWidth: 90 },
      { field: 'invoiceDate', headerName: 'DATE', flex: 1, minWidth: 100 },
      { field: 'invoiceNumber', headerName: 'INVOICE NO.', flex: 1.2, minWidth: 140 },
      {
        field: 'purchaseFrom',
        headerName: 'PURCHASE FROM',
        flex: 1.5,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams) => {
          const span = document.createElement('span');
          span.innerText = params.value;
          span.style.overflow = 'hidden';
          span.style.textOverflow = 'ellipsis';
          span.style.whiteSpace = 'nowrap';
          span.style.display = 'block';
          span.style.width = '100%';
          return span;
        }
      },
      {
        field: 'deliveredToName',
        headerName: 'DELIVERED TO',
        flex: 1.2,
        minWidth: 130,
        cellRenderer: (params: ICellRendererParams) => {
          const span = document.createElement('span');
          span.innerText = params.value;
          span.style.overflow = 'hidden';
          span.style.textOverflow = 'ellipsis';
          span.style.whiteSpace = 'nowrap';
          span.style.display = 'block';
          span.style.width = '100%';
          return span;
        }
      },
      { field: 'purchaseType', headerName: 'TYPE', flex: 0.8, minWidth: 90 },
      { field: 'totalItems', headerName: 'ITEMS', flex: 0.6, minWidth: 70 },
      {
        field: 'status',
        headerName: 'STATUS',
        flex: 1,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams) => {
          const span = document.createElement('span');
          span.innerText = params.value;
          span.style.fontWeight = '500';

          if (params.data && params.data.statusColor) {
            span.style.color = params.data.statusColor;
          } else {
            span.style.color = '#333';
          }
          return span;
        }
      },
      {
        headerName: 'ACTION',
        field: 'action',
        flex: 0.7,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement('div');
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.justifyContent = 'center';
          container.style.height = '100%';
          container.style.gap = '10px';

          const infoImg = document.createElement('img');
          infoImg.src = 'assets/icons/information-icon.svg';
          infoImg.style.cursor = 'pointer';
          infoImg.style.width = '20px';
          infoImg.style.height = '20px';

          infoImg.addEventListener('click', () => {
            this.ngZone.run(() => {
              this.viewPurchase.emit(params.data);
            });
          });

          container.appendChild(infoImg);
          return container;
        },
      }
    ];
  }

  ngOnInit() {
    // Initial load triggered by CalendarComponent's dateRangeSelected emission on init
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadTrigger'] && !changes['reloadTrigger'].firstChange) {
      this.fetchPurchaseData();
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    if (this.allFilteredData.length > 0) {
      setTimeout(() => this.gridApi.sizeColumnsToFit(), 0);
    }
  }

  onDateRangeChange(payload: any) {
    if (payload?.startDate && payload?.endDate) {
      const start = new Date(payload.startDate);
      const end = new Date(payload.endDate);

      this.startDate = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())).toISOString();
      this.endDate = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())).toISOString();
    } else {
      this.startDate = undefined;
      this.endDate = undefined;
    }
    this.currentPage = 1;
    this.fetchPurchaseData();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.filterData();
  }

  filterData() {
    let filtered = [...this.purchaseData];

    // Search
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      filtered = filtered.filter((item: any) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(q)
        )
      );
    }

    // Local Filters
    filtered = filtered.filter(item => {
      if (this.filterCriteria.purchaseType !== 'All' && item.purchaseType !== this.filterCriteria.purchaseType) return false;
      if (this.filterCriteria.status !== 'All' && item.status !== this.filterCriteria.status) return false;
      return true;
    });

    this.allFilteredData = filtered;

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.allFilteredData);
    }
  }

  populateFilterOptions() {
    const uniqueTypes = new Set<string>();
    const uniqueStatuses = new Set<string>();

    this.purchaseData.forEach(item => {
      if (item.purchaseType) uniqueTypes.add(item.purchaseType);
      if (item.status) uniqueStatuses.add(item.status);
    });

    this.types = Array.from(uniqueTypes).sort();
    this.statuses = Array.from(uniqueStatuses).sort();

    this.setupFilterFields();
  }

  setupFilterFields() {
    this.filterFields = [
      {
        key: 'purchaseType',
        label: 'Select Type',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.types.map(t => ({ label: t, value: t }))]
      },
      {
        key: 'status',
        label: 'Select Status',
        type: 'dropdown',
        options: [{ label: 'All', value: 'All' }, ...this.statuses.map(s => ({ label: s, value: s }))]
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
      purchaseType: 'All',
      status: 'All'
    };
    this.filterData();
  }

  onFilterApply(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.filterData();
    this.showFilterPanel = false;
  }

  onFilterCriteriaChange(criteria: any) {
    this.filterCriteria = { ...criteria };
    this.filterData();
  }

  fetchPurchaseData() {
    this.setLoading(true);
    const params = {
      pageNo: this.currentPage,
      pageSize: this.pageSize,
      startDate: this.startDate,
      endDate: this.endDate
    };

    this.inventoryService.getPurchaseList(params).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.purchaseData = res.data;
          this.totalRecords = res.pagination ? res.pagination.totalRecords : this.purchaseData.length;
          this.totalPages = res.pagination ? res.pagination.totalPages : 1;

          this.populateFilterOptions();
          this.filterData();
        } else {
          console.warn("API responded successfully but data is not present:", res);
        }
        this.setLoading(false);
      },
      error: (err) => {
        console.error("Error fetching purchase data", err);
        this.setLoading(false);
      }
    });
  }

  get paginatedData() {
    return this.allFilteredData; // Grid is fed this array directly for server-side pagination simulation
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.fetchPurchaseData();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.fetchPurchaseData();
  }

  private setLoading(status: boolean) {
    this.isLoading = status;
    this.loadingChange.emit(status);
  }
}
