import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import {
  GridApi,
  GridReadyEvent,
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  QuickFilterModule,
} from "ag-grid-community";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { EscalationPopupComponent } from "../../shared/escalation-popup/escalation-popup.component";
import { AgGridModule } from "ag-grid-angular";
import { CalendarComponent } from "src/app/shared/calendar/calendar.component";
import { EventsService } from "./events.service";
import { ESCALATED_COLORS } from "src/app/shared/constants/chart-colors";
import { OverlayPanel } from "primeng/overlaypanel";
import { OverlayPanelModule } from "primeng/overlaypanel";
// ADD these imports
import { Subscription, interval } from "rxjs";

// Register AG Grid modules
ModuleRegistry.registerModules([QuickFilterModule, AllCommunityModule]);

/** -------------------- Interfaces -------------------- */
interface IconData {
  iconPath: string;
  count: number;
}

interface CardDot {
  iconcolor: string;
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
  ],
})
export class EventsComponent implements OnInit {
  /** -------------------- Template refs -------------------- */
  @ViewChild("paginationControls")
  paginationControls!: ElementRef<HTMLDivElement>;
  @ViewChild("playOverlay") playOverlay!: OverlayPanel;

  /** -------------------- Media/overlay state -------------------- */
  safeVideoUrl!: SafeResourceUrl;
  selectedPlayItem: any;

  /** -------------------- Dates -------------------- */
  currentDate: Date = new Date();
  selectedDate: Date | null = null;
  currentDateTime: Date = new Date();

  /** Date range (CalendarComponent output) */
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;

  /** Last emitted range (to suppress duplicate API calls) */
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

  /** Loading flag for top‑level data fetches */
  isLoading = false;

  /** -------------------- AG Grid APIs -------------------- */
  gridApi!: GridApi;
  closedGridApi: GridApi | undefined;
  pendingGridApi: GridApi | undefined;

  /** -------------------- Popup handling -------------------- */
  isTablePopupVisible = false;
  isPopupVisible = false; // generic overlay toggle
  selectedItem: any = null; // row data for info popup

  isPlayPopupVisible = false; // video popup
  currentSlideIndex = 0; // carousel index inside play popup

  /** Calendar popup visibility */
  isCalendarPopupOpen = false;

  /** -------------------- Dashboard data -------------------- */
  rowData: any[] = []; // CLOSED table data
  pendingRowData: any[] = []; // PENDING table data
  secondEscalatedDetails: SecondEscalatedDetail[] = []; // small stat cards

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

  /** -------------------- Constructor -------------------- */
  constructor(
    private eventsService: EventsService,
    private sanitizer: DomSanitizer
  ) {}

  /**
   * Angular lifecycle: initialize default dates, build column defs, and load initial data.
   * Also sets up a 1‑minute ticker to refresh the displayed clock.
   */
  ngOnInit(): void {
    this.selectedDate = new Date();
    this.selectedStartDate = this.selectedDate;
    this.selectedEndDate = this.selectedDate;

    this.setupColumnDefs();
    this.loadPendingEvents();

    // Auto‑refresh the displayed clock every 1 min
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 60_000);
  }

  /** -------------------- Filter & toggle actions -------------------- */
  /**
   * Switch between CLOSED and PENDING views.
   * Clears quick search and triggers the relevant data load.
   */
setFilter(filter: 'CLOSED' | 'PENDING'): void {
  this.selectedFilter = filter;
  this.searchTerm = '';

  if (filter === 'CLOSED') {
    this.stopAutoRefresh();
    this.hasStartedAutoRefresh = false;
    this.suspiciousChecked = true;
    this.falseChecked = false;

    // ⛔️ Do NOT call loadClosedAndEscalatedDetails() here
    // Wait for (dateRangeSelected) from the Calendar (on Confirm)
  } else {
    this.loadPendingEvents();
  }
}

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /** Enable Suspicious filter for CLOSED view and reload data. */
  onSuspiciousToggle(): void {
    this.suspiciousChecked = true;
    this.falseChecked = false;
    this.loadClosedAndEscalatedDetails();
    if (this.showMore) this.loadEscalatedDetails();
  }

  /** Enable False filter for CLOSED view and reload data. */
  onFalseToggle(): void {
    this.suspiciousChecked = false;
    this.falseChecked = true;
    this.loadClosedAndEscalatedDetails();
    if (this.showMore) this.loadEscalatedDetails();
  }

  /** Switch to CONSOLES in PENDING view and reload. */
  onconsolesToggle(): void {
    this.consolesChecked = true;
    this.queuesChecked = false;
    this.selectedpendingFilter = "CONSOLES";
    this.loadPendingEvents();
  }

  /** Switch to QUEUES in PENDING view and reload. */
  onqueuesToggle(): void {
    this.consolesChecked = false;
    this.queuesChecked = true;
    this.selectedpendingFilter = "QUEUES";
    this.loadPendingEvents();
  }

  /** Toggle the secondary stats section; fetch data when expanding. */
  toggleMore(): void {
    this.showMore = !this.showMore;
    if (this.showMore) {
      this.loadEscalatedDetails();
    }
  }

  /** -------------------- AG Grid setup -------------------- */
  /**
   * AG Grid init: capture API, attach responsive column sizing, and prepend
   * custom pagination controls to the paging panel after first render.
   */
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    const resizeAll = () => {
      const ids = this.gridApi.getColumns()?.map((col) => col.getColId()) ?? [];
      this.gridApi.autoSizeColumns(ids, false);
      this.gridApi.sizeColumnsToFit();
    };

    setTimeout(resizeAll);
    this.gridApi.addEventListener("firstDataRendered", resizeAll);
    window.addEventListener("resize", resizeAll);

    // Wait until AG Grid renders pagination, then inject our controls
    setTimeout(() => {
      const paginationPanel = document.querySelector(
        ".ag-paging-panel"
      ) as HTMLElement | null;
      if (paginationPanel && this.paginationControls) {
        const controlsClone = this.paginationControls.nativeElement.cloneNode(
          true
        ) as HTMLElement;
        controlsClone.style.display = "flex";
        controlsClone.style.alignItems = "center";
        controlsClone.style.gap = "12px";
        controlsClone.style.marginRight = "35%"; // spacing between your controls and pagination
        paginationPanel.prepend(controlsClone);
      }
    }, 100);
  }

  /** Interval (minutes) for optional auto refresh. */
  // ADD these fields inside the class
  /** -------------------- Auto-refresh state -------------------- */
  refreshInterval = 1; // minutes; default 1 (dropdown already exists)
  private refreshSub?: Subscription;
  private hasStartedAutoRefresh = false; // start only after the first successful fetch

  /** Placeholder for manual refresh hook. */
  refreshData(): void {
    // Immediate fetch
    this.loadPendingEvents({ silent: false });

    // Re-anchor the schedule to “now”
    if (this.selectedFilter === "PENDING") {
      this.scheduleAutoRefresh(this.refreshInterval);
      this.hasStartedAutoRefresh = true; // (optional) mark started
    }
  }

toastMessages: any[] = [];

onToastClose(event: any) {
  // remove closed message (optional cleanup)
  this.toastMessages = this.toastMessages.filter(m => m !== event.message);
}
showToast(severity: string, summary: string, detail: string, life = 3000) {
  this.toastMessages = [
    ...this.toastMessages,
    { severity, summary, detail, life }
  ];
}

  /** Start/restart auto-refresh with a new interval (in minutes). */
  private scheduleAutoRefresh(minutes: number): void {
    this.stopAutoRefresh(); // clear previous timer if any
    if (!minutes || minutes <= 0) return;

    this.refreshSub = interval(minutes * 60_000).subscribe(() => {
      // Silent refresh (no overlay spinner)
      if (this.selectedFilter === "PENDING") {
        this.loadPendingEvents({ silent: true });
      }
    });
  }

  /** Stop auto-refresh (e.g., when leaving PENDING tab). */
  private stopAutoRefresh(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = undefined;
    }
  }

  /** Update chosen auto‑refresh interval (not yet scheduling). */
  onIntervalChange(intervalMin: number): void {
    this.refreshInterval = Number(intervalMin) || 1;
    // Do NOT schedule here; the user must click Refresh to start/re-anchor
    this.showToast(
    'info',
    'Auto-refresh Interval Updated',
    `Refresh will occur every ${this.refreshInterval} minute(s).`
  );
  }



  /** Capture CLOSED grid API. */
  onClosedGridReady(params: any): void {
    this.closedGridApi = params.api;
  }

  /** Capture PENDING grid API. */
  onPendingGridReady(params: any): void {
    this.pendingGridApi = params.api;
  }

  /**
   * Apply quick filter text to the active grid.
   */
  onFilterTextBoxChanged(): void {
    this.gridApi?.setGridOption("quickFilterText", this.searchTerm);
  }

  /** Custom quick filter matcher for CLOSED table. */
  closedQuickFilterMatcher = (quickFilterParts: string[], rowText: string) =>
    quickFilterParts.every((part) => new RegExp(part, "i").test(rowText));

  /** Custom quick filter matcher for PENDING table. */
  pendingQuickFilterMatcher = (quickFilterParts: string[], rowText: string) =>
    quickFilterParts.every((part) => new RegExp(part, "i").test(rowText));

  /** -------------------- AG Grid cell click -------------------- */
  /**
   * Delegated cell click handler for the "MORE" column.
   * - Play icon: opens a PrimeNG overlay panel with the video.
   * - Info icon: fetches additional row details and opens the table popup.
   */
  onCellClicked(event: any): void {
    if (event.colDef.field !== "more") return;

    const target = event.event.target as HTMLElement;

    // Play icon clicked
    if (target.closest(".play-icon")) {
      this.openPlayTooltip(event.event as MouseEvent, event);
    }

    // Info icon clicked
    if (target.closest(".info-icon")) {
      const eventId = event.data.eventId as number;
      this.eventsService.getEventMoreInfo(eventId).subscribe({
        next: (res) => this.openTablePopup(res),
        error: (err) => console.error("Error fetching info:", err),
      });
    }
  }

  /** Fetch row details by id and open the info popup. */
  fetchMoreInfo(eventId: number): void {
    this.eventsService.getEventMoreInfo(eventId).subscribe({
      next: (res) => {
        this.selectedItem = res;
        this.isTablePopupVisible = true;
      },
      error: (err) => console.error("Error fetching more info:", err),
    });
  }

  /** -------------------- Popup handling -------------------- */
  /** Open the info popup with a prepared object. */
  openTablePopup(item: any): void {
    this.selectedItem = item;
    this.isTablePopupVisible = true;
  }

  /** Close all popups. */
  closePopup(): void {
    this.isPopupVisible = false;
    this.isTablePopupVisible = false;
  }

  /**
   * Open the full play popup dialog using selected row item.
   * Trusts and assigns the media URL when available.
   */
  openPlayPopup(item: any): void {
    this.selectedPlayItem = item;
    if (item?.httpUrl) {
      this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        item.httpUrl
      );
    }
    this.isPlayPopupVisible = true;
  }

  /**
   * Open a compact PrimeNG overlay with the video player (tooltip‑like).
   * Uses the AG Grid row data (params.data) to derive media URL.
   */
  openPlayTooltip(event: MouseEvent, params: any): void {
    const item = params.data;
    this.selectedPlayItem = item;

    if (item?.httpUrl) {
      this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        item.httpUrl
      );
    } else {
      this.safeVideoUrl = null as any;
    }

    this.playOverlay.show(event);
  }

  /** Close the play popup and hide overlay panel. */
  closePlayPopup(): void {
    this.isPlayPopupVisible = false;
    this.selectedPlayItem = null;
    this.playOverlay.hide();
  }

  /** Open the date picker popup (wrapping CalendarComponent). */
  openCalendarPopup(): void {
    this.isCalendarPopupOpen = true;
  }

  /** Close the date picker popup. */
  closeCalendarPopup(): void {
    this.isCalendarPopupOpen = false;
  }

  /** Callback from CalendarComponent when a single date is chosen. */
  onDateSelected(date: Date): void {
    this.selectedDate = date;
    console.log(this.selectedDate, "selected dates");
    this.closeCalendarPopup();
  }

  /** Change selectedDate by a day offset (e.g., prev/next). */
  changeDate(offset: number): void {
    if (!this.selectedDate) return;
    const updatedDate = new Date(this.selectedDate);
    updatedDate.setDate(updatedDate.getDate() + offset);
    this.selectedDate = updatedDate;
  }

  /** Set selectedDate to today. */
  setToday(): void {
    this.currentDate = new Date();
    this.selectedDate = this.currentDate;
  }

  /** -------------------- Play popup carousel -------------------- */
  /** Go to previous video slide within the current item. */
  prevSlide(): void {
    if (!this.selectedPlayItem?.videoFile?.length) return;
    const len = this.selectedPlayItem.videoFile.length;
    this.currentSlideIndex = (this.currentSlideIndex - 1 + len) % len;
  }

  /** Go to next video slide within the current item. */
  nextSlide(): void {
    if (!this.selectedPlayItem?.videoFile?.length) return;
    const len = this.selectedPlayItem.videoFile.length;
    this.currentSlideIndex = (this.currentSlideIndex + 1) % len;
  }

  /** -------------------- Helper functions -------------------- */
  /** Map icon path to a human‑readable label for cards. */
  getIconLabel(iconPath?: string): string {
    const map: Record<string, string> = {
      "assets/home.svg": "SITE EVENTS",
      "assets/cam.svg": "CAMERA EVENTS",
      "assets/direction.svg": "GROUP EVENTS",
      "assets/moniter.svg": "MONITER EVENTS",
    };
    return iconPath ? map[iconPath] || "" : "";
  }

  /**
   * Parse compact server timestamps (e.g., 2025-01-01_12-30-00) and return
   * a normalized string in "YYYY-MM-DD HH:mm:ss".
   */
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

  /** -------------------- API calls -------------------- */
  /**
   * Receive a date range from CalendarComponent and (only when changed)
   * trigger the CLOSED view fetch. Prevents duplicate API calls.
   */
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

    // Prevent duplicate call if same date/time range as last
    if (
      this.lastStartDateTime === startStr &&
      this.lastEndDateTime === endStr
    ) {
      console.log("⏸️ Duplicate range ignored:", startStr, endStr);
      return;
    }

    this.lastStartDateTime = startStr;
    this.lastEndDateTime = endStr;

    this.selectedStartDate = newStart;
    this.selectedEndDate = newEnd;

    console.log("✅ Date range updated:", startStr, "to", endStr);

    if (this.selectedFilter === "CLOSED") {
      this.loadClosedAndEscalatedDetails();
    }
  }

  /** Utility: combine a date and a HH:mm:ss string into a Date object. */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, seconds || 0);
    return combined;
  }

  /** Format date as YYYY-MM-DD. */
  formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  }

  /**
   * Flatten queue structures (eventWallQueues, manualWallQueues, missedWallQueues)
   * into a single array for PENDING table consumption.
   */
  private transformQueuesMessages(res: any): any[] {
    // Gather all queue groups
    const allQueues = [
      ...(res?.eventWallQueues?.queues || []),
      ...(res?.manualWallQueues?.queues || []),
      ...(res?.missedWallQueues?.queues || []),
    ].filter(Boolean);

    // Skip any queue whose "messages" is [] or not present
    return allQueues
      .filter((q: any) => Array.isArray(q?.messages) && q.messages.length > 0)
      .flatMap((q: any) =>
        q.messages.map((msg: any) => ({
          ...msg,
          queueName: q.queueName,
          queueLevel: q.queueLevel,
        }))
      );
  }

  /**
   * Fetch PENDING view data (level 1 = CONSOLES, level 2 = QUEUES) and
   * populate both the stat cards and the table rows.
   */
  // loadPendingEvents(): void {
  //   this.isLoading = true;
  //   const level = this.selectedpendingFilter === "CONSOLES" ? 1 : 2;

  //   this.eventsService.getEventsPendingEventa(level).subscribe({
  //     next: (res) => {
  //       this.isLoading = false;

  //       // Summary cards (top row)
  //       this.secondEscalatedDetails = [
  //         { label: "TOTAL", value: res.totalEvents || 0, color: "#ED3237" },
  //         {
  //           iconPath: "assets/home.svg",
  //           value: res.siteCount || 0,
  //           color: "#ED3237",
  //         },
  //         {
  //           iconPath: "assets/cam.svg",
  //           value: res.cameraCount || 0,
  //           color: "#ED3237",
  //         },
  //         {
  //           iconcolor: "#FFC400",
  //           value: res.manualWallCount || 0,
  //           color: "#ED3237",
  //         },
  //         {
  //           iconcolor: "#53BF8B",
  //           value: res.eventWallCount || 0,
  //           color: "#ED3237",
  //         },
  //         {
  //           iconcolor: "#FF0000",
  //           value: res.missedWallCount || 0,
  //           color: "#ED3237",
  //         },
  //       ];

  //       // Table rows
  //       this.pendingRowData = this.transformQueuesMessages(res);
  //     },
  //     error: (err) => {
  //       this.isLoading = false;
  //       console.error("Error fetching pending events:", err);
  //     },
  //   });
  // }

  // CHANGE signature to accept an optional { silent } flag
  loadPendingEvents(opts: { silent?: boolean } = {}): void {
    const { silent = false } = opts;

    if (!silent) this.isLoading = true;
    const level = this.selectedpendingFilter === "CONSOLES" ? 1 : 2;

    this.eventsService.getEventsPendingEventa(level).subscribe({
      next: (res) => {
        if (!silent) this.isLoading = false;

        // ---------------- cards ----------------
        this.secondEscalatedDetails = [
          { label: "TOTAL", value: res.totalEvents || 0, color: "#ED3237" },
          {
            iconPath: "assets/home.svg",
            value: res.siteCount || 0,
            color: "#ED3237",
          },
          {
            iconPath: "assets/cam.svg",
            value: res.cameraCount || 0,
            color: "#ED3237",
          },
          {
            iconcolor: "#FFC400",
            value: res.manualWallCount || 0,
            color: "#ED3237",
          },
          {
            iconcolor: "#53BF8B",
            value: res.eventWallCount || 0,
            color: "#ED3237",
          },
          {
            iconcolor: "#FF0000",
            value: res.missedWallCount || 0,
            color: "#ED3237",
          },
        ];

        // ---------------- table ----------------
        this.pendingRowData = this.transformQueuesMessages(res);

        // ✅ Start the timer AFTER the very first successful fetch of PENDING
        if (!this.hasStartedAutoRefresh && this.selectedFilter === "PENDING") {
          this.hasStartedAutoRefresh = true;
          this.scheduleAutoRefresh(this.refreshInterval); // minutes
        }
      },
      error: (err) => {
        if (!silent) this.isLoading = false;
        console.error("Error fetching pending events:", err);
      },
    });
  }

  /** -------------------- CLOSED view: table + escalated details -------------------- */
  /** Format a Date as YYYY-MM-DD HH:mm:ss. */
  private formatDateTimeFull(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  }

  /**
   * Fetch CLOSED table data and top stat cards in a single request, honoring
   * actionTag (2 = Suspicious, 1 = False) and optional date range.
   */
  loadClosedAndEscalatedDetails(): void {
    this.isLoading = true;
    const actionTag = this.suspiciousChecked ? 2 : 1;

    const startDateStr = this.selectedStartDate
      ? this.formatDateTimeFull(this.selectedStartDate)
      : undefined;
    const endDateStr = this.selectedEndDate
      ? this.formatDateTimeFull(this.selectedEndDate)
      : undefined;

    console.log(endDateStr, "endDateStr");

    this.eventsService
      .getSuspiciousEvents(actionTag, startDateStr, endDateStr)
      .subscribe({
        next: (res) => {
          this.isLoading = false;

          // CLOSED table rows
          if (res?.eventData) {
            this.rowData = res.eventData.map((e: any) => {
              let alertColor = "#53BF8B"; // default green
              if (e.eventType === "Event_Wall") alertColor = "#53BF8B"; // green
              else if (e.eventType === "Manual_Wall") alertColor = "#FFC400"; // yellow

              return {
                ...e,
                siteId: e.siteId,
                siteName: e.siteName,
                device: e.unitId,
                cameraId: e.cameraId,
                duration: e.eventDuration,
                tz: e.timezone,
                eventStartTime: e.eventStartTime,
                actionTag: e.actionTag,
                employee: {
                  avatar: "assets/user1.png",
                  level: e.userLevels || "N/A",
                },
                alertType: alertColor,
                more: true,
              };
            });
          }

          // Top summary cards for CLOSED
          if (res?.counts) {
            this.secondEscalatedDetails = [
              {
                label: "Total",
                value: res.counts.totalEventsCount || 0,
                color: "#ED3237",
              },
              {
                iconPath: "assets/home.svg",
                value: res.counts.sites || 0,
                color: "#ED3237",
              },
              {
                iconPath: "assets/cam.svg",
                value: res.counts.cameras || 0,
                color: "#ED3237",
              },
              {
                iconcolor: "#53BF8B",
                value: res.counts.Event_Wall || 0,
                color: "#ED3237",
              },
              {
                iconcolor: "#FFC400",
                value: res.counts.Manual_Wall || 0,
                color: "#ED3237",
              },
            ];
          }
        },
        error: (err) => {
          console.error("Failed to load closed/escalated details", err);
          this.rowData = [];
          this.secondEscalatedDetails = [];
          this.isLoading = false;
        },
      });
  }

  /** -------------------- AG Grid utility -------------------- */
  /** Auto‑size a specific column key. */
  autoSizeColumn(colKey: string): void {
    this.gridApi?.autoSizeColumns([colKey], true);
  }

  /** Auto‑size multiple column keys. */
  autoSizeColumns(colKeys: string[]): void {
    this.gridApi?.autoSizeColumns(colKeys, true);
  }

  /** -------------------- Column definitions -------------------- */
  /** Build column definitions for CLOSED and PENDING tables. */
  setupColumnDefs(): void {
    // CLOSED column definitions
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
      {
        headerName: "EMP.",
        field: "employee",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => params.value?.name || "",
        cellRenderer: (params: any) =>
          `<div style="display:flex; align-items:center; gap:8px;"><img src="${params.value.avatar}" style="width:20px; height:20px; border-radius:50%;" alt="Emp"/><span>  ${params.value.level}</span></div>`,
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
          `<span style="display:inline-block; width:14px; margin-top:10px;  height:14px; background:${params.value}; border-radius:50%;"></span>`,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "MORE",
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
      // If you want icons in CLOSED as in PENDING, uncomment and adjust the renderer below
      // {
      //   headerName: "MORE",
      //   field: "more",
      //   headerClass: "custom-header",
      //   cellClass: "custom-cell",
      //   cellStyle: { textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center" },
      //   cellRenderer: () => `
      //     <span class="play-icon" style="margin-right:8px;">
      //       <img src="assets/play-circle-icon.svg" style="width:20px; margin-top:10px; height:20px; cursor:pointer;" alt="Play"/>
      //     </span>
      //     <span class="info-icon">
      //       <img src="assets/information-icon.svg" style="width:20px; margin-top:10px; height:20px; cursor:pointer;" alt="Info"/>
      //     </span>`
      // },
    ];

    // PENDING column definitions
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
        field: "eventTime",
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
      // {
      //   headerName: "MORE",
      //   field: "more",
      //   cellClass: "custom-cell",
      //   cellStyle: {
      //     textAlign: "center",
      //     display: "flex",
      //     justifyContent: "center",
      //     alignItems: "center",
      //   },
      //   cellRenderer: (params: any) => {
      //     const playIcon = document.createElement("img");
      //     playIcon.src = "assets/play-circle-icon.svg";
      //     playIcon.style.width = "20px";
      //     playIcon.style.height = "20px";
      //     playIcon.style.cursor = "pointer";
      //     playIcon.style.marginRight = "8px";
      //     playIcon.style.marginTop = "10px";
      //     playIcon.title = "Play Video";
      //     playIcon.classList.add("play-icon");

      //     playIcon.addEventListener("click", (event) => {
      //       this.openPlayTooltip(event as unknown as MouseEvent, params);
      //     });

      //     const div = document.createElement("div");
      //     div.appendChild(playIcon);
      //     return div;
      //   },
      // },
    ];
  }

  /** Custom status bar configuration for AG Grid (if used). */
  statusBar = {
    statusPanels: [
      { statusPanel: "agTotalRowCountComponent", align: "left" },
      { statusPanel: "myEventWallLabel", align: "left" },
      { statusPanel: "agPaginationPanel", align: "right" },
    ],
  };

  /** -------------------- "More" section (expanded stats) -------------------- */
  /**
   * Load additional escalated details for either CLOSED or PENDING view.
   * - CLOSED: fetch categorized counts for the current actionTag and date range.
   * - PENDING: map existing secondEscalatedDetails to the EscalatedDetail shape.
   */
  loadEscalatedDetails(): void {
    if (this.selectedFilter === "CLOSED") {
      const actionTag = this.suspiciousChecked ? 2 : 1;

      const startDateStr = this.selectedStartDate
        ? this.formatDateTimeFull(this.selectedStartDate)
        : undefined;
      const endDateStr = this.selectedEndDate
        ? this.formatDateTimeFull(this.selectedEndDate)
        : undefined;

      const categoryName = actionTag === 1 ? "False Activity" : "Suspicious";
      const displayCategoryLabel = actionTag === 1 ? "False" : "Suspicious";

      this.eventsService
        .getEventReportCountsForActionTag(startDateStr, endDateStr, actionTag)
        .subscribe({
          next: (res) => {
            const counts = res.counts || {};
            const details: EscalatedDetail[] = [];

            // Main total card for the category
            const totalData = counts[categoryName];
            if (totalData) {
              details.push({
                label: displayCategoryLabel,
                value: totalData.totalCount || 0,
                color: ESCALATED_COLORS[0],
                icons: [
                  { iconPath: "assets/home.svg", count: totalData.sites || 0 },
                  { iconPath: "assets/cam.svg", count: totalData.cameras || 0 },
                ],
                colordot: [
                  { iconcolor: "#53BF8B", count: totalData.Event_Wall || 0 },
                  { iconcolor: "#FFC400", count: totalData.Manual_Wall || 0 },
                ],
              });
            }

            // One card per subcategory
            Object.entries(counts).forEach(([label, data]: [string, any]) => {
              if (label !== categoryName) {
                details.push({
                  label,
                  value: data.totalCount || 0,
                  color: ESCALATED_COLORS[0],
                  icons: [
                    { iconPath: "assets/home.svg", count: data.sites || 0 },
                    { iconPath: "assets/cam.svg", count: data.cameras || 0 },
                  ],
                  colordot: [
                    { iconcolor: "#53BF8B", count: data.Event_Wall || 0 },
                    { iconcolor: "#FFC400", count: data.Manual_Wall || 0 },
                  ],
                });
              }
            });

            this.escalatedDetailsClosed = details;
          },
          error: (err) => {
            console.error("Error loading escalated details for CLOSED:", err);
            this.escalatedDetailsClosed = [];
          },
        });
    } else {
      // PENDING view: project the already fetched small stat cards
      const details: EscalatedDetail[] = [];

      const total = this.secondEscalatedDetails.find(
        (e) => e.label === "Total"
      );
      const site = this.secondEscalatedDetails.find(
        (e) => e.iconPath === "assets/home.svg"
      );
      const camera = this.secondEscalatedDetails.find(
        (e) => e.iconPath === "assets/cam.svg"
      );
      const manualWall = this.secondEscalatedDetails.find(
        (e) => e.iconcolor === "#FFC400"
      );
      const eventWall = this.secondEscalatedDetails.find(
        (e) => e.iconcolor === "#53BF8B"
      );
      const missedWall = this.secondEscalatedDetails.find(
        (e) => e.iconcolor === "#FF0000"
      );

      details.push({
        label: "False",
        value: total?.value || 0,
        color: ESCALATED_COLORS[0],
        icons: [
          { iconPath: "assets/home.svg", count: site?.value || 0 },
          { iconPath: "assets/cam.svg", count: camera?.value || 0 },
        ],
        colordot: [
          { iconcolor: "#FFC400", count: manualWall?.value || 0 },
          { iconcolor: "#53BF8B", count: eventWall?.value || 0 },
          { iconcolor: "#FF0000", count: missedWall?.value || 0 },
        ],
      });

      this.escalatedDetailsPending = details;
    }
  }

  /** Storage for expanded stats by tab */
  escalatedDetailsClosed: EscalatedDetail[] = [];
  escalatedDetailsPending: EscalatedDetail[] = [];
}
