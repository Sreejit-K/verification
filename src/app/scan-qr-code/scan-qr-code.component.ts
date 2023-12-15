import { QuarComponent } from '@altack/quar';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { concatMap, map, switchMap } from 'rxjs/operators';
import { CredentialService } from '../services/credential/credential.service';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-scan-qr-code',
  templateUrl: './scan-qr-code.component.html',
  styleUrls: ['./scan-qr-code.component.scss']
})
export class ScanQrCodeComponent implements OnInit {
  loader: boolean = false;
  invalidQRCode: boolean = false;
  qrString: string;
  isScanCompleted = true;
  scanQrCode = true;
  verified = false;
  expired = false;
  notVerified = false;
  credential: any;
  credentialId: string;

  @ViewChild(QuarComponent) private quar: QuarComponent;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly credentialService: CredentialService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = { ...navigation.extras.state };

    if (state.showScanner) {
      this.scanQrCode = false;
      this.isScanCompleted = false;
    }
  }

  ngOnInit(): void {
    this.verified = false;
    this.expired = false;
    this.notVerified = false;
    this.route.params.subscribe(params => {
      console.log("params", params);

      if (params['credentialId']) {
        this.credentialId = params['credentialId'];

        if (this.credentialId) {
          this.loader = true;
          this.isScanCompleted = true;
          this.scanQrCode = false;
          this.verifyCredential(this.credentialId);
          this.fetchCredential(this.credentialId);
        } else {
          this.loader = false;
          this.invalidQRCode = true;
          this.restartScanning();
        }
      }
    })
  }

  scanSuccessHandler(event: any) {
    this.loader = true;
    event = event.replace(/['"]/g, '');
    this.qrString = event;
    this.isScanCompleted = true;
    console.log("event", event);
    if (event) {
      try {
        let url: string;
        let credentialId;
        if (this.qrString.startsWith('http://') || this.qrString.startsWith('https://')) {
          url = new URL(this.qrString).pathname;
          const part = url.split('/');
          credentialId = part[2];
          console.log("CredentialId", credentialId);
        }

        if (credentialId) {
          this.verifyCredential(credentialId);
          this.fetchCredential(credentialId);
        } else {
          this.loader = false;
          // this.notVerified = true;
          this.invalidQRCode = true;
          this.restartScanning();
        }
      } catch (error) {
        console.log(error);
        this.loader = false;
        this.invalidQRCode = true;
        this.restartScanning();
      }
    }
  }

  verifyCredential(credentialId: string) {
    this.dataService.verify(credentialId)
      .pipe(map(res => {
        if (res?.result) {
          if (res?.result?.errors) {
            throw new Error('Error occurred!')
          }
          return res;
        } else {
          throw new Error('Error occurred!');
        }
      }))
      .subscribe((res: any) => {
        console.log(res)
        console.log(res?.result?.checks?.[0]?.expired)
        if (res?.result?.checks?.[0]?.expired === 'OK') {
          this.loader = false;
          this.verified = true;
        } else {
          this.loader = false;
          this.verified = true;
          this.expired = true;
        }
      }, error => {
        this.loader = false;
        this.notVerified = true;
      });
  }

  fetchCredential(credentialId: string) {
    console.log("credID:" , credentialId);
    this.credentialService.getCredentialById(credentialId).pipe(map(res => {
        return res.result;
      })).subscribe((res: any) => {
      this.loader = false;
      this.credential = res;
    }, (error: any) => {
      this.loader = false;
      // this.notVerified = true;
      this.restartScanning();
    });
  }

  restartScanning() {
    if (this.quar) {
      this.quar.resumeScanner();
    }
  }

  onError(error) {
    console.error(error)
  }

  scanAgain() {
    this.restartScanning();
    this.invalidQRCode = false;
    this.isScanCompleted = false;
    this.verified = false;
    this.notVerified = false;
    this.credential = false;
    this.expired = false;

    const navigationExtras: NavigationExtras = {
      state: { showScanner: true }
    };

    this.router.navigate(['/'], navigationExtras);
  }

  scan() {
    console.log("scan")
    this.scanQrCode = false;
    this.isScanCompleted = false;
  }

  back() {
    this.scanQrCode = true;
    this.isScanCompleted = true;
    this.verified = false;
    this.notVerified = false;
    this.expired = false;
    this.router.navigate(['/']);
  }
}
