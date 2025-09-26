'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, CheckCircle, Clock, MapPin, CreditCard, RefreshCw } from 'lucide-react';

interface Booking {
  id: number;
  full_name: string;
  email: string;
  start_date: string;
  end_date: string;
  license_plate: string | null;
  no_license_plate: boolean;
  location: string;
  total_price: number;
  stripe_payment_intent_id: string | null;
  status: 'pending' | 'completed';
  created_at: string;
}

interface BookingStats {
  total: number;
  completed: number;
  pending: number;
  totalRevenue: number;
  locationCounts: {
    'jens-zetlitz-gate': number;
    'saudagata': number;
    'torbjorn-hornkloves-gate': number;
  };
}

interface AdminData {
  bookings: Booking[];
  stats: BookingStats;
}

const LOCATION_NAMES = {
  'jens-zetlitz-gate': 'Jens Zetlitz gate',
  'saudagata': 'Saudagata',
  'torbjorn-hornkloves-gate': 'Torbjørn Hornkløves gate'
} as const;

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) setIsRefreshing(true);
      
      const response = await fetch('/api/admin/bookings', {
        headers: {
          'Authorization': `Basic ${btoa('staysville:choose-a-strong-password')}`,
        },
      });

      if (response.status === 401) {
        // Handle basic auth
        const username = prompt('Username:');
        const password = prompt('Password:');
        
        if (username && password) {
          const authResponse = await fetch('/api/admin/bookings', {
            headers: {
              'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
            },
          });
          
          if (!authResponse.ok) {
            throw new Error('Invalid credentials');
          }
          
          const authData = await authResponse.json();
          setData(authData);
        } else {
          throw new Error('Authentication required');
        }
      } else if (!response.ok) {
        throw new Error('Failed to fetch admin data');
      } else {
        const responseData = await response.json();
        setData(responseData);
      }
      
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fetchData()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <Button 
              onClick={() => fetchData(true)} 
              disabled={isRefreshing}
              variant="outline"
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{data.stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalRevenue.toLocaleString()} NOK</div>
            </CardContent>
          </Card>
        </div>

        {/* Location Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Bookings by Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.stats.locationCounts).map(([key, count]) => (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    {LOCATION_NAMES[key as keyof typeof LOCATION_NAMES]}
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
              All bookings ordered by creation date (most recent first)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.bookings.length === 0 ? (
              <Alert>
                <AlertDescription>No bookings found.</AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>License Plate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-sm">
                          #{booking.id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.full_name}</div>
                            <div className="text-sm text-gray-600">{booking.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {LOCATION_NAMES[booking.location as keyof typeof LOCATION_NAMES]}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(booking.start_date)}</div>
                            <div className="text-gray-600">to {formatDate(booking.end_date)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.no_license_plate ? (
                            <span className="text-sm text-gray-500 italic">Not provided</span>
                          ) : (
                            <span className="text-sm font-mono">{booking.license_plate}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{booking.total_price} NOK</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={booking.status === 'completed' ? 'default' : 'secondary'}
                            className={booking.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatDateTime(booking.created_at)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
