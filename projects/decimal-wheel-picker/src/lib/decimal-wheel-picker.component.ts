import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ElementRef,
  AfterViewInit,
  ViewChild,
  NgZone,
  OnChanges,
  SimpleChanges
} from '@angular/core';

@Component({
  selector: 'decimal-wheel-picker',
  templateUrl: './decimal-wheel-picker.component.html',
  styleUrls: ['./decimal-wheel-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecimalWheelPickerComponent implements AfterViewInit, OnChanges {
  @Input() min!: number;
  @Input() max!: number;
  @Input() decimals = 1;
  @Input() stepSize = 1;
  @Input() allowNegative = true;
  @Input() initialValue?: number;
  @Input() itemHeight = 40;
  @Input() wheelHeight = 160;

  // Two-way API
  @Input() value!: number;
  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('signWheel', { static: false }) signWheel?: ElementRef<HTMLElement>;
  @ViewChild('intWheel', { static: false }) intWheel?: ElementRef<HTMLElement>;
  @ViewChild('decWheel', { static: false }) decWheel?: ElementRef<HTMLElement>;

  // internal
  multiplier = 10;
  allowedUnits: number[] = [];
  integers: number[] = [];
  decimalsList: number[] = []; // fractional units
  signOptions: string[] = [];

  // UI state
  selectedSign = '+';
  selectedInteger = 0;
  selectedDecimal = 0;

  // debounce
  private scrollTimeout: any;

  constructor(private host: ElementRef, private ngZone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['decimals'] || changes['stepSize'] || changes['min'] || changes['max']) {
      this.setup();
      this.applyInitialOrCurrentValue();
    }
  }

  ngAfterViewInit(): void {
    this.setup();
    this.applyInitialOrCurrentValue();
    this.setupScrollListeners();
  }

  private setup(): void {
    this.multiplier = Math.pow(10, Math.max(0, this.decimals));
    const mul = this.multiplier;

    const stepUnits = Math.round(this.stepSize * mul);
    const minUnits = Math.round(Math.ceil(this.min * mul - 1e-8));
    const maxUnits = Math.round(Math.floor(this.max * mul + 1e-8));
    this.allowedUnits = [];
    for (let u = minUnits; u <= maxUnits; u += stepUnits) {
      this.allowedUnits.push(u);
    }

    // Prepare integers range (abs)
    const intSet = new Set<number>();
    const decSet = new Set<number>();
    for (const u of this.allowedUnits) {
      const absU = Math.abs(u);
      intSet.add(Math.floor(absU / mul));
      decSet.add(absU % mul);
    }
    const ints = Array.from(intSet).sort((a, b) => a - b);
    const decs = Array.from(decSet).sort((a, b) => a - b);
    this.integers = ints;
    this.decimalsList = decs;

    // sign options
    if (this.min >= 0) {
      this.signOptions = ['+'];
    } else if (this.max <= 0) {
      this.signOptions = ['-'];
    } else if (!this.allowNegative) {
      this.signOptions = ['+'];
    } else {
      this.signOptions = ['+', '-'];
    }
  }

  private applyInitialOrCurrentValue(): void {
    const initial = this.initialValue !== undefined ? this.initialValue : (this.value !== undefined ? this.value : this.min);
    const nearest = this.findNearestAllowed(initial);
    this.setValueFromUnits(nearest, false);
    // ensure wheels scroll to these positions after view init
    setTimeout(() => this.scrollToSelected(true), 0);
  }

  private setupScrollListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const els = [
        this.signWheel?.nativeElement,
        this.intWheel?.nativeElement,
        this.decWheel?.nativeElement
      ].filter(Boolean) as HTMLElement[];
      els.forEach(el => {
        el.addEventListener('scroll', () => this.onWheelScroll(), { passive: true });
      });
    });
  }

  private onWheelScroll(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    // debounce scroll end
    this.scrollTimeout = setTimeout(() => {
      this.ngZone.run(() => this.onScrollEnd());
    }, 120);
  }

  private onScrollEnd(): void {
    // read nearest indices
    const sign = this.getVisibleSign();
    const integer = this.getVisibleInteger();
    const dec = this.getVisibleDecimal();

    // compute candidate units
    const mul = this.multiplier;
    const signFactor = sign === '-' ? -1 : 1;
    const candidateUnits = signFactor * (integer * mul + dec);

    const nearest = this.findNearestAllowed(candidateUnits / mul);
    this.setValueFromUnits(nearest, true);
    this.scrollToSelected(true);
  }

  private getVisibleSign(): string {
    if (!this.signWheel) return this.signOptions[0] || '+';
    const el = this.signWheel.nativeElement;
    const idx = Math.round(el.scrollTop / this.itemHeight);
    return this.signOptions[Math.min(Math.max(0, idx), this.signOptions.length - 1)];
  }

  private getVisibleInteger(): number {
    if (!this.intWheel) return this.integers[0] || 0;
    const el = this.intWheel.nativeElement;
    const idx = Math.round(el.scrollTop / this.itemHeight);
    return this.integers[Math.min(Math.max(0, idx), this.integers.length - 1)];
  }

  private getVisibleDecimal(): number {
    if (!this.decWheel) return this.decimalsList[0] || 0;
    const el = this.decWheel.nativeElement;
    const idx = Math.round(el.scrollTop / this.itemHeight);
    return this.decimalsList[Math.min(Math.max(0, idx), this.decimalsList.length - 1)];
  }

  private findNearestAllowed(targetValue: number): number {
    // operate in units
    const mul = this.multiplier;
    const targetUnits = Math.round(targetValue * mul);
    let nearest = this.allowedUnits[0];
    let minDiff = Math.abs(targetUnits - nearest);
    for (const u of this.allowedUnits) {
      const diff = Math.abs(u - targetUnits);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = u;
      }
    }
    return nearest;
  }

  private setValueFromUnits(units: number, emit = true): void {
    const mul = this.multiplier;
    const sign = units < 0 ? '-' : '+';
    const abs = Math.abs(units);
    const integer = Math.floor(abs / mul);
    const dec = abs % mul;

    this.selectedSign = sign;
    this.selectedInteger = integer;
    this.selectedDecimal = dec;

    const signedValue = (sign === '-' ? -1 : 1) * (integer + dec / mul);
    // enforce bounds just in case
    let bounded = signedValue;
    if (bounded < this.min) bounded = this.min;
    if (bounded > this.max) bounded = this.max;

    // Round to decimals
    const pow = Math.pow(10, this.decimals);
    bounded = Math.round(bounded * pow) / pow;

    this.value = bounded;
    if (emit) {
      this.valueChange.emit(this.value);
    }
  }

  private scrollToSelected(smooth = true): void {
    const behavior = smooth ? 'smooth' : 'auto';
    // sign
    if (this.signWheel) {
      const sIdx = Math.max(0, this.signOptions.indexOf(this.selectedSign));
      this.signWheel.nativeElement.scrollTo({ top: sIdx * this.itemHeight, behavior: behavior as ScrollBehavior });
    }
    // integer
    if (this.intWheel) {
      const iIdx = Math.max(0, this.integers.indexOf(this.selectedInteger));
      this.intWheel.nativeElement.scrollTo({ top: iIdx * this.itemHeight, behavior: behavior as ScrollBehavior });
    }
    // decimal
    if (this.decWheel) {
      const dIdx = Math.max(0, this.decimalsList.indexOf(this.selectedDecimal));
      this.decWheel.nativeElement.scrollTo({ top: dIdx * this.itemHeight, behavior: behavior as ScrollBehavior });
    }
  }

  // helper for template formatting
  formatDecimalPart(value: number): string {
    const padded = value.toString().padStart(this.decimals, '0');
    return padded;
  }
}
