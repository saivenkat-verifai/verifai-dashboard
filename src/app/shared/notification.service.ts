// import { Injectable } from '@angular/core';
// import { MessageService } from 'primeng/api';
// import { BehaviorSubject } from 'rxjs';

// export interface NotificationMessage {
//   id: number;
//   severity: 'success' | 'info' | 'warn' | 'error';
//   summary: string;
//   detail?: string;
//   life?: number;
//   timestamp: Date;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class NotificationService {
//   private _messagesSubject = new BehaviorSubject<NotificationMessage[]>([]);
//   /** Stream of all notifications for this session */
//   readonly messages$ = this._messagesSubject.asObservable();

//   constructor(private messageService: MessageService) {}

//   /** Generic method that also pushes to PrimeNG toast */
//   addToast(options: {
//     severity: 'success' | 'info' | 'warn' | 'error';
//     summary: string;
//     detail?: string;
//     life?: number;
//     closable?: boolean;
//   }) {
//     const msg: NotificationMessage = {
//       id: Date.now() + Math.floor(Math.random() * 1000),
//       severity: options.severity,
//       summary: options.summary,
//       detail: options.detail,
//       life: options.life ?? 5000,
//       timestamp: new Date(),
//     };

//     // show PrimeNG toast
//     this.messageService.add({
//       severity: options.severity,
//       summary: options.summary,
//       detail: options.detail,
//       life: options.life ?? 5000,
//       closable: options.closable ?? true,
//     });

//     // store in session list
//     const current = this._messagesSubject.value;
//     this._messagesSubject.next([...current, msg]);
//   }

//   success(summary: string, detail?: string, life = 5000) {
//     this.addToast({ severity: 'success', summary, detail, life, closable: true });
//   }

//   error(summary: string, detail?: string, life = 5000) {
//     this.addToast({ severity: 'error', summary, detail, life, closable: true });
//   }

//   info(summary: string, detail?: string, life = 5000) {
//     this.addToast({ severity: 'info', summary, detail, life, closable: true });
//   }

//   warn(summary: string, detail?: string, life = 5000) {
//     this.addToast({ severity: 'warn', summary, detail, life, closable: true });
//   }

//   /** Clear all notifications (e.g., on logout) */
//   clear() {
//     this.messageService.clear();
//     this._messagesSubject.next([]);
//   }
// }

// src/app/shared/notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConfirmationService, MessageService,  } from 'primeng/api';

export interface AppNotification {
  id: number;
  severity: 'success' | 'error' | 'warn' | 'info';
  summary: string;
  detail?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private idCounter = 0;

  constructor(private messageService: MessageService,private confirmationService: ConfirmationService ) {}

  private push(
    severity: 'success' | 'error' | 'warn' | 'info',
    summary: string,
    detail?: string
  ) {
    const notif: AppNotification = {
      id: ++this.idCounter,
      severity,
      summary,
      detail,
      timestamp: new Date(),
    };

    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next([...current, notif]);

    // Still show normal PrimeNG toast
    this.messageService.add({
      severity,
      summary,
      detail,
      life: 5000,
      closable: true,
    });
  }

  success(summary: string, detail?: string) {
    this.push('success', summary, detail);
  }

  error(summary: string, detail?: string) {
    this.push('error', summary, detail);
  }

  warn(summary: string, detail?: string) {
    this.push('warn', summary, detail);
  }

  info(summary: string, detail?: string) {
    this.push('info', summary, detail);
  }

  clear() {
    this.notificationsSubject.next([]);
    this.messageService.clear();
  }

  //   confirm(message: string): Promise<boolean> {
  //   return new Promise((resolve) => {
  //     this.confirmationService.confirm({
  //       message,
  //       header: 'Confirmation',
  //       icon: 'pi pi-exclamation-triangle',
  //       acceptLabel: 'Yes',
  //       rejectLabel: 'No',

  //       accept: () => resolve(true),
  //       reject: () => resolve(false),
  //     });
  //   });
  // }

  // optional snapshot helper
  getSnapshot(): AppNotification[] {
    return this.notificationsSubject.getValue();
  }

    confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Yes',
        rejectLabel: 'No',
        
        acceptButtonStyleClass: 'p-button-danger',
    rejectButtonStyleClass: 'p-button-secondary',

        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
