import { Component, Input } from "@angular/core";
import { CommonModule, AsyncPipe } from "@angular/common";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";
import { ImagePipe } from "src/app/shared/image.pipe";

@Component({
  selector: "app-profile-image-renderer",
  standalone: true,
  imports: [CommonModule, ImagePipe, AsyncPipe],
  template: `
    <div style="display:flex;align-items:center;gap:8px;">
      <img
        [src]="
          (!hasError &&
          (value?.profileImage || value?.profileImageUrl)
            ? (((value.profileImage || value.profileImageUrl) | image | async) ||
              'assets/icons/dummy_300x300.png')
            : 'assets/icons/dummy_300x300.png')
        "
        (error)="onError()"
        style="width:40px;height:40px;border-radius:50%;object-fit:cover;"
      />

      <!-- ✅ ADD: only show label if enabled -->
      <span *ngIf="showLabel">
        {{ value?.name || value?.level || value?.userName || value?.User_Name || "N/A" }}
      </span>
    </div>
  `,
})
export class ProfileImageRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;
  hasError = false;

  /** For normal template usage */
  @Input() data: any;

  /** ✅ ADD: allow hiding the name text */
  @Input() showLabel: boolean = true;

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.hasError = false;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.hasError = false;
    return true;
  }

  get value() {
    return this.data ?? this.params?.value ?? this.params?.data;
  }

  onError() {
    this.hasError = true;
  }
}
