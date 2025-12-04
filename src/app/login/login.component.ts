import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';

import { AuthService, LoginResponse } from './login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    ButtonModule,
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  rememberMe: boolean = false;
  loading: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  login() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.authService.login(this.username, this.password).subscribe({
      next: (res: LoginResponse) => {
        this.loading = false;

        // 🔹 Decide which storage to use based on "Remember Me"
        const storage = this.rememberMe ? localStorage : sessionStorage;

        // 🔹 Save the whole response object (user/session info)
        storage.setItem('verifai_user', JSON.stringify(res));

        // 🔹 If backend sends a token, store it separately too
        if (res.token) {
          storage.setItem('verifai_token', res.token);
        }

        // 👉 If API sends an explicit status, you can check it:
        // if (res.status === 'SUCCESS') { ... }

        // 🔹 Navigate to dashboard after successful login
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        console.error('Login error:', err);

        if (err.status === 400 || err.status === 401) {
          this.errorMessage = 'Invalid username or password.';
        } else {
          this.errorMessage =
            'Something went wrong. Please try again later.';
        }
      }
    });
  }
}
