import { Component, OnInit, OnDestroy } from "@angular/core";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { Subscription } from "rxjs";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { GroupsPopupComponent } from "../../shared/groups-popup/groups-popup.component";
import { AgGridModule } from "ag-grid-angular";
import { GroupsService } from "./groups.service"; // ✅ Import service
import { QuickFilterModule, ModuleRegistry } from "ag-grid-community";
import { DropdownModule } from "primeng/dropdown";
import { ButtonModule } from "primeng/button";

// Register module
ModuleRegistry.registerModules([QuickFilterModule]);

interface SecondEscalatedDetail {
  label?: string;
  value: number;
  iconPath?: string;
  color: string;
}

@Component({
  selector: "app-groups",
  templateUrl: "./groups.component.html",
  styleUrls: ["./groups.component.css"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridModule,
    DropdownModule,
    ButtonModule,
    GroupsPopupComponent,
  ],
})
export class GroupsComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  selectedDate: Date | null = null;
  private boundResize?: () => void;
  gridApi!: GridApi;
  private apiSub?: Subscription;

  constructor(private groupsService: GroupsService) { }

  ngOnInit() {
    this.selectedDate = new Date();
    this.loadGroups();
  }

  /** Close popups */
  closePopup() {
    this.isPopupVisible = false;
    this.isTablePopupVisible = false;
  }

  searchTerm: string = "";
  rowData: any[] = [];
  secondEscalatedDetails: SecondEscalatedDetail[] = [];

  isPopupVisible = false;
  isTablePopupVisible = false;
  selectedItem: any = null;
  popupColumnDefs: ColDef[] = [];
  popupRowData: any[] = [];

  selectedFilter: string = "CLOSED";
  currentIndex = 0; // currently selected item index

  nextItem() {
    if (this.rowData.length === 0) return;

    if (this.currentIndex < this.rowData.length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0; // loop back to start
    }

    this.loadGroupDetails(this.rowData[this.currentIndex].id);
  }

  prevItem() {
    if (this.rowData.length === 0) return;

    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.rowData.length - 1; // loop to last
    }

    this.loadGroupDetails(this.rowData[this.currentIndex].id);
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

  columnDefs: ColDef[] = [
    { headerName: "ID", field: "id", sortable: true , cellStyle: { opacity: "0.5" }},
    { headerName: "NAME", field: "name", sortable: true },
    {
      headerName: "LEVEL",
      field: "level",
      cellStyle: { opacity: "0.5" },
      valueGetter: (params) => {
        const levelMap: { [key: string]: string } = {
          "1": "Q",
          "2": "PDQ",
          "3": "DQ",
          "4": "OBQ",
        };
        return levelMap[params.data.level] ?? params.data.level;
      },
      sortable: true,
    },
    { headerName: "SITE", field: "site", cellStyle: { opacity: "0.5" } },
    { headerName: "CAMERAS", field: "cameras", cellStyle: { opacity: "0.5" } },
    { headerName: "EMPLOYEES", field: "employees", cellStyle: { opacity: "0.5" } },
    {
      headerName: "STATUS",
      field: "status",
      headerClass: "custom-header",
      cellRenderer: (params: any) => {
        const color = params.value === "ACTIVE" ? "#53BF8B" : "#979797";
        return `
          <span style="display:inline-flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:14px; height:14px; background:${color}; border-radius:50%;"></span>
          </span>
        `;
      },
    },
    {
      headerName: "MORE",
      field: "more",
      cellRenderer: () => `
        <span class="info-icon">
          <img src="assets/information-icon.svg" style="width:20px; height:20px; cursor:pointer;" alt="Info"/>
        </span>
      `,
    },
  ];

  //get levels data
  selectedLevel: any;
  levelsData: any[] = [];

  getLevelsData() {
    this.groupsService.getLevels().subscribe({
      next: (response: any) => {
        // Make sure levelsData is always an array
        this.levelsData = Array.isArray(response.data) ? response.data : [];
        console.log(this.levelsData, "get Levels");
      },
      error: (err) => {
        console.error("Error fetching levels", err);
      },
    });
  }

  // New queue model
  newQueue = {
    queueName: "", // bind this to your input
    levelId: null, // bind this to your dropdown
  };

  onCreateQueueClick() {
    this.currentSection = "queue";
    this.getLevelsData();
  }

  createQueue() {
    if (!this.newQueue.queueName || !this.newQueue.levelId) {
      console.warn("Queue form is incomplete");
      return;
    }

    const payload = {
      queueName: this.newQueue.queueName,
      levelId: this.newQueue.levelId,
      remarks: "created by sai venkat", // dummy
      createdBy: 0, // dummy
    };

    this.groupsService.postQueues(payload).subscribe({
      next: (res) => {
        console.log("Queue Created Successfully:", res);
        // Reset form
        this.newQueue = { queueName: "", levelId: null };
        this.goBack();
      },
      error: (err) => {
        console.error("Error creating queue:", err);
      },
    });
  }

  onAddClick() {
    this.isPopupVisible = true;
  }

  // Check if all visible (filtered) users are selected
  areAllFilteredUsersSelected(): boolean {
    const filteredIds = this.filteredUsers.map((u) => u.userId);
    return (
      filteredIds.every((id) => this.selectedUserIds.includes(id)) &&
      filteredIds.length > 0
    );
  }

  // Toggle select/deselect all visible users
  toggleSelectAll(isChecked: boolean) {
    const filteredIds = this.filteredUsers.map((u) => u.userId);

    if (isChecked) {
      // Add all filtered users that are not already selected
      filteredIds.forEach((id) => {
        if (!this.selectedUserIds.includes(id)) {
          this.selectedUserIds.push(id);
        }
      });
    } else {
      // Remove all filtered users from selected
      this.selectedUserIds = this.selectedUserIds.filter(
        (id) => !filteredIds.includes(id)
      );
    }
  }

  defaultColDef: ColDef = { resizable: true, filter: true };

  /** Load data via service */
  loadGroups() {
    this.apiSub = this.groupsService.getGroups().subscribe({
      next: (res) => {
        console.log(res, "responce");
        if (res?.status === "Success" && Array.isArray(res.queuesData)) {
          this.rowData = res.queuesData.map((g: any) => ({
            id: g.queueId,
            name: g.queueName,
            level: g.levelId,
            site: g.sites,
            cameras: g.cameras,
            employees: g.employees,
            status: g.status?.toUpperCase(),
            more: true,
          }));

          const total = res.queuesData.filter((g: any) => g).length;
          const active = res.queuesData.filter(
            (g: any) => g.status?.toUpperCase() === "ACTIVE"
          ).length;
          const inactive = res.queuesData.filter(
            (g: any) => g.status?.toUpperCase() === "INACTIVE"
          ).length;

          this.secondEscalatedDetails = [
            { label: "TOTAL", value: total, color: "#f44336" },
            { label: "ACTIVE", value: active, color: "#2196f3" },
            { label: "INACTIVE", value: inactive, color: "#4caf50" },
          ];

          // ✅ Auto-select first group and call second API
          if (this.rowData.length > 0) {
            this.loadGroupDetails(this.rowData[0].id);
          }
        }
      },
      error: (err) => {
        console.error("Failed to load groups:", err);
      },
    });
  }

  onUserInactivated(queueId: number) {
    // Reload group details after user is inactivated
    this.loadGroupDetails(queueId);

    // Optionally refresh your main table
    // this.loadAllGroups(); // or whatever method reloads the table
  }

  /** Load second API and send data to popup */
  loadGroupDetails(queueId: number) {
    this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
      next: (res) => {
        // Merge second API data into selectedItem
        const baseData = this.rowData.find((r) => r.id === queueId);
        this.selectedItem = {
          ...baseData,
          groupSites: res.groupSites,
          groupUsers: res.groupUsers,
        };

        // Show popup
        this.isTablePopupVisible = true;
      },
      error: (err) => console.error("Failed to load group sites/users:", err),
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    const resizeAll = () => {
      const ids = this.gridApi.getColumns()?.map((col) => col.getColId()) ?? [];
      this.gridApi.autoSizeColumns(ids, false);
      this.gridApi.sizeColumnsToFit();
    };
    setTimeout(resizeAll);
    this.boundResize = () => resizeAll();
    window.addEventListener("resize", this.boundResize);
    this.gridApi.addEventListener("firstDataRendered", resizeAll);
  }

  onCellClicked(event: any) {
    // If "more" column clicked, open popup
    if (event.colDef.field === "more") {
      const target = event.event.target as HTMLElement;
      if (target.closest(".info-icon")) {
        this.loadGroupDetails(event.data.id);
      }
    }

    // Update currentIndex based on clicked row
    const clickedIndex = this.rowData.findIndex((r) => r.id === event.data.id);
    if (clickedIndex !== -1) {
      this.currentIndex = clickedIndex;
    }
  }

  users: any[] = [];
  selectedUserIds: number[] = [];

  userselect: boolean = true;

  toggleUserSelection(userId: number, isChecked: boolean) {
    if (isChecked) {
      if (!this.selectedUserIds.includes(userId))
        this.selectedUserIds.push(userId);
    } else {
      this.selectedUserIds = this.selectedUserIds.filter((id) => id !== userId);
    }
  }

  // Employee search & pagination
  searchUserTerm: string = "";
  currentPage: number = 1;
  pageSize: number = 8; // number of users per page

get filteredUsers() {
  if (this.searchUserTerm) {
    const term = this.searchUserTerm.toLowerCase();
    return this.users.filter(
      (u) =>
        u.userName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.userContact.toLowerCase().includes(term)
    );
  }
  return this.users;
}

  get totalPages() {
    return Math.ceil(
      (this.searchUserTerm
        ? this.users.filter(
          (u) =>
            u.userName
              .toLowerCase()
              .includes(this.searchUserTerm.toLowerCase()) ||
            u.email
              .toLowerCase()
              .includes(this.searchUserTerm.toLowerCase()) ||
            u.userContact
              .toLowerCase()
              .includes(this.searchUserTerm.toLowerCase())
        ).length
        : this.users.length) / this.pageSize
    );
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  errorMessage: string = ""; // Add this at the top of your component
  addSelectedUsers() {
    if (!this.selectedUserIds.length) {
      this.errorMessage = "Please select at least one user.";
      return;
    }

    const payload = {
      queueId: this.selectedItem?.id || 0, // fallback 0 if null
      userId: this.selectedUserIds,
      createdBy: 0, // dummy value
    };

    this.groupsService.addUsersToQueue(payload).subscribe({
      next: (res) => {
        console.log("Users added successfully", res);
        this.selectedUserIds = []; // clear selection
        this.errorMessage = ""; // clear any previous errors
        this.goBack(); // close form
        this.loadGroups(); //reload the queues api
      },
      error: (err) => {
        console.error("Error adding users:", err);
        this.errorMessage = "Failed to add users. Please try again.";
      },
    });
  }

  addSiteCamera() {
    if (!this.selectedItem || !this.selectedSiteId || !this.selectedCameraId) {
      console.warn("Form is incomplete: select queue, site, and camera");
      return;
    }

    const payload = {
      queueId: this.selectedItem.id,
      siteId: this.selectedSiteId,
      cameraId: this.selectedCameraId,
      createdBy: 0, // dummy value
    };

    console.log("Payload for addSiteCamera:", payload);

    this.groupsService.postSiteCamera(payload).subscribe({
      next: (res) => {
        console.log("Site & Camera added successfully:", res);
        // Optional: reset selections
        this.selectedSiteId = null;
        this.selectedCameraId = null;
        this.camerasDropdown = [];
        this.goBack(); // close form
        this.loadGroups(); //reload the queues api
      },
      error: (err) => {
        console.error("Error adding site & camera:", err);
      },
    });
  }

  sites: any[] = []; // initially empty
  showPopup = false;

  // Selected site and camera
  selectedSiteId: number | null = null;
  selectedCameraId: string | null = null;

  // Dropdown data
  sitesDropdown: any[] = [];
  camerasDropdown: any[] = [];

  openPopup(item: any) {
    this.selectedItem = item; // store which item this popup is for
    this.showPopup = !this.showPopup; // toggle popup
  }

  onSectionChange(section: string) {
    this.currentSection = section;

    if (section === "camera") {
      this.loadSitesDropdown();
    } else if (section === "employee") {
      this.loadUsers(); // load employees here
    }
  }

  // Load sites when popup opens
  loadSitesDropdown() {
    this.groupsService.getSites().subscribe({
      next: (res: any) => {
        this.sitesDropdown = res.data.map((s: any) => ({
          label: s.siteName,
          value: s.siteId,
        }));
        console.log("Sites dropdown:", this.sitesDropdown);
      },
      error: (err) => console.error("Error fetching sites:", err),
    });
  }

  loadUsers() {
    this.groupsService.getUsersByDepartment().subscribe({
      next: (res: any) => {
        console.log(res, "API response");

        // Correctly map the userDetails array
        this.users = Array.isArray(res.userDetails) ? res.userDetails : [];
        this.selectedUserIds = []; // reset selection

        console.log("Users loaded for Employee section:", this.users);
      },
      error: (err) => console.error("Error fetching users:", err),
    });
  }

  // Load cameras based on selected site
  onSiteChange(siteId: number) {
    this.selectedSiteId = siteId;
    this.selectedCameraId = null; // reset camera
    this.groupsService.getCameras(siteId).subscribe({
      next: (res: any) => {
        this.camerasDropdown = res.data.map((c: any) => ({
          label: c.name,
          value: c.cameraId,
        }));
        console.log("Cameras dropdown:", this.camerasDropdown);
      },
      error: (err) => console.error("Error fetching cameras:", err),
    });
  }

  cameras = [
    { id: 1, name: "Camera 1" },
    { id: 2, name: "Camera 2" },
  ];

  currentSection: string = "default"; // default = normal right section

  goBack() {
    this.currentSection = "default";
  }

  formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
      })
      .replace("GMT", "CT");
  }

  localeText = {
    sortAscending: "",
    sortDescending: "",
    sortUnSort: "",
    columnMenu: "",
    ariaLabelSortAscending: "",
    ariaLabelSortDescending: "",
    ariaLabelSortNone: "",
    ariaLabelColumnMenu: "",
  };

  ngOnDestroy() {
    if (this.boundResize)
      window.removeEventListener("resize", this.boundResize);
    if (this.apiSub) this.apiSub.unsubscribe();
  }
}
