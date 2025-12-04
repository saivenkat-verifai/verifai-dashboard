import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

interface UserProfile {
  name: string;
  role: string;
  id: string;
  email: string;
  phone: string;
  version: string;
}

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.css"],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class HeaderComponent implements OnInit {
  activeMenu = "dashboard";
  ticketCount: number = 209;

  showUserCard = false;

  userProfile: UserProfile = {
    name: "Username",
    role: "Screener",
    id: "",
    email: "",
    phone: "",
    version: "V1.01",
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Read login response from storage (whatever you stored in login component)
    const stored =
      localStorage.getItem("verifai_user") ||
      sessionStorage.getItem("verifai_user");

    if (stored) {
      try {
        const data = JSON.parse(stored);

        // Map fields based on your API response shape
        this.userProfile = {
          name:
            `${data.FirstName ?? ""} ${data.LastName ?? ""}`.trim() ||
            "Username",
          role: data.roleList[0].roleName || "",
          id: data.UserId || "0",
          email: data.email || "user@example.com",
          phone: data.phone || data.mobileNo || "+91 99999 99999",
          version: data.version || "V1.01",
        };
      } catch (e) {
        console.error("Error parsing stored user data:", e);
      }
    }
  }

  setActive(menu: string) {
    this.activeMenu = menu;
    this.router.navigate([menu]);
  }

  toggleUserCard() {
    this.showUserCard = !this.showUserCard;
  }

  logout() {
    // clear storage
    localStorage.removeItem("verifai_user");
    localStorage.removeItem("verifai_token");
    sessionStorage.removeItem("verifai_user");
    sessionStorage.removeItem("verifai_token");

    this.showUserCard = false;
    this.router.navigate(["/login"]);
  }
}
