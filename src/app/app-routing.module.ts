import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { AuthGuard } from "./auth.guard";

export const routes: Routes = [
  { path: "", redirectTo: "/login", pathMatch: "full" },

  {
    path: "login",
    loadComponent: () =>
      import("./login/login.component").then((m) => m.LoginComponent),
  },

  {
    path: "dashboard",
    canActivate: [AuthGuard], // 🔒 protected
    loadComponent: () =>
      import("./pages/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: "events",
    canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/events/events.component").then((m) => m.EventsComponent),
  },
  {
    path: "groups",
    canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/groups/groups.component").then((m) => m.GroupsComponent),
  },
  {
    path: "employees",
    canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/employees/employees.component").then(
        (m) => m.EmployeesComponent,
      ),
  },
  {
    path: "sites",
    canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/sites/sites.component").then((m) => m.SitesComponent),
  },
  {
    path: "clients",
    canActivate: [AuthGuard],
    loadComponent: () =>
      import("./pages/clients/clients.component").then(
        (m) => m.ClientsComponent,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
