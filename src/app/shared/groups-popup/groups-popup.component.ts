import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
} from "@angular/core";
import { AgGridModule } from "ag-grid-angular";
import { FormsModule } from "@angular/forms";
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { ColDef, GridReadyEvent } from "ag-grid-community";
import { CommonModule } from "@angular/common";
import { ModuleRegistry } from "ag-grid-community";
import { TreeDataModule } from "ag-grid-enterprise";
import { GroupsService } from "src/app/pages/groups/groups.service";
import { HttpClientModule } from "@angular/common/http";

// Register the TreeDataModule for tree data feature
ModuleRegistry.registerModules([TreeDataModule]);

@Component({
  selector: "app-groups-popup",
  templateUrl: "./groups-popup.component.html",
  styleUrls: ["./groups-popup.component.css"],
  standalone: true,
  imports: [
    AgGridModule,
    FormsModule,
    MatNativeDateModule,
    MatDatepickerModule,
    CommonModule,
    HttpClientModule,
  ],
})
export class GroupsPopupComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() selectedItem: any;
  @Input() selectedDate: Date | null = null;
  @Input() sites: any[] = [];
  @Input() camera: any[] = [];
  @Input() data: any; // Receives second API data: { groupSites, groupUsers, queueId }

  @Output() sectionChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() openPopupEvent = new EventEmitter<any>();

  showPopup = false;

  constructor(private groupsService: GroupsService) {}

  /** AG Grid auto group column definition */
  autoGroupColumnDef: ColDef = {
    headerName: "SITE ID",
    field: "siteId",
    cellRendererParams: {
      suppressCount: true,
    },
    valueGetter: (params) =>
      params.data && !params.data.isCamera ? params.data.siteId : "",
  };

  /** Columns for Sites AG Grid */
  sitesColumnDefs: ColDef[] = [
    {
      headerName: "SITE / CAMERA NAME",
      field: "siteName",
      cellClass: "custom-cell",
      valueGetter: (params) =>
        params.data.isCamera ? params.data.cameraName : params.data.siteName,
    },
    
    {
      headerName: "CAMERAS",
      field: "totalCamerasCount",
      cellClass: "custom-cell",
      valueGetter: (params) =>
        params.data.isCamera ? "" : params.data.totalCamerasCount,
    },
     { headerName: "STATUS", field: "status", cellClass: "custom-cell" },
    {
      headerName: "ACTION",
      field: "action",
      cellRenderer: (params: any) => {
        const button = document.createElement("button");
        button.innerHTML = "X";
        button.className = "delete-btn";

        button.addEventListener("click", () => {
          this.inactivateSite(params.data.siteId, this.data.id);
        });

        return button;
      },
      cellClass: "action-cell",
    },
  ];

  inactivateSite(siteId: number, queueId: number) {
    const modifiedBy = 123; // replace with logged-in user ID

    this.groupsService.inactivateQueuesSite(siteId, modifiedBy).subscribe({
      next: (response) => {
        console.log("Site inactivated successfully", response);

        // Refresh sites & users data
        this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
          next: (res) => {
            console.log("Updated sites and users for the queue:", res);
            this.updateSitesAndUsers(res);
          },
          error: (err) => {
            console.error("Error fetching sites and users:", err);
          },
        });
      },
      error: (error) => {
        console.error("Error inactivating site", error);
      },
    });
  }

  /** Columns for Users AG Grid including X button */
  usersColumnDefs: ColDef[] = [
    { headerName: "USER ID", field: "userId", cellClass: "custom-cell" },
    { headerName: "NAME", field: "User_Name", cellClass: "custom-cell" },
    { headerName: "EMAIL", field: "email", cellClass: "custom-cell" },
    { headerName: "STATUS", field: "status", cellClass: "custom-cell" },
    {
      headerName: "ACTION",
      field: "action",
      cellRenderer: (params: any) => {
        const button = document.createElement("button");
        button.innerHTML = "X";
        button.className = "delete-btn";

        // Use arrow function to preserve `this` context
        button.addEventListener("click", () => {
          // Pass userId from row and queueId from @Input() data
          this.inactivateUser(params.data.userId, this.data.id);
        });

        return button;
      },
      cellClass: "action-cell",
    },
  ];

  /** Default column definition */
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  /** Row data arrays */
  sitesRowData: any[] = [];
  usersRowData: any[] = [];

  /** Toggle popup visibility */
  togglePopup() {
    this.showPopup = !this.showPopup;
    this.openPopupEvent.emit(this.data);
  }

  openPopup(groupData: any) {
    this.data = groupData;
    this.showPopup = true;
  }

  openSection(section: string) {
    this.sectionChange.emit(section);
    this.showPopup = false;
  }

  toggleStatus(isActive: boolean) {
    if (this.data) {
      this.data.status = isActive ? "ACTIVE" : "INACTIVE";
    }
  }

  /** Inactivate a user and refresh data */

  // inactivateUser(userId: number, id: number) {
  //   console.log(id,"dfghj")
  //   const modifiedBy = 123; // replace with logged-in user id

  //   this.groupsPopupService.inactivateQueuesUser(userId, modifiedBy).subscribe({
  //     next: (response) => {
  //       console.log('User inactivated successfully', response);

  //       // Call the second API only after success
  //       this.groupsService.getGroups().subscribe({
  //         next: (res) => {
  //           console.log('Sites and users for the queue:', res);
  //           // Update UI or state here
  //         },
  //         error: (err) => {
  //           console.error('Error fetching sites and users:', err);
  //         },
  //       });
  //     },
  //     error: (error) => {
  //       console.error('Error inactivating user', error);
  //     },
  //   });
  // }

  inactivateUser(userId: number, id: number) {
    const modifiedBy = 123; // replace with logged-in user id

    this.groupsService.inactivateQueuesUser(userId, modifiedBy).subscribe({
      next: (response) => {
        console.log("User inactivated successfully", response);

        // Call the second API only after success
        this.groupsService.getGroupSitesAndUsers(id).subscribe({
          next: (res) => {
            console.log("Updated sites and users for the queue:", res);
            // Update the table data
            this.updateSitesAndUsers(res);
          },
          error: (err) => {
            console.error("Error fetching sites and users:", err);
          },
        });
      },
      error: (error) => {
        console.error("Error inactivating user", error);
      },
    });
  }

  /** Update Sites and Users rowData from API response */
  private updateSitesAndUsers(res: any) {
    // Users
    if (Array.isArray(res.groupUsers)) {
      this.usersRowData = res.groupUsers.map((user: any) => ({
        userId: user.userId ?? `user-${Math.random()}`,
        User_Name: user.User_Name || "Unknown User",
        email: user.email || "N/A",
        status: user.status || "UNKNOWN",
      }));
    } else {
      this.usersRowData = [];
    }

    // Sites
    if (Array.isArray(res.groupSites)) {
      this.sitesRowData = [];
      res.groupSites.forEach((site: any) => {
        const safeSiteId = site.siteId ?? `site-${Math.random()}`;

        this.sitesRowData.push({
          siteId: safeSiteId,
          siteName: site.siteName || "Unnamed Site",
          status: site.status || "UNKNOWN",
          totalCamerasCount: site.totalCamerasCount || 0,
          isCamera: false,
        });

        const cameras = Array.from(
          { length: site.totalCamerasCount || 0 },
          (_, i) => ({
            siteId: safeSiteId,
            cameraName: site.cameras?.[i]?.cameraName || `mdx-cam${i + 1}`,
            isCamera: true,
          })
        );

        this.sitesRowData.push(...cameras);
      });
    }
  }

  /** ngOnChanges to initialize data on input change */
  ngOnChanges() {
    if (this.data) {
      this.updateSitesAndUsers(this.data);
    }
  }

  /** AG Grid tree data hierarchy */
  getDataPath = (data: any) => {
    const siteId =
      data.siteId != null ? data.siteId.toString() : "unknown-site";

    if (data.isCamera) {
      return [siteId, data.cameraName || "unknown-camera"];
    } else {
      return [siteId];
    }
  };

  /** AG Grid ready handlers */
  onSitesGridReady(params: GridReadyEvent) {
    params.api.sizeColumnsToFit();
  }

  onUsersGridReady(params: GridReadyEvent) {
    params.api.sizeColumnsToFit();
  }

  closePopup() {
    this.close.emit();
  }
}
