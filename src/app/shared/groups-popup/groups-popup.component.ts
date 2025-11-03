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
      headerName: "SITES / CAMERA NAME",
      field: "siteName",
      cellClass: "custom-cell",
      valueGetter: (params) =>
        params.data.isCamera ? params.data.cameraName : params.data.siteName,
    },
    {
      headerName: "CAMERA'S",
      field: "cameraCount",
      cellClass: "custom-cell",
      cellStyle: {
        textAlign: "center",
        display: "flex",
        justifyContent: "right",
        alignItems: "center",
      },
      valueGetter: (params) => {
        if (params.data.isCamera) return "";
        const queueCount = params.data.queueCamerasCount ?? 0;
        const totalCount = params.data.totalCamerasCount ?? 0;
        return `${queueCount} / ${totalCount}`;
      },
    },
    // { headerName: "STATUS", field: "status", cellClass: "custom-cell" },
    {
      headerName: "ACTION",
      field: "action",
      cellRenderer: (params: any) => {
        
        const data = params.data;
        console.log("Rendering ACTION button for data:", data);
        if (!data) return document.createTextNode("");

        // Create button element
        const button = document.createElement("button");
        button.innerHTML = "X";

        // 🎨 Apply different styles for sites vs cameras
        if (data.isCamera) {
          button.className = "camera-delete-btn"; // black X, no background
        } else {
          button.className = "delete-btn"; // red X for sites
        }

       

        // 🧩 Attach click event
        button.addEventListener("click", () => {
          const parent = params.context.componentParent;
          console.log("parent:", parent.data);

          if (data.isCamera) {
            parent.inactivateCamera(
              data.cameraId,
              data.queueSitesId,
              // parent.data.queueSitesId,
              params.context.componentParent.data.id
              
            );

          } else {
            parent.inactivateSite(data.siteId,   params.context.componentParent.data.id );
          }
        });

        return button;
      },
       cellStyle: {
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
    },
  ];

  inactivateCamera(cameraId: string, queueSitesId: number, queueId: number) {
    const modifiedBy = 0; // replace with logged-in user ID if available
// console.log("Inactivating camera:", cameraId, "from queueSitesId:", queueSitesId, );
console.log(" queueid:", queueId, );
    this.groupsService
      .inactivateQueuesCamera(cameraId, queueSitesId, modifiedBy)
      .subscribe({
        next: (res) => {
          console.log("✅ Camera inactivated successfully:", res);

          // Refresh the data after successful inactivation
          this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
            next: (updatedRes) => {
              // console.log("🔄 Refreshed data:", updatedRes);
              this.updateSitesAndUsers(updatedRes);
            },
            error: (err) => console.error("Error refreshing data:", err),
          });
        },
        error: (err) => {
          console.error("❌ Error inactivating camera:", err);
        },
      });
  }


  inactivateSite(siteId: number, queueId: number) {
    const modifiedBy = 123; // replace with logged-in user ID
    // console.log("Inactivating site:", siteId, "from queueId:", queueId);

    this.groupsService.inactivateQueuesSite(siteId, queueId, modifiedBy).subscribe({
      next: (response) => {
        // console.log("Site inactivated successfully", response);

        // Refresh sites & users data
        this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
          next: (res) => {
            // console.log("Updated sites and users for the queue:", res);
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
  {
    headerName: "NAME",
    field: "User_Name",
    cellClass: "custom-cell",
    cellRenderer: (params: any) => {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.gap = "8px"; // spacing between image & text

      // 👤 Create user profile image
      const img = document.createElement("img");
      img.src =
        // params.data?.profileImage ||
        "assets/user1.png"; // fallback image
      img.alt = params.data?.User_Name || "User";
      img.style.width = "28px";
      img.style.height = "28px";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";

      // 🧑 Create username text
      const name = document.createElement("span");
      name.textContent = params.data?.User_Name || "";
      name.style.whiteSpace = "nowrap";

      // Append both to the container
      container.appendChild(img);
      container.appendChild(name);

      return container;
    },
  },
  {
    headerName: "ACTION",
    field: "action",
    cellRenderer: (params: any) => {
      // Hide button if user is inactive
      if (!params.data || params.data.status?.toLowerCase() !== "active") {
        return document.createTextNode("");
      }

      const button = document.createElement("button");
      button.innerHTML = "X";
      button.className = "delete-btn";

      button.addEventListener("click", () => {
        params.context.componentParent.inactivateUser(
          params.data.userId,
          params.context.componentParent.data.id
        );
      });

      return button;
    },
    cellClass: "action-cell",
  },
];

  /** Default column definition */
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    wrapText: false, // keep false so text stays on one line
    autoHeight: false,
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
  onStatusToggle(event: Event) {
    if (!this.data || !this.data.id) return;

    // Cast event target to HTMLInputElement
    const input = event.target as HTMLInputElement;
    const isActive = input.checked;
    const status = isActive ? "ACTIVE" : "INACTIVE";
    const modifiedBy = 123; // replace with logged-in user id

    this.groupsService
      .toggleQueueStatus(this.data.id, status, modifiedBy)
      .subscribe({
        next: () => {
          this.data.status = status; // update local data
          // console.log("Queue status updated successfully");
        },
        error: (err) => {
          // console.error("Error updating queue status", err);
          // revert checkbox state if API fails
          input.checked = !isActive;
        },
      });
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

    this.groupsService.inactivateQueuesUser(userId, id, modifiedBy).subscribe({
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
    console.log("Raw API response:", res);

    // ✅ Match the actual keys from your API
    const queueUsers = Array.isArray(res.groupUsers) ? res.groupUsers : [];
    const queuesData = Array.isArray(res.groupSites) ? res.groupSites : [];

    // ================== USERS ==================
    this.usersRowData = queueUsers.map((user: any) => ({
      userId: user.userId || "N/A",
      User_Name: user.User_Name || "N/A",
      email: user.email || "N/A",
      status: user.status || "N/A",
      profileImage: user.profileImage || null,
    }));

    // ================== SITES (TREE STRUCTURE) ==================
    this.sitesRowData = [];

    queuesData.forEach((site: any) => {
      // ---- Parent: Site Row ----
      this.sitesRowData.push({
        isCamera: false,
        siteId: site.siteId || "N/A",
        siteName: site.siteName || "N/A",
        queueId: site.queueId || "N/A",
        queueName: site.queueName || "N/A",
        status: site.status || "N/A",
        queueCamerasCount: site.queueCamerasCount ?? 0, // ✅ Add this
        totalCamerasCount: site.totalCamerasCount ?? 0, // ✅ Keep this
      });

      // ---- Children: Cameras ----
      if (Array.isArray(site.cameraInfo) && site.cameraInfo.length > 0) {
        site.cameraInfo.forEach((cam: any) => {
          this.sitesRowData.push({
            isCamera: true,
            siteId: site.siteId,
            cameraId: cam.cameraId,
            cameraName: cam.cameraName || "Unnamed Camera",
            status: cam.status || "ACTIVE",
             queueSitesId: cam.queueSitesId ?? site.queueSitesId, // ✅ Add this line
             queueId: site.queueId ,
          });
        });
      }
    });

    // ================== LOG SUMMARY ==================
    console.log("✅ Sites & Users processed:", {
      users: this.usersRowData.length,
      sites: this.sitesRowData.filter((s) => !s.isCamera).length,
      cameras: this.sitesRowData.filter((s) => s.isCamera).length,
    });
  }

  /** ngOnChanges to initialize data on input change */
  ngOnChanges() {
    if (this.data) {
      this.updateSitesAndUsers(this.data);
    }
  }

  /** AG Grid tree data hierarchy */
  getDataPath = (data: any) => {
    const siteId = data.siteId?.toString() || "unknown-site";
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
