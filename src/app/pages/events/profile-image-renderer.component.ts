import { Component } from "@angular/core";
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
    (!hasError && value?.profileImage
      ? ((value.profileImage | image | async) || 'assets/icons/dummy_300x300.png')
      : 'assets/icons/dummy_300x300.png')
  "
  (error)="onError()"
  style="width:24px;height:24px;border-radius:50%;object-fit:cover;"
/>
      <span>{{ value?.name || value?.level || 'N/A' }}</span>
    </div>
  `,
})
export class ProfileImageRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;
  hasError = false;

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
    return this.params?.value;
  }

  onError() {
    this.hasError = true;
  }
}
