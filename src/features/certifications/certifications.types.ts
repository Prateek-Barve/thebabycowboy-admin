
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  url: string | null;
}

export interface CertificationRequest {
  name: string;
  issuer: string;
  url: string | null;
}
