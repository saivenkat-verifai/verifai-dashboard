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
import { NotificationService } from "src/app/shared/notification.service";

// ✅ ADD import
import { ProfileImageRendererComponent } from "src/app/pages/events/profile-image-renderer.component";

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
  User_Name?: string;     // keep
  userName?: string;      // ✅ support new api shape
  email: string;
  status: string;
  profileImage?: string | null;      // keep
  profileImageUrl?: string | null;   // ✅ support new api shape
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
    // ImagePipe,
    ProfileImageRendererComponent, // ✅ ADD
  ],
})
export class GroupsPopupComponent implements OnChanges, OnInit {
  @Input() isVisible = false;
  @Input() selectedItem: any;
  @Input() selectedDate: Date | null = null;
  @Input() sites: any[] = [];
  @Input() camera: any[] = [];
  @Input() data: any;

  @Output() sectionChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() openPopupEvent = new EventEmitter<any>();
  @Output() refreshRequested = new EventEmitter<number>();

  get isActive(): boolean {
    return (this.data?.status ?? "").toString().toLowerCase() === "active";
  }

  showPopup = false;

  sitesDisplay: DisplaySite[] = [];
  usersDisplay: DisplayUser[] = [];

  currentUser: any = null;

  constructor(
    private groupsService: GroupsService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    const raw =
      localStorage.getItem("verifai_user") ||
      sessionStorage.getItem("verifai_user");
    // console.log("Stored user data:", raw);

    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
        // console.log("Current user in Groups:", this.currentUser);
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
          this.showSuccess("Update Queue Status", msg);
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.msg ||
            "Failed to update queue status";
          input.checked = !isActive;
          this.showError("Update Queue Status Failed", msg);
        },
      });
  }

  toggleSiteExpand(site: DisplaySite) {
    site.expanded = !site.expanded;
  }

  async onSiteDelete(site: DisplaySite, event: MouseEvent) {
    event.stopPropagation();
    const confirmed = await this.notificationService.confirm("Are you sure ?");
    if (confirmed) {
      this.inactivateSite(site.siteId, this.data.id);
    }
  }

  onCameraDelete(site: DisplaySite, cam: DisplayCamera, event: MouseEvent) {
    event.stopPropagation();

    this.inactivateCamera(cam.cameraId, cam.queueSitesId, this.data.id);
  }

  async onUserDelete(user: DisplayUser) {
    const confirmed = await this.notificationService.confirm("Are you sure ?");
    if (confirmed) {
      this.inactivateUser(user.userId as number, this.data.id);
    }
  }

  inactivateCamera(
    cameraId: string | number,
    queueSitesId: number,
    queueId: number,
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
            "Camera removed from queue";

          this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
            next: (refreshRes) => {
              this.updateSitesAndUsers(refreshRes);
              this.refreshRequested.emit(queueId);
              this.showSuccess("Remove Camera", msg);
            },
            error: () => {
              this.showError(
                "Refresh Failed",
                "Failed to refresh camera data.",
              );
            },
          });
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.msg ||
            "Failed to remove camera from queue";
          this.showError("Remove Camera Failed", msg);
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
            "Site removed from queue";

          this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
            next: (refreshRes) => {
              this.updateSitesAndUsers(refreshRes);
              this.refreshRequested.emit(queueId);
              this.showSuccess("Remove Site", msg);
            },
            error: () => {
              this.showError("Refresh Failed", "Failed to refresh site data.");
            },
          });
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.msg ||
            "Failed to remove site from queue";
          this.showError("Remove Site Failed", msg);
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
            "Employee removed from queue";

          this.groupsService.getGroupSitesAndUsers(queueId).subscribe({
            next: (refreshRes) => {
              this.updateSitesAndUsers(refreshRes);
              this.refreshRequested.emit(queueId);
              this.showSuccess("Remove Employee", msg);
            },
            error: () => {
              this.showError(
                "Refresh Failed",
                "Failed to refresh employee data.",
              );
            },
          });
        },
        error: (error) => {
          const msg =
            error?.error?.message ||
            error?.error?.msg ||
            "Failed to remove employee from queue";
          this.showError("Remove Employee Failed", msg);
        },
      });
  }

  private updateSitesAndUsers(res: any) {
    // console.log("Raw API response:", res);

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

    // ✅ USERS (support BOTH shapes)
    this.usersDisplay = queueUsers.map((user: any) => ({
      userId: user.userId || "N/A",
      User_Name: user.User_Name || null,
      userName: user.userName || null,
      email: user.email || "N/A",
      status: user.status || "N/A",
      profileImage: user.profileImage || null,
      profileImageUrl: user.profileImageUrl || null,
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
  }

  closePopup() {
    this.close.emit();
  }
}
