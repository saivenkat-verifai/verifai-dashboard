import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { wrap } from 'highcharts';

@Component({
  selector: 'app-sites',
  standalone: true,
  templateUrl: './sites.component.html',
  styleUrls: ['./sites.component.css'],
  imports: [CommonModule, FormsModule, AgGridModule],
})
export class SitesComponent implements OnInit {
  /** ==============================
   *         TOP SUMMARY CARDS
   * ============================== */
  summaryCards = [
    { key: 'total',        label: 'TOTAL',        value: 300, subValue: 2100, variant: 'solid' },
    { key: 'online',       label: 'ONLINE',       value: 250, subValue: 1350, variant: 'solid' },
    { key: 'offline',      label: 'OFFLINE',      value: 50,  subValue: 750,  variant: 'solid' },
    { key: 'unsubscribed', label: 'UNSUBSCRIBED', value: 10,  subValue: 80,   variant: 'light' },
    { key: 'upcoming',     label: 'UPCOMING',     value: 5,   subValue: 60,   variant: 'light' },
  ];

  /** ==============================
   *         AG-GRID CONFIG
   * ============================== */
  siteColumnDefs: ColDef[] = [
    { headerName: 'ID',       field: 'id',       sortable: true, filter: true, width: 90 },
    { headerName: 'SITE',     field: 'site',     sortable: true, filter: true, width: 280},
    { headerName: 'CLIENT',   field: 'client',   sortable: true, filter: true, width: 110  },
    { headerName: 'VERTICAL', field: 'vertical', sortable: true, filter: true, flex: 1 },
    {
      headerName: 'DEVICE',
      field: 'device',
      width: 90,
      cellRenderer: (p: any) =>
        `<span class="device-pill">${p.value}</span>`,
    },
    {
      headerName: 'CAMERA',
      field: 'camera',
      width: 110,
      cellRenderer: (p: any) =>
        `<span class="camera-pill ${p.data.cameraState || ''}">${p.value}</span>`,
    },
    {
      headerName: 'INVENTORY',
      field: 'inventory',
      width: 110,
      cellRenderer: () => `<button class="inventory-btn">VIEW</button>`,
    },
   {
  headerName: 'HEALTH',
  field: 'health',
  width: 90,
  cellRenderer: (p: any) => {
    const iconMap: Record<string, string> = {
      good: 'assets/heart-icon-red.png',
      warn: 'assets/heart-icon-yell.png',
      bad:  'assets/heart-icon.png',
    };
    const src = iconMap[p.value] || iconMap['bad'];
    return `<img class="health-icon" src="${src}" style="height:17px; display: flex" alt="${p.value}" />`;
  }
},
    {
      headerName: 'AUDIO',
      field: 'audio',
      width: 90,
        cellRenderer: (p: any) => {
    const iconMap: Record<string, string> = {
      on: 'assets/alarm-warning-fill-dark.png',
      off: 'assets/alarm-warning-fill-dark-1.png',
      warn: 'assets/alarm-warning-fill-light.png',
     
    };
    const src = iconMap[p.value] || iconMap['bad'];
    return `<img class="health-icon" src="${src}" style="height:25px; display: flex" alt="${p.value}" />`;
  }
      // cellRenderer: (p: any) =>
      //   `<span class="audio-icon ${p.value}"></span>`,
    },
    { headerName: 'SERVICES', field: 'services', width: 100 },
    {
      headerName: 'STATUS',
      field: 'status',
      width: 110,
      cellRenderer: (p: any) =>
        `<span class="status-text ${p.value.toLowerCase()}">${p.value}</span>`,
    },
    {
    headerName: 'MORE INFO',
    field: 'moreINFO',
    width: 120,
    cellStyle: { cursor: 'pointer', textAlign: 'center', top: '5px'},
    cellRenderer: () => `
      <span class="info-icon" title="View client">
        <img src="assets/information-icon.svg" style="width:20px;height:20px;" alt="Info"/>
      </span>
    `,
  },
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    suppressMovable: true,
  };

  siteRowData: any[] = [];
  private gridApi!: GridApi;

  /** search */
  searchTerm = '';

  localeText = {
    page: 'Page',
    more: 'More',
    to: 'to',
    of: 'of',
    next: 'Next',
    last: 'Last',
    first: 'First',
    previous: 'Previous',
    loadingOoo: 'Loading...',
    noRowsToShow: 'No Sites Found',
  };

  ngOnInit(): void {
    // mock data matching screenshot
    this.siteRowData = [
      {
        id: '1234567',
        site: 'Reliance Store - Tadepally',
        client: 'Reliance',
        vertical: 'Shopping Center',
        device: 2,
        camera: '6/14',
        cameraState: 'ok',
        health: 'good',
        audio: 'on',
        services: 2,
        status: 'Online',
      },
      {
        id: '1234567',
        site: 'Reliance Mart - Benz Circle',
        client: 'Reliance',
        vertical: 'General Stores',
        device: 2,
        camera: '2/14',
        cameraState: 'warn',
        health: 'warn',
        audio: 'off',
        services: 1,
        status: 'Partial',
      },
      {
        id: '1234567',
        site: 'Samsung Showroom - Tadepally',
        client: 'Samsung',
        vertical: 'Shopping Center',
        device: 2,
        camera: '4/12',
        cameraState: 'bad',
        health: 'bad',
        audio: 'warn',
        services: 1,
        status: 'Offline',
      },
      // ...add more rows as needed, you can mirror the screenshot
    ];
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.gridApi.sizeColumnsToFit();
  }

  onFilterTextBoxChanged() {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', this.searchTerm);
    }
  }

  quickFilterMatcher = (quickFilterParts: string[], rowText: string) => {
    return quickFilterParts.every((part) => {
      const regex = new RegExp(part, 'i');
      return regex.test(rowText);
    });
  };

  // dummy pagination handlers for the custom footer UI
  currentPage = 1;
  totalPages = 117;
  pageSize = 15;

  onPrevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  onNextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
}
