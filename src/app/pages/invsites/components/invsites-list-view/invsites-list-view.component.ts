import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, NgZone, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent, ICellRendererParams, themeQuartz } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { SiteInventoryNormalItem } from '../../../../core/models/inventory.models';

@Component({
  selector: 'app-invsites-list-view',
  standalone: true,
  imports: [CommonModule, AgGridModule, PaginationComponent],
  templateUrl: './invsites-list-view.component.html',
  styleUrls: ['./invsites-list-view.component.css']
})
export class InvsitesListViewComponent implements OnInit, OnChanges {
  @Input() tableData: SiteInventoryNormalItem[] = [];
  @Output() viewDetails = new EventEmitter<any>();

  private gridApi!: GridApi;
  theme: any = themeQuartz;
  currentPage: number = 1;
  pageSize: number = 10;

  gridOptions: GridOptions = {
    suppressCellFocus: true,
    suppressRowHoverHighlight: false,
    headerHeight: 45,
    rowHeight: 45,
    animateRows: false,
    theme: this.theme,
    suppressColumnVirtualisation: true,
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit();
    }
  };

  defaultColDef: ColDef = {
    resizable: true,
    suppressMovable: true,
    sortable: true,
    filter: false,
  };

  columnDefs: ColDef[] = [];

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
      { field: 'id', headerName: 'ID', minWidth: 90, flex: 0.8 },
      { field: 'name', headerName: 'PRODUCT / ITEM', minWidth: 200, flex: 2 },
      { field: 'type', headerName: 'TYPE', minWidth: 100, flex: 1 },
      { field: 'make', headerName: 'MAKE', minWidth: 120, flex: 1 },
      { field: 'model', headerName: 'MODEL', minWidth: 150, flex: 1.5 },
      { field: 'delivered', headerName: 'DELIVERED', minWidth: 100, flex: 1 },
      { field: 'returned', headerName: 'RETURN', minWidth: 100, flex: 1 },
      {
        headerName: 'MORE',
        minWidth: 80,
        flex: 0.6,
        sortable: false,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.style.display = "flex";
          container.style.alignItems = "center";
          container.style.justifyContent = "center";
          container.style.height = "100%";

          const img = document.createElement("img");
          img.src = "assets/icons/information-icon.svg";
          img.alt = "View";
          img.style.width = "18px";
          img.style.height = "18px";
          img.style.cursor = "pointer";
          img.style.opacity = "0.7";

          img.addEventListener("click", () => {
            this.ngZone.run(() => {
              this.viewDetails.emit(params.data);
            });
          });

          container.appendChild(img);
          return container;
        }
      }
    ];
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tableData']) {
      this.currentPage = 1;
      this.updateGridData();
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
    this.updateGridData();
  }

  updateGridData() {
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.paginatedData);
    }
  }

  get paginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const filtered = this.tableData || [];
    return filtered.slice(start, start + this.pageSize);
  }

  get totalItems() {
    return (this.tableData || []).length;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.updateGridData();
  }
}
