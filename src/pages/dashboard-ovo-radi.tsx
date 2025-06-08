import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Star } from 'lucide-react';
import { format } from 'date-fns';
import de from 'date-fns/locale/de';
import { ChartDataPoint, LiveData, ProcessType, SensorData, DashboardError, Beer, Review, ReviewsSummary } from '../types';

const processNames: Record<ProcessType, string> = {
    gaerung: 'Gärung',
    maischen: 'Maischen',
    hopfenkochen: 'Hopfenkochen'
};

const processIcons: Record<ProcessType, React.ReactNode> = {
    gaerung: <Thermometer className="w-5 h-5 text-red-500" />,
    maischen: <Droplets className="w-5 h-5 text-blue-500" />,
    hopfenkochen: <Star className="w-5 h-5 text-yellow-500" />
};

const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) {
        return 'Keine Daten';
    }
    const parsedDate = Date.parse(timestamp);
    if (isNaN(parsedDate)) {
        return 'Ungültiges Datum';
    }
    return format(new Date(parsedDate), 'HH:mm:ss', { locale: de });
};

// ProcessCard component
const ProcessCard: React.FC<{ process: ProcessType; data: SensorData | LiveData | undefined; historical: LiveData[] | undefined }> = ({ process, data, historical }) => {
    console.log(`ProcessCard data for ${process}:`, data);
    const chartData: ChartDataPoint[] = historical?.map((point, index) => ({
        time: point.timestamp ? new Date(point.timestamp).getTime() : index,
        temperature: point.values?.temperatur || 0,
        pressure: point.values?.druck || 0,
        ph: point.values?.ph || 0,
    })) || [];

    // Get the latest values directly from chartData
    const latestPoint = chartData[chartData.length - 1] || { temperature: 0, pressure: 0 };
    const currentTemp = latestPoint.temperature;
    const currentPress = latestPoint.pressure;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{processNames[process]}</h3>
                    <p className="text-sm text-gray-500">{formatTimestamp(data?.timestamp)}</p>
                </div>
                {processIcons[process]}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{currentTemp.toFixed(1)}°C</p>
                    <p className="text-gray-500">Temperatur</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{currentPress.toFixed(1)} bar</p>
                    <p className="text-gray-500">Druck</p>
                </div>
            </div>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tickFormatter={(value) => formatTimestamp(new Date(value).toISOString())} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="temperature" stroke="#ff4b4b" name="Temperatur" />
                        <Line type="monotone" dataKey="pressure" stroke="#3b82f6" name="Druck" />
                        <Line type="monotone" dataKey="ph" stroke="#10b981" name="pH" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// StarRating component
const StarRating: React.FC<{ rating: number; onRate: (rating: number) => void }> = ({ rating, onRate }) => {
    const stars = Array(5).fill(0);
    return (
        <div className="flex items-center">
            {stars.map((_, index) => (
                <Star
                    key={index}
                    className={`w-6 h-6 cursor-pointer ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    onClick={() => onRate(index + 1)}
                />
            ))}
        </div>
    );
};

export default function Dashboard() {
    const [error, setError] = useState<DashboardError>({
        activeBeer: null,
        reviews: null,
        sensor: null
    });
    const [selectedRating, setSelectedRating] = useState(0);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [sensorData, setSensorData] = useState<Record<ProcessType, SensorData | undefined>>({
        gaerung: undefined,
        maischen: undefined,
        hopfenkochen: undefined
    });
    const [historicalData, setHistoricalData] = useState<Record<ProcessType, LiveData[] | undefined>>({
        gaerung: undefined,
        maischen: undefined,
        hopfenkochen: undefined
    });

    const queryClient = useQueryClient();

    // Fetch active beer data
    const { 
        data: activeBeerData, 
        error: activeBeerError, 
        isLoading: isBeerLoading 
    } = useQuery<Beer | null>(
        ['active-beer'],
        async () => {
            const response = await fetch('/api/beer/active');
            if (!response.ok) {
                throw new Error('Failed to fetch active beer');
            }
            const data = await response.json();
            return data || null;
        },
        {
            enabled: true,
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes,
            onError: (error: unknown) => {
                console.error('Error fetching active beer:', error);
                setError(prev => ({ ...prev, activeBeer: error instanceof Error ? error : new Error('Failed to fetch active beer') }));
            }
        }
    );

    // Fetch reviews data
    const { 
        data: reviewsData, 
        error: reviewsError, 
        isLoading: isReviewsLoading 
    } = useQuery<ReviewsSummary | null>(
        ['reviews', activeBeerData?.name],
        async () => {
            if (!activeBeerData?.name) {
                return null;
            }
            const response = await fetch(`/api/review/${activeBeerData.name}`);
            if (!response.ok) {
                throw new Error('Failed to fetch reviews');
            }
            return await response.json();
        },
        {
            enabled: !!activeBeerData?.name,
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes,
            onError: (error: unknown) => {
                console.error('Error fetching reviews:', error);
                setError(prev => ({ ...prev, reviews: error instanceof Error ? error : new Error('Failed to fetch reviews') }));
            }
        }
    );

    // Fetch sensor data for all processes
    const fetchAllSensorData = useCallback(async () => {
        const processes = ['gaerung', 'maischen', 'hopfenkochen'];
        const newSensorData = { ...sensorData };
        const newHistoricalData = { ...historicalData };
        let hasError = false;

        for (const process of processes) {
            try {
                const currentResponse = await fetch(`/api/sensor-data/${process}`);
                if (!currentResponse.ok) {
                    throw new Error('Failed to fetch sensor data');
                }
                const currentData = await currentResponse.json();
                console.log(`Current data for ${process}:`, currentData);
                newSensorData[process as ProcessType] = currentData;

                const liveResponse = await fetch(`/api/live/${process}`);
                if (!liveResponse.ok) {
                    throw new Error('Failed to fetch live data');
                }
                const liveData = await liveResponse.json();
                console.log(`Live data for ${process}:`, liveData);
                newHistoricalData[process as ProcessType] = liveData;
            } catch (error) {
                console.error(`Error fetching data for ${process}:`, error);
                hasError = true;
            }
        }

        setSensorData(newSensorData);
        setHistoricalData(newHistoricalData);
        if (hasError) {
            setError(prev => ({ ...prev, sensor: new Error('Failed to fetch sensor data') }));
        }
    }, [sensorData, historicalData]);

    useEffect(() => {
        fetchAllSensorData();
        const interval = setInterval(fetchAllSensorData, 10000);
        return () => clearInterval(interval);
    }, [fetchAllSensorData]);

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

            // Invalidate and refetch reviews
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
        <div className="p-6">
            {/* Active Beer Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Aktuelles Bier</h2>
                </div>
                {isBeerLoading ? (
                    <p className="text-gray-500">Lade aktuelles Bier...</p>
                ) : activeBeerData ? (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-800">{activeBeerData?.name}</h3>
                                <p className="text-sm text-gray-500">{activeBeerData?.type}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-800">{reviewsData?.durchschnitt || 0} ⭐</p>
                                <p className="text-sm text-gray-500">Bewertungen: {reviewsData?.anzahl || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={submitReview}
                                disabled={isSubmittingReview || selectedRating === 0}
                                className={`px-4 py-2 rounded-md text-sm font-medium ${
                                    isSubmittingReview || selectedRating === 0
                                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                {isSubmittingReview ? 'Absenden...' : 'Bewertung absenden'}
                            </button>
                            <StarRating
                                rating={selectedRating}
                                onRate={setSelectedRating}
                            />
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500">Kein aktuelles Bier gefunden</p>
                )}
            </div>

            {/* Process Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(sensorData).map(([process, data]) => (
                    <ProcessCard
                        key={process}
                        process={process as ProcessType}
                        data={data}
                        historical={historicalData[process as ProcessType]}
                    />
                ))}
            </div>
        </div>
    );
}
