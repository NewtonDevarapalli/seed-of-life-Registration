import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
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

type RegistrationSummary = {
  count: number;
  exportUrl: string;
  latestRegistrations: Array<{
    submittedAt: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    city: string;
  }>;
};

type FocusFieldName = 'fullName' | 'phoneNumber' | 'email' | 'gender' | 'city' | 'prayerRequest';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
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
  protected readonly isAdminPage = this.document.location.pathname.startsWith('/admin');
  protected readonly qrImageUrl = '/promo/qr.png';
  protected readonly bannerImageUrl = '/promo/banner.png';
  protected readonly exportUrl = '/api/registrations/export';
  protected adminError = '';
  protected isLoadingAdmin = false;
  protected registrationSummary: RegistrationSummary = {
    count: 0,
    exportUrl: this.exportUrl,
    latestRegistrations: []
  };

  protected registration: RegistrationFormModel = this.createEmptyRegistration();

  ngOnInit(): void {
    if (this.isAdminPage) {
      this.loadRegistrationSummary();
    }
  }

  ngAfterViewInit(): void {
    if (this.isAdminPage) {
      return;
    }

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
          const submittedCampaign = this.registration.campaignName;
          const nextRegistration = this.createEmptyRegistration();

          this.registration = nextRegistration;
          form.resetForm(nextRegistration);
          this.submittedCampaign = submittedCampaign;
          this.submitSuccess = response.message || 'Thank you. Your registration has been received successfully.';
          this.showThankYou = true;
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

  protected refreshRegistrationSummary(): void {
    this.loadRegistrationSummary();
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

  private loadRegistrationSummary(): void {
    this.isLoadingAdmin = true;
    this.adminError = '';

    this.http
      .get<RegistrationSummary>('/api/registrations/summary')
      .pipe(
        timeout(60000),
        finalize(() => {
          this.isLoadingAdmin = false;
        })
      )
      .subscribe({
        next: (summary) => {
          this.registrationSummary = summary;
        },
        error: () => {
          this.adminError = 'Unable to load registration summary right now.';
        }
      });
  }
}
