import { Component, OnInit, NgZone, inject, HostListener, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, GridOptions } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { CalendarComponent } from '../../../../shared/calendar/calendar.component';
import { ReturnListItem, ReturnListParams } from '../../../../core/models/inventory.models';
import { InventoryService } from '../../../../core/services/inventory.service';
import { UnifiedFilterPanelComponent, FilterField } from '../../../../shared/unified-filter-panel/unified-filter-panel.component';


@Component({
  selector: 'app-inventory-return-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, PaginationComponent, CalendarComponent, UnifiedFilterPanelComponent],
  templateUrl: './inventory-return-tab.component.html',
  styleUrls: ['./inventory-return-tab.component.css']
})
export class InventoryReturnTabComponent implements OnInit, OnChanges {
  @Input() reloadTrigger: number = 0;
  searchText: string = '';
  startDate?: string;
  endDate?: string;

  currentPage: number = 1;
  pageSize: number = 15;
  totalRecords: number = 0;
  totalPages: number = 1;

  // Filter Props
  showFilterPanel: boolean = false;
  filterFields: FilterField[] = [];
  filterCriteria: any = {
    status: 'All'
  };

  statuses: string[] = [];

  private gridApi!: GridApi;
  private inventoryService = inject(InventoryService);
  gridOptions: GridOptions = {
    suppressCellFocus: true,
    suppressRowHoverHighlight: false,
    headerHeight: 40,
    rowHeight: 45,
    animateRows: false,
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
  returnData: ReturnListItem[] = [];
  allFilteredData: ReturnListItem[] = [];

  @Output() viewReturn = new EventEmitter<ReturnListItem>();

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
    this.columnDefs = [
      { field: 'id', headerName: 'ID', flex: 0.8, minWidth: 90 },
      { field: 'returnDate', headerName: 'DATE', flex: 1, minWidth: 100 },
      {
        field: 'returnFrom',
        headerName: 'RETURN FROM',
        flex: 1.5,
        minWidth: 160,
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
        field: 'returnTo',
        headerName: 'RETURN TO',
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
      {
        field: 'status',
        headerName: 'STATUS',
        flex: 1,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams) => {
          const span = document.createElement('span');
          span.innerText = params.value;
          span.style.fontWeight = '500';

          const lowerStatus = params.value ? params.value.toLowerCase() : '';
          if (lowerStatus === 'in_transit') {
            span.style.color = '#F44336';
          } else if (lowerStatus === 'returned') {
            span.style.color = '#53BF8B';
          } else if (lowerStatus === 'scrap') {
            span.style.color = '#333333';
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

          const img = document.createElement('img');
          img.src = 'assets/icons/information-icon.svg';
          img.style.cursor = 'pointer';
          img.style.width = '20px';
          img.style.height = '20px';

          img.addEventListener('click', () => {
            this.ngZone.run(() => {
              this.viewReturn.emit(params.data);
            });
          });

          container.appendChild(img);
          return container;
        }
      }
    ];

    this.returnData = [];
  }

  ngOnInit() {
    this.fetchReturnList();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadTrigger'] && !changes['reloadTrigger'].firstChange) {
      this.fetchReturnList();
    }
  }

  fetchReturnList() {
    this.inventoryService.getReturnList({
      pageNo: this.currentPage,
      pageSize: this.pageSize,
      search: this.searchText,
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe({
      next: (res) => {
        if (res.statusCode === 200 && res.data) {
          this.returnData = [...res.data];

          this.populateFilterOptions();
          this.applyLocalFilters();

          if (res.pagination) {
            this.currentPage = res.pagination.pageNo;
            this.pageSize = res.pagination.pageSize;
            this.totalRecords = res.pagination.totalRecords;
            this.totalPages = res.pagination.totalPages;
          }
        }
      },
      error: (err) => {
        console.error('Error fetching return list', err);
      }
    });
  }

  applyLocalFilters() {
    let filtered = [...this.returnData];

    // Local Filters
    filtered = filtered.filter(item => {
      if (this.filterCriteria.status !== 'All' && item.status !== this.filterCriteria.status) return false;
      return true;
    });

    this.allFilteredData = filtered;

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.allFilteredData);
    }
  }

  populateFilterOptions() {
    const uniqueStatuses = new Set<string>();

    this.returnData.forEach(item => {
      if (item.status) uniqueStatuses.add(item.status);
    });

    this.statuses = Array.from(uniqueStatuses).sort();

    this.setupFilterFields();
  }

  setupFilterFields() {
    this.filterFields = [
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
      status: 'All'
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

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi.sizeColumnsToFit(), 0);
  }

  onDateRangeChange(payload: any) {
    if (payload && payload.startDate && payload.endDate) {
      const start = new Date(payload.startDate);
      const end = new Date(payload.endDate);

      this.startDate = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())).toISOString();
      this.endDate = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())).toISOString();
    } else {
      this.startDate = undefined;
      this.endDate = undefined;
    }
    this.currentPage = 1;
    this.fetchReturnList();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.fetchReturnList();
  }

  get paginatedData() {
    return this.allFilteredData;
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.fetchReturnList();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.fetchReturnList();
  }
}
