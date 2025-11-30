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
  currentFilter: EventsFilterCriteria = {
    startDate: null,
    endDate: null,
    startTime: "00:00",
    endTime: "23:59",
    minDuration: 0,
    maxDuration: 120,
    city: "All",
    site: "All",
    camera: "All",
    actionTag: "All",
    eventType: "All",
    employee: "All",
  };

  /** -------------------- Display arrays (post-filter) -------------------- */
  rowData: any[] = []; // CLOSED table data (raw)
  pendingRowData: any[] = []; // PENDING table data (raw)

  closedDisplayRows: any[] = []; // what CLOSED grid sees
  pendingDisplayRows: any[] = []; // what PENDING grid sees

  onFilterReset() {
    this.pendingDisplayRows = [...this.pendingRowData];
    this.closedDisplayRows = [...this.rowData];
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

      // dropdowns
      const city = row.cityName ?? row.city;
      if (criteria.city !== "All" && city !== criteria.city) return false;
      if (criteria.site !== "All" && row.siteName !== criteria.site)
        return false;
      if (criteria.camera !== "All" && row.cameraId !== criteria.camera)
        return false;
      if (
        criteria.actionTag !== "All" &&
        (row.actionTag ?? row.subActionTag) !== criteria.actionTag
      )
        return false;
      if (
        criteria.eventType !== "All" &&
        (row.eventType ?? row.eventTag) !== criteria.eventType
      )
        return false;

      const emp = row.employee?.name ?? row.userName ?? row.user;
      if (criteria.employee !== "All" && emp !== criteria.employee)
        return false;

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
  isTablePopupVisible = false;
  isPopupVisible = false;
  selectedItem: any = null;

  isPlayPopupVisible = false;

  /** Calendar popup visibility */
  isCalendarPopupOpen = false;

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
  refreshInterval = 1; // minutes; default 1
  private refreshSub?: Subscription;
  private hasStartedAutoRefresh = false;

  toastMessages: any[] = [];

  statusBar = {
    statusPanels: [
      { statusPanel: "agTotalRowCountComponent", align: "left" },
      { statusPanel: "myEventWallLabel", align: "left" },
      { statusPanel: "agPaginationPanel", align: "right" },
    ],
  };

  /** -------------------- Filters (dropdown lists) -------------------- */
  filterLists = {
    cities: [] as string[],
    sites: [] as string[],
    cameras: [] as string[],
    actionTags: ["Suspicious", "False", "Event_Wall", "Manual_Wall"],
    eventTypes: ["Event_Wall", "Manual_Wall"],
    employees: [] as string[],
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
  get employees() {
    return this.filterLists.employees;
  }

  /** -------------------- Constructor -------------------- */
  constructor(private eventsService: EventsService) {}

  /** -------------------- Lifecycle -------------------- */
  ngOnInit(): void {
    this.selectedDate = new Date();
    this.selectedStartDate = this.selectedDate;
    this.selectedEndDate = this.selectedDate;

    this.setupColumnDefs();
    this.loadPendingEvents();

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


    /**
   * Resolve which media array to use based on:
   * - PENDING + CONSOLES  => image_list
   * - PENDING + QUEUES    => videoUrl
   * - CLOSED (Suspicious/False) => videoFile
   */
  private resolveMediaUrls(item: any): string[] {
    // PENDING tab
    if (this.selectedFilter === "PENDING") {
      // CONSOLES on
      if (this.selectedpendingFilter === "CONSOLES") {
        const list = item.image_list ?? item.imageList ?? item.images;
        if (Array.isArray(list)) {
          return list.filter((x: any) => !!x);
        }
        if (typeof list === "string" && list) {
          return [list];
        }
        return [];
      }

      // QUEUES on
      if (this.selectedpendingFilter === "QUEUES") {
        const v = item.videoUrl ?? item.videoURL;
        if (Array.isArray(v)) {
          return v.filter((x: any) => !!x);
        }
        if (typeof v === "string" && v) {
          return [v];
        }
        return [];
      }
    }

    // CLOSED tab (SUSPICIOUS / FALSE both use videoFile)
    const vf = item.videoFile ?? item.videoFiles;
    if (Array.isArray(vf)) {
      return vf.filter((x: any) => !!x);
    }
    if (typeof vf === "string" && vf) {
      return [vf];
    }
    return [];
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopImageLoop();
  }

  /** -------------------- Toast helpers -------------------- */
  onToastClose(event: any) {
    this.toastMessages = this.toastMessages.filter((m) => m !== event.message);
  }

  showToast(severity: string, summary: string, detail: string, life = 3000) {
    this.toastMessages = [
      ...this.toastMessages,
      { severity, summary, detail, life },
    ];
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

  /** -------------------- Auto-refresh -------------------- */
  refreshData(): void {
    if (this.selectedFilter === "PENDING") {
      this.loadPendingEvents({ silent: false });
    } else {
      if (this.selectedStartDate && this.selectedEndDate) {
        this.loadClosedAndEscalatedDetails({ silent: false });
      } else {
        this.showToast(
          "warn",
          "Pick a date range",
          "Select dates in the calendar to refresh CLOSED events."
        );
        return;
      }
    }

    this.scheduleAutoRefresh(this.refreshInterval);
    this.hasStartedAutoRefresh = true;
  }

  private scheduleAutoRefresh(minutes: number): void {
    this.stopAutoRefresh();
    if (!minutes || minutes <= 0) return;

    this.refreshSub = interval(minutes * 60_000).subscribe(() => {
      if (this.selectedFilter === "PENDING") {
        this.loadPendingEvents({ silent: true });
      } else if (this.selectedFilter === "CLOSED") {
        if (this.selectedStartDate && this.selectedEndDate) {
          this.loadClosedAndEscalatedDetails({ silent: true });
        }
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = undefined;
    }
  }

  onIntervalChange(intervalMin: number): void {
    this.refreshInterval = Number(intervalMin) || 1;
    this.showToast(
      "info",
      "Auto-refresh Interval Updated",
      `Refresh will occur every ${this.refreshInterval} minute(s).`
    );
  }

  /** -------------------- AG Grid setup -------------------- */
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

    setTimeout(() => {
      const paginationPanel = document.querySelector(
        ".ag-paging-panel"
      ) as HTMLElement | null;
      if (!paginationPanel) return;

      const tplRef =
        this.selectedFilter === "PENDING"
          ? this.paginationControls
          : this.paginationControlsClosed;

      if (tplRef) {
        const clone = tplRef.nativeElement.cloneNode(true) as HTMLElement;
        clone.style.display = "flex";
        clone.style.alignItems = "center";
        clone.style.gap = "12px";
        clone.style.marginRight = "25%";
        paginationPanel.prepend(clone);
      }
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
  openTablePopup(item: any): void {
    this.selectedItem = item;
    this.isTablePopupVisible = true;
  }

  closePopup(): void {
    this.isPopupVisible = false;
    this.isTablePopupVisible = false;
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

    this.selectedPlayItem = {
      ...item,
      videoFile: media, // again normalize
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

        if (!this.hasStartedAutoRefresh && this.selectedFilter === "PENDING") {
          this.hasStartedAutoRefresh = true;
          this.scheduleAutoRefresh(this.refreshInterval);
        }
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
              avatar: "assets/user1.png",
              level: e?.userLevels || "N/A",
              name: e?.userName ?? e?.user ?? "",
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

          /** ------------------------------
           *  CASE 1: API returned ONLY "null"
           *  → show NO DATA
           * ------------------------------*/
          if (
            keys.length === 1 &&
            (keys[0] === "null" || keys[0] === null)
          ) {
            this.escalatedDetailsClosed = [];
            return;
          }

          const details: EscalatedDetail[] = [];

          /** ------------------------------
           *  Normalize real category
           * ------------------------------*/
          Object.entries(counts).forEach(([label, data]: any) => {
            if (label === "null") return; // ignore "null" response completely

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
        }
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
    this.filterLists.employees = this.uniq(
      rows.map((r) => r.employeeName ?? r.userName ?? r.user)
    );
  }

  private refreshDropdownListsFromClosed() {
    const rows = this.rowData || [];
    this.filterLists.cities = this.uniq(rows.map((r) => r.cityName ?? r.city));
    this.filterLists.sites = this.uniq(rows.map((r) => r.siteName));
    this.filterLists.cameras = this.uniq(rows.map((r) => r.cameraId));
    this.filterLists.employees = this.uniq(
      rows.map((r) => r.employee?.name ?? r.userName ?? r.user)
    );
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
      {
        headerName: "EMP.",
        field: "employee",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => params.value?.name || "",
        cellRenderer: (params: any) =>
          `<div style="display:flex; align-items:center; gap:8px;">
            <img src="${params.value.avatar}" style="width:20px; height:20px; border-radius:50%;" alt="Emp"/>
            <span>${params.value.level}</span>
          </div>`,
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
          `<span style="display:inline-block; width:14px; margin-top:10px; height:14px; background:${params.value}; border-radius:50%;"></span>`,
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
        // field: "displayTime",
       valueGetter: (params) => {
          return params.data.eventTime || params.data.eventStartTime || params.data.timestamp;
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
          `<span style="display:inline-block; width:14px; margin-top:10px; height:14px; background:${params.value}; border-radius:50%;"></span>`,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EMP",
        field: "employee",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => params.value?.name || "",
        cellRenderer: (params: any) =>
          `<div style="display:flex; align-items:center; gap:8px;">
            <img src="${params.value.avatar}" style="width:20px; height:20px; border-radius:50%;" alt="Emp"/>
            <span>${params.value.level}</span>
          </div>`,
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
