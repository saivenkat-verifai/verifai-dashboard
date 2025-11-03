import { Component, OnInit } from "@angular/core";
import { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AgGridModule } from "ag-grid-angular";
import { DropdownModule } from "primeng/dropdown";
import { ButtonModule } from "primeng/button";
import { MultiSelectModule } from "primeng/multiselect";

@Component({
  selector: "app-clients",
  templateUrl: "./clients.component.html",
  styleUrls: ["./clients.component.css"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridModule,
    DropdownModule,
    ButtonModule,
    MultiSelectModule,
  ],
})
export class ClientsComponent implements OnInit {
  /** ==============================
   *        TOP CARD DATA
   * ============================== */
  clientEscalatedDetails = [
    { label: "TOTAL", value: 42 },
    { label: "ACTIVE", value: 28 },
    { label: "HOLD", value: 10 },
    { label: "INACTIVE", value: 4 },
  ];

  /** ==============================
   *        AG GRID SETUP
   * ============================== */
  clientsColumnDefs: ColDef[] = [
    { headerName: "ID", field: "id", sortable: true, filter: true, flex: 1 },
    {
      headerName: "CLIENT",
      field: "client",
      sortable: true,
      filter: true,
      width: 500,
    },
    { headerName: "TYPE", field: "type", flex: 1 },
    { headerName: "USERS", field: "users", flex: 1 },
    { headerName: "SITES", field: "sites", flex: 1 },
    { headerName: "VERTICLES", field: "verticles", flex: 1 },
    { headerName: "DEVICES", field: "devices", flex: 1 },
    { headerName: "CAMERAS", field: "cameras", flex: 1 },
    { headerName: "STATUS", field: "status", flex: 1 },
    {
      headerName: "MORE INFO",
      field: "moreINFO",
      cellRenderer: () => `
    <span class="info-icon">
      <img src="assets/information-icon.svg" style="width:20px; height:20px; cursor:pointer;" alt="Info"/>
    </span>
  `,
    },
  ];

  defaultColDef: ColDef = {
    resizable: true,
    filter: true,
    sortable: true,
    suppressMovable: true,
  };

  clientsRowData: any[] = [];
  private gridApi!: GridApi;

  /** ==============================
   *        SEARCH & FILTER
   * ============================== */
  searchTerm: string = "";

  localeText = {
    page: "Page",
    more: "More",
    to: "to",
    of: "of",
    next: "Next",
    last: "Last",
    first: "First",
    previous: "Previous",
    loadingOoo: "Loading...",
    noRowsToShow: "No Clients Found",
  };

  /** ==============================
   *        INIT
   * ============================== */
  ngOnInit() {
    // Dummy client data
    this.clientsRowData = [
      {
        id: "01010101",
        client: "Lewis Management Corporate Limited",
        type: "Organization",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "Active",
        moreINFO: "",
      },
      {
        id: "01010104",
        client: "Vijaya Bank",
        type: "Organization",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "Active",
        moreINFO: "",
      },
      {
        id: "01010105",
        client: "Samsung Electronics",
        type: "Organization",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "Active",
        moreINFO: "",
      },
      {
        id: "01010106",
        client: "Protech Surveillance LLP",
        type: "Organization",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "Active",
        moreINFO: "",
      },
      {
        id: "01010107",
        client: "Pizzahut",
        type: "Organization",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "Active",
        moreINFO: "",
      },
      {
        id: "01010108",
        client: "Protech Surveillance LLP",
        type: "Organization",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "Active",
        moreINFO: "",
      },
      {
        id: "01010109",
        client: "Protech Surveillance LLP",
        type: "Organization",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "Hold",
        moreINFO: "",
      },
      {
        id: "01010110",
        client: "TID Systems",
        type: "Client",
        users: 15,
        sites: 10,
        verticles: 3,
        devices: 20,
        cameras: "100 / 120",
        status: "InActive",
        moreINFO: "",
      },
    ];
  }

  /** ==============================
   *        AG GRID EVENTS
   * ============================== */
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onCellClicked(event: any) {
    console.log("Clicked cell:", event.data);
  }

  onFilterTextBoxChanged() {
    if (this.gridApi) {
      this.gridApi.setGridOption("quickFilterText", this.searchTerm);
    }
  }
  quickFilterMatcher = (quickFilterParts: string[], rowText: string) => {
    return quickFilterParts.every((part) => {
      const regex = new RegExp(part, "i"); // case-insensitive
      return regex.test(rowText);
    });
  };

  // inside your ClientsComponent
  activeSide: "left" | "right" = "left";

  setActiveSide(side: "left" | "right") {
    this.activeSide = side;
  }

  /** ==============================
   *        Create Clients Panel
   * ============================== */

  isCreateClientPanelOpen: boolean = false;

  openCreateClientPanel() {
    this.isCreateClientPanelOpen = true;
  }

  closeCreateClientPanel() {
    this.isCreateClientPanelOpen = false;
  }
}
