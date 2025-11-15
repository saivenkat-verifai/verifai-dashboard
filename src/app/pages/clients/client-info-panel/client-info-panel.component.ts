import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ClientSite {
  id: string;
  name: string;
  vertical: string;
  devices: number;
  cameras: string;   // e.g. "8/12"
  status: 'Live' | 'Offline' | 'Inprogress';
  remarks?: string;
}

export interface ClientUser {
  id: string;
  fullName: string;
  designation: string;          // second line under name
  deptRole: string;             // e.g. "Client - Admin", "Site - Member"
  sites: string | number;       // "ALL" or a number
  phone: string;                // "+91 9090909090"
  email: string;                // "user@email.com"
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-client-info-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-info-panel.component.html',
  styleUrls: ['./client-info-panel.component.css'],
})
export class ClientInfoPanelComponent {
  @Input() client?: any;
  // expects at least { id, client, type, status, users, sites }
  @Output() close = new EventEmitter<void>();

  // Optional: if parent passes arrays, we use them; otherwise this remains empty.
  get sitesList(): ClientSite[] {
    return this.client?.sitesList ?? [];
  }
  get usersList(): ClientUser[] {
    return this.client?.usersList ?? [];
  }

  get sitesCount(): number | string {
    // Prefer real length if provided; else fall back to numeric "sites" from table row
    return this.sitesList?.length ?? this.client?.sites ?? 0;
  }
  get usersCount(): number | string {
    return this.usersList?.length ?? this.client?.users ?? 0;
  }

  
}
