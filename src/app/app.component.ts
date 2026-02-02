import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { concatMap, filter, mergeMap, switchMap } from 'rxjs/operators';
import { HeaderComponent } from './shared/header/header.component';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { NotificationService } from 'src/app/shared/notification.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, ToastModule,ConfirmDialogModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  showHeader = false;

  constructor(private router: Router, private notificationService: NotificationService, private http: HttpClient) {
    const todos$ = http.get('https://jsonplaceholder.typicode.com/todos');
    const posts$ = http.get('https://jsonplaceholder.typicode.com/posts');

    // forkJoin({
    //   todos: todos$,
    //   posts: posts$
    // }).subscribe({
    //   next: (res) => {
    //     console.log(res)
    //   }
    // })

    todos$.pipe(
      concatMap(() => {
        return posts$;
      })
    )

    // todos$.pipe(
    //   mergeMap((response) => {
    //     console.log(response)
    //     return posts$;
    //   })
    // ).subscribe((res) => {
    //   console.log(res)
    // })


  }

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Hide header only on login page
        this.showHeader = event.urlAfterRedirects !== '/login';
      });
  }
}
