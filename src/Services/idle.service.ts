import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/login/login.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {

  private timeoutId: any;
  private readonly IDLE_TIME = 1 * 60 * 1000; // 5 minutes

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private auth :AuthService
  ) {}

  startWatching() {
   
    this.resetTimer();

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart'
    ];

    events.forEach(event =>
      document.addEventListener(event, () => this.resetTimer())
    );
  }

  stopWatching() {
    clearTimeout(this.timeoutId);
  }

  private resetTimer() {
    clearTimeout(this.timeoutId);

    // Run outside Angular to avoid change detection spam
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => this.logout1());
      }, this.IDLE_TIME);
    });
  }

   logout1() {

  this.auth.logout();
  }
}
