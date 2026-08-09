export type AdPackageStatus = 'Active' | 'Inactive';

export interface AdPackage {
  packageId: number;
  packageName: string;
  pricePackage: number;
  priceRoute: number;
  priceZone: number;
  priceShelf: number;
  basePriceClick: number;
  adScore: number;
  status: AdPackageStatus;
  activeCampaignCount: number;
}

export interface CreateAdPackagePayload {
  packageName: string;
  pricePackage: number;
  priceRoute: number;
  priceZone: number;
  priceShelf: number;
  basePriceClick: number;
  adScore: number;
}

export interface UpdateAdPackagePayload extends CreateAdPackagePayload {
  status: AdPackageStatus;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
