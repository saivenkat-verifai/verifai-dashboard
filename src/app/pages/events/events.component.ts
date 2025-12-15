import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from "@angular/core";
import {
  GridApi,
  GridReadyEvent,
  ColDef,
  Column,
  ModuleRegistry,
  AllCommunityModule,
  QuickFilterModule,
} from "ag-grid-community";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { EscalationPopupComponent } from "src/app/shared/escalation-popup/escalation-popup.component";
import { AgGridModule } from "ag-grid-angular";
import { CalendarComponent } from "src/app/shared/calendar/calendar.component";
import { EventsService } from "./events.service";
import { ESCALATED_COLORS } from "src/app/shared/constants/chart-colors";
import { OverlayPanel } from "primeng/overlaypanel";
import { OverlayPanelModule } from "primeng/overlaypanel";
import { Subscription, interval, forkJoin, of } from "rxjs";
import {
  EventsFilterPanelComponent,
  EventsFilterCriteria,
} from "src/app/shared/events-filter-panel/events-filter-panel.component";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { NotificationService } from "src/app/shared/notification.service";

import { ProfileImageRendererComponent } from "./profile-image-renderer.component";
import { NgZone } from "@angular/core";
import { RefreshStatusPanelComponent } from "./refresh-status-panel.component";
import { ImagePipe } from "src/app/shared/image.pipe"; // adjust path

// Register AG Grid modules
ModuleRegistry.registerModules([QuickFilterModule, AllCommunityModule]);

/** -------------------- Interfaces -------------------- */
interface IconData {
  iconPath: string;
  count: number;
}

interface CardDot {
  iconcolor?: string;
  label: string;
  count: number;
}

interface EscalatedDetail {
  label: string;
  value: number;
  color: string;
  icons?: IconData[];
  colordot?: CardDot[];
}

interface SecondEscalatedDetail {
  label?: string;
  value?: number;
  iconPath?: string;
  color?: string;
  iconcolor?: string;
}

@Component({
  selector: "app-events",
  templateUrl: "./events.component.html",
  styleUrls: ["./events.component.css"],
  standalone: true,
  imports: [
    CommonModule,
    EscalationPopupComponent,
    AgGridModule,
    FormsModule,
    MatNativeDateModule,
    MatDatepickerModule,
    CalendarComponent,
    OverlayPanelModule,
    EventsFilterPanelComponent,
    ImagePipe,
  ],
})
export class EventsComponent implements OnInit, OnDestroy {
  @ViewChild("filterOverlay") filterOverlay!: OverlayPanel;
  @ViewChild("paginationControlsClosed")
  paginationControlsClosed!: ElementRef<HTMLDivElement>;
  @ViewChild("paginationControls")
  paginationControls!: ElementRef<HTMLDivElement>;
  @ViewChild("playOverlay") playOverlay!: OverlayPanel;

  filterPanelVisible = false;

  toggleFilterPanel() {
    this.filterPanelVisible = !this.filterPanelVisible;
  }

  gridIcons = {
    sortAscending: '<span class="sort-icon"></span>',
    sortDescending: '<span class="sort-icon"></span>',
    sortUnSort: '<span class="sort-icon"></span>',
  };

  closeFilterPanel() {
    this.filterPanelVisible = false;
  }

  // Opens/closes the popup anchored to the button click
  toggleFilter(ev: MouseEvent) {
    this.filterOverlay.toggle(ev);
  }

  /** --------------- Filter sidebar state --------------- */
  isFilterOpen = false;

  openFilter() {
    this.isFilterOpen = true;
  }
  onFilterClose() {
    this.isFilterOpen = false;
  }
  // currentFilter initial value:
  currentFilter: EventsFilterCriteria = {
    startDate: null,
    endDate: null,
    startTime: "00:00",
    endTime: "23:59",
    minDuration: 0,
    maxDuration: 120,
    userLevels: "All",
    city: "All",
    site: "All",
    camera: "All",
    actionTag: "All",
    eventType: "All",
    employee: "All",
    queueLevel: "All",
    queueName: "All",
    consoleType: "All",
  };

  /** -------------------- Display arrays (post-filter) -------------------- */
  rowData: any[] = []; // CLOSED table data (raw)
  pendingRowData: any[] = []; // PENDING table data (raw)

  closedDisplayRows: any[] = []; // what CLOSED grid sees
  pendingDisplayRows: any[] = []; // what PENDING grid sees

  onFilterReset() {
    this.pendingDisplayRows = [...this.pendingRowData];
    setTimeout(() => this.autoSizeAllColumns(), 0);
    this.closedDisplayRows = [...this.rowData];
  }

  onFirstDataRendered() {
    this.autoSizeAllColumns();
  }

  onFilterApply(criteria: EventsFilterCriteria) {
    this.currentFilter = criteria;

    const base =
      this.selectedFilter === "PENDING" ? this.pendingRowData : this.rowData;

    const start = criteria.startDate
      ? this.toDateAtTime(new Date(criteria.startDate), criteria.startTime)
      : undefined;
    const end = criteria.endDate
      ? this.toDateAtTime(new Date(criteria.endDate), criteria.endTime)
      : undefined;

    const filtered = base.filter((row) => {
      const timeField = row.eventTime || row.eventStartTime || row.timestamp;
      if (!this.withinRange(timeField, start, end)) return false;
      // ✅ Queue filters (PENDING only)
      if (this.selectedFilter === "PENDING") {
        if (
          criteria.queueLevel !== "All" &&
          row.queueLevel !== criteria.queueLevel
        ) {
          return false;
        }

        if (
          criteria.queueName !== "All" &&
          row.queueName !== criteria.queueName
        ) {
          return false;
        }
      }
      // dropdowns
      const city = row.cityName ?? row.city;
      if (criteria.city !== "All" && city !== criteria.city) return false;
      if (criteria.site !== "All" && row.siteName !== criteria.site)
        return false;
      if (criteria.camera !== "All" && row.cameraId !== criteria.camera)
        return false;

      // 🔹 Action Tag filter (using eventType from dropdown)
      const selectedActionTag = criteria.eventType;
      if (selectedActionTag !== "All") {
        const rowActionTag =
          this.selectedFilter === "PENDING"
            ? row.actionTag
            : row.subActionTag ?? row.actionTag;

        if (rowActionTag !== selectedActionTag) {
          return false;
        }
      }

      // 🔹 Employee (userLevel) filter
      const level =
        row.employee?.level ?? row.userLevels ?? row.userLevel ?? "N/A";
      if (criteria.employee !== "All" && level !== criteria.employee) {
        return false;
      }

      // 🔹 Alert Type filter
      if (criteria.consoleType !== "All") {
        const rowAlertType = row.eventType ?? row.eventTag;
        if (rowAlertType !== criteria.consoleType) {
          return false;
        }
      }

      // duration
      const durationStr = row.duration ?? row.eventDuration;
      const durationMin = this.parseDurationToMinutes(durationStr);
      if (
        !this.withinDuration(
          criteria.minDuration,
          criteria.maxDuration,
          durationMin
        )
      )
        return false;

      return true;
    });

    if (this.selectedFilter === "PENDING") {
      this.pendingDisplayRows = filtered;
    } else {
      this.closedDisplayRows = filtered;
    }
  }

  private parseDurationToMinutes(value?: string): number {
    if (!value) return 0;
    const parts = value.split(":").map((n) => +n || 0);
    if (parts.length === 2) {
      const [mm, ss] = parts;
      return mm + ss / 60;
    }
    if (parts.length === 3) {
      const [hh, mm, ss] = parts;
      return hh * 60 + mm + ss / 60;
    }
    return 0;
  }

  /** -------------------- Media/overlay state -------------------- */
  selectedPlayItem: any;
  currentSlideIndex = 0;
  private slideIntervalSub?: Subscription;

  /** -------------------- Dates -------------------- */
  currentDate: Date = new Date();
  selectedDate: Date | null = null;
  currentDateTime: Date = new Date();

  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  lastStartDateTime?: string;
  lastEndDateTime?: string;

  /** -------------------- Filters & toggles -------------------- */
  selectedFilter: "CLOSED" | "PENDING" = "PENDING";
  selectedpendingFilter: "CONSOLES" | "QUEUES" = "CONSOLES";

  consolesChecked = true;
  queuesChecked = false;
  suspiciousChecked = true;
  falseChecked = false;

  searchTerm = "";
  showMore = false;

  /** Loading flag for top-level data fetches */
  isLoading = false;

  /** -------------------- AG Grid APIs -------------------- */
  gridApi!: GridApi;
  closedGridApi: GridApi | undefined;
  pendingGridApi: GridApi | undefined;

  /** -------------------- Popup handling -------------------- */
  isTablePopupVisible = false; // ESCALATION DETAILS right popup
  isPopupVisible = false;
  selectedItem: any = null;

  isPlayPopupVisible = false;

  /** NEW: Add Comment right popup visibility */
  isAddCommentPopupVisible = false;

  /** Calendar popup visibility */
  isCalendarPopupOpen = false;

  // dropdown & form for Add Comment
  commentTags = [
    { label: "Suspicious", value: "SUSPICIOUS" },
    { label: "False", value: "FALSE" },
    { label: "Info", value: "INFO" },
  ];

  addCommentForm: { tag: string | null; notes: string } = {
    tag: null,
    notes: "",
  };

  currentUser: any = null;

  /** -------------------- Cards -------------------- */
  secondEscalatedDetails: SecondEscalatedDetail[] = [];

  /** -------------------- Column definitions -------------------- */
  closedColumnDefs: ColDef[] = [];
  pendingColumnDefs: ColDef[] = [];
  defaultColDef: ColDef = { resizable: true };

  /** Minimal locale text to hide AG Grid labels we don't use */
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

  /** -------------------- Auto-refresh state -------------------- */
  // ✅ interval actually being used for auto refresh timer
  refreshInterval = 1; // minutes; applied interval

  // ✅ dropdown selection (NOT applied until Refresh click)
  pendingRefreshInterval = 1;

  private refreshSub?: Subscription;

  // ✅ start timer only after first Refresh click (manual)
  private hasStartedAutoRefresh = false;

  toastMessages: any[] = [];
  statusBar = {
    statusPanels: [
      { statusPanel: "agTotalRowCountComponent", align: "left" },
      {
        statusPanelFramework: RefreshStatusPanelComponent, // ✅ use this
        align: "right",
        statusPanelParams: {
          onIntervalChange: (v: number) => {
            console.log("Dropdown selected:", v);
            this.onIntervalChange(v);
          },
          getInterval: () => this.refreshInterval,
        },
      },
    ],
  };

  /** -------------------- Filters (dropdown lists) -------------------- */
  filterLists = {
    cities: [] as string[],
    sites: [] as string[],
    cameras: [] as string[],
    actionTags: ["Suspicious", "False", "Event_Wall", "Manual_Wall"],
    eventTypes: ["Event_Wall", "Manual_Wall", "Timed_Out"],
    userLevels: [] as string[],
    queueLevels: [] as string[],
    queueNames: [] as string[],
    queues: [] as string[],
    consoleTypes: [] as string[],
  };

  get cities() {
    return this.filterLists.cities;
  }
  get sites() {
    return this.filterLists.sites;
  }
  get cameras() {
    return this.filterLists.cameras;
  }
  get actionTags() {
    return this.filterLists.actionTags;
  }
  get eventTypes() {
    return this.filterLists.eventTypes;
  }
  get userLevels() {
    return this.filterLists.userLevels;
  }
  get queueLevels() {
    return this.filterLists.queueLevels;
  }
  get queueNames() {
    return this.filterLists.queueNames;
  }
  get queues() {
    return this.filterLists.queues;
  }
  get consoleTypes() {
    return this.filterLists.consoleTypes;
  }

  /** -------------------- Constructor -------------------- */
  constructor(
    private eventsService: EventsService,
    private http: HttpClient,
    private notification: NotificationService,
    private zone: NgZone
  ) {}

  private getAuthHeaders(): HttpHeaders {
    let rawToken = localStorage.getItem("acTok");
    let token: string | null = null;

    try {
      if (rawToken) {
        token = rawToken.startsWith('"') ? JSON.parse(rawToken) : rawToken;
      }
    } catch (e) {
      console.error(
        "EventsComponent: failed to parse token from localStorage",
        e
      );
    }

    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  /** -------------------- Lifecycle -------------------- */
  ngOnInit(): void {
    this.selectedDate = new Date();
    this.selectedStartDate = this.selectedDate;
    this.selectedEndDate = this.selectedDate;

    this.setupColumnDefs();
    this.loadPendingEvents();
    this.preloadPendingCounts(); 
    this.preloadClosedCounts();
    

    // load logged-in user (for comments)
    const raw =
      localStorage.getItem("verifai_user") ||
      sessionStorage.getItem("verifai_user");
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
        console.log("Current user in EventsComponent:", this.currentUser);
      } catch (e) {
        console.error("Error parsing stored user data", e);
      }
    }

    // Clock update
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 60_000);

    setTimeout(() => {
      if (this.playOverlay) {
        this.playOverlay.onHide.subscribe(() => {
          this.stopImageLoop();
        });
      }
    }, 0);
  }

  /** ✅ Preload PENDING counts card data (without needing MORE click) */
private preloadPendingCounts(): void {
  if (this.selectedFilter !== "PENDING") return;

  // if both unchecked -> nothing
  if (!this.consolesChecked && !this.queuesChecked) {
    this.escalatedDetailsPending = [];
    return;
  }

  const consoles$ = this.consolesChecked
    ? this.eventsService.getConsoleEventsCounts_1_0()
    : of(null);

  const queues$ = this.queuesChecked
    ? this.eventsService.getPendingEventsCounts_1_0()
    : of(null);

  forkJoin([consoles$, queues$]).subscribe({
    next: ([consolesRes, queuesRes]) => {
      const details: EscalatedDetail[] = [];

      if (queuesRes) details.push(this.buildQueuesEscalationCard(queuesRes));
      if (consolesRes) details.push(this.buildConsoleEscalationCard(consolesRes));

      this.escalatedDetailsPending = details;
    },
    error: (err) => {
      console.error("preloadPendingCounts failed:", err);
      this.escalatedDetailsPending = [];
    },
  });
}

/** ✅ Preload CLOSED counts cards (without needing MORE click) */
private preloadClosedCounts(): void {
  if (this.selectedFilter !== "CLOSED") return;

  if (!this.selectedStartDate || !this.selectedEndDate) {
    this.escalatedDetailsClosed = [];
    return;
  }

  if (!this.suspiciousChecked && !this.falseChecked) {
    this.escalatedDetailsClosed = [];
    return;
  }

  const actionTag = this.suspiciousChecked ? 2 : 1;
  const start = this.formatDateTimeFull(this.selectedStartDate);
  const end = this.formatDateTimeFull(this.selectedEndDate);

  this.eventsService.getEventReportCountsForActionTag(start, end, actionTag).subscribe({
    next: (res) => {
      const counts = res?.counts || {};
      const keys = Object.keys(counts);

      if (keys.length === 1 && (keys[0] === "null" || keys[0] == null)) {
        this.escalatedDetailsClosed = [];
        return;
      }

      const details: EscalatedDetail[] = [];

      Object.entries(counts).forEach(([label, data]: any) => {
        if (!label || label === "null") return;

        details.push({
          label,
          value: data.totalCount || 0,
          color: ESCALATED_COLORS[0],
          icons: [
            { iconPath: "assets/home.svg", count: data.sites || 0 },
            { iconPath: "assets/cam.svg", count: data.cameras || 0 },
          ],
          colordot: [
            { iconcolor: "#53BF8B", label: "Event Wall", count: data.Event_Wall || 0 },
            { iconcolor: "#FFC400", label: "Manual Wall", count: data.Manual_Wall || 0 },
          ],
        });
      });

      this.escalatedDetailsClosed = details;
    },
    error: (err) => {
      console.error("preloadClosedCounts failed:", err);
      this.escalatedDetailsClosed = [];
    },
  });
}


  private readonly DOT_IMAGES_BASE =
    "https://usstaging.ivisecurity.com/dotimages/";

  private buildImageUrl(imageName?: string | null): string | null {
    if (!imageName) return null;

    const trimmed = String(imageName).trim();
    if (!trimmed) return null;

    // If it’s already a full URL, just return it
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    // Remove any leading slashes before concatenating
    const cleaned = trimmed.replace(/^\/+/, "");
    return `${this.DOT_IMAGES_BASE}${cleaned}`;
  }

  /**
   * Resolve which media array to use based on:
   * - First: explicit imageUrl / videoUrl on the row
   * - Then: PENDING + CONSOLES  => image_list / imageList / images / frames / videoFile / imageName
   * - Then: CLOSED              => videoFile / videoFiles / images / imageList
   */
  private resolveMediaUrls(item: any): string[] {
    // ✅ 0) Best source: image_list if present
    if (Array.isArray(item.image_list) && item.image_list.length) {
      return item.image_list
        .filter((x: any) => !!x)
        .map((x: any) => this.buildImageUrl(String(x)) ?? String(x));
    }
    // ✅ 1) Next best: imageUrl / videoUrl
    const directMedia = this.extractRowMedia(item);
    if (directMedia.length) {
      return directMedia;
    }

    // ✅ 2) Existing fallback for strings / other shapes
    if (this.selectedFilter === "PENDING") {
      if (this.selectedpendingFilter === "CONSOLES") {
        const list =
          item.imageList ??
          item.images ??
          item.frames ??
          item.imageName ??
          item.videoFile;

        if (Array.isArray(list)) {
          return list.filter((x: any) => !!x);
        }
        if (typeof list === "string" && list) {
          const maybeSplit = list.includes(",") ? list.split(",") : [list];
          return maybeSplit.map((s) => s.trim()).filter(Boolean);
        }
        return [];
      }

      if (this.selectedpendingFilter === "QUEUES") {
        const v = item.videoFile ?? item.images ?? item.imageList ?? null;
        if (!v) return [];
        if (Array.isArray(v)) return v.filter((x: any) => !!x);
        if (typeof v === "string" && v) {
          const maybeSplit = v.includes(",") ? v.split(",") : [v];
          return maybeSplit.map((s) => s.trim()).filter(Boolean);
        }
        return [];
      }
    }

    // CLOSED
    const vf =
      item.videoFile ?? item.videoFiles ?? item.images ?? item.imageList;
    if (Array.isArray(vf)) {
      return vf.filter((x: any) => !!x);
    }
    if (typeof vf === "string" && vf) {
      const maybeSplit = vf.includes(",") ? vf.split(",") : [vf];
      return maybeSplit.map((s) => s.trim()).filter(Boolean);
    }

    return [];
  }

  /** Prefer imageUrl, then videoUrl (string or array, comma-separated supported) */
  private extractRowMedia(item: any): string[] {
    const urls: string[] = [];

    const addFrom = (val: any) => {
      if (!val) return;

      if (Array.isArray(val)) {
        val.filter((x) => !!x).forEach((x) => urls.push(String(x).trim()));
      } else if (typeof val === "string") {
        val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((u) => urls.push(u));
      }
    };

    // 1️⃣ Prefer images
    // addFrom(item.imageUrl ?? item.imageURL);
    // if (urls.length) return urls;

    // 2️⃣ Fallback to videos
    addFrom(item.videoUrl ?? item.videoURL);
    return urls;
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopImageLoop();
  }

  /** -------------------- Toast helpers -------------------- */
  // onToastClose(event: any) {
  //   this.toastMessages = this.toastMessages.filter((m) => m !== event.message);
  // }

  // showToast(severity: string, summary: string, detail: string, life = 3000) {
  //   this.toastMessages = [
  //     ...this.toastMessages,
  //     { severity, summary, detail, life },
  //   ];
  // }

  /** -------------------- Toast helpers (PrimeNG) -------------------- */
  private showSuccess(summary: string, detail?: string) {
    this.notification.success(summary, detail);
  }

  private showError(summary: string, detail?: string) {
    this.notification.error(summary, detail);
  }

  private showWarn(summary: string, detail?: string) {
    this.notification.warn(summary, detail);
  }

  private showInfo(summary: string, detail?: string) {
    this.notification.info(summary, detail);
  }

  // Optional – keep a generic wrapper if you still want it
  showToast(
    severity: "success" | "error" | "warn" | "info",
    summary: string,
    detail: string
  ) {
    this.notification[severity](summary, detail);
  }

  /** -------------------- Filter & toggle actions -------------------- */
  setFilter(filter: "CLOSED" | "PENDING"): void {
    this.selectedFilter = filter;
    this.searchTerm = "";

    if (filter === "CLOSED") {
      this.stopAutoRefresh();
      this.hasStartedAutoRefresh = false;
      this.suspiciousChecked = true;
      this.falseChecked = false;
      // wait for dateRangeSelected
    } else {
      this.loadPendingEvents();
    }
  }

  /** CLOSED: when either Suspicious/False checkbox changes */
  onClosedTogglesChanged(): void {
    if (!this.suspiciousChecked && !this.falseChecked) {
      this.rowData = [];
      this.closedDisplayRows = [];
      this.secondEscalatedDetails = [];
      return;
    }
    this.loadClosedAndEscalatedDetails();
  }

  /** PENDING: when either Consoles/Queues checkbox changes */
  onPendingTogglesChanged(): void {
    if (!this.consolesChecked && !this.queuesChecked) {
      this.pendingRowData = [];
      this.pendingDisplayRows = [];
      this.secondEscalatedDetails = [];
      this.escalatedDetailsPending = [];
      return;
    }

    this.loadPendingEvents();

    if (this.showMore) {
      this.loadEscalatedDetails();
    }
  }

  toggleMore(): void {
    this.showMore = !this.showMore;
    if (this.showMore) {
      this.loadEscalatedDetails();
    }
  }

  onSuspiciousToggle(): void {
    this.suspiciousChecked = true;
    this.falseChecked = false;
    this.loadClosedAndEscalatedDetails();
    if (this.showMore) this.loadEscalatedDetails();
  }

  onFalseToggle(): void {
    this.suspiciousChecked = false;
    this.falseChecked = true;
    this.loadClosedAndEscalatedDetails();
    if (this.showMore) this.loadEscalatedDetails();
  }

  onconsolesToggle(): void {
    this.consolesChecked = true;
    this.queuesChecked = false;
    this.selectedpendingFilter = "CONSOLES";
    this.loadPendingEvents();
  }

  onqueuesToggle(): void {
    this.consolesChecked = false;
    this.queuesChecked = true;
    this.selectedpendingFilter = "QUEUES";
    this.loadPendingEvents();
  }

  /** -------------------- ✅ REFRESH button handler (called from status bar) -------------------- */
  /** ✅ Refresh button click (APPLY interval + call API + start/restart timer) */
  refreshData(): void {
    // ✅ Apply the selection only when Refresh is clicked
    this.refreshInterval = this.pendingRefreshInterval;

    console.log(
      "[REFRESH CLICK] Applied interval(min):",
      this.refreshInterval,
      "selectedFilter:",
      this.selectedFilter
    );

    // ✅ Call API only on refresh click
    if (this.selectedFilter === "PENDING") {
      this.loadPendingEvents({ silent: false });
    } else {
      this.loadClosedAndEscalatedDetails({ silent: false });
    }

    // ✅ Start/restart timer after manual refresh
    this.scheduleAutoRefresh(this.refreshInterval);
    this.hasStartedAutoRefresh = true;

    // Optional toast
    this.notification.info(
      "Refresh Applied",
      `Now refreshing every ${this.refreshInterval} minute(s).`
    );
  }

  /** -------------------- ✅ Timer scheduler -------------------- */
  private scheduleAutoRefresh(minutes: number): void {
    this.stopAutoRefresh();

    if (!minutes || minutes <= 0) return;

    this.refreshSub = interval(minutes * 60_000).subscribe(() => {
      console.log("[AUTO REFRESH TICK] selectedFilter:", this.selectedFilter);

      if (this.selectedFilter === "PENDING") {
        this.loadPendingEvents({ silent: true });
      } else {
        this.loadClosedAndEscalatedDetails({ silent: true });
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = undefined;
    }
  }

  /** -------------------- ✅ Interval dropdown handler (called from status bar) -------------------- */
  /** ✅ Dropdown change (ONLY select, do NOT apply / do NOT call API / do NOT restart timer) */
  onIntervalChange(newInterval: number): void {
    this.pendingRefreshInterval = Number(newInterval) || 1;

    console.log(
      "[INTERVAL SELECTED - NOT APPLIED YET] pendingRefreshInterval:",
      this.pendingRefreshInterval
    );

    // Optional toast (purely informational)
    // this.notification.info("Interval selected", `Click Refresh to apply ${this.pendingRefreshInterval} min`);
  }

  /** -------------------- AG Grid setup -------------------- */
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    setTimeout(() => {
      const paginationPanel = document.querySelector(
        ".ag-paging-panel"
      ) as HTMLElement | null;
      if (!paginationPanel) return;

      // ✅ remove any existing injected toolbar first
      const existing = paginationPanel.querySelector(
        ".custom-pagination-toolbar"
      );
      if (existing) existing.remove();

      // ✅ clone your hidden template div
      const tplRef = this.paginationControls;
      const clone = tplRef.nativeElement.cloneNode(true) as HTMLElement;

      // ✅ mark it so we can find/remove next time
      clone.classList.add("custom-pagination-toolbar");
      clone.style.display = "flex";

      // ✅ dropdown wiring (ONLY set pending value)
      const select = clone.querySelector(
        ".refresh-interval-select"
      ) as HTMLSelectElement | null;
      if (select) {
        // ✅ show current pending selection in UI
        select.value = String(this.pendingRefreshInterval);

        select.addEventListener("change", (e) => {
          const val = Number((e.target as HTMLSelectElement).value);
          this.zone.run(() => this.onIntervalChange(val)); // <-- only sets pending now
        });
      }

      // ✅ refresh button wiring (apply + call API + start timer)
      const btn = clone.querySelector(
        ".refreshbutton"
      ) as HTMLButtonElement | null;
      if (btn) {
        btn.addEventListener("click", () =>
          this.zone.run(() => this.refreshData())
        );
      }

      paginationPanel.prepend(clone);
    }, 100);
  }

  onClosedGridReady(params: any): void {
    this.closedGridApi = params.api;
  }

  onPendingGridReady(params: any): void {
    this.pendingGridApi = params.api;
  }

  onFilterTextBoxChanged(): void {
    this.gridApi?.setGridOption("quickFilterText", this.searchTerm);
  }

  closedQuickFilterMatcher = (quickFilterParts: string[], rowText: string) =>
    quickFilterParts.every((part) => new RegExp(part, "i").test(rowText));

  pendingQuickFilterMatcher = (quickFilterParts: string[], rowText: string) =>
    quickFilterParts.every((part) => new RegExp(part, "i").test(rowText));

  /** -------------------- Cell click handlers -------------------- */
  onCellClicked(event: any): void {
    if (event.colDef.field !== "more") return;

    const target = event.event.target as HTMLElement;

    if (target.closest(".play-icon")) {
      this.openPlayTooltip(event.event as MouseEvent, event);
    }

    if (target.closest(".info-icon")) {
      const eventId = event.data.eventId as number;
      this.eventsService.getEventMoreInfo(eventId).subscribe({
        next: (res) => this.openTablePopup(res),
        error: (err) => console.error("Error fetching info:", err),
      });
    }
  }

  /** -------------------- REFRESH MORE INFO (used by child + after add comment) -------------------- */
  onRefreshMoreInfo(eventId: number): void {
    this.eventsService.getEventMoreInfo(eventId).subscribe({
      next: (res) => {
        console.log("Refreshed event more info:", res);
        this.selectedItem = res; // new object -> triggers ngOnChanges in popup
        this.isTablePopupVisible = true;
      },
      error: (err) => {
        console.error("Error refreshing more info:", err);
      },
    });
  }

  fetchMoreInfo(eventId: number): void {
    this.eventsService.getEventMoreInfo(eventId).subscribe({
      next: (res) => {
        this.selectedItem = res; // 🔁 new reference
        this.isTablePopupVisible = true;
      },
      error: (err) => console.error("Error fetching more info:", err),
    });
  }

  /** -------------------- Popup handling -------------------- */
  openTablePopup(item: any): void {
    this.selectedItem = item;
    this.isAddCommentPopupVisible = false; // ensure add comment popup hidden
    this.isTablePopupVisible = true;
  }

  closePopup(): void {
    this.isPopupVisible = false;
    this.isTablePopupVisible = false;
    this.isAddCommentPopupVisible = false; // close add comment popup as well
  }

  /** NEW: From child – "+ ADD" button */
  openAddCommentPopup(): void {
    // reset form
    this.addCommentForm = { tag: null, notes: "" };

    // hide ESCALATION popup, show ADD COMMENT popup
    this.isTablePopupVisible = false;
    this.isAddCommentPopupVisible = true;
  }

  /** NEW: Cancel/close Add Comment popup */
  cancelAddComment(): void {
    this.isAddCommentPopupVisible = false;
    this.isTablePopupVisible = true; // show ESCALATION DETAILS again
  }

  /** NEW: Submit Add Comment popup */
  submitAddComment(): void {
    if (!this.selectedItem?.eventDetails?.[0]?.eventId) {
      console.error("No eventId on selectedItem");
      this.showError("Add Comment", "Missing event ID for this record.");
      return;
    }

    const eventId = Number(this.selectedItem.eventDetails[0].eventId);
    const notes = (this.addCommentForm.notes || "").trim();

    if (!notes) {
      this.showWarn("Validation", "Comment cannot be empty.");
      return;
    }

    const remarks = this.addCommentForm.tag
      ? `Tag: ${this.addCommentForm.tag} | Added via escalation popup`
      : "Added via escalation popup";

    const payload = {
      eventsId: String(eventId),
      commentsInfo: notes,
      createdBy: this.currentUser?.UserId || 0,
      remarks,
    };

    console.log("Sending comment payload from parent:", payload);

    this.eventsService.addComment(payload).subscribe({
      next: (res) => {
        console.log("Comment saved successfully", res);

        const msg =
          res?.message ||
          res?.msg ||
          res?.statusMessage ||
          "Comment added successfully.";

        this.showSuccess("Add Comment", msg);

        // close add comment popup
        this.isAddCommentPopupVisible = false;

        // re-open escalation popup
        this.isTablePopupVisible = true;

        // refresh data so comments grid updates
        this.onRefreshMoreInfo(eventId);
      },
      error: (err) => {
        console.error("Error saving comment", err);

        const msg =
          err?.error?.message ||
          err?.error?.msg ||
          "Failed to save comment. Please try again.";

        this.showError("Add Comment Failed", msg);
      },
    });
  }

  downloadAllImages(event: MouseEvent): void {
    // Don't close the overlay
    event.stopPropagation();

    const files: string[] | undefined = this.selectedPlayItem?.videoFile;
    if (!files || !files.length) {
      this.showToast("warn", "No images", "There are no images to download.");
      return;
    }

    files.forEach((rawUrl: string, index: number) => {
      if (!rawUrl) return;

      // Normalize (handles file names vs full URLs)
      const url = this.buildImageUrl(rawUrl) ?? rawUrl;

      // Create a temporary <a> and click it
      const link = document.createElement("a");
      link.href = url;

      // Try to construct a reasonable filename
      const urlPath = url.split("?")[0]; // strip query string if any
      const ext = (urlPath.split(".").pop() || "jpg").toLowerCase();

      const baseName =
        this.selectedPlayItem?.eventId != null
          ? `event_${this.selectedPlayItem.eventId}`
          : "event_image";

      link.download = `${baseName}_${index + 1}.${ext}`;
      link.target = "_blank"; // optional

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  openAllImagesInNewTabs(event: MouseEvent): void {
    // Prevent bubbling to overlay
    event.stopPropagation();

    const files: string[] | undefined = this.selectedPlayItem?.videoFile;
    if (!files || !files.length) {
      this.showToast("warn", "No images", "There are no images to open.");
      return;
    }

    files.forEach((url: string) => {
      if (!url) return;
      window.open(url, "_blank");
    });
  }

  /** -------------------- Play popup / image loop -------------------- */
  openPlayPopup(item: any): void {
    const media = this.resolveMediaUrls(item);

    this.selectedPlayItem = {
      ...item,
      videoFile: media, // normalize into videoFile always
    };

    this.currentSlideIndex = 0;

    if (media.length > 0) {
      this.startImageLoop();
      this.isPlayPopupVisible = true;
    } else {
      console.warn("No media found to play for item:", item);
    }
  }

  openPlayTooltip(event: MouseEvent, params: any): void {
    const item = params.data;
    const media = this.resolveMediaUrls(item);

    console.log("DEBUG media for tooltip:", media, "from item:", item);

    this.selectedPlayItem = {
      ...item,
      videoFile: media,
    };

    this.currentSlideIndex = 0;

    if (media.length > 0) {
      this.startImageLoop();
      this.playOverlay.show(event);
    } else {
      console.warn("No media found to play for item (tooltip):", item);
    }
  }

  closePlayPopup(): void {
    this.stopImageLoop();
    this.isPlayPopupVisible = false;
    this.selectedPlayItem = null;
    this.playOverlay.hide();
  }

  private startImageLoop(): void {
    this.stopImageLoop();

    const files = this.selectedPlayItem?.videoFile;
    if (!files || !files.length) return;

    this.slideIntervalSub = interval(500).subscribe(() => {
      const imgs = this.selectedPlayItem?.videoFile;
      if (!imgs || !imgs.length) return;
      this.currentSlideIndex = (this.currentSlideIndex + 1) % imgs.length;
    });
  }

  private stopImageLoop(): void {
    if (this.slideIntervalSub) {
      this.slideIntervalSub.unsubscribe();
      this.slideIntervalSub = undefined;
    }
  }

  getCurrentImageUrl(): string | null {
    const files = this.selectedPlayItem?.videoFile;
    if (!files || !files.length) return null;
    return files[this.currentSlideIndex] ?? files[0];
  }

  /** -------------------- Calendar popup -------------------- */
  openCalendarPopup(): void {
    this.isCalendarPopupOpen = true;
  }

  closeCalendarPopup(): void {
    this.isCalendarPopupOpen = false;
  }

  onDateSelected(date: Date): void {
    this.selectedDate = date;
    this.closeCalendarPopup();
  }

  changeDate(offset: number): void {
    if (!this.selectedDate) return;
    const updatedDate = new Date(this.selectedDate);
    updatedDate.setDate(updatedDate.getDate() + offset);
    this.selectedDate = updatedDate;
  }

  setToday(): void {
    this.currentDate = new Date();
    this.selectedDate = this.currentDate;
  }

  /** -------------------- Helpers -------------------- */
  getIconLabel(iconPath?: string): string {
    const map: Record<string, string> = {
      "assets/home.svg": "SITE EVENTS",
      "assets/cam.svg": "CAMERA EVENTS",
      "assets/direction.svg": "GROUP EVENTS",
      "assets/moniter.svg": "MONITER EVENTS",
    };
    return iconPath ? map[iconPath] || "" : "";
  }

  formatDateTime(value: string): string {
    if (!value) return "";
    const isoString = value
      .replace("_", "T")
      .replace(/-/g, (match, offset) => (offset > 9 ? ":" : "-"));
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return value;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, seconds || 0);
    return combined;
  }

  formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  }

  private formatDateTimeFull(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  }

  private uniq = (arr: any[]) =>
    Array.from(new Set(arr.filter((v) => v != null && v !== "")));

  private toDateAtTime(d?: Date | null, t?: string | null): Date | undefined {
    if (!d) return undefined;
    const copy = new Date(d);
    const [hh, mm] = (t ?? "00:00").split(":").map((n) => +n || 0);
    copy.setHours(hh, mm, 0, 0);
    return copy;
  }

  private withinRange(
    valueISO?: string | Date,
    start?: Date,
    end?: Date
  ): boolean {
    if (!valueISO) return true;
    const v =
      valueISO instanceof Date
        ? valueISO
        : new Date(this.formatDateTime(valueISO));
    if (start && v < start) return false;
    if (end && v > end) return false;
    return true;
  }

  private withinDuration(
    min?: number | null,
    max?: number | null,
    durationMin?: number
  ): boolean {
    if (min != null && durationMin != null && durationMin < min) return false;
    if (max != null && durationMin != null && durationMin > max) return false;
    return true;
  }

  autoSizeColumn(colKey: string): void {
    this.gridApi?.autoSizeColumns([colKey], true);
  }

  autoSizeColumns(colKeys: string[]): void {
    this.gridApi?.autoSizeColumns(colKeys, true);
  }

  /** -------------------- Queues → flat rows -------------------- */
  private ALERT_COLORS: Record<string, string> = {
    Event_Wall: "#53BF8B",
    Manual_Wall: "#FFC400",
    Timed_Out: "#FF0000",
  };

  private transformConsolePendingMessages(res: any): any[] {
    const rows: any[] = [];

    const collectFrom = (wrapper: any, tag: "Event_Wall" | "Manual_Wall") => {
      const buckets = wrapper?.redis ?? [];
      buckets.forEach((q: any) => {
        const messages = Array.isArray(q?.messages) ? q.messages : [];

        messages.forEach((msg: any) => {
          const lastAlarm = Array.isArray(msg.userLevelAlarmInfo)
            ? msg.userLevelAlarmInfo[msg.userLevelAlarmInfo.length - 1]
            : null;

          // 🔹 Build full URL from imageName (for consoleManualWallMessages and others)
          const imageUrl = this.buildImageUrl(msg.imageName);

          rows.push({
            ...msg,
            queueName: q.queueName,
            queueLevel: q.level,
            eventType: tag,
            eventTag: msg.eventTag,
            actionTag: msg.actionTag ?? lastAlarm?.actionTag ?? null,
            actionTime: msg.actionTime,
            timezone: msg.timezone,
            alertType: this.ALERT_COLORS[tag],
            imageUrl,
          });
        });
      });
    };

    collectFrom(res?.consoleEventWallMessages, "Event_Wall");
    collectFrom(res?.consoleManualWallMessages, "Manual_Wall");

    return rows;
  }

  private normalizePendingCounts(api: any) {
    if (!api) {
      return {
        total: 0,
        sites: 0,
        cameras: 0,
        eventWall: 0,
        manualWall: 0,
        timedOut: 0,
      };
    }

    return {
      total:
        api.totalEvents ?? api.totalEventCounts ?? api.totalEventCount ?? 0,
      sites: api.siteCount ?? api.sitesCounts ?? api.sitesCount ?? 0,
      cameras: api.cameraCount ?? api.cameraCounts ?? api.camerasCount ?? 0,
      eventWall:
        api.eventWallCount ??
        api.consoleEventWallCounts ??
        api.eventWallCounts ??
        0,
      manualWall:
        api.manualWallCount ??
        api.consoleManualWallCounts ??
        api.manualWallCounts ??
        0,
      timedOut:
        api.timedOutWallCount ??
        api.consoleTimedOutCounts ??
        api.timedOutWallCounts ??
        0,
    };
  }

  private transformQueuesMessages(res: any): any[] {
    const collectFrom = (
      queuesWrapper: any,
      tag: "Event_Wall" | "Manual_Wall" | "Timed_Out"
    ) =>
      (queuesWrapper?.queues ?? []).filter(Boolean).flatMap((q: any) =>
        (Array.isArray(q?.messages) ? q.messages : []).map((msg: any) => ({
          ...msg,
          queueName: q.queueName,
          queueLevel: q.queueLevel,
          eventType: tag,
          eventTag: msg.eventTag ?? tag,
          actionTag: msg.actionTag ?? null,
          timezone: msg.timezone,
          alertType: this.ALERT_COLORS[tag],
        }))
      );

    return [
      collectFrom(res?.eventWallQueues, "Event_Wall"),
      collectFrom(res?.manualWallQueues, "Manual_Wall"),
      collectFrom(res?.timedOutWallQueues, "Timed_Out"),
    ].flat();
  }

  /** -------------------- PENDING fetch -------------------- */
  loadPendingEvents(opts: { silent?: boolean } = {}): void {
    const { silent = false } = opts;

    if (!this.consolesChecked && !this.queuesChecked) {
      this.pendingRowData = [];
      this.pendingDisplayRows = [];
      this.secondEscalatedDetails = [];
      return;
    }

    if (!silent) this.isLoading = true;

    const calls = [
      this.consolesChecked
        ? this.eventsService.getConsolePendingMessages_1_0()
        : of(null),
      this.queuesChecked
        ? this.eventsService.getEventsPendingMessages_1_0()
        : of(null),
    ];

    forkJoin(calls).subscribe({
      next: ([consoleRes, queueRes]) => {
        if (!silent) this.isLoading = false;

        const allRows: any[] = [];

        if (consoleRes) {
          const consoleRows = this.transformConsolePendingMessages(consoleRes);
          allRows.push(...consoleRows);
        }

        if (queueRes) {
          const queueRows = this.transformQueuesMessages(queueRes);
          allRows.push(...queueRows);
        }

        const hasEventId = allRows.some((r) => r?.eventId != null);

        if (hasEventId) {
          const unique = new Map<string | number, any>();
          allRows.forEach((r) => {
            const k = r.eventId as string | number;
            if (!unique.has(k)) unique.set(k, r);
          });
          this.pendingRowData = Array.from(unique.values());
        } else {
          this.pendingRowData = allRows;
        }

        /** 🔴 Normalize alertType + employee for ALL pending rows */
        this.pendingRowData = this.pendingRowData.map((row: any) => {
          const type = row.eventType ?? row.eventTag;
          const empName =
            row.employee?.name ??
            row.employeeName ??
            row.userName ??
            row.user ??
            "";
          const empLevel =
            row.employee?.level ?? row.userLevels ?? row.userLevel ?? "N/A";

          const empProfileImage =
            row.employee?.profileImage ?? row.profileImage ?? null;

          return {
            ...row,
            alertType:
              row.alertType ??
              this.ALERT_COLORS[type as keyof typeof this.ALERT_COLORS] ??
              "#53BF8B",
            employee:
              row.employee ??
              (empName
                ? {
                    name: empName,
                    level: empLevel,
                    profileImage: empProfileImage, // 👈 used by ProfileImageRendererComponent
                  }
                : undefined),
          };
        });

        this.pendingDisplayRows = [...this.pendingRowData];

        const consoleCounts = this.normalizePendingCounts(consoleRes);
        const queueCounts = this.normalizePendingCounts(queueRes);

        const totals = {
          total: consoleCounts.total + queueCounts.total,
          sites: consoleCounts.sites + queueCounts.sites,
          cameras: consoleCounts.cameras + queueCounts.cameras,
          eventWall: consoleCounts.eventWall + queueCounts.eventWall,
          manualWall: consoleCounts.manualWall + queueCounts.manualWall,
          timedOut: consoleCounts.timedOut + queueCounts.timedOut,
        };

        this.secondEscalatedDetails = [
          { label: "TOTAL", value: totals.total, color: "#ED3237" },
          {
            iconPath: "assets/home.svg",
            value: totals.sites,
            color: "#ED3237",
          },
          {
            iconPath: "assets/cam.svg",
            value: totals.cameras,
            color: "#ED3237",
          },
          { iconcolor: "#FFC400", value: totals.manualWall, color: "#ED3237" },
          { iconcolor: "#53BF8B", value: totals.eventWall, color: "#ED3237" },
          { iconcolor: "#FF0000", value: totals.timedOut, color: "#ED3237" },
        ];

        this.refreshDropdownListsFromPending();

        // 🔹 PENDING: "Action Tag" options come from actionTag in the response
        this.filterLists.eventTypes = this.uniq(
          this.pendingRowData
            .map((r) => r.actionTag)
            .filter((v) => v != null && v !== "")
        );

        // 🔹 PENDING: Alert Type options (Event_Wall / Manual_Wall / Timed_Out)
        this.filterLists.consoleTypes = this.uniq(
          this.pendingRowData
            .map((r) => r.eventType ?? r.eventTag)
            .filter((v) => v != null && v !== "")
        );

        // if (!this.hasStartedAutoRefresh && this.selectedFilter === "PENDING") {
        //   this.hasStartedAutoRefresh = true;
        //   this.scheduleAutoRefresh(this.refreshInterval);
        // }
      },
      error: (err) => {
        if (!silent) this.isLoading = false;
        console.error("Pending events load failed:", err);
      },
    });
  }

  /** -------------------- CLOSED fetch -------------------- */
  onDateRangeSelected(event: {
    startDate: Date;
    startTime: string;
    endDate: Date;
    endTime: string;
  }): void {
    const newStart = this.combineDateAndTime(event.startDate, event.startTime);
    const newEnd = this.combineDateAndTime(event.endDate, event.endTime);

    const startStr = this.formatDateTimeFull(newStart);
    const endStr = this.formatDateTimeFull(newEnd);

    if (
      this.lastStartDateTime === startStr &&
      this.lastEndDateTime === endStr
    ) {
      return;
    }

    this.lastStartDateTime = startStr;
    this.lastEndDateTime = endStr;

    this.selectedStartDate = newStart;
    this.selectedEndDate = newEnd;

    if (this.selectedFilter === "CLOSED") {
      this.loadClosedAndEscalatedDetails();
      this.preloadClosedCounts(); // ✅ ADD
    }
  }

  loadClosedAndEscalatedDetails(opts: { silent?: boolean } = {}): void {
    const { silent = false } = opts;

    if (!this.selectedStartDate || !this.selectedEndDate) {
      if (!silent) {
        this.showToast(
          "warn",
          "Pick a date range",
          "Select dates in the calendar to load CLOSED events."
        );
      }
      return;
    }

    if (!this.suspiciousChecked && !this.falseChecked) {
      this.rowData = [];
      this.closedDisplayRows = [];
      this.secondEscalatedDetails = [];
      return;
    }

    if (!silent) this.isLoading = true;

    const startDateStr = this.formatDateTimeFull(this.selectedStartDate);
    const endDateStr = this.formatDateTimeFull(this.selectedEndDate);

    const calls = [
      this.suspiciousChecked
        ? this.eventsService.getSuspiciousEvents(2, startDateStr, endDateStr)
        : of(null),
      this.falseChecked
        ? this.eventsService.getSuspiciousEvents(1, startDateStr, endDateStr)
        : of(null),
    ];

    forkJoin(calls).subscribe({
      next: ([suspRes, falseRes]) => {
        if (!silent) this.isLoading = false;

        const allEventData: any[] = [];
        const countsList: any[] = [];

        if (Array.isArray(suspRes?.eventData))
          allEventData.push(...suspRes.eventData);
        if (Array.isArray(falseRes?.eventData))
          allEventData.push(...falseRes.eventData);
        if (suspRes?.counts) countsList.push(suspRes.counts);
        if (falseRes?.counts) countsList.push(falseRes.counts);

        const dedupMap = new Map<string | number, any>();
        for (const e of allEventData) {
          const key =
            e?.eventId ?? `${e?.siteId}-${e?.cameraId}-${e?.eventStartTime}`;
          if (!dedupMap.has(key)) dedupMap.set(key, e);
        }
        const mergedRows = Array.from(dedupMap.values());

        this.rowData = mergedRows.map((e: any) => {
          let alertColor = "#53BF8B";
          if (e?.eventType === "Manual_Wall") alertColor = "#FFC400";
          else if (e?.eventType === "Event_Wall") alertColor = "#53BF8B";

          const empName = e?.userName ?? e?.user ?? "";
          const empLevel = e?.userLevels ?? "N/A";

          const empProfileImage =
            e?.profileImage ?? e?.avatar ?? e?.employee?.profileImage ?? null;

          return {
            ...e,
            siteId: e?.siteId,
            siteName: e?.siteName,
            device: e?.unitId,
            cameraId: e?.cameraId,
            duration: e?.eventDuration,
            tz: e?.timezone,
            eventStartTime: e?.eventStartTime,
            actionTag: e?.actionTag ?? e?.subActionTag,
            subActionTag: e?.subActionTag ?? e?.actionTag,
            employee: {
              name: empName,
              level: empLevel,
              profileImage: empProfileImage, // 👈 renderer uses this
            },
            alertType: alertColor,
            more: true,
          };
        });

        this.closedDisplayRows = [...this.rowData];

        const sum = (arr: number[]) =>
          arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

        const totalEventsCount = sum(
          countsList.map((c) => Number(c?.totalEventsCount) || 0)
        );

        const uniqueSites = new Set<string | number>();
        const uniqueCams = new Set<string | number>();
        mergedRows.forEach((r) => {
          if (r?.siteId) uniqueSites.add(r.siteId);
          if (r?.cameraId) uniqueCams.add(r.cameraId);
        });

        const eventWall = sum(
          countsList.map((c) => Number(c?.Event_Wall) || 0)
        );
        const manualWall = sum(
          countsList.map((c) => Number(c?.Manual_Wall) || 0)
        );

        this.secondEscalatedDetails = [
          { label: "TOTAL", value: totalEventsCount || 0, color: "#ED3237" },
          {
            iconPath: "assets/home.svg",
            value: uniqueSites.size,
            color: "#ED3237",
          },
          {
            iconPath: "assets/cam.svg",
            value: uniqueCams.size,
            color: "#ED3237",
          },
          { iconcolor: "#53BF8B", value: eventWall, color: "#ED3237" },
          { iconcolor: "#FFC400", value: manualWall, color: "#ED3237" },
        ];

        this.refreshDropdownListsFromClosed();
        // 🔹 CLOSED: "Action Tag" options come from subActionTag in the response
        this.filterLists.eventTypes = this.uniq(
          this.rowData
            .map((r) => r.subActionTag)
            .filter((v) => v != null && v !== "")
        );

        // 🔹 CLOSED: Alert Type options from eventType / eventTag in CLOSED data
        this.filterLists.consoleTypes = this.uniq(
          this.rowData
            .map((r) => r.eventType ?? r.eventTag)
            .filter((v) => v != null && v !== "")
        );
      },
      error: (err) => {
        if (!silent) this.isLoading = false;
        console.error("Failed to load/merge CLOSED results", err);
        this.rowData = [];
        this.closedDisplayRows = [];
        this.secondEscalatedDetails = [];
      },
    });
  }

  /** -------------------- Escalated "More" cards -------------------- */
  escalatedDetailsClosed: EscalatedDetail[] = [];
  escalatedDetailsPending: EscalatedDetail[] = [];

  loadEscalatedDetails(): void {
    // CLOSED
    if (this.selectedFilter === "CLOSED") {
      const actionTag = this.suspiciousChecked ? 2 : 1;

      const start = this.formatDateTimeFull(this.selectedStartDate!);
      const end = this.formatDateTimeFull(this.selectedEndDate!);

      this.eventsService
        .getEventReportCountsForActionTag(start, end, actionTag)
        .subscribe({
          next: (res) => {
            const counts = res?.counts || {};
            const keys = Object.keys(counts);

            if (keys.length === 1 && (keys[0] === "null" || keys[0] === null)) {
              this.escalatedDetailsClosed = [];
              return;
            }

            const details: EscalatedDetail[] = [];

            Object.entries(counts).forEach(([label, data]: any) => {
              if (label === "null") return;

              details.push({
                label,
                value: data.totalCount || 0,
                color: ESCALATED_COLORS[0],
                icons: [
                  { iconPath: "assets/home.svg", count: data.sites || 0 },
                  { iconPath: "assets/cam.svg", count: data.cameras || 0 },
                ],
                colordot: [
                  {
                    iconcolor: "#53BF8B",
                    label: "Event Wall",
                    count: data.Event_Wall || 0,
                  },
                  {
                    iconcolor: "#FFC400",
                    label: "Manual Wall",
                    count: data.Manual_Wall || 0,
                  },
                ],
              });
            });

            this.escalatedDetailsClosed = details;
          },

          error: () => {
            this.escalatedDetailsClosed = [];
          },
        });

      return;
    }

    // PENDING
    if (!this.consolesChecked && !this.queuesChecked) {
      this.escalatedDetailsPending = [];
      return;
    }

    const consoles$ = this.consolesChecked
      ? this.eventsService.getConsoleEventsCounts_1_0()
      : of(null);
    const queues$ = this.queuesChecked
      ? this.eventsService.getPendingEventsCounts_1_0()
      : of(null);

    forkJoin([consoles$, queues$]).subscribe({
      next: ([consolesRes, queuesRes]) => {
        const details: EscalatedDetail[] = [];

        if (queuesRes) {
          details.push(this.buildQueuesEscalationCard(queuesRes));
        }

        if (consolesRes) {
          details.push(this.buildConsoleEscalationCard(consolesRes));
        }

        this.escalatedDetailsPending = details;
      },
      error: (err) => {
        console.error("Error loading escalated details for PENDING:", err);
        this.escalatedDetailsPending = [];
      },
    });
  }

  private buildQueuesEscalationCard(res: any): EscalatedDetail {
    const total =
      res?.totalQeventsCount ??
      res?.allQueuesCount ?? // 👈 NEW: your current API
      res?.totalQueues ??
      res?.total ??
      res?.totalCount ??
      0;

    const qs = res?.totalQCount ?? res?.Q ?? 0;
    const pdqs = res?.totalPDQCount ?? res?.PDQ ?? 0;
    const dqs = res?.totalDQCount ?? res?.DQ ?? 0;
    const obqs = res?.totalOBQCount ?? res?.OQ ?? 0;

    return {
      label: "All Queues",
      value: total,
      color: "#000000",
      colordot: [
        { label: "Qs", count: qs },
        { label: "PDQs", count: pdqs },
        { label: "DQs", count: dqs },
        { label: "OQ", count: obqs },
      ],
    };
  }

  private buildConsoleEscalationCard(res: any): EscalatedDetail {
    const total =
      res?.totalConsoleEvents ??
      res?.totalConsoles ??
      res?.allConsoleCount ??
      res?.total ??
      res?.totalCount ??
      0;

    const sc = res?.Sc ?? res?.totalScCount ?? 0;
    const pds = res?.PDs ?? res?.totalPDsCount ?? 0;
    const ds = res?.Ds ?? res?.totalDsCount ?? 0;
    const obs = res?.OBs ?? res?.totalOBsCount ?? 0;

    return {
      label: "All Consoles",
      value: total,
      color: "#000000",
      colordot: [
        { label: "Sc", count: sc },
        { label: "PDs", count: pds },
        { label: "Ds", count: ds },
        { label: "OBs", count: obs },
      ],
    };
  }

  /** -------------------- Dropdown list refresh -------------------- */
  private refreshDropdownListsFromPending() {
    const rows = this.pendingRowData || [];
    this.filterLists.cities = this.uniq(rows.map((r) => r.cityName ?? r.city));
    this.filterLists.sites = this.uniq(rows.map((r) => r.siteName));
    this.filterLists.cameras = this.uniq(rows.map((r) => r.cameraId));

    // ✅ Queue Names dropdown values
    this.filterLists.queueNames = this.uniq(rows.map((r) => r.queueName));
    // ✅ Queue Levels dropdown values
    this.filterLists.queueLevels = this.uniq(rows.map((r) => r.queueLevel));

    // 🔁 Now build options from userLevels / employee.level
    this.filterLists.userLevels = this.uniq(
      rows.map((r) => r.employee?.level ?? r.userLevels ?? r.userLevel ?? "N/A")
    );
  }

  private refreshDropdownListsFromClosed() {
    const rows = this.rowData || [];
    this.filterLists.cities = this.uniq(rows.map((r) => r.cityName ?? r.city));
    this.filterLists.sites = this.uniq(rows.map((r) => r.siteName));
    this.filterLists.cameras = this.uniq(rows.map((r) => r.cameraId));

    // 🔁 Use levels instead of names
    this.filterLists.userLevels = this.uniq(
      rows.map((r) => r.employee?.level ?? r.userLevels ?? r.userLevel ?? "N/A")
    );
  }

  private autoSizeAllColumns(skipHeader = false): void {
    if (!this.gridApi) return;

    const cols = (this.gridApi.getColumns?.() ?? []) as Column[];
    const colIds = cols.map((c: Column) => c.getColId());

    this.gridApi.autoSizeColumns(colIds, skipHeader);
  }

  /** -------------------- Column definitions -------------------- */
  setupColumnDefs(): void {
    this.closedColumnDefs = [
      {
        headerName: "ID",
        field: "siteId",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "SITE",
        field: "siteName",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "DEVICE",
        field: "device",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "CAMERA",
        field: "cameraId",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EVENT TIME",
        field: "eventStartTime",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        valueFormatter: (p) => this.formatDateTime(p.value),
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "DURATION",
        field: "duration",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "TZ",
        field: "tz",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ACTION TAG",
        field: "subActionTag",
        headerClass: "custom-header",
        cellClass: "custome-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      // {
      //   headerName: "EMP.",
      //   field: "employee",
      //   headerClass: "custom-header",
      //   cellClass: "custom-cell",
      //   valueFormatter: (params) => params.value?.name || "",
      //   cellRenderer: (params: any) =>
      //     params.value
      //       ? `<div style="display:flex; align-items:center; gap:8px;">
      //       <img src="${params.value.avatar}" style="width:20px; height:20px; border-radius:50%;" alt="Emp"/>
      //       <span>${params.value.level}</span>
      //     </div>`
      //       : "",
      //   suppressHeaderMenuButton: true,
      // },
      {
        headerName: "EMP.",
        field: "employee",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellRenderer: ProfileImageRendererComponent,
        valueFormatter: (p) => p.value?.name || p.value?.level || "N/A",
        suppressHeaderMenuButton: true,
      },

      {
        headerName: "ALERT TYPE",
        field: "alertType",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: {
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        cellRenderer: (params: any) =>
          params.value
            ? `<span style="display:inline-block; width:14px; margin-top:10px; height:14px; background:${params.value}; border-radius:50%;"></span>`
            : "",
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "MORE INFO",
        field: "more",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: {
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        cellRenderer: () =>
          `<span class="play-icon" style="margin-right:8px;">
            <img src="assets/play-circle-icon.svg" style="width:20px; margin-top:10px; height:20px; cursor:pointer;" alt="Play"/>
          </span>
          <span class="info-icon">
            <img src="assets/information-icon.svg" style="width:20px; margin-top:10px; height:20px; cursor:pointer;" alt="Info"/>
          </span>`,
      },
    ];

    this.pendingColumnDefs = [
      {
        headerName: "ID",
        field: "siteId",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "SITE NAME",
        field: "siteName",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "CAMERA ID",
        field: "cameraId",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EVENT TAG",
        field: "eventTag",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ACTION TAG",
        field: "actionTag",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EVENT TIME",
        valueGetter: (params) => {
          return (
            params.data.eventTime ||
            params.data.eventStartTime ||
            params.data.timestamp
          );
        },
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        valueFormatter: (p) => this.formatDateTime(p.value),
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ACTION TIME",
        field: "actionTime",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        valueFormatter: (p) => this.formatDateTime(p.value),
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "TZ",
        field: "timezone",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "QUEUE NAME",
        field: "queueName",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "QUEUE LEVEL",
        field: "queueLevel",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: { opacity: "0.5" },
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ALERT TYPE",
        field: "alertType",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellStyle: {
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        cellRenderer: (params: any) =>
          params.value
            ? `<span style="display:inline-block; width:14px; margin-top:10px; height:14px; background:${params.value}; border-radius:50%;"></span>`
            : "",
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EMP",
        field: "employee",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => params.value?.name || "N/A",
        cellRenderer: ProfileImageRendererComponent,

        suppressHeaderMenuButton: true,
      },
      {
        headerName: "MORE INFO",
        field: "more",
        cellClass: "custom-cell",
        cellStyle: {
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        cellRenderer: (params: any) => {
          const playIcon = document.createElement("img");
          playIcon.src = "assets/play-circle-icon.svg";
          playIcon.style.width = "20px";
          playIcon.style.height = "20px";
          playIcon.style.cursor = "pointer";
          playIcon.style.marginRight = "8px";
          playIcon.style.marginTop = "10px";
          playIcon.title = "Play";
          playIcon.classList.add("play-icon");

          playIcon.addEventListener("click", (event) => {
            this.openPlayTooltip(event as unknown as MouseEvent, params);
          });

          const div = document.createElement("div");
          div.appendChild(playIcon);
          return div;
        },
      },
    ];
  }
}
