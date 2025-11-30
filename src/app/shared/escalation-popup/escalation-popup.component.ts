import {
  Component,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  OnChanges,
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
})
export class EscalationPopupComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() selectedItem: any;
  @Input() selectedDate: Date | null = null;
  @Input() data: any; // escalationData

  constructor(private eventsService: EventsService) {}

  @Input() tableConfigs: {
    [key: string]: { columnDefs: ColDef[]; rowData: any[] };
  } = {};
  @Input() popupType: "MORE" | "DETAILS" = "DETAILS";

  @Output() close = new EventEmitter<void>();

  // Row data for escalation and alarm events
  escalationRowData: any[] = [];
  alarmRowData: any[] = [];
  selectedTZ: "MT" | "CT" | "IST" = "MT";

  onTzChange(tz: "MT" | "CT" | "IST") {
    this.selectedTZ = tz;
    this.refreshTimeColumns();
  }

  /**
   * Returns the appropriate time string for the given base field
   * ('receiveAt' | 'reviewStart' | 'reviewEnd') based on selectedTZ.
   */
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

  /** ================= ESCALATION COLUMN DEFS ================= */
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
      // editable ONLY for duplicate row in edit mode
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

        // CASE 1: duplicate row in edit -> show ✓ / X
        if (isDuplicate && isEditing) {
          const saveBtn = document.createElement("button");
          saveBtn.className = "action-btn save-btn";
          saveBtn.innerText = "✓";
          saveBtn.addEventListener("click", () => {
            params.api.stopEditing();
            this.saveEscalation(params.data);
          });

          const cancelBtn = document.createElement("button");
          cancelBtn.className = "action-btn delete-btn";
          cancelBtn.innerText = "x";
          cancelBtn.addEventListener("click", () => {
            params.api.applyTransaction({ remove: [params.data] });
          });

          container.appendChild(saveBtn);
          container.appendChild(cancelBtn);
          return container;
        }

        // CASE 2: last ORIGINAL row (not duplicate) -> show pencil
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

        // Other rows: no icon
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

  // Make sure we have a number (in case it's a string "1")
  const levelId =
    typeof data.levelId === "number" ? data.levelId : Number(data.levelId) || 0;

  const payload = {
    eventsId: String(eventId),
    userlevel: levelId,                 // ✅ use levelId from API row
    user: data.user?.id || 0,
    alarm: data.alarm || "",
    landingTime: data.landingTime || "",
    receivedTime: data.receiveAt || "",
    reviewStartTime: data.reviewStart || "",
    reviewEndTime: data.reviewEnd || "",
    actionTag: Number(data.actionTag) || 0,
    subActionTag: Number(data.subActionTag) || 0,
    notes: data.notes || "",
  };

  console.log("Sending escalation update payload:", payload);

  this.eventsService.putEventsMoreInfo(payload).subscribe({
    next: (res) => {
      console.log("Escalation updated successfully", res);
      data.isEditing = false;
      data.isDuplicate = false;
      this.escalationGridApi.applyTransaction({ update: [data] });
    },
    error: (err) => {
      console.error("Error updating escalation", err);
    },
  });
}


  escalationGridApi!: GridApi;

  /** ================= ALARM COLUMN DEFS ================= */
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

  selectedEvent: any = null;

  /** ================= CHANGES HANDLER ================= */
  ngOnChanges(changes: SimpleChanges) {
    if (changes["selectedItem"] && this.selectedItem) {
      console.log("API Data received in popup:", this.selectedItem);

      // Escalation rows
      this.escalationRowData = (this.selectedItem.eventEscalationInfo || []).map(
        (item: any) => ({
          ...item,
          user: {
            img: "https://i.pravatar.cc/30?img=1",
            name: item.userName ?? String(item.user ?? ""),
            id: item.user ?? null,
          },
          isEditing: false,
          isDuplicate: false,
        })
      );

      // Alarm rows
      this.alarmRowData = (this.selectedItem.eventAlarmInfo || []).map(
        (item: any) => ({
          ...item,
          user: item.user || { img: "https://i.pravatar.cc/30?img=1" },
        })
      );

      // Comments rows
      this.commentRowData = (this.selectedItem.eventComments || []).map(
        (c: any) => ({
          user: { img: "https://i.pravatar.cc/30?img=1" },
          name: c.NAME || "",
          level: c.level || "",
          submittedtime: this.formatDateTime(c.submittedTime || new Date()),
          notes: c.notes || "",
        })
      );

      // Event details
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

  // Grid ready handler (for escalation + alarm grid)
  onGridReady(params: any) {
    this.escalationGridApi = params.api;
    params.api.sizeColumnsToFit();
    params.columnApi.autoSizeAllColumns();
    this.commentGridApi = params.api; // you already had this line; keeping as-is
  }

  commentGridApi!: GridApi;
  commentGridColumnApi!: Column;

  onCommentGridReady(params: any) {
    params.api.sizeColumnsToFit();
    this.commentGridApi = params.api;
    this.commentGridColumnApi = params.columnApi;
  }

  // Column definitions for comments
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
      editable: true,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "LEVEL",
      field: "level",
      editable: true,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "SUBMITTED TIME",
      field: "submittedtime",
      editable: true,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "NOTES",
      field: "notes",
      editable: true,
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "ACTIONS",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellRenderer: (params: any) => {
        if (!params.data.isNew) return "";

        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.gap = "6px";

        const saveBtn = document.createElement("button");
        saveBtn.className = "action-btn save-btn";
        saveBtn.innerText = "✓";
        saveBtn.addEventListener("click", () => {
          params.api.stopEditing();
          this.saveComment(params.data);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "action-btn delete-btn";
        deleteBtn.innerText = "X";
        deleteBtn.addEventListener("click", () => {
          this.deleteComment(params.data);
        });

        container.appendChild(saveBtn);
        container.appendChild(deleteBtn);

        return container;
      },
    },
  ];

  addComments() {
    if (!this.commentGridApi) return;

    const newComment = {
      user: { img: "https://i.pravatar.cc/30?img=3" },
      name: "",
      level: "",
      submittedtime: new Date().toISOString(),
      notes: "",
      isNew: true,
    };

    this.commentGridApi.applyTransaction({ add: [newComment] });

    const rowIndex = this.commentRowData.length;
    this.commentGridApi.setFocusedCell(rowIndex, "name");
    this.commentGridApi.startEditingCell({ rowIndex, colKey: "name" });
    this.commentGridApi.ensureIndexVisible(rowIndex, "bottom");
  }

  saveComment(data: any) {
    if (!this.selectedEvent) {
      console.error("No event selected");
      return;
    }

    const eventId = Number(this.selectedItem.eventDetails[0]?.eventId);
    if (!eventId) {
      console.error("Invalid eventId:", this.selectedItem.eventDetails[0]);
      return;
    }

    const payload = {
      eventsId: String(this.selectedItem.eventDetails[0]?.eventId),
      commentsInfo: data.notes || "",
      createdBy: 123,
      remarks: "Added via escalation popup",
    };

    console.log("Sending comment payload:", payload);

    this.eventsService.addComment(payload).subscribe({
      next: (res) => {
        console.log("Comment saved successfully", res);
        data.submittedtime = new Date().toISOString();
        this.commentGridApi.applyTransaction({ update: [data] });
      },
      error: (err) => {
        console.error("Error saving comment", err);
      },
    });
  }

  deleteComment(data: any) {
    this.commentGridApi.applyTransaction({ remove: [data] });
  }

  commentRowData: any[] = [];

  userCellRenderer(params: any) {
    const u = params.value;
    if (u?.img) {
      return `
        <div style="display:flex;align-items:center;gap:6px;">
          <img src="${u.img}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;"/>
          ${u.name ? `<span>${u.name}</span>` : ""}
        </div>
      `;
    }
    return u?.name || "";
  }
}
