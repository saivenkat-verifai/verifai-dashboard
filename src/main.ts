// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, withHashLocation } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AgGridModule } from 'ag-grid-angular';
import { HighchartsChartModule } from 'highcharts-angular';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { routes } from './app/app-routing.module';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthTokenInterceptor } from 'src/app/core/interceptors/auth-token.interceptor';

// Register AG Grid modules before bootstrap
ModuleRegistry.registerModules([AllCommunityModule]);

// GLOBAL PATCH: passive touch events
const origAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (
  type: string,
  listener: any,
  options?: any
) {
  if ((type === 'touchstart' || type === 'touchmove') && options === undefined) {
    options = { passive: true };
  }
  return origAddEventListener.call(this, type, listener, options);
};

bootstrapApplication(AppComponent, {
  providers: [
     provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthTokenInterceptor,
      multi: true
    },
     provideRouter(routes, withHashLocation()), 
    provideAnimations(),
    provideRouter(routes),
    importProvidersFrom(
      FormsModule,
      MatDatepickerModule,
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatNativeDateModule,
      BrowserAnimationsModule,
      HttpClientModule,
      AgGridModule,
      HighchartsChartModule,
      ToastModule,           // ✅ module stays here
    ),
    MessageService           // ✅ service is provided here
  ]
});
