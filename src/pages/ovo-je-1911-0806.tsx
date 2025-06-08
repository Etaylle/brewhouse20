import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Star, Award, Activity, TrendingUp, Droplets, Zap } from 'lucide-react';
import { format } from 'date-fns';
import de from 'date-fns/locale/de';
import { ChartDataPoint, LiveData, ProcessType, SensorData, DashboardError, Beer, ReviewsSummary } from '../types';
import { ProcessCard } from '../components/ProcessCard';

// Process configuration
const processNames: Record<ProcessType, string> = {
  gaerung: 'Gärung',
  maischen: 'Maischen',
  hopfenkochen: 'Hopfenkochen',
};

const processIcons: Record<ProcessType, React.ReactNode> = {
  gaerung: <Activity className="w-6 h-6" />,
  maischen: <Droplets className="w-6 h-6" />,
  hopfenkochen: <Zap className="w-6 h-6" />,
};

const processColors: Record<ProcessType, string> = {
  gaerung: 'from-red-500 to-pink-600',
  maischen: 'from-blue-500 to-cyan-600',
  hopfenkochen: 'from-yellow-500 to-orange-600',
};

// Helper functions for consistent data access
const getTemperatureValue = (data: any): number => {
  const temp = data?.temperatur ?? data?.temperature ?? data?.values?.temperatur ?? data?.values?.temperature;
  return temp !== undefined ? parseFloat(temp.toFixed(1)) : 0;
};

const getPressureValue = (data: any): number => {
  const pressure = data?.druck ?? data?.pressure ?? data?.values?.druck ?? data?.values?.pressure;
  return pressure !== undefined ? parseFloat(pressure.toFixed(2)) : 0;
};

const getPhValue = (data: any): number => {
  const ph = data?.ph ?? data?.values?.ph;
  return ph !== undefined ? parseFloat(ph.toFixed(1)) : 0;
};

const formatTime = (timestamp: string | number | undefined): string => {
  if (!timestamp) return 'Keine Daten';
  const date = typeof timestamp === 'string' ? new Date(Date.parse(timestamp)) : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Ungültiges Datum';
  return format(date, 'HH:mm:ss', { locale: de });
};



// StarRating component
const StarRating: React.FC<{
  rating: number;
  onRate: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ rating, onRate, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 hover:scale-110 ${
            index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/30 hover:text-yellow-400/50'
          }`}
          onClick={() => onRate(index + 1)}
        />
      ))}
    </div>
  );
};

// Main Dashboard component
export default function Dashboard() {
  const [error, setError] = useState<DashboardError>({
    activeBeer: null,
    reviews: null,
    sensor: null,
  });
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [sensorData, setSensorData] = useState<Record<ProcessType, SensorData | undefined>>({
    gaerung: undefined,
    maischen: undefined,
    hopfenkochen: undefined,
  });
  const [historicalData, setHistoricalData] = useState<Record<ProcessType, LiveData[] | undefined>>({
    gaerung: undefined,
    maischen: undefined,
    hopfenkochen: undefined,
  });
  const [activeProcess, setActiveProcess] = useState<ProcessType>('gaerung');

  const queryClient = useQueryClient();

  // Fetch active beer data
  const {
    data: activeBeerData,
    error: activeBeerError,
    isLoading: isBeerLoading,
  } = useQuery<Beer | null>({
    queryKey: ['active-beer'],
    queryFn: async () => {
      const response = await fetch('/api/beer/active');
      if (!response.ok) {
        throw new Error('Failed to fetch active beer');
      }
      const data = await response.json();
      return data || null;
    },
    enabled: true,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    onError: (error: unknown) => {
      console.error('Error fetching active beer:', error);
      setError(prev => ({ ...prev, activeBeer: error instanceof Error ? error : new Error('Failed to fetch active beer') }));
    },
  });

  // Fetch reviews data
  const {
    data: reviewsData,
    error: reviewsError,
    isLoading: isReviewsLoading,
  } = useQuery<ReviewsSummary | null>({
    queryKey: ['reviews', activeBeerData?.name],
    queryFn: async () => {
      if (!activeBeerData?.name) {
        return null;
      }
      const response = await fetch(`/api/review/${activeBeerData.name}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      return await response.json();
    },
    enabled: !!activeBeerData?.name,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    onError: (error: unknown) => {
      console.error('Error fetching reviews:', error);
      setError(prev => ({ ...prev, reviews: error instanceof Error ? error : new Error('Failed to fetch reviews') }));
    },
  });

  // Fetch sensor data
  const fetchAllSensorData = useCallback(async () => {
    const processes: ProcessType[] = ['gaerung', 'maischen', 'hopfenkochen'];
    const newSensorData = {} as Record<ProcessType, SensorData | undefined>;
    const newHistoricalData = {} as Record<ProcessType, LiveData[] | undefined>;
    let hasError = false;

    console.log('Starting data fetch for all processes');

    for (const process of processes) {
      try {
        console.log(`Fetching data for process: ${process}`);

        // Fetch current sensor data
        const currentResponse = await fetch(`/api/sensor-data/${process}`);
        if (!currentResponse.ok) {
          console.error(`Sensor data request failed for ${process}:`, currentResponse.statusText);
          throw new Error(`Failed to fetch sensor data for ${process}: ${currentResponse.statusText}`);
        }
        const currentData = await currentResponse.json();
        console.log(`[${process}] Current sensor data:`, currentData);
        newSensorData[process] = currentData;

        // Fetch live data
        const liveResponse = await fetch(`/api/live/${process}`);
        if (!liveResponse.ok) {
          console.error(`Live data request failed for ${process}:`, liveResponse.statusText);
          throw new Error(`Failed to fetch live data for ${process}: ${liveResponse.statusText}`);
        }
        const liveData = await liveResponse.json();
        console.log(`[${process}] Live data (last point):`, liveData[liveData.length - 1]);
        newHistoricalData[process] = liveData;

        // Log the values we're actually using
        const latestPoint = liveData[liveData.length - 1];
        const currentTemp = getTemperatureValue(latestPoint) || getTemperatureValue(currentData) || 0;
        const currentPressure = getPressureValue(latestPoint) || getPressureValue(currentData) || 0;
        const currentPh = getPhValue(latestPoint) || getPhValue(currentData) || 0;
        console.log(`[${process}] Values used:`, {
          temperature: currentTemp,
          pressure: currentPressure,
          ph: currentPh
        });

      } catch (error) {
        console.error(`Error fetching data for ${process}:`, error);
        hasError = true;
        // Set previous data if fetch fails
        newSensorData[process] = sensorData[process];
        newHistoricalData[process] = historicalData[process];
      }
    }

    // Update state only if we have new data
    if (Object.keys(newSensorData).length > 0) {
      setSensorData(prev => ({ ...prev, ...newSensorData }));
      setHistoricalData(prev => ({ ...prev, ...newHistoricalData }));
      console.log('Updated sensor data:', newSensorData);
      console.log('Updated historical data:', newHistoricalData);
    }
    
    if (hasError) {
      setError(prev => ({ ...prev, sensor: new Error('Failed to fetch sensor data') }));
    }
  }, []); // Removed dependencies to prevent infinite loops

  useEffect(() => {
    fetchAllSensorData();
    const interval = setInterval(fetchAllSensorData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllSensorData]);

  // Cycle through active processes
  useEffect(() => {
    const processes: ProcessType[] = ['gaerung', 'maischen', 'hopfenkochen'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % processes.length;
      setActiveProcess(processes[currentIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Submit review
  const submitReview = useCallback(async () => {
    if (!activeBeerData || selectedRating === 0) return;

    setIsSubmittingReview(true);
    try {
      const response = await fetch(`/api/review/${activeBeerData.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sterne: selectedRating }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      queryClient.invalidateQueries(['reviews', activeBeerData.name]);
      setSelectedRating(0);
    } catch (error) {
      console.error('Error submitting review:', error);
      setError(prev => ({ ...prev, reviews: error instanceof Error ? error : new Error('Failed to submit review') }));
      alert('Fehler beim Absenden der Bewertung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmittingReview(false);
    }
  }, [activeBeerData, selectedRating, queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-800 p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent mb-4">
            Brauerei-Dashboard
          </h1>
          <p className="text-white/60 text-lg">Echtzeitüberwachung und Analysen</p>
        </div>

        {error.activeBeer || error.reviews || error.sensor ? (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
            {error.activeBeer && <p>Error fetching active beer: {error.activeBeer.message}</p>}
            {error.reviews && <p>Error fetching reviews: {error.reviews.message}</p>}
            {error.sensor && <p>Error fetching sensor data: {error.sensor.message}</p>}
          </div>
        ) : null}

        <div className="mb-12">
          <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 animate-pulse" />
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl">
                    <Award className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Aktuelles Bier</h2>
                    {isBeerLoading ? (
                      <p className="text-white/60 text-lg">Lade aktuelles Bier...</p>
                    ) : activeBeerData ? (
                      <div className="space-y-1">
                        <h3 className="text-2xl font-semibold text-white/90">{activeBeerData.name}</h3>
                        <p className="text-white/60 text-lg">{activeBeerData.type}</p>
                      </div>
                    ) : (
                      <p className="text-white/60 text-lg">Kein aktuelles Bier gefunden</p>
                    )}
                  </div>
                </div>
                {activeBeerData && (
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="text-4xl font-bold text-white">{reviewsData?.durchschnitt || 0}</span>
                      <StarRating rating={Math.floor(reviewsData?.durchschnitt || 0)} onRate={() => {}} size="lg" />
                    </div>
                    <p className="text-white/60">{reviewsData?.anzahl || 0} Bewertungen</p>
                  </div>
                )}
              </div>
              {activeBeerData && (
                <div className="flex items-center justify-between p-6 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center space-x-6">
                    <span className="text-white/80 font-medium">Bewerte dieses Bier:</span>
                    <StarRating rating={selectedRating} onRate={setSelectedRating} size="lg" />
                  </div>
                  <button
                    onClick={submitReview}
                    disabled={isSubmittingReview || selectedRating === 0}
                    className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                      isSubmittingReview || selectedRating === 0
                        ? 'bg-white/20 text-white/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isSubmittingReview ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Absenden...</span>
                      </div>
                    ) : (
                      'Bewertung absenden'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {Object.entries(historicalData).map(([process, data]) => (
            <ProcessCard
              key={process}
              process={process as ProcessType}
              data={sensorData[process as ProcessType]}
              historical={data}
              isActive={activeProcess === process}
            />
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center">
          <div className="flex items-center space-x-8 px-8 py-4 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/80 text-sm">System Online</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-white/80 text-sm">Alle Sensoren Aktiv</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white/80 text-sm">Optimale Leistung</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
