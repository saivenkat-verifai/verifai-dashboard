import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/header/header.component';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { NotificationService } from 'src/app/shared/notification.service';


@Component({
  selector: 'app-root',
   standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, ToastModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  showHeader = true;

  constructor(private router: Router, private notificationService: NotificationService) {}

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Hide header only on login page
        this.showHeader = event.urlAfterRedirects !== '/login';
      });
  }
}
