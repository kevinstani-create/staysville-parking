import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Car, Clock } from 'lucide-react';

export default function HomePage() {
  const locations = [
    {
      id: 'jens-zetlitz-gate',
      name: 'Jens Zetlitz gate',
      description: 'Central location with easy access to downtown',
      features: ['24/7 Access', 'Secure Parking', 'CCTV Monitoring']
    },
    {
      id: 'saudagata',
      name: 'Saudagata',
      description: 'Quiet residential area, limited capacity (max 2 cars)',
      features: ['Limited Spots', 'Residential Area', 'Quiet Location']
    },
    {
      id: 'torbjorn-hornkloves-gate',
      name: 'Torbjørn Hornkløves gate',
      description: 'Premium location with excellent accessibility',
      features: ['Premium Location', 'Easy Access', 'Well Lit']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Staysville Parking</h1>
            </div>
            <div className="text-sm text-gray-600">
              150 NOK per night
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Premium Parking in Oslo
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Book secure parking spots at prime locations throughout the city. 
            Easy online booking with instant confirmation.
          </p>
        </div>

        {/* Location Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {locations.map((location) => (
            <Card key={location.id} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl">{location.name}</CardTitle>
                </div>
                <CardDescription className="text-gray-600">
                  {location.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {location.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>150 NOK/night</span>
                  </div>
                </div>
                <Link href={`/booking/${location.id}`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Book Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Staysville Parking?
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Secure Parking</h4>
              <p className="text-gray-600">All locations are monitored and secure</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">24/7 Access</h4>
              <p className="text-gray-600">Access your parking spot anytime</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Prime Locations</h4>
              <p className="text-gray-600">Convenient locations throughout Oslo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Staysville Parking. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
