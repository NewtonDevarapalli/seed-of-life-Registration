import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, timeout } from 'rxjs';

type RegistrationFormModel = {
  campaignName: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: string;
  city: string;
  prayerRequest: string;
};

type RegistrationResponse = {
  message: string;
  filePath: string;
  savedAt: string;
};

type FocusFieldName = 'fullName' | 'phoneNumber' | 'email' | 'gender' | 'city' | 'prayerRequest';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly fieldOrder: FocusFieldName[] = [
    'fullName',
    'phoneNumber',
    'email',
    'gender',
    'city',
    'prayerRequest'
  ];
  private readonly defaultCampaign = 'Registration for - Baptism';

  @ViewChildren('focusField') private focusFields!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('submitButton') private submitButton?: ElementRef<HTMLButtonElement>;

  protected isSubmitting = false;
  protected submitError = '';
  protected submitSuccess = '';
  protected showThankYou = false;
  protected submittedCampaign = '';
  protected readonly qrImageUrl = '/promo/qr.png';
  protected readonly bannerImageUrl = '/promo/banner.png';

  protected registration: RegistrationFormModel = this.createEmptyRegistration();

  ngAfterViewInit(): void {
    this.focusFieldByName('fullName');
  }

  protected submitRegistration(form: NgForm): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (form.invalid) {
      form.control.markAllAsTouched();
      this.submitError = 'Please complete the required details before submitting.';
      return;
    }

    this.isSubmitting = true;

    this.http
      .post<RegistrationResponse>('/api/registrations', this.registration)
      .pipe(
        timeout(60000),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.submittedCampaign = this.registration.campaignName;
          this.submitSuccess = response.message || 'Thank you. Your registration has been received successfully.';
          this.showThankYou = true;
          this.registration = this.createEmptyRegistration();
          form.resetForm(this.registration);
        },
        error: (error: { status?: number; error?: { message?: string } }) => {
          if (error?.status === 0) {
            this.submitError =
              'The server may be waking up. Please wait a moment and try submitting again.';
            return;
          }

          this.submitError =
            error?.error?.message ||
            'The registration service is not responding right now. Please try again in a moment.';
        }
      });
  }

  protected registerAnother(): void {
    this.showThankYou = false;
    this.submitError = '';
    this.submitSuccess = '';
    this.submittedCampaign = '';
    this.registration = this.createEmptyRegistration();

    queueMicrotask(() => {
      this.focusFieldByName('fullName');
    });
  }

  protected focusNextFromEnter(event: Event, currentField: FocusFieldName): void {
    event.preventDefault();
    this.focusNextField(currentField);
  }

  protected handlePhoneInput(phoneNumber: string): void {
    const digitCount = phoneNumber.replace(/\D/g, '').length;

    if (digitCount >= 10) {
      this.focusNextField('phoneNumber');
    }
  }

  protected advanceIfFilled(currentField: FocusFieldName, value: string): void {
    if (value.trim()) {
      this.focusNextField(currentField);
    }
  }

  protected skipToNext(currentField: FocusFieldName): void {
    this.focusNextField(currentField);
  }

  private focusNextField(currentField: FocusFieldName): void {
    const currentIndex = this.fieldOrder.indexOf(currentField);
    const nextField = this.fieldOrder[currentIndex + 1];

    if (!nextField) {
      this.submitButton?.nativeElement.focus();
      return;
    }

    this.focusFieldByName(nextField);
  }

  private focusFieldByName(fieldName: FocusFieldName): void {
    queueMicrotask(() => {
      const elementRef = this.focusFields.find(
        (field) => field.nativeElement.dataset['field'] === fieldName
      );

      if (!elementRef) {
        return;
      }

      const element =
        elementRef.nativeElement as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      element.focus();

      if ('select' in element && typeof element.select === 'function') {
        element.select();
      }
    });
  }

  private createEmptyRegistration(): RegistrationFormModel {
    return {
      campaignName: this.defaultCampaign,
      fullName: '',
      phoneNumber: '',
      email: '',
      gender: '',
      city: '',
      prayerRequest: ''
    };
  }
}
