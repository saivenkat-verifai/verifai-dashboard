import { Component } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { ImagePipe } from 'src/app/shared/image.pipe';

@Component({
  selector: 'app-profile-image-renderer',
  standalone: true,
  template: `
    <div style="display: flex; align-items: center; gap: 8px;">
      <img
        [src]="(!value?.profileImage || hasError)
          ? 'assets/icons/dummy_300x300.png'
          : (value.profileImage | image | async)"
        (error)="onError()"
        style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;"
        alt="Emp"
      />
      <span>{{ value?.name || value?.level || '' }}</span>
    </div>
  `,
  imports: [CommonModule, ImagePipe, AsyncPipe],
})
export class ProfileImageRendererComponent
  implements ICellRendererAngularComp
{
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
    // value is the "user" field from your row
    return this.params?.value;
  }

  onError() {
    // Just flip the flag so we fall back to the dummy image
    this.hasError = true;
  }
}
