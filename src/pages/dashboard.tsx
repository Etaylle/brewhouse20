import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { FC } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Clock, Star, StarHalf } from 'lucide-react';
import { Beer, Review, SensorData, LiveData } from '../types';

interface DashboardState {
    activeBeer: Beer | null;
    reviews: Review[];
    sensorData: Record<string, SensorData>;
    historicalData: Record<string, LiveData[]>;
    selectedRating: number;
    isSubmittingReview: boolean;
}

interface DashboardError {
    activeBeer: Error | null;
    reviews: Error | null;
    sensor: Error | null;
}

function Dashboard() {
    const { 
        data: activeBeerData, 
        error: activeBeerError, 
        isLoading: activeBeerLoading,
        isFetching: activeBeerFetching
    } = useQuery<Beer, Error>({
        queryKey: ['activeBeer'],
        queryFn: async () => {
            const response = await fetch('/api/beer/active');
            if (!response.ok) {
                throw new Error('Failed to fetch active beer');
            }
            const data = await response.json();
            if (!data.name) {
                throw new Error('Invalid beer data');
            }
            return data;
        },
        retry: 1,
        retryDelay: 1000,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false
    });

    const activeBeer = activeBeerData || null;

    const reviewsQueryOptions: UseQueryOptions<{ anzahl: number; durchschnitt: number }, Error> = {
        enabled: !!activeBeer?.name,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes,
    };

    const { 
        data: reviewsData, 
        error: reviewsError,
        isLoading: reviewsLoading,
        isFetching: reviewsFetching
    } = useQuery<{ anzahl: number; durchschnitt: number }, Error>(
        ['reviews', activeBeer?.name],
        async () => {
            if (!activeBeer?.name) return { anzahl: 0, durchschnitt: 0 };
            const response = await fetch(`/api/review/${activeBeer.name}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            return response.json();
        },
        reviewsQueryOptions
    );

    const [sensorData, setSensorData] = useState<Record<string, SensorData>>({});
    const [historicalData, setHistoricalData] = useState<Record<string, LiveData[]>>({});
    const [selectedRating, setSelectedRating] = useState(0);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [errorState, setErrorState] = useState<DashboardError>({
        activeBeer: null,
        reviews: null,
        sensor: null
    });

    // Fetch sensor data for all processes
    useEffect(() => {
        const fetchAllSensorData = async () => {
            const processes = ['gaerung', 'maischen', 'hopfenkochen'];
            const newSensorData = {} as Record<string, SensorData>;
            const newHistoricalData = {} as Record<string, LiveData[]>;
            let hasError = false;

            for (const process of processes) {
                try {
                    // Current data
                    const currentResponse = await fetch(`/api/sensor-data/${process}`);
                    if (currentResponse.ok) {
                        const data = await currentResponse.json();
                        if (!data.data || typeof data.data.temperatur !== 'number') {
                            throw new Error('Invalid sensor data format');
                        }
                        newSensorData[process] = data;
                    }

                    // Historical data for charts
                    const liveResponse = await fetch(`/api/live/${process}`);
                    if (liveResponse.ok) {
                        const liveData = await liveResponse.json();
                        if (!Array.isArray(liveData)) {
                            throw new Error('Invalid live data format');
                        }
                        newHistoricalData[process] = liveData.slice(0, 20).reverse();
                    }
                } catch (error) {
                    console.error(`Error fetching data for ${process}:`, error);
                    hasError = true;
                }
            }

            setSensorData(newSensorData);
            setHistoricalData(newHistoricalData);
            if (hasError) {
                setErrorState(prev => ({ ...prev, sensor: new Error('Failed to fetch sensor data') }));
            }
        };

        fetchAllSensorData();
        const interval = setInterval(fetchAllSensorData, 10000);
        return () => clearInterval(interval);
    }, []);

    const queryClient = useQueryClient();
    const submitReview = useCallback(async () => {
        if (!activeBeer || selectedRating === 0) return;

        setIsSubmittingReview(true);
        try {
            const response = await fetch(`/api/review/${activeBeer.name}`, {
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
            queryClient.invalidateQueries(['reviews', activeBeer.name]);
            setSelectedRating(0);
        } catch (error) {
            console.error('Error submitting review:', error);
            setErrorState(prev => ({ ...prev, reviews: error instanceof Error ? error : new Error('Failed to submit review') }));
        } finally {
            setIsSubmittingReview(false);
        }
    }, [activeBeer, selectedRating, queryClient]);

    const StarRating: React.FC<{ rating: number; onRate?: (rating: number) => void; readonly?: boolean }> = ({ rating, onRate, readonly = false }) => {
        return (
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <div
                        key={star}
                        onClick={() => !readonly && onRate?.(star)}
                        className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
                    >
                        <Star
                            className={`w-6 h-6 ${
                                star <= rating
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                            }`}
                        />
                    </div>
                ))}
            </div>
        );
    };

    const ProcessCard: React.FC<{ process: string; data: SensorData | undefined; historical: LiveData[] | undefined }> = ({ process, data, historical }) => {
        const processNames = {
            gaerung: 'Gärung',
            maischen: 'Maischen',
            hopfenkochen: 'Hopfenkochen'
        };

        const processIcons = {
            gaerung: <Thermometer className="w-8 h-8 text-blue-500" />,
            maischen: <Droplets className="w-8 h-8 text-green-500" />,
            hopfenkochen: <Clock className="w-8 h-8 text-red-500" />
        };

        const chartData = historical?.map((point, index) => ({
            time: index,
            temperature: point.data?.temperatur || 0,
            pressure: point.data?.druck || 0,
            ph: point.data?.ph || 0,
        })) || [];

        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    {processIcons[process as keyof typeof processIcons]}
                    <h3 className="text-xl font-semibold">{processNames[process as keyof typeof processNames]}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-amber-50 p-4 rounded-lg">
                        <div className="text-amber-600 font-semibold">Temperatur</div>
                        <div className="text-2xl font-bold">{data?.data?.temperatur?.toFixed(1) || 0}°C</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                        <div className="text-amber-600 font-semibold">Druck</div>
                        <div className="text-2xl font-bold">{data?.data?.druck?.toFixed(1) || 0} bar</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                        <div className="text-amber-600 font-semibold">pH</div>
                        <div className="text-2xl font-bold">{data?.data?.ph?.toFixed(1) || 0}</div>
                    </div>
                </div>
                <div className="mt-6">
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="temperature" stroke="#82ca9d" name="Temperatur" />
                            <Line type="monotone" dataKey="pressure" stroke="#8884d8" name="Druck" />
                            <Line type="monotone" dataKey="ph" stroke="#ffc658" name="pH" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
            <div className="container mx-auto p-6">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-amber-800 mb-2">Bier Dashboard</h1>
                    <p className="text-gray-600">Überwache und bewerte deine Bierproduktion</p>
                </div>

                {activeBeer ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Process Cards */}
                        {['gaerung', 'maischen', 'hopfenkochen'].map((process) => (
                            <ProcessCard
                                key={process}
                                process={process}
                                data={sensorData[process]}
                                historical={historicalData[process]}
                            />
                        ))}

                        {/* Reviews Section */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-2xl font-semibold mb-4">Bewertungen</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold">Durchschnittliche Bewertung</h3>
                                        <div className="text-4xl font-bold">
                                            {reviewsData?.durchschnitt || '0.0'}
                                            <Star className="inline-block w-6 h-6 text-yellow-400 ml-1" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold">Anzahl Bewertungen</h3>
                                        <div className="text-4xl font-bold">{reviewsData?.anzahl || 0}</div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center space-x-2">
                                        <StarRating
                                            rating={selectedRating}
                                            onRate={setSelectedRating}
                                            readonly={isSubmittingReview}
                                        />
                                        <button
                                            onClick={submitReview}
                                            disabled={isSubmittingReview || !selectedRating}
                                            className={`px-4 py-2 rounded-lg ${
                                                isSubmittingReview || !selectedRating
                                                    ? 'bg-gray-300 cursor-not-allowed'
                                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                            }`}
                                        >
                                            {isSubmittingReview ? 'Bewertung wird abgegeben...' : 'Bewertung abgeben'}
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    {reviewsData && reviewsData.anzahl > 0 ? (
                                        <div className="space-y-4">
                                            {/* reviews.map((review) => (
                                                <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <StarRating rating={review.sterne} readonly />
                                                            <span className="text-gray-600">{review.sterne} Sterne</span>
                                                        </div>
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            )) */}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500 py-8">
                                            <p>📝 Noch keine Bewertungen vorhanden</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        <p>📝 Kein aktives Bier vorhanden</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
