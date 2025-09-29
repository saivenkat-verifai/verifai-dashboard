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
import { GridApi, Column } from 'ag-grid-community';

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
    },
    {
      headerName: "USER LEVEL",
      field: "userLevel",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "RECEIVE AT",
      field: "receiveAt",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "REVIEW START",
      field: "reviewStart",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "REVIEW END",
      field: "reviewEnd",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "DURATION",
      field: "duration",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "ACTION TAG",
      field: "actionTag",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "TAG",
      field: "subActionTag",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "NOTES",
      field: "notes",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
  ];

  // Column Definitions for alarm events
  alarmColumnDefs: ColDef[] = [
    {
      headerName: "LEVEL",
      field: "userLevel",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "USER",
      field: "user",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "USER NAME",
      field: "userName",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "DESCRIPTION",
      field: "description",
      headerClass: "custom-header",
      cellClass: "custom-cell",
    },
    {
      headerName: "deterredTime",
      field: "deterredTime",
      headerClass: "custom-header",
      cellClass: "custom-cell",
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
        return "#53BF8B"; // green
      case "Event_Wall":
        return "#FFC400"; // yellow
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
    this.escalationRowData = (this.selectedItem.eventEscalationInfo || []).map((item: any) => ({
      ...item,
      user: item.user || { img: "https://i.pravatar.cc/30?img=1" },
    }));

    // Alarm
    this.alarmRowData = (this.selectedItem.eventAlarmInfo || []).map((item: any) => ({
      ...item,
      user: item.user || { img: "https://i.pravatar.cc/30?img=1" },
    }));

    // Comments
    this.commentRowData = (this.selectedItem.eventComments || []).map((c: any) => ({
      userName: c.userName || "Unknown",
      comment: c.comment || "",
      timestamp: c.timestamp || "--",
    }));

    // Event Details
    this.selectedEvent = (this.selectedItem.eventDetails || [])[0] || null;
  }
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
    field: "actions",
    cellRenderer: (params: any) => {
      return `
        <button class="save-btn">💾</button>
        <button class="delete-btn">❌</button>
      `;
    },
    cellRendererParams: {
      onSave: (data: any) => this.saveComment(data),
      onDelete: (data: any) => this.deleteComment(data),
    },
  },
];



addComments() {
  if (!this.commentGridApi) return;

  const newComment = {
    user: { img: 'https://i.pravatar.cc/30?img=3' },
    name: '',
    level: '',
    submittedtime: new Date().toISOString(),
    notes: ''
  };

  this.commentGridApi.applyTransaction({ add: [newComment] });

  const rowIndex = this.commentRowData.length;
  this.commentGridApi.setFocusedCell(rowIndex, 'name');
  this.commentGridApi.startEditingCell({ rowIndex, colKey: 'name' });
  this.commentGridApi.ensureIndexVisible(rowIndex, 'bottom');
}

saveComment(data: any) {
  // This is where you send your API call to save the row
  console.log('Saving comment:', data);
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
