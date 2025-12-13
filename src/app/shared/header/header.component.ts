import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/login/login.service';
import {
  NotificationService,
  AppNotification,
} from 'src/app/shared/notification.service';
import { Subscription } from 'rxjs';
import { ImagePipe } from '../image.pipe';

/** 👇 Add this back */
interface UserProfile {
  name: string;
  role: string;
  id: string;
  email: string;
  phone: string;
  version: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, ImagePipe],
})
export class HeaderComponent implements OnInit, OnDestroy {
  activeMenu = 'dashboard';

  ticketCount = 0;
  showUserCard = false;
  showNotifications = false;

  notifications: AppNotification[] = [];
  private notifSub?: Subscription;

  userProfile: UserProfile = {
    name: 'Username',
    role: 'Screener',
    id: '',
    email: '',
    phone: '',
    version: 'V1.01',
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private notification: NotificationService
  ) {}

  userData: any;
  ngOnInit(): void {
    // user profile (your existing logic)
    const stored =
      localStorage.getItem('verifai_user') ||
      sessionStorage.getItem('verifai_user');

    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.userProfile = {
          name:
            `${data.FirstName ?? ''} ${data.LastName ?? ''}`.trim() ||
            'Username',
          role: data.roleList[0].roleName || '',
          id: data.UserId || '0',
          email: data.email || 'user@example.com',
          phone: data.phone || data.mobileNo || '+91 99999 99999',
          version: data.version || 'V1.01',
        };
      } catch (e) {
        console.error('Error parsing stored user data:', e);
      }
    }

    // 🔔 subscribe to notifications
    this.notifSub = this.notification.notifications$.subscribe(
      (list) => {
        this.notifications = list;
        this.ticketCount = list.length;
      }
    );

    this.authService.getUserInfoForId().subscribe((res) => this.userData = res)
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
  }

  setActive(menu: string) {
    this.activeMenu = menu;
    this.router.navigate([menu]);
  }

  toggleUserCard() {
    this.showUserCard = !this.showUserCard;
    if (this.showUserCard) {
      this.showNotifications = false;
    }
  }

  closeNotifications() {
  this.showNotifications = false;
}

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.showUserCard = false;
    }
  }

clearNotifications() {
  this.notification.clear();
  this.showNotifications = false; // 👈 auto close popup
}

  logout() {
    this.showUserCard = false;
    this.showNotifications = false;
    this.notification.clear();  // 🔄 reset on logout
    this.authService.logout();
  }
}
