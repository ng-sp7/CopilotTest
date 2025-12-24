import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [
    `
    :host { display:block; padding:20px; font-family: Arial, Helvetica, sans-serif; }
    .demo { display:flex; gap:24px; flex-wrap:wrap; }
    .card { border:1px solid #eee; padding:12px; border-radius:8px; width:320px; box-shadow:0 1px 3px rgba(0,0,0,0.03); }
    .value { font-size:18px; margin-top:8px; font-weight:600; }
    `
  ]
})
export class AppComponent {
  val1 = 5.5;
  val2 = -10;
  val3 = 0;

  // configurations
  cfg1 = { min: 5.5, max: 50.8, decimals: 1, stepSize: 0.5, allowNegative: true, itemHeight: 44, wheelHeight: 176 };
  cfg2 = { min: -100, max: 100, decimals: 0, stepSize: 5, allowNegative: true, itemHeight: 44, wheelHeight: 176 };
  cfg3 = { min: 0, max: 10, decimals: 2, stepSize: 0.25, allowNegative: false, itemHeight: 36, wheelHeight: 144 };
}
