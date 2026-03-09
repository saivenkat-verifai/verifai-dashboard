import { Component, OnInit, NgZone, inject, Output, EventEmitter, Input, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, GridOptions, themeQuartz } from 'ag-grid-community';
import { PaginationComponent } from '../../../../shared/pagination/pagination.component';
import { InventoryItem } from '../../../../core/models/item.models';
import { ItemsService } from '../../../../core/services/items.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-items-all-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, PaginationComponent],
  templateUrl: './items-all-tab.component.html',
  styleUrls: ['./items-all-tab.component.css']
})
export class ItemsAllTabComponent implements OnInit, OnChanges {
  searchQuery: string = '';
  @Input() reloadTrigger: number = 0;
  @Output() viewItem = new EventEmitter<InventoryItem>();

  allItemsData: InventoryItem[] = [];
  totalRecords: number = 0;
  allCurrentPage: number = 1;
  allPageSize: number = 10;
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

  private ngZone = inject(NgZone);
  private itemsService = inject(ItemsService);
  private messageService = inject(MessageService);

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.allGridApi) {
      setTimeout(() => {
        this.allGridApi.sizeColumnsToFit();
      }, 100);
    }
  }

  constructor() {
    this.allColumnDefs = [
      {
        field: "itemName",
        headerName: "ITEM",
        flex: 2,
        minWidth: 250,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.classList.add('ag-cell-item-container');

          const imgContainer = document.createElement("div");
          imgContainer.classList.add('ag-cell-item-img-box');

          const img = document.createElement("img");
          img.src = "assets/ptz.jpg";
          img.alt = params.data.itemName;
          img.classList.add('ag-cell-item-img');
          imgContainer.appendChild(img);

          const nameSpan = document.createElement("span");
          nameSpan.textContent = params.data.itemName;
          if (params.data.model) {
            nameSpan.textContent += " - " + params.data.model;
          }
          nameSpan.classList.add('ag-cell-item-name');

          container.appendChild(imgContainer);
          container.appendChild(nameSpan);
          return container;
        },
      },
      { field: "serialNumber", headerName: "SERIAL NUMBER", flex: 1.3, minWidth: 150 },
      { field: "barcode", headerName: "BARCODE NO.", flex: 1.2, minWidth: 140 },
      { field: "qty", headerName: "QTY", flex: 0.6, minWidth: 70 },
      { field: "purchaseDate", headerName: "PURCHASE DATE", flex: 1.1, minWidth: 130 },
      {
        headerName: "LINK",
        flex: 1,
        minWidth: 120,
        sortable: false,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.style.display = "flex";
          container.style.gap = "8px";
          container.style.alignItems = "center";
          container.style.height = "100%";

          // Link Button
          const linkBtn = document.createElement("div");
          linkBtn.style.cursor = "pointer";
          linkBtn.style.background = "#ED3237";
          linkBtn.style.borderRadius = "4px";
          linkBtn.style.width = "22px";
          linkBtn.style.height = "22px";
          linkBtn.style.display = "flex";
          linkBtn.style.alignItems = "center";
          linkBtn.style.justifyContent = "center";
          linkBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
          linkBtn.onclick = (event: MouseEvent) => {
            event.stopPropagation();
            const links = params.data.purchaseLinks;
            if (links && links.length > 0) {
              const firstLink = links[0];
              const url = typeof firstLink === 'string' ? firstLink : firstLink.purchaseLink;
              if (url) window.open(url, '_blank');
              else console.warn('Link object found but purchaseLink property is missing');
            } else {
              console.warn('No purchase links found in data:', params.data);
            }
          };

          // Copy Button
          const copyBtn = document.createElement("div");
          copyBtn.style.cursor = "pointer";
          copyBtn.style.background = "#00000026";
          copyBtn.style.border = "0.5px solid #00000026";
          copyBtn.style.borderRadius = "3px";
          copyBtn.style.padding = "2px 6px";
          copyBtn.style.display = "flex";
          copyBtn.style.height = "22px";
          copyBtn.style.alignItems = "center";
          copyBtn.style.gap = "4px";
          copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span style="font-size: 10px; color: #666;">Copy</span>';

          copyBtn.onclick = (event: MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();

            const links = params.data.purchaseLinks;
            let textToCopy = '';

            if (links && links.length > 0) {
              const firstLink = links[0];
              textToCopy = typeof firstLink === 'string' ? firstLink : firstLink.purchaseLink;
            }

            if (textToCopy) {
              this.copyToClipboard(textToCopy);
            } else {
              this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'No link available to copy' });
            }
          };

          container.appendChild(linkBtn);
          container.appendChild(copyBtn);
          return container;
        },
      },
      {
        field: "entityType",
        headerName: "NOW AT",
        flex: 1.3,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("span");
          let text = "";
          if (params.data.entityType) {
            text += params.data.entityType.toUpperCase();
          }
          if (params.data.locationName) {
            text += " - " + params.data.locationName;
          }
          if (params.data.country) {
            text += " (" + params.data.country + ")";
          }
          container.textContent = text;
          container.style.fontSize = "11px";
          container.style.color = "#333333";
          return container;
        },
      },
      {
        field: "status",
        headerName: "STATUS",
        flex: 0.9,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams) => {
          const container = document.createElement("div");
          container.textContent = params.value;
          container.style.padding = "4px 8px";
          container.style.borderRadius = "4px";
          container.style.fontSize = "11px";
          container.style.fontWeight = "600";
          container.style.display = "inline-block";

          if (params.data.statusColor) {
            container.style.color = params.data.statusColor;
          } else {
            container.style.color = "#333333";
          }
          return container;
        },
      },
      {
        field: "action",
        headerName: "MORE INFO",
        sortable: false,
        flex: 0.7,
        minWidth: 90,
        suppressSizeToFit: false,
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
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadTrigger'] && !changes['reloadTrigger'].firstChange) {
      this.loadData();
    }
  }

  onSearchChange() {
    this.allCurrentPage = 1;
    this.loadData();
  }

  onAllGridReady(params: GridReadyEvent) {
    this.allGridApi = params.api;
  }

  onAllPageSizeChange(size: number) {
    this.allPageSize = size;
    this.allCurrentPage = 1;
    this.loadData();
  }

  onAllPageChange(page: number) {
    this.allCurrentPage = page;
    this.loadData();
  }

  loadData() {
    this.itemsService.getAllInventoryItems(this.allCurrentPage, this.allPageSize, this.searchQuery).subscribe({
      next: (res) => {
        if (res && res.status === 'Success') {
          this.allItemsData = res.data || [];
          this.totalRecords = res.pagination?.totalRecords || this.allItemsData.length;
        } else {
          this.allItemsData = [];
          this.totalRecords = 0;
        }
      },
      error: (err) => {
        console.error("Error fetching inventory items", err);
        this.allItemsData = [];
        this.totalRecords = 0;
      }
    });
  }

  private copyToClipboard(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.ngZone.run(() => {
          this.messageService.clear();
          this.messageService.add({
            severity: 'success',
            summary: 'Copied!',
            detail: `Link copied: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`
          });
        });
      }).catch(err => {
        console.error('Failed to copy using navigator.clipboard: ', err);
        this.fallbackCopyTextToClipboard(text);
      });
    } else {
      this.fallbackCopyTextToClipboard(text);
    }
  }

  private fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure it's not visible
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.ngZone.run(() => {
          this.messageService.clear();
          this.messageService.add({
            severity: 'success',
            summary: 'Copied!',
            detail: `Link copied: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`
          });
        });
      } else {
        this.ngZone.run(() => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to copy link' });
        });
      }
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      this.ngZone.run(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to copy link' });
      });
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
