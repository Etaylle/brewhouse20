import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LucideIcon } from 'lucide-react';

const PROCESS_ICONS = {
    'gaerung': 'Temperature',
    'maischen': 'Mug',
    'hopfenkochen': 'Flame'
};

function Dashboard() {
    const { data: activeBeer } = useQuery({
        queryKey: ['activeBeer'],
        queryFn: async () => {
            const response = await fetch('/api/beer/active');
            if (!response.ok) throw new Error('Failed to fetch active beer');
            return response.json();
        },
    });

    const { data: reviews } = useQuery({
        queryKey: ['reviews', activeBeer?.name],
        queryFn: async () => {
            if (!activeBeer?.name) return null;
            const response = await fetch(`/api/review/${activeBeer.name}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            return response.json();
        },
    });

    const [sensorData, setSensorData] = useState({});

    useEffect(() => {
        const fetchSensorData = async () => {
            const response = await fetch('/api/sensor-data/gaerung');
            if (response.ok) {
                const data = await response.json();
                setSensorData(data);
            }
        };

        fetchSensorData();
        const interval = setInterval(fetchSensorData, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-4xl font-bold mb-8">Bierbrauerei Dashboard</h1>

            {/* Active Beer Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-2xl font-semibold mb-4">Aktives Bier</h2>
                {activeBeer ? (
                    <div className="space-y-2">
                        <p className="font-bold text-xl">{activeBeer.name}</p>
                        <p className="text-gray-600">{activeBeer.type}</p>
                        <p className="text-gray-600">{activeBeer.description}</p>
                    </div>
                ) : (
                    <p className="text-gray-600">Kein aktives Bier gefunden</p>
                )}
            </div>

            {/* Process Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {['gaerung', 'maischen', 'hopfenkochen'].map(process => (
                    <div key={process} className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-semibold mb-4">
                            {process.charAt(0).toUpperCase() + process.slice(1)}
                        </h3>
                        <div className="space-y-2">
                            {sensorData[process]?.data && Object.entries(sensorData[process].data).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                    <span className="text-gray-600">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                    <span className="font-medium">{value.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Reviews Section */}
            {reviews && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-semibold mb-4">Bewertungen</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Anzahl</span>
                            <span className="font-medium">{reviews.anzahl}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Durchschnitt</span>
                            <span className="font-medium">{reviews.durchschnitt}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
