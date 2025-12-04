import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  OnChanges,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, Column } from "ag-grid-community";
import { DialogModule } from "primeng/dialog";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { EventsService } from "src/app/pages/events/events.service";
@Component({
  selector: "app-escalation-popup",
  templateUrl: "./escalation-popup.component.html",
  styleUrls: ["./escalation-popup.component.css"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridModule,
    DialogModule,
    ButtonModule,
  ],
  providers: [], // 👈 provide pipe here
})
export class EscalationPopupComponent implements OnChanges, OnInit {
  @Input() isVisible = false;
  @Input() selectedItem: any;
  @Input() selectedDate: Date | null = null;
  @Input() data: any; // not used, kept for compatibility

  @Input() tableConfigs: {
    [key: string]: { columnDefs: ColDef[]; rowData: any[] };
  } = {};
  @Input() popupType: "MORE" | "DETAILS" = "DETAILS";

  // 👇 NEW: queueUsers from your queue API response
  @Input() queueUsers: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() refreshMoreInfo = new EventEmitter<number>();
  @Output() addCommentClicked = new EventEmitter<void>();

  currentUser: any = null;

  /** View toggle: false = ESCALATION DETAILS, true = ADD COMMENT **/
  isAddCommentView = false;

  /** ADD COMMENT form model **/
  commentTags = [
    { label: "Suspicious", value: "SUSPICIOUS" },
    { label: "False", value: "FALSE" },
    { label: "Info", value: "INFO" },
  ];

  addCommentForm: { tag: string | null; notes: string } = {
    tag: null,
    notes: "",
  };

  // Row data for escalation and alarm events
  escalationRowData: any[] = [];
  alarmRowData: any[] = [];
  commentRowData: any[] = [];

  selectedTZ: "MT" | "CT" | "IST" = "MT";

  escalationGridApi!: GridApi;
  commentGridApi!: GridApi;
  commentGridColumnApi!: Column;

  selectedEvent: any = null;

  constructor(
    private eventsService: EventsService,
  ) {}

  // ------------------------ INIT ------------------------
  ngOnInit() {
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

  handleAddClick() {
    // just tell the parent; parent will open a new popup
    this.addCommentClicked.emit();
  }

  // ------------------------ TZ Handling ------------------------
  onTzChange(tz: "MT" | "CT" | "IST") {
    this.selectedTZ = tz;
    this.refreshTimeColumns();
  }

  private getTimeValue =
    (baseField: "receiveAt" | "reviewStart" | "reviewEnd") => (params: any) => {
      let key: string = baseField;
      if (this.selectedTZ === "CT") key = `${baseField}(CT)`;
      else if (this.selectedTZ === "IST") key = `${baseField}(IST)`;

      const row = (params?.data ?? {}) as Record<string, unknown>;
      const raw =
        (row[key] as string | Date | undefined) ??
        (row[baseField] as string | Date | undefined) ??
        "";

      const full = this.formatDateTime(raw);
      return full.split(" ")[1] || ""; // only HH:MM:SS
    };

  private refreshTimeColumns() {
    if (this.escalationGridApi) {
      this.escalationGridApi.refreshCells({
        force: true,
        columns: ["receiveAt", "reviewStart", "reviewEnd"],
      });
    }
  }

  private normalizeAvatarUrl(url?: string): string | undefined {
    if (!url) return url;
    return url.replace(
      /assetName=([^&]+)/,
      (_m, v) => `assetName=${encodeURIComponent(v)}`
    );
  }


  // ------------------------ ESCALATION COLUMNS ------------------------
  escalationColumnDefs: ColDef[] = [
    {
      headerName: "USER",
      field: "user",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellRenderer: this.userCellRenderer.bind(this),
      editable: false,
    },
    {
      headerName: "USER LEVEL",
      field: "userLevel",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: false,
    },
    {
      headerName: "RECEIVE AT",
      field: "receiveAt",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: false,
      valueGetter: this.getTimeValue("receiveAt"),
    },
    {
      headerName: "REVIEW START",
      field: "reviewStart",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: false,
      valueGetter: this.getTimeValue("reviewStart"),
    },
    {
      headerName: "REVIEW END",
      field: "reviewEnd",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: false,
      valueGetter: this.getTimeValue("reviewEnd"),
    },
    {
      headerName: "DURATION",
      field: "duration",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: false,
    },
    {
      headerName: "ACTION TAG",
      field: "actionTag",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: false,
    },
    {
      headerName: "TAG",
      field: "subActionTag",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isDuplicate && params.data.isEditing,
    },
    {
      headerName: "NOTES",
      field: "notes",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isDuplicate && params.data.isEditing,
    },
    {
      headerName: "END OF SHIFT",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellRenderer: (params: any) => {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.gap = "6px";

        const rowIndex = params.node.rowIndex;
        const lastRowIndex = params.api.getDisplayedRowCount() - 1;
        const isDuplicate = !!params.data.isDuplicate;
        const isEditing = !!params.data.isEditing;

        // duplicate row in edit -> ✓ / X
        if (isDuplicate && isEditing) {
          const saveBtn = document.createElement("button");
          saveBtn.className = "action-btn save-btn";
          saveBtn.innerText = "✓";
          saveBtn.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            params.api.stopEditing();

            setTimeout(() => {
              this.saveEscalation(params.node.data);
            }, 0);
          });

          const cancelBtn = document.createElement("button");
          cancelBtn.className = "action-btn delete-btn";
          cancelBtn.innerText = "x";
          cancelBtn.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            params.api.applyTransaction({ remove: [params.data] });
          });

          container.appendChild(saveBtn);
          container.appendChild(cancelBtn);
          return container;
        }

        // last ORIGINAL row -> pencil icon
        if (!isDuplicate && rowIndex === lastRowIndex) {
          const editBtn = document.createElement("button");
          editBtn.className = "action-btn1 edit-btn1";

          const pencilIcon = document.createElement("img");
          pencilIcon.src = "assets/pencil.svg";
          pencilIcon.alt = "Edit";
          pencilIcon.style.width = "16px";
          pencilIcon.style.height = "16px";

          editBtn.appendChild(pencilIcon);

          editBtn.addEventListener("click", () => {
            this.createDuplicateRowFromLast(params);
          });

          container.appendChild(editBtn);
          return container;
        }

        return container;
      },
    },
  ];

  /** Create duplicate row from last row and put into edit mode */
  createDuplicateRowFromLast(params: any) {
    const lastRowNode = params.api.getDisplayedRowAtIndex(
      params.api.getDisplayedRowCount() - 1
    );
    if (!lastRowNode) return;

    const original = lastRowNode.data;

    const duplicate = {
      ...original,
      isDuplicate: true,
      isEditing: true,
    };

    const res = params.api.applyTransaction({ add: [duplicate] });
    const newRowNode = res?.add && res.add[0] ? res.add[0] : null;
    if (!newRowNode) return;

    const rowIndex = newRowNode.rowIndex;
    params.api.startEditingCell({
      rowIndex,
      colKey: "subActionTag",
    });
  }

  saveEscalation(data: any) {
    if (!this.selectedEvent) {
      console.error("No event selected");
      return;
    }

    const eventId = Number(this.selectedItem.eventDetails[0]?.eventId);
    if (!eventId) {
      console.error("Invalid eventId:", this.selectedItem.eventDetails[0]);
      return;
    }

    const levelId =
      typeof data.levelId === "number"
        ? data.levelId
        : Number(data.levelId) || 0;

    const payload = {
      eventsId: String(eventId),
      userlevel: levelId,
      user: this.currentUser?.UserId || 0,
      alarm: "N",
      landingTime: data.receiveAt || "",
      receivedTime: "",
      reviewStartTime: data.reviewStart || "",
      reviewEndTime: data.reviewEnd || "",
      actionTag: this.mapActionTag(data.actionTag),
      subActionTag: Number(data.subActionTag),
      notes: data.notes || "",
    };

    console.log("Sending escalation update payload:", payload);

    this.eventsService.putEventsMoreInfo(payload).subscribe({
      next: (res) => {
        console.log("Escalation updated successfully", res);
        data.isEditing = false;
        data.isDuplicate = false;
        this.escalationGridApi.applyTransaction({ update: [data] });
        this.refreshMoreInfo.emit(eventId);
      },
      error: (err) => {
        console.error("Error updating escalation", err);
      },
    });
  }

  private mapActionTag(value: any): number {
    if (!value) return 3;

    const v = String(value).trim().toLowerCase();

    if (v === "suspicious") return 2;
    if (v === "false" || v === "false alarm") return 1;

    return 3;
  }

  // ------------------------ ALARM COLUMNS ------------------------
  alarmColumnDefs: ColDef[] = [
    {
      headerName: "Time",
      field: "deterredTime",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "USER",
      field: "user",
      headerClass: "custom-header",
      cellStyle: {
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
      cellClass: "custom-cell",
      cellRenderer: (params: any) => {
        const imgUrl = params.data.userName
          ? `https://i.pravatar.cc/30?u=${params.data.userName}`
          : "https://i.pravatar.cc/30?img=1";

        return `
          <img src="${imgUrl}" alt="user"
            style="width: 24px; height: 24px; border-radius: 50%;  margin-top: 15px " />
        `;
      },
    },
    {
      headerName: "DESCRIPTION",
      field: "description",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellStyle: {
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
      cellRenderer: (params: any) => {
        const value = params.value;
        let iconUrl = "";

        switch (value) {
          case "N":
            iconUrl = "assets/alarm-warning-fill-copy.svg";
            break;
          case "P":
            iconUrl = "assets/alarm-warning-fill-success.svg";
            break;
          case "":
            iconUrl = "";
            break;
        }

        return `<img src="${iconUrl}" alt="${value}" style="width:17px;  margin-top: 15px ;height:17px;" />`;
      },
    },
    {
      headerName: "STATUS",
      field: "status",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
  ];

  // ------------------------ BASIC INFO ------------------------
  basicInfoFields: { label: string; field: string; default?: string }[] = [
    { label: "Escalation ID", field: "eventId" },
    { label: "Ticket No.", field: "ticketNo", default: "--" },
    { label: "Site Name", field: "siteName" },
    { label: "Camera Name", field: "cameraName" },
    { label: "Camera Id", field: "cameraId" },
    { label: "Event Time (CT)", field: "eventTime_CT" },
    { label: "Event Time Customer", field: "eventStartTime" },
    { label: "Event Time (IN)", field: "eventTime_IN" },
    { label: "Type", field: "eventType", default: "--" },
    { label: "City", field: "country" },
  ];

  getEventDotColor(eventType: string): string {
    switch (eventType) {
      case "Manual Wall":
        return "#FFC400";
      case "Event Wall":
        return "#53BF8B";
      case "Missed Wall":
        return "#FF0000";
      default:
        return "#ccc";
    }
  }

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  // ------------------------ ON CHANGES ------------------------
  ngOnChanges(changes: SimpleChanges) {
    if (changes["selectedItem"] && this.selectedItem) {
      console.log("API Data received in popup:", this.selectedItem);

      // 🧩 Map userId -> profileImage from queueUsers
      const userImageMap = new Map<number, string>();
      (this.queueUsers || []).forEach((u: any) => {
        if (u?.userId && u?.profileImage) {
          userImageMap.set(Number(u.userId), u.profileImage);
        }
      });

      this.escalationRowData = (
        this.selectedItem.eventEscalationInfo || []
      ).map((item: any) => ({
        ...item,
        user: {
          // custom user object used by userCellRenderer
          imgUrl: userImageMap.get(Number(item.user)) || null, // profileImage from API
          img: "https://i.pravatar.cc/30?img=1", // fallback
          name: item.userName ?? String(item.user ?? ""),
          id: item.user ?? null,
        },
        isEditing: false,
        isDuplicate: false,
      }));

      this.alarmRowData = (this.selectedItem.eventAlarmInfo || []).map(
        (item: any) => ({
          ...item,
          user: item.user || { img: "https://i.pravatar.cc/30?img=1" },
        })
      );

      this.commentRowData = (this.selectedItem.eventComments || []).map(
        (c: any) => ({
          user: { img: "https://i.pravatar.cc/30?img=1" },
          name: c.name || "",
          level: c.level || "",
          submittedtime: this.formatDateTime(c.submittedTime || new Date()),
          notes: c.notes || "",
        })
      );

      this.selectedEvent = (this.selectedItem.eventDetails || [])[0] || null;
    }
  }

  get formattedBasicInfo() {
    return this.basicInfoFields.map((field) => {
      let value = this.selectedEvent?.[field.field] ?? field.default ?? "--";

      if (field.label.toLowerCase().includes("time") && value !== "--") {
        value = this.formatDateTime(value);
      }

      return { ...field, value };
    });
  }

  formatDateTime(dateInput: string | Date): string {
    const d = new Date(dateInput);
    const pad = (n: number) => n.toString().padStart(2, "0");

    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();

    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  // ------------------------ GRID READY ------------------------
  onGridReady(params: any) {
    this.escalationGridApi = params.api;
    params.api.sizeColumnsToFit();
    params.columnApi.autoSizeAllColumns();
    this.commentGridApi = params.api; // kept for compatibility
  }

  onCommentGridReady(params: any) {
    params.api.sizeColumnsToFit();
    this.commentGridApi = params.api;
    this.commentGridColumnApi = params.columnApi;
  }

  // ------------------------ COMMENTS GRID (READ-ONLY) ------------------------
  commentColumnDefs: ColDef[] = [
    {
      headerName: "USER",
      field: "user",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellRenderer: this.userCellRenderer.bind(this),
      editable: false,
    },
    {
      headerName: "NAME",
      field: "name",
      editable: false,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "LEVEL",
      field: "level",
      editable: false,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "SUBMITTED TIME",
      field: "submittedtime",
      editable: false,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "NOTES",
      field: "notes",
      editable: false,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
  ];

  // ------------------------ ADD COMMENT VIEW LOGIC ------------------------
  openAddCommentView() {
    this.addCommentForm = { tag: null, notes: "" };
    this.isAddCommentView = true;
  }

  onCancelAddComment() {
    this.isAddCommentView = false;
  }

  onSubmitAddComment() {
    if (!this.selectedEvent) {
      console.error("No event selected");
      return;
    }

    const eventId = Number(this.selectedItem?.eventDetails?.[0]?.eventId);
    if (!eventId) {
      console.error("Invalid eventId:", this.selectedItem?.eventDetails?.[0]);
      return;
    }

    const notes = (this.addCommentForm.notes || "").trim();
    if (!notes) {
      console.warn("Comment cannot be empty");
      return;
    }

    const payload = {
      eventsId: String(eventId),
      commentsInfo: notes,
      createdBy: this.currentUser?.UserId || 0,
      remarks: "",
    };

    console.log("Sending comment payload:", payload);

    this.eventsService.addComment(payload).subscribe({
      next: (res) => {
        console.log("Comment saved successfully", res);
        // Close ADD COMMENT view, show details again
        this.isAddCommentView = false;
        // Ask parent to refresh more-info for this event
        this.refreshMoreInfo.emit(eventId);
      },
      error: (err) => {
        console.error("Error saving comment", err);
      },
    });
  }

  // ------------------------ Helpers ------------------------
  userCellRenderer(params: any) {
    const u = params.value;

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "6px";

    const img = document.createElement("img");
    img.style.width = "28px";
    img.style.height = "28px";
    img.style.borderRadius = "50%";
    img.style.objectFit = "cover";

    // default placeholder
    img.src = "assets/icons/dummy_300x300.png";

    // Prefer profileImage (imgUrl); fall back to plain img
    const rawUrl: string | undefined = u?.imgUrl || u?.img;

   

    container.appendChild(img);

    if (u?.name) {
      const nameSpan = document.createElement("span");
      nameSpan.innerText = u.name;
      container.appendChild(nameSpan);
    }

    return container;
  }
}
