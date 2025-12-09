import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnInit,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { GroupsService } from "src/app/pages/groups/groups.service";
import { ImagePipe } from "src/app/shared/image.pipe";
import { NotificationService } from 'src/app/shared/notification.service';


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
    ImagePipe, // ✅ image pipe for profile images
  ],
})
export class GroupsPopupComponent implements OnChanges, OnInit {
  @Input() isVisible = false;
  @Input() selectedItem: any;
  @Input() selectedDate: Date | null = null;
  @Input() sites: any[] = [];
  @Input() camera: any[] = [];
  @Input() data: any; // { groupSites/queuesData, groupUsers/queueUsers, queueId, status, id, ... }

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

  currentUser: any = null;

  constructor(private groupsService: GroupsService,  private notificationService: NotificationService) {}

  /* ========== Lifecycle ========== */

  ngOnInit(): void {
    const raw =
      localStorage.getItem("verifai_user") ||
      sessionStorage.getItem("verifai_user");
    console.log("Stored user data:", raw);

    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
        console.log("Current user in Groups:", this.currentUser);
      } catch (e) {
        console.error("Error parsing stored user data", e);
      }
    }
  }

private showSuccess(summary: string, detail?: string) {
  this.notificationService.success(summary, detail);
}

private showError(summary: string, detail?: string) {
  this.notificationService.error(summary, detail);
}

  ngOnChanges(): void {
    if (this.data) {
      this.updateSitesAndUsers(this.data);
    }
  }

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
  const modifiedBy = this.currentUser?.UserId || 0;

  this.groupsService
    .toggleQueueStatus(this.data.id, status, modifiedBy)
    .subscribe({
      next: (res) => {
        const msg =
          res?.message ||
          res?.msg ||
          res?.statusMessage ||
          `Queue marked as ${status}`;
        this.data.status = status;
        this.refreshRequested.emit(this.data.id);
        this.showSuccess('Update Queue Status', msg);
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.msg ||
          'Failed to update queue status';
        input.checked = !isActive; // revert on failure
        this.showError('Update Queue Status Failed', msg);
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

  onCameraDelete(site: DisplaySite, cam: DisplayCamera, event: MouseEvent) {
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
  const modifiedBy = this.currentUser?.UserId || 0;
  const cameraIdStr = String(cameraId);

  this.groupsService
    .inactivateQueuesCamera(cameraIdStr, queueSitesId, modifiedBy)
    .subscribe({
      next: (res: any) => {
        const msg =
          res?.message ||
          res?.msg ||
          res?.statusMessage ||
          'Camera removed from queue';

        this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
          next: (refreshRes) => {
            this.updateSitesAndUsers(refreshRes);
            this.refreshRequested.emit(queueId);
            this.showSuccess('Remove Camera', msg);
          },
          error: (err) => {
            console.error("Error refreshing data:", err);
            this.showError('Refresh Failed', 'Failed to refresh camera data.');
          },
        });
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.msg ||
          'Failed to remove camera from queue';
        console.error("Error inactivating camera", err);
        this.showError('Remove Camera Failed', msg);
      },
    });
}


inactivateSite(siteId: number | string, queueId: number) {
  const modifiedBy = this.currentUser?.UserId || 0;
  const siteIdNum = Number(siteId);

  this.groupsService
    .inactivateQueuesSite(siteIdNum, queueId, modifiedBy)
    .subscribe({
      next: (res) => {
        const msg =
          res?.message ||
          res?.msg ||
          res?.statusMessage ||
          'Site removed from queue';

        this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
          next: (refreshRes) => {
            this.updateSitesAndUsers(refreshRes);
            this.refreshRequested.emit(queueId);
            this.showSuccess('Remove Site', msg);
          },
          error: (err) => {
            console.error("Error refreshing data:", err);
            this.showError('Refresh Failed', 'Failed to refresh site data.');
          },
        });
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.msg ||
          'Failed to remove site from queue';
        console.error("Error inactivating site", err);
        this.showError('Remove Site Failed', msg);
      },
    });
}


 inactivateUser(userId: number, queueId: number) {
  const modifiedBy = this.currentUser?.UserId || 0;

  this.groupsService
    .inactivateQueuesUser(userId, queueId, modifiedBy)
    .subscribe({
      next: (res) => {
        const msg =
          res?.message ||
          res?.msg ||
          res?.statusMessage ||
          'Employee removed from queue';

        this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
          next: (refreshRes) => {
            this.updateSitesAndUsers(refreshRes);
            this.refreshRequested.emit(queueId);
            this.showSuccess('Remove Employee', msg);
          },
          error: (err) => {
            console.error("Error fetching sites and users:", err);
            this.showError('Refresh Failed', 'Failed to refresh employee data.');
          },
        });
      },
      error: (error) => {
        const msg =
          error?.error?.message ||
          error?.error?.msg ||
          'Failed to remove employee from queue';
        console.error("Error inactivating user", error);
        this.showError('Remove Employee Failed', msg);
      },
    });
}


  /* ========== Build display arrays from API response ========== */

  private updateSitesAndUsers(res: any) {
    console.log("Raw API response:", res);

    // Support both shapes:
    // - { groupUsers, groupSites }
    // - { queueUsers, queuesData }
    const queueUsers = Array.isArray(res.groupUsers)
      ? res.groupUsers
      : Array.isArray(res.queueUsers)
      ? res.queueUsers
      : [];

    const queuesData = Array.isArray(res.groupSites)
      ? res.groupSites
      : Array.isArray(res.queuesData)
      ? res.queuesData
      : [];

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
        expanded: false,
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

  closePopup() {
    this.close.emit();
  }
}
