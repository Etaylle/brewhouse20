import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Clock, Star, StarHalf } from 'lucide-react';

function Dashboard() {
    const { data: activeBeer, error: activeBeerError, isLoading: activeBeerLoading } = useQuery({
        queryKey: ['activeBeer'],
        queryFn: async () => {
            const response = await fetch('/api/beer/active');
            if (!response.ok) throw new Error('Failed to fetch active beer');
            return response.json();
        },
        retry: 1,
    });

    const { data: reviews, error: reviewsError } = useQuery({
        queryKey: ['reviews', activeBeer?.name],
        queryFn: async () => {
            if (!activeBeer?.name) return null;
            const response = await fetch(`/api/review/${activeBeer.name}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            return response.json();
        },
        enabled: !!activeBeer?.name,
        retry: 1,
    });

    const [sensorData, setSensorData] = useState({});
    const [historicalData, setHistoricalData] = useState({});
    const [selectedRating, setSelectedRating] = useState(0);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Fetch sensor data for all processes
    useEffect(() => {
        const fetchAllSensorData = async () => {
            const processes = ['gaerung', 'maischen', 'hopfenkochen'];
            const newSensorData = {};
            const newHistoricalData = {};

            for (const process of processes) {
                try {
                    // Current data
                    const currentResponse = await fetch(`/api/sensor-data/${process}`);
                    if (currentResponse.ok) {
                        newSensorData[process] = await currentResponse.json();
                    }

                    // Historical data for charts
                    const liveResponse = await fetch(`/api/live/${process}`);
                    if (liveResponse.ok) {
                        const liveData = await liveResponse.json();
                        newHistoricalData[process] = liveData.slice(0, 20).reverse(); // Last 20 points
                    }
                } catch (error) {
                    console.error(`Error fetching data for ${process}:`, error);
                }
            }

            setSensorData(newSensorData);
            setHistoricalData(newHistoricalData);
        };

        fetchAllSensorData();
        const interval = setInterval(fetchAllSensorData, 10000);
        return () => clearInterval(interval);
    }, []);

    const submitReview = async () => {
        if (!activeBeer?.name || selectedRating === 0) return;
        
        setIsSubmittingReview(true);
        try {
            const response = await fetch(`/api/review/${activeBeer.name}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sterne: selectedRating }),
            });

            if (response.ok) {
                setSelectedRating(0);
                // Refetch reviews
                window.location.reload(); // Simple refresh for now
            }
        } catch (error) {
            console.error('Error submitting review:', error);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const StarRating = ({ rating, onRate, readonly = false }) => {
        return (
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => !readonly && onRate(star)}
                        className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
                        disabled={readonly}
                    >
                        <Star
                            className={`w-6 h-6 ${
                                star <= rating
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                            }`}
                        />
                    </button>
                ))}
            </div>
        );
    };

    const ProcessCard = ({ process, data, historical }) => {
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
            temperature: point.values?.temperatur || 0,
            pressure: point.values?.druck || 0,
            ph: point.values?.ph || 0,
        })) || [];

        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center mb-4">
                    {processIcons[process]}
                    <h3 className="text-xl font-semibold ml-3">{processNames[process]}</h3>
                </div>

                {/* Current Values */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {data?.data && Object.entries(data.data).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-3 rounded">
                            <div className="text-sm text-gray-600 capitalize">{key}</div>
                            <div className="text-lg font-bold">
                                {typeof value === 'number' ? value.toFixed(1) : value}
                                {key === 'temperatur' && '°C'}
                                {key === 'druck' && ' bar'}
                                {key === 'ph' && ' pH'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chart */}
                {chartData.length > 0 && (
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="temperature"
                                    stroke="#3b82f6"
                                    name="Temperatur (°C)"
                                    strokeWidth={2}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pressure"
                                    stroke="#10b981"
                                    name="Druck (bar)"
                                    strokeWidth={2}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="ph"
                                    stroke="#f59e0b"
                                    name="pH"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
            <div className="container mx-auto p-6">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-amber-800 mb-2">🍺 Bierbrauerei Dashboard</h1>
                    <p className="text-amber-600 text-lg">Überwachung des Brauprozesses in Echtzeit</p>
                </div>

                {/* Active Beer Section */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h2 className="text-3xl font-bold text-amber-700 mb-4 flex items-center">
                        🍺 Aktives Bier
                    </h2>
                    {activeBeerLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                            <span className="ml-3 text-amber-600">Lädt...</span>
                        </div>
                    ) : activeBeerError ? (
                        <div className="bg-red-50 border border-red-200 rounded p-4">
                            <p className="text-red-700">⚠️ Fehler beim Laden des aktiven Biers</p>
                        </div>
                    ) : activeBeer ? (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-lg">
                            <h3 className="text-2xl font-bold text-amber-800 mb-2">{activeBeer.name}</h3>
                            <p className="text-amber-600 text-lg mb-1">Typ: {activeBeer.type}</p>
                            <p className="text-amber-600">{activeBeer.description}</p>
                        </div>
                    ) : (
                        <div className="text-center p-8 text-amber-600">
                            <p className="text-lg">🚫 Kein aktives Bier gefunden</p>
                        </div>
                    )}
                </div>

                {/* Process Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {['gaerung', 'maischen', 'hopfenkochen'].map(process => (
                        <ProcessCard
                            key={process}
                            process={process}
                            data={sensorData[process]}
                            historical={historicalData[process]}
                        />
                    ))}
                </div>

                {/* Reviews Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Submit Review */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-amber-700 mb-4 flex items-center">
                            ⭐ Bier Bewerten
                        </h2>
                        {activeBeer ? (
                            <div>
                                <p className="text-gray-600 mb-4">
                                    Wie findest du das Bier "{activeBeer.name}"?
                                </p>
                                <div className="mb-4">
                                    <StarRating 
                                        rating={selectedRating} 
                                        onRate={setSelectedRating}
                                    />
                                </div>
                                <button
                                    onClick={submitReview}
                                    disabled={selectedRating === 0 || isSubmittingReview}
                                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                                >
                                    {isSubmittingReview ? 'Wird gesendet...' : 'Bewertung Abgeben'}
                                </button>
                            </div>
                        ) : (
                            <p className="text-gray-500">Kein aktives Bier zum Bewerten verfügbar</p>
                        )}
                    </div>

                    {/* Review Statistics */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-amber-700 mb-4 flex items-center">
                            📊 Bewertungen
                        </h2>
                        {reviewsError ? (
                            <div className="text-red-600">
                                <p>⚠️ Fehler beim Laden der Bewertungen</p>
                            </div>
                        ) : reviews ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-amber-50 p-4 rounded-lg">
                                    <span className="text-amber-700 font-semibold">Anzahl Bewertungen</span>
                                    <span className="text-2xl font-bold text-amber-800">{reviews.anzahl}</span>
                                </div>
                                <div className="flex items-center justify-between bg-amber-50 p-4 rounded-lg">
                                    <span className="text-amber-700 font-semibold">Durchschnitt</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-2xl font-bold text-amber-800">
                                            {reviews.durchschnitt}
                                        </span>
                                        <StarRating 
                                            rating={Math.round(parseFloat(reviews.durchschnitt))} 
                                            readonly={true}
                                        />
                                    </div>
                                </div>
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
    );
}

export default Dashboard;
