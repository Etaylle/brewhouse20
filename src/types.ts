export interface Beer {
    id: number;
    name: string;
    type: string;
    description: string;
    imageUrl?: string;
    isActive?: boolean;
}

export interface Review {
    id: number;
    beer_id: number;
    sterne: number;
    timestamp: string;
}

export interface SensorData {
    temperatur: number;
    druck: number;
    ph: number;
    timestamp: string;
}

export interface LiveData {
    id: number;
    process: ProcessType;
    values: {
        temperatur: number;
        druck?: number;
        ph: number;
        suess: number;
        sauer: number;
    };
    timestamp: string;
    createdAt: string;
    updatedAt: string;
}

export interface DashboardState {
    activeBeer: Beer | null;
    reviews: Review[];
    sensorData: Record<ProcessType, SensorData>;
    historicalData: Record<ProcessType, LiveData[]>;
    selectedRating: number;
    isSubmittingReview: boolean;
}

export interface DashboardError {
    activeBeer: Error | null;
    reviews: Error | null;
    sensor: Error | null;
}

export interface ReviewsSummary {
    anzahl: number;
    durchschnitt: number;
}

export interface ProcessData {
    process: ProcessType;
    data: SensorData;
    historical: LiveData[];
}

export type ProcessType = 'gaerung' | 'maischen' | 'hopfenkochen';

export interface ChartDataPoint {
    time: number;
    temperature: number;
    pressure: number;
    ph: number;
}
