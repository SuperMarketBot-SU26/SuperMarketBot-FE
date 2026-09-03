export type AdPackageStatus = 'Active' | 'Inactive';

export interface AdPackage {
  packageId: number;
  packageName: string;
  description?: string | null;
  budget: number;
  zoneFee: number;
  shelfFee: number;
  routeFee: number;
  clickFee: number;
  durationDays: number;
  status: AdPackageStatus;
  createdAt: string;
  updatedAt: string;
  activeCampaignCount: number;
}

export interface CreateAdPackagePayload {
  packageName: string;
  description?: string | null;
  budget: number;
  zoneFee: number;
  shelfFee: number;
  routeFee: number;
  clickFee: number;
  durationDays: number;
}

export interface UpdateAdPackagePayload extends CreateAdPackagePayload {
  status: AdPackageStatus;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
