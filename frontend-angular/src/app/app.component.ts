import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  template: '<router-outlet *ngIf="esLogin(); else appPrivada"></router-outlet><ng-template #appPrivada><app-layout></app-layout></ng-template>',
})
export class AppComponent {
  constructor(private router: Router) {}

  esLogin(): boolean {
    return this.router.url.startsWith('/login');
  }
}
