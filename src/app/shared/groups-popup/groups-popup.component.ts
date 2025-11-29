import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { GroupsService } from "src/app/pages/groups/groups.service";

interface DisplayCamera {
  cameraId: string | number;
  cameraName: string;
  status: string;
  queueSitesId: number;
  queueId: number;
}

interface DisplaySite {
  siteId: string | number;
  siteName: string;
  queueId: number;
  status: string;
  queueCamerasCount: number;
  totalCamerasCount: number;
  cameras: DisplayCamera[];
  expanded: boolean;
}

interface DisplayUser {
  userId: number | string;
  User_Name: string;
  email: string;
  status: string;
  profileImage?: string | null;
}

@Component({
  selector: "app-groups-popup",
  templateUrl: "./groups-popup.component.html",
  styleUrls: ["./groups-popup.component.css"],
  standalone: true,
  imports: [
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
  @Input() data: any; // { groupSites, groupUsers, queueId, status, id, ... }

  @Output() sectionChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() openPopupEvent = new EventEmitter<any>();
  @Output() refreshRequested = new EventEmitter<number>(); // queueId

  get isActive(): boolean {
    return (this.data?.status ?? "").toString().toLowerCase() === "active";
  }

  showPopup = false;

  // what we bind in the template
  sitesDisplay: DisplaySite[] = [];
  usersDisplay: DisplayUser[] = [];

  constructor(private groupsService: GroupsService) {}

  /* ========== UI actions ========== */

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

    const input = event.target as HTMLInputElement;
    const isActive = input.checked;
    const status = isActive ? "ACTIVE" : "INACTIVE";
    const modifiedBy = 123;

    this.groupsService
      .toggleQueueStatus(this.data.id, status, modifiedBy)
      .subscribe({
        next: () => {
          this.data.status = status;
          this.refreshRequested.emit(this.data.id);
        },
        error: () => {
          input.checked = !isActive; // revert on failure
        },
      });
  }

  /* ========== Expand / collapse sites ========== */

  toggleSiteExpand(site: DisplaySite) {
    site.expanded = !site.expanded;
  }

  /* ========== Delete handlers (call existing APIs) ========== */

  onSiteDelete(site: DisplaySite, event: MouseEvent) {
    event.stopPropagation();
    this.inactivateSite(site.siteId, this.data.id);
  }

  onCameraDelete(
    site: DisplaySite,
    cam: DisplayCamera,
    event: MouseEvent
  ) {
    event.stopPropagation();
    this.inactivateCamera(cam.cameraId, cam.queueSitesId, this.data.id);
  }

  onUserDelete(user: DisplayUser) {
    this.inactivateUser(user.userId as number, this.data.id);
  }

  /* ========== API methods (same logic as before) ========== */

 inactivateCamera(
    cameraId: string | number,
    queueSitesId: number,
    queueId: number
  ) {
    const modifiedBy = 0;
    const cameraIdStr = String(cameraId); // 👈 ensure string

    this.groupsService
      .inactivateQueuesCamera(cameraIdStr, queueSitesId, modifiedBy)
      .subscribe({
        next: () => {
          this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
            next: (res) => {
              this.updateSitesAndUsers(res);
              this.refreshRequested.emit(queueId);
            },
            error: (err) =>
              console.error("Error refreshing data:", err),
          });
        },
        error: (err) => console.error("Error inactivating camera", err),
      });
  }

  inactivateSite(siteId: number | string, queueId: number) {
    const modifiedBy = 123;
    const siteIdNum = Number(siteId); // 👈 ensure number

    this.groupsService
      .inactivateQueuesSite(siteIdNum, queueId, modifiedBy)
      .subscribe({
        next: () => {
          this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
            next: (res) => {
              this.updateSitesAndUsers(res);
              this.refreshRequested.emit(queueId);
            },
            error: (err) =>
              console.error("Error refreshing data:", err),
          });
        },
        error: (err) => console.error("Error inactivating site", err),
      });
  }

  inactivateUser(userId: number, queueId: number) {
    const modifiedBy = 123;

    this.groupsService
      .inactivateQueuesUser(userId, queueId, modifiedBy)
      .subscribe({
        next: () => {
          this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
            next: (res) => {
              this.updateSitesAndUsers(res);
              this.refreshRequested.emit(queueId);
            },
            error: (err) =>
              console.error("Error fetching sites and users:", err),
          });
        },
        error: (error) =>
          console.error("Error inactivating user", error),
      });
  }

  /* ========== Build display arrays from API response ========== */

  private updateSitesAndUsers(res: any) {
    console.log("Raw API response:", res);

    const queueUsers = Array.isArray(res.groupUsers) ? res.groupUsers : [];
    const queuesData = Array.isArray(res.groupSites) ? res.groupSites : [];

    // USERS
    this.usersDisplay = queueUsers.map((user: any) => ({
      userId: user.userId || "N/A",
      User_Name: user.User_Name || "N/A",
      email: user.email || "N/A",
      status: user.status || "N/A",
      profileImage: user.profileImage || null,
    }));

    // SITES + CAMERAS
    this.sitesDisplay = queuesData.map((site: any) => {
      const cameras: DisplayCamera[] = Array.isArray(site.cameraInfo)
        ? site.cameraInfo.map((cam: any) => ({
            cameraId: cam.cameraId,
            cameraName: cam.cameraName || "Unnamed Camera",
            status: cam.status || "ACTIVE",
            queueSitesId: cam.queueSitesId ?? site.queueSitesId,
            queueId: site.queueId,
          }))
        : [];

      const displaySite: DisplaySite = {
        siteId: site.siteId || "N/A",
        siteName: site.siteName || "N/A",
        queueId: site.queueId || "N/A",
        status: site.status || "N/A",
        queueCamerasCount: site.queueCamerasCount ?? 0,
        totalCamerasCount: site.totalCamerasCount ?? 0,
        cameras,
        expanded: false, // open by default
      };

      return displaySite;
    });

    console.log("✅ Sites & Users processed:", {
      users: this.usersDisplay.length,
      sites: this.sitesDisplay.length,
      cameras: this.sitesDisplay.reduce(
        (sum, s) => sum + s.cameras.length,
        0
      ),
    });
  }

  /* ========== Lifecycle ========== */

  ngOnChanges() {
    if (this.data) {
      this.updateSitesAndUsers(this.data);
    }
  }

  closePopup() {
    this.close.emit();
  }
}
