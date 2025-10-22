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
import { ColDef } from "ag-grid-community";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { GridApi, Column } from "ag-grid-community";
import { EventsService } from "../../pages/events/events.service"; // adjust path

@Component({
  selector: "app-escalation-popup",
  templateUrl: "./escalation-popup.component.html",
  styleUrls: ["./escalation-popup.component.css"],
  standalone: true,
  imports: [CommonModule, AgGridModule, DialogModule, ButtonModule],
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

  // Column Definitions for escalation
  escalationColumnDefs: ColDef[] = [
    {
      headerName: "USER",
      field: "user",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellRenderer: this.userCellRenderer.bind(this),
      editable: false, // User column with avatar is not editable
    },
    {
      headerName: "USER LEVEL",
      field: "userLevel",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
    },
    {
      headerName: "RECEIVE AT",
      field: "receiveAt",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
      valueFormatter: (params) => {
        const full = this.formatDateTime(params.value); // "dd-mm-yyyy HH:MM:SS"
        return full.split(" ")[1]; // return only "HH:MM:SS"
      },
    },
    {
      headerName: "REVIEW START",
      field: "reviewStart",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
      valueFormatter: (params) =>
        this.formatDateTime(params.value).split(" ")[1],
    },
    {
      headerName: "REVIEW END",
      field: "reviewEnd",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
      valueFormatter: (params) =>
        this.formatDateTime(params.value).split(" ")[1],
    },
    {
      headerName: "DURATION",
      field: "duration",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
    },
    {
      headerName: "ACTION TAG",
      field: "actionTag",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
    },
    {
      headerName: "TAG",
      field: "subActionTag",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
    },
    {
      headerName: "NOTES",
      field: "notes",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      editable: (params) => params.data.isEditing,
    },
    {
      headerName: "END OF SHIFT",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellRenderer: (params: any) => {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.gap = "6px";

        if (params.data.isEditing) {
          // Save button (tick)
          const saveBtn = document.createElement("button");
          saveBtn.className = "action-btn save-btn";
          saveBtn.innerText = "✓";
          saveBtn.addEventListener("click", () => {
            params.api.stopEditing();
            this.saveEscalation(params.data);
          });

          // Cancel button
          const cancelBtn = document.createElement("button");
          cancelBtn.className = "action-btn delete-btn";
          cancelBtn.innerText = "x";
          cancelBtn.addEventListener("click", () => {
            params.data.isEditing = false;
            params.api.refreshCells({ rowNodes: [params.node], force: true });
            params.api.stopEditing(true); // Cancel editing
          });

          container.appendChild(saveBtn);
          container.appendChild(cancelBtn);
        } else {
          // Edit button
          // Edit button
          const editBtn = document.createElement("button");
          editBtn.className = "action-btn1 edit-btn1";

          // Create an image element for the pencil icon
          const pencilIcon = document.createElement("img");
          pencilIcon.src = "assets/pencil.svg"; // replace with the correct path to your SVG
          pencilIcon.alt = "Edit";
          pencilIcon.style.width = "16px"; // adjust size as needed
          pencilIcon.style.height = "16px";

          // Append the image to the button
          editBtn.appendChild(pencilIcon);

          editBtn.addEventListener("click", () => {
            params.data.isEditing = true;
            params.api.refreshCells({ rowNodes: [params.node], force: true });
            params.api.startEditingCell({
              rowIndex: params.node.rowIndex,
              colKey: "userLevel", // Start editing on USER LEVEL column
            });
          });

          container.appendChild(editBtn);
        }

        return container;
      },
    },
  ];

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

    // Prepare payload based on the provided schema
    const payload = {
      eventsId: String(eventId),
      userlevel: data.userLevel || 0,
      user: data.user?.id || 0, // Assuming user object has an id
      alarm: data.alarm || "",
      landingTime: data.landingTime || "",
      receivedTime: data.receiveAt || "",
      reviewStartTime: data.reviewStart || "",
      reviewEndTime: data.reviewEnd || "",
      actionTag: Number(data.actionTag) || 0,
      subActionTag: Number(data.subActionTag) || 0,
      notes: data.notes || "",
    };

    console.log("Sendinghjk escalation update payload:", payload);

    this.eventsService.putEventsMoreInfo(payload).subscribe({
      next: (res) => {
        console.log("Escalation updated successfully", res);
        data.isEditing = false;
        this.escalationGridApi.applyTransaction({ update: [data] });
      },
      error: (err) => {
        console.error("Error updating escalation", err);
      },
    });
  }
  escalationGridApi!: GridApi;

  // Column Definitions for alarm events
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
      cellClass: "custom-cell",
      cellRenderer: (params: any) => {
        const imgUrl = params.data.userName
          ? `https://i.pravatar.cc/30?u=${params.data.userName}`
          : "https://i.pravatar.cc/30?img=1"; // fallback image

        return `<img src="${imgUrl}" alt="user" style="width:30px; height:30px; border-radius:50%;" />`;
      },
    },
    {
      headerName: "DESCRIPTION",
      field: "description",
      headerClass: "custom-header",
      cellClass: "custom-cell",
      cellRenderer: (params: any) => {
        const value = params.value;
        let iconUrl = "";

        switch (value) {
          case "N":
            // iconUrl = "assets/alarm-warning-fill-copy.svg"; // replace with your actual image path or URL
             iconUrl = "assets/alarm-warning-fill-copy.svg"; 
            break;
          case "P":
             iconUrl = "assets/na-alarm-warning-fill-copy.svg"; 
            break;
             case "":
             iconUrl = ""; 
            break;
         
        }

        return `<img src="${iconUrl}" alt="${value}" style="width:17px; height:17px;" />`;
      },
    },
{
  headerName: "STATUS",
  field: "status",
  headerClass: "custom-header",
  cellClass: "custom-cell",
  valueGetter: (params: any) => {
    if (params.data.description === "P") return "No Action";
    if (params.data.description === "N") return "Failed";
    return ""; // leave empty for others
  },
},
  ];

  // Inside EscalationPopupComponent
  basicInfoFields: { label: string; field: string; default?: string }[] = [
    { label: "Escalation ID", field: "eventId" },
    { label: "Ticket No.", field: "ticketNo", default: "--" },
    { label: "Site Name", field: "siteName" },
    { label: "Camera Name", field: "cameraName" },
    { label: "Event Time (CT)", field: "eventStartTime" },
    { label: "Event Time Customer", field: "eventStartTime" }, // Can be converted if needed
    { label: "Event Time (IN)", field: "eventStartTime" }, // Can be converted if needed
    { label: "Type", field: "eventType", default: "--" },
    { label: "City", field: "country" },
  ];

  // Inside EscalationPopupComponent
  getEventDotColor(eventType: string): string {
    switch (eventType) {
      case "Manual_Wall":
        return "#FFC400"; // yellow
      case "Event_Wall":
        return "#53BF8B"; // green
      case "Missed_Wall":
        return "#FF0000"; // red
      default:
        return "#ccc"; // default gray
    }
  }

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  // Inside EscalationPopupComponent
  selectedEvent: any = null;

  // Update row data when selectedItem changes
  ngOnChanges(changes: SimpleChanges) {
    if (changes["selectedItem"] && this.selectedItem) {
      console.log("API Data received in popup:", this.selectedItem);

      // Escalation
      this.escalationRowData = (
        this.selectedItem.eventEscalationInfo || []
      ).map((item: any) => ({
        ...item,
        user: item.user || { img: "https://i.pravatar.cc/30?img=1" },
      }));

      // Alarm
      this.alarmRowData = (this.selectedItem.eventAlarmInfo || []).map(
        (item: any) => ({
          ...item,
          user: item.user || { img: "https://i.pravatar.cc/30?img=1" },
        })
      );

      // Comments
      this.commentRowData = (this.selectedItem.eventComments || []).map(
        (c: any) => ({
          user: { img: "https://i.pravatar.cc/30?img=1" },
          name: c.NAME || "",
          level: c.level || "",
          submittedtime: this.formatDateTime(c.submittedTime || new Date()), // <--- formatted
          notes: c.notes || "",
        })
      );

      // Event Details
      this.selectedEvent = (this.selectedItem.eventDetails || [])[0] || null;
    }
  }

  get formattedBasicInfo() {
    return this.basicInfoFields.map((field) => {
      let value = this.selectedEvent?.[field.field] ?? field.default ?? "--";

      // Format date/time fields
      if (field.label.toLowerCase().includes("time") && value !== "--") {
        value = this.formatDateTime(value);
      }

      return { ...field, value };
    });
  }

  // Helper function in the component
  formatDateTime(dateInput: string | Date): string {
    const d = new Date(dateInput);
    const pad = (n: number) => n.toString().padStart(2, "0");

    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1); // months are 0-indexed
    const year = d.getFullYear();

    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }
  // Grid ready handler
  onGridReady(params: any) {
    params.api.sizeColumnsToFit();
    params.columnApi.autoSizeAllColumns();
    this.commentGridApi = params.api;
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
      cellRenderer: this.userCellRenderer.bind(this),
      headerClass: "custom-header",
      cellClass: "custom-cell",
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
        if (!params.data.isNew) return ""; // no buttons for old rows

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
      isNew: true, // flag to show buttons
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

    // Ensure eventId is a number
    const eventId = Number(this.selectedItem.eventDetails[0]?.eventId);
    if (!eventId) {
      console.error("Invalid eventId:", this.selectedItem.eventDetails[0]);
      return;
    }

    // Prepare payload according to typical backend field names
    const payload = {
      eventsId: String(this.selectedItem.eventDetails[0]?.eventId),
      commentsInfo: data.notes || "",
      createdBy: 123, // replace with logged-in user ID
      remarks: "Added via escalation popup",
    };

    console.log("Sending comment payload:", payload);

    // Send POST request with explicit application/json header
    this.eventsService.addComment(payload).subscribe({
      next: (res) => {
        console.log("Comment saved successfully", res);

        // Update grid row timestamp
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

  // Custom cell renderer for user (avatar + optional name)
  userCellRenderer(params: any) {
    if (params.value && params.value.img) {
      return `
        <div style="display:flex;align-items:center;gap:6px;">
          <img src="${params.value.img}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;"/>
        </div>
      `;
    }
    return params.value?.name || "";
  }
}
