export enum PSStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  FINISHED = 'FINISHED'
}

export enum RentalType {
  PS_ONLY = 'PS_ONLY',
  PS_TV = 'PS_TV'
}

export interface PSUnit {
  id: number;
  name: string;
  status: PSStatus;
  customerName: string;
  startTime: number | null;
  finishedAt: number | null;
  durationInMinutes: number;
  remainingSeconds: number;
  totalCost: number;
}

export interface HistoryRecord {
  id: string;
  unitName: string;
  customerName: string;
  duration: number;
  cost: number;
  timestamp: number;
  type: 'HOURLY' | 'RENTAL';
}

export interface ActiveRental {
  id: string;
  customerName: string;
  address: string;
  type: RentalType;
  packageName: string;
  startTime: number;
  endTime: number;
  totalPrice: number;
  discount: number;
}

export interface CustomerRank {
  name: string;
  totalSpend: number;
  totalVisits: number;
  rank: string;
  color: string;
  nextTier: number;
}
