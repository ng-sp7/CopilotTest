import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { DecimalWheelPickerModule } from 'decimal-wheel-picker';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, DecimalWheelPickerModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
