import { Component, OnInit } from "@angular/core";
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

import { EscalationPopupComponent } from "../../shared/escalation-popup/escalation-popup.component";
import { AgGridModule } from "ag-grid-angular";
import { CalendarComponent } from "src/app/shared/calendar/calendar.component";
import { EventsService } from "./events.service";
import { ESCALATED_COLORS } from "src/app/shared/constants/chart-colors";

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
  ],
})
export class EventsComponent implements OnInit {
  /** -------------------- Dates -------------------- */
  currentDate: Date = new Date();
  selectedDate: Date | null = null;
  currentDateTime: Date = new Date();

  /** -------------------- Filters & toggles -------------------- */
  selectedFilter: "CLOSED" | "PENDING" = "PENDING";
  selectedpendingFilter: "CONSOLES" | "QUEUES" = "CONSOLES";
  consolesChecked: boolean = true;
  queuesChecked: boolean = false;
  suspiciousChecked: boolean = true;
  falseChecked: boolean = false;
  searchTerm: string = "";
  showMore: boolean = false;

  /** -------------------- AG Grid APIs -------------------- */
  gridApi!: GridApi;
  closedGridApi: any;
  pendingGridApi: any;

  /** -------------------- Popup handling -------------------- */
  isTablePopupVisible = false;
  isPopupVisible = false;
  selectedItem: any = null;

  isPlayPopupVisible = false;
  selectedPlayItem: any = null;
  currentSlideIndex: number = 0;

  isCalendarPopupOpen = false;

  /** -------------------- Dashboard data -------------------- */
  rowData: any[] = [];
  pendingRowData: any[] = [];
  secondEscalatedDetails: SecondEscalatedDetail[] = [];

  /** -------------------- Column definitions -------------------- */
  closedColumnDefs: ColDef[] = [];
  pendingColumnDefs: ColDef[] = [];
  defaultColDef: ColDef = { resizable: true };
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
  constructor(private eventsService: EventsService) {}

  /** -------------------- Lifecycle -------------------- */
ngOnInit() {
  this.selectedDate = new Date();
  this.selectedStartDate = this.selectedDate;
  this.selectedEndDate = this.selectedDate;
  this.setupColumnDefs();
  this.loadPendingEvents();

  // auto-refresh the displayed clock every 1 min
  setInterval(() => {
    this.currentDateTime = new Date();
  }, 60000);
}

  /** -------------------- Filter & toggle actions -------------------- */
  setFilter(filter: "CLOSED" | "PENDING") {
    console.log("Setting filter to:", filter);
    this.selectedFilter = filter;
    this.searchTerm = "";

    if (filter === "PENDING") {
      this.loadPendingEvents();
      this.pendingGridApi?.setQuickFilter("");
    } else {
      this.suspiciousChecked = true;
      this.falseChecked = false;
      this.loadClosedAndEscalatedDetails();
      this.closedGridApi?.setQuickFilter("");
    }
  }

  onSuspiciousToggle() {
  this.suspiciousChecked = true;
  this.falseChecked = false;
  this.loadClosedAndEscalatedDetails();
  if (this.showMore) this.loadEscalatedDetails();
}

onFalseToggle() {
  this.suspiciousChecked = false;
  this.falseChecked = true;
  this.loadClosedAndEscalatedDetails();
  if (this.showMore) this.loadEscalatedDetails();
}

onconsolesToggle() {
  this.consolesChecked = true;
  this.queuesChecked = false;
  this.selectedpendingFilter = "CONSOLES";
  this.loadPendingEvents();
}

onqueuesToggle() {
  this.consolesChecked = false;
  this.queuesChecked = true;
  this.selectedpendingFilter = "QUEUES";
  this.loadPendingEvents();
}

  toggleMore() {
    this.showMore = !this.showMore;
    if (this.showMore) {
      this.loadEscalatedDetails(); // Load data for "More" section
    }
  }

  /** -------------------- AG Grid setup -------------------- */
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    const resizeAll = () => {
      const ids = this.gridApi.getColumns()?.map((col) => col.getColId()) ?? [];
      this.gridApi.autoSizeColumns(ids, false);
      this.gridApi.sizeColumnsToFit();
    };
    setTimeout(resizeAll);
    this.gridApi.addEventListener("firstDataRendered", resizeAll);
    window.addEventListener("resize", resizeAll);
  }

  onClosedGridReady(params: any) {
    this.closedGridApi = params.api;
  }

  onPendingGridReady(params: any) {
    this.pendingGridApi = params.api;
  }

  onFilterTextBoxChanged() {
    this.gridApi?.setGridOption("quickFilterText", this.searchTerm);
  }

  closedQuickFilterMatcher = (quickFilterParts: string[], rowText: string) =>
    quickFilterParts.every((part) => new RegExp(part, "i").test(rowText));

  pendingQuickFilterMatcher = (quickFilterParts: string[], rowText: string) =>
    quickFilterParts.every((part) => new RegExp(part, "i").test(rowText));

  /** -------------------- AG Grid cell click -------------------- */
onCellClicked(event: any) {

  const target = event.event.target as HTMLElement;

  if (event.colDef.field === "more" && target.closest(".info-icon")) {
   
     const eventId = event.data.eventId; // id from the table row
   
    this.eventsService.getEventMoreInfo(eventId).subscribe({
      next: (res) => {
     
        this.openTablePopup(res); // pass the full object to popup
      }
    });
  }

  if (event.colDef.field === "more" && target.closest(".play-icon")) {
    this.openPlayPopup(event.data);
  }
}

fetchMoreInfo(eventId: number) {
  this.eventsService.getEventMoreInfo(eventId).subscribe({
    next: (res) => {
      this.selectedItem = res; // set popup data
      this.isTablePopupVisible = true; // open popup
    },
    error: (err) => {
      console.error('Error fetching more info:', err);
    },
  });
}



  /** -------------------- Popup handling -------------------- */
  openTablePopup(item: any) {
    this.selectedItem = item;
    this.isTablePopupVisible = true;
  }

  closePopup() {
    this.isPopupVisible = false;
    this.isTablePopupVisible = false;
  }

  openPlayPopup(item: any) {
    this.selectedPlayItem = item;
    this.isPlayPopupVisible = true;
  }

  closePlayPopup() {
    this.isPlayPopupVisible = false;
    this.selectedPlayItem = null;
  }

  openCalendarPopup() {
    this.isCalendarPopupOpen = true;
  }

  closeCalendarPopup() {
    this.isCalendarPopupOpen = false;
  }

  onDateSelected(date: Date) {
    this.selectedDate = date;
    console.log(this.selectedDate, "selected dates");
    this.closeCalendarPopup();
  }

  changeDate(offset: number) {
    if (this.selectedDate) {
      const updatedDate = new Date(this.selectedDate);
      updatedDate.setDate(updatedDate.getDate() + offset);
      this.selectedDate = updatedDate;
    }
  }

  setToday(): void {
    this.currentDate = new Date();
    this.selectedDate = this.currentDate;
  }

  /** -------------------- Play popup carousel -------------------- */
  prevSlide() {
    if (this.selectedPlayItem?.videoFile?.length) {
      this.currentSlideIndex =
        (this.currentSlideIndex - 1 + this.selectedPlayItem.videoFile.length) %
        this.selectedPlayItem.videoFile.length;
    }
  }

  nextSlide() {
    if (this.selectedPlayItem?.videoFile?.length) {
      this.currentSlideIndex =
        (this.currentSlideIndex + 1) % this.selectedPlayItem.videoFile.length;
    }
  }

  /** -------------------- Helper functions -------------------- */
  getIconLabel(iconPath?: string): string {
    const map: { [key: string]: string } = {
      "assets/home.svg": "SITE EVENTS",
      "assets/cam.svg": "CAMERA EVENTS",
      "assets/direction.svg": "GROUP EVENTS",
      "assets/moniter.svg": "MONITER EVENTS",
    };
    return iconPath ? map[iconPath] || "" : "";
  }

  formatDateTime(value: string) {
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

  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
onDateRangeSelected(event: {
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
}) {
  // Merge into full Date objects
  this.selectedStartDate = this.combineDateAndTime(event.startDate, event.startTime);
  this.selectedEndDate = this.combineDateAndTime(event.endDate, event.endTime);

  console.log("Start DateTime:", this.selectedStartDate);
  console.log("End DateTime:", this.selectedEndDate);

  if (this.selectedFilter === 'CLOSED') {
    this.loadClosedAndEscalatedDetails();
  }
}

/** Utility: combine Date + time string into formatted string */
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

  

  private transformQueuesMessages(res: any) {
    const allQueues = [
      ...(res.eventWallQueues?.queues || []),
      ...(res.manualWallQueues?.queues || []),
      ...(res.missedWallQueues?.queues || []),
    ];

    const queuesMessages = allQueues.map((queue: any) => {
      if (!queue.messages || queue.messages.length === 0) {
        // Add placeholder if no messages
        return {
          siteName: "-",
          siteId: "-",
          cameraId: "-",
          objectName: "-",
          eventTag: "-",
          actionTag: "-",
          eventTime: "-",
          actionTime: "-",
          httpUrl: "-",
          imageUrl: "-",
          noOfImages: 0,
          queueName: queue.queueName,
          queueLevel: queue.queueLevel,
        };
      }

      return queue.messages.map((msg: any) => ({
        ...msg,
        queueName: queue.queueName,
        queueLevel: queue.queueLevel,
      }));
    });

    return queuesMessages.flat();
  }

  loadPendingEvents() {
    // Determine level based on selected filter
    const level = this.selectedpendingFilter === "CONSOLES" ? 1 : 2;
    this.eventsService.getEventsPendingEventa(level).subscribe({
      next: (res) => {
        // === Keep your summary cards as-is ===
        this.secondEscalatedDetails = [
          { label: "Total", value: res.totalEvents || 0, color: "#ED3237" },
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
            iconcolor: "#53BF8B",
            value: res.manualWallCount || 0,
            color: "#ED3237",
          },
          {
            iconcolor: "#FFC400",
            value: res.eventWallCount || 0,
            color: "#ED3237",
          },
          {
            iconcolor: "#FF0000",
            value: res.missedWallCount || 0,
            color: "#ED3237",
          },
        ];

        // === Transform API queues into single array for AG Grid ===
        this.pendingRowData = this.transformQueuesMessages(res);
      },
      error: (err) => console.error("Error fetching pending events:", err),
    });
  }

  /** -------------------- Load closed and escalated details -------------------- */

  private formatDateTimeFull(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

  loadClosedAndEscalatedDetails() {
  const actionTag = this.suspiciousChecked ? 2 : 1;

  const startDateStr = this.selectedStartDate
    ? this.formatDateTimeFull(this.selectedStartDate)
    : undefined;

  const endDateStr = this.selectedEndDate
    ? this.formatDateTimeFull(this.selectedEndDate)
    : undefined;



    this.eventsService
      .getSuspiciousEvents(actionTag, startDateStr, endDateStr)
      .subscribe({
        next: (res) => {
          // Closed events for table
          console.log(res,"responce")
          if (res?.eventData) {
            this.rowData = res.eventData.map((e: any) => ({
              ...e,
              siteId: e.siteId,
              siteName: e.siteName,
              device: e.unitId,
              cameraId: e.cameraId?.slice(-2) ?? "",
              duration: `${Math.floor(e.eventDuration / 60)}m ${
                e.eventDuration % 60
              }s`,
              tz: "CT",
              eventStartTime: e.eventStartTime,
              actionTag: e.actionTag,
              employee: {
                name: e.employee || "Unknown",
                avatar: "assets/user1.png",
                level: e.userLevels || "N/A",
              },
              alertType: "green",
              more: true,
            }));
          }

          // Escalated cards for top section
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
                value: res.counts.Manual_Wall || 0,
                color: "#ED3237",
              },
              {
                iconcolor: "#FFC400",
                value: res.counts.Event_Wall || 0,
                color: "#ED3237",
              },
            ];
          }
        },
        error: (err) => {
          console.error("Failed to load closed/escalated details", err);
          this.rowData = [];
          this.secondEscalatedDetails = [];
        },
      });
  }

  /** -------------------- AG Grid utility -------------------- */
  autoSizeColumn(colKey: string) {
    this.gridApi?.autoSizeColumns([colKey], true);
  }

  autoSizeColumns(colKeys: string[]) {
    this.gridApi?.autoSizeColumns(colKeys, true);
  }

  /** -------------------- Column definitions -------------------- */
  setupColumnDefs() {
    // CLOSED column definitions
    this.closedColumnDefs = [
      {
        headerName: "ID",
        field: "siteId",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "SITE",
        field: "siteName",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "DEVICE",
        field: "device",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "CAMERA",
        field: "cameraId",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EVENT TIME",
        field: "eventStartTime",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => this.formatDateTime(params.value),
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "DURATION",
        field: "duration",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "TZ",
        field: "tz",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ACTION TAG",
        field: "actionTag",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EMP.",
        field: "employee",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => params.value?.name || "",
        cellRenderer: (params: any) =>
          `<div style="display:flex; align-items:center; gap:8px;"><img src="${params.value.avatar}" style="width:30px; height:30px; border-radius:50%;" alt="Emp"/><span>${params.value.name} - Level ${params.value.level}</span></div>`,
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ALERT TYPE",
        field: "alertType",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellRenderer: () =>
          `<span style="display:inline-block; width:14px; height:14px; background:green; border-radius:50%;"></span>`,
        floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "MORE",
        field: "more",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellRenderer: () =>
          `<span class="play-icon" style="margin-right:8px;"><img src="assets/play-circle-icon.svg" style="width:20px; height:20px; cursor:pointer;" alt="Play"/></span><span class="info-icon"><img src="assets/information-icon.svg" style="width:20px; height:20px; cursor:pointer;" alt="Info"/></span>`,
      },
    ];

    // PENDING column definitions
    this.pendingColumnDefs = [
      {
        headerName: "ID",
        field: "siteId",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "SITE NAME",
        field: "siteName",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "CAMERA ID",
        field: "cameraId",
        headerClass: "custom-header",
        cellClass: "custom-cell",
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EVENT TAG",
        field: "eventTag",
        headerClass: "custom-header",
        cellClass: "custom-cell",
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ACTION TAG",
        field: "actionTag",
        headerClass: "custom-header",
        cellClass: "custom-cell",
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "EVENT TIME",
        field: "eventTime",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => this.formatDateTime(params.value),
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "ACTION TIME",
        field: "actionTime",
        sortable: true,
        headerClass: "custom-header",
        cellClass: "custom-cell",
        valueFormatter: (params) => this.formatDateTime(params.value),
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "QUEUE NAME",
        field: "queueName",
        headerClass: "custom-header",
        cellClass: "custom-cell",
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      {
        headerName: "QUEUE LEVEL",
        field: "queueLevel",
        headerClass: "custom-header",
        cellClass: "custom-cell",
         floatingFilter: true,
        filter: true,
        suppressHeaderMenuButton: true,
      },
      // {
      //   headerName: "EMP.",
      //   field: "employee",
      //   headerClass: "custom-header",
      //   cellClass: "custom-cell",
      //   cellRenderer: (params: any) =>
      //     `<img src="${params.value.avatar}" style="width:30px; height:30px;" class="avatar-img" alt="Emp"/>`,
      // },
      {
        headerName: "MORE",
        field: "more",
        headerClass: "custom-header",
        cellClass: "custom-cell",
        cellRenderer: () =>
          `<span class="play-icon" style="margin-right:8px;"><img src="assets/play-circle-icon.svg" style="width:20px; height:20px; cursor:pointer;" alt="Play"/></span><span class="info-icon"><img src="assets/information-icon.svg" style="width:20px; height:20px; cursor:pointer;" alt="Info"/></span>`,
      },
    ];
  }

  /** -------------------- New method for loading escalated details -------------------- */
  loadEscalatedDetails() {
    if (this.selectedFilter === "CLOSED") {
      const actionTag = this.suspiciousChecked ? 2 : 1;
      const dateStr = this.formatDate(this.selectedDate || new Date());
      const categoryName = actionTag === 1 ? "False Activity" : "Suspicious";
      const displayCategoryLabel = actionTag === 1 ? "False" : "Suspicious";

      this.eventsService
        .getEventReportCountsForActionTag(dateStr, actionTag)
        .subscribe({
          next: (res) => {
            const counts = res.counts || {};
            const details: EscalatedDetail[] = [];

            // Add total card for the category
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
                  { iconcolor: "#53BF8B", count: totalData.Manual_Wall || 0 },
                  // Add more dots if additional fields like Event_Wall are available
                  // { iconcolor: "#FFC400", count: totalData.Event_Wall || 0 },
                ],
              });
            }

            // Add cards for each subcategory
            Object.entries(counts).forEach(([label, data]: [string, any]) => {
              if (label !== categoryName) {
                details.push({
                  label: label,
                  value: data.totalCount || 0,
                  color: ESCALATED_COLORS[0],
                  icons: [
                    { iconPath: "assets/home.svg", count: data.sites || 0 },
                    { iconPath: "assets/cam.svg", count: data.cameras || 0 },
                  ],
                  colordot: [
                    { iconcolor: "#53BF8B", count: data.Manual_Wall || 0 },
                    // Add more dots if additional fields like Event_Wall are available
                    // { iconcolor: "#FFC400", count: data.Event_Wall || 0 },
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
      // PENDING filter: Use secondEscalatedDetails from loadPendingEvents
      const details: EscalatedDetail[] = [];

      // Map secondEscalatedDetails to escalatedDetailsPending format
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
        (e) => e.iconcolor === "#53BF8B"
      );
      const eventWall = this.secondEscalatedDetails.find(
        (e) => e.iconcolor === "#FFC400"
      );
      const missedWall = this.secondEscalatedDetails.find(
        (e) => e.iconcolor === "#FF0000"
      );

      // Main card for "False"
      details.push({
        label: "False",
        value: total?.value || 0,
        color: ESCALATED_COLORS[0],
        icons: [
          { iconPath: "assets/home.svg", count: site?.value || 0 },
          { iconPath: "assets/cam.svg", count: camera?.value || 0 },
        ],
        colordot: [
          { iconcolor: "#53BF8B", count: manualWall?.value || 0 },
          { iconcolor: "#FFC400", count: eventWall?.value || 0 },
          { iconcolor: "#FF0000", count: missedWall?.value || 0 },
        ],
      });

      this.escalatedDetailsPending = details;
    }
  }

  escalatedDetailsClosed: EscalatedDetail[] = [];
  escalatedDetailsPending: EscalatedDetail[] = [];
}
