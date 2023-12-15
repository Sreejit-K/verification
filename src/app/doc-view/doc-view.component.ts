import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
// import { AuthService } from 'src/app/services/auth/auth.service';
//import { GeneralService } from 'src/app/services/general/general.service';
import { environment } from 'src/environments/environment';
import * as config from '../../assets/config/config.json';
import { DataService } from '../services/data.service';
import { CredentialService } from '../services/credential/credential.service';




@Component({
    selector: 'app-doc-view',
    templateUrl: './doc-view.component.html',
    styleUrls: ['./doc-view.component.scss']
})
export class DocViewComponent implements OnInit {
    baseUrl: string;
    docUrl: string;
    htmlString: string;
    extension;
    document = [];
    loader: boolean = true;
    docName: any;
    docDetails: any;
    schemaId: string;
    templateId: string;
    blob: Blob;
    canShareFile = !!navigator.share;
    private readonly canGoBack: boolean;
    @Input() credential: any
    constructor(
        //public generalService: GeneralService,
        private router: Router,
        private http: HttpClient,
        private location: Location,
        //private authService: AuthService,
        private activatedRoute: ActivatedRoute,
        private dataService: DataService,
        private readonly credentialService: CredentialService

    ) {
        this.baseUrl = config.bffUrl;
        // const navigation = this.router.getCurrentNavigation();
        // this.credential = navigation.extras.state;
        // this.canGoBack = !!(this.router.getCurrentNavigation()?.previousNavigation);

        // if (!this.credential) {
        //     if (this.canGoBack) {
        //         this.location.back();
        //     } else {
        //         this.router.navigate(['/home']);
        //     }
        // }
    }

    ngOnInit(): void {
        if (this.credential?.credentialSchemaId) {
            this.schemaId = this.credential.credentialSchemaId;
            this.getTemplate(this.schemaId).subscribe((res) => {
                this.templateId = res?.templateId;
                this.getPDF(res?.template);
            });
        } else {
            console.error("Something went wrong!");
        }
    }



    getTemplate(id: string): Observable<any> {
        const payload = {
            url: `${this.baseUrl}/v1/credential/schema/template/list`,
            data: {
                "schema_id": id
            }
        }
        return this.dataService.post(payload).pipe(
            map((res: any) => {
                if (res.result.length > 1) {
                    const selectedLangKey = 'en';
                    const certExpireTime = new Date(this.credential.expirationDate).getTime();
                    const currentDateTime = new Date().getTime();
                    const isExpired = certExpireTime < currentDateTime;

                    const type = isExpired ? `inactive-${selectedLangKey}` : `active-${selectedLangKey}`;
                    const template = res.result.find((item: any) => item.type === type);

                    if (template) {
                        return template;
                    } else {
                        const genericTemplate = res.result.find((item: any) => item.type === 'Handlebar');
                        if (genericTemplate) {
                            return genericTemplate;
                        } else {
                            return res.result[0];
                        }
                    }
                } else if (res.result.length === 1) {
                    return res.result[0];
                }
                throwError('Template not attached to schema');
            })
        )
    }

    getPDF(template) {
        let headerOptions = new HttpHeaders({
            'Accept': 'application/pdf'
        });
        let requestOptions = { headers: headerOptions, responseType: 'blob' as 'json' };
        const credential_schema = this.credential.credential_schema;
        delete this.credential.credential_schema;
        delete this.credential.schemaId;
        const request = {
            credentialid: this.credential.id,
            templateid: this.templateId,
        }
        // delete request.credential.credentialSubject;
        this.http.post(`${this.baseUrl}/v1/credentials/render`, request, requestOptions).pipe(map((data: any) => {
            this.blob = new Blob([data], {
                type: 'application/pdf' // must match the Accept type
            });
            this.docUrl = window.URL.createObjectURL(this.blob);
        })).subscribe((result: any) => {
            this.loader = false;
            this.extension = 'pdf';
        });
    }

    goBack() {
        window.history.go(-1);
    }

    // downloadCertificate(asJSON?: boolean) {
    //     let link: any;
    //     if (asJSON) {
    //         const blob = new Blob([JSON.stringify(this.credential)], { type: 'application/json' });
    //         const url = window.URL.createObjectURL(blob);
    //         link = document.createElement("a");
    //         link.href = url;
    //         link.download = `${this.authService.currentUser?.student_name}_certificate.json`.replace(/\s+/g, '_');;
    //     } else {
    //         link = document.createElement("a");
    //         link.href = this.docUrl;
    //         link.download = `${this.authService.currentUser?.student_name}_certificate.pdf`.replace(/\s+/g, '_');;
    //     }
    //     link.style.visibility = 'hidden';
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);

    // }

    // shareFile() {
    //     const pdf = new File([this.blob], "certificate.pdf", { type: "application/pdf" });
    //     const shareData = {
    //         title: "Certificate",
    //         text: "Enrollment certificate",
    //         files: [pdf]
    //     };

    //     if (navigator.share) {
    //         navigator.share(shareData).then((res: any) => {
    //             console.log("File shared successfully!");
    //         }).catch((error: any) => {
    //             this.toastMessage.error("", this.generalService.translateString('SHARED_OPERATION_FAILED'));
    //             console.error("Shared operation failed!", error);
    //         })
    //     } else {
    //         console.log("Share not supported");
    //     }
    // }



}
