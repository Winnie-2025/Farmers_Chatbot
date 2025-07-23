import React from 'react';
import { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Wind, Thermometer, Droplets } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: any;
  description: string;
}

interface ForecastData {
  day: string;
  temp: number;
  condition: string;
  icon: any;
  rain: number;
  description: string;
}

export const WeatherWidget: React.FC = () => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState({ lat: -25.81606774487145, lng: 28.24244434919649 });

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
      return CloudRain;
    } else if (conditionLower.includes('cloud')) {
      return Cloud;
    } else if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      return Sun;
    } else {
      return Cloud;
    }
  };

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `https://afrigis.services/weather-10-day-forecast/v1/getHourlyByCoords?latitude=${location.lat}&longitude=${location.lng}&station_count=1&location_buffer=1&day_count=10`,
        {
          headers: {
            'accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const currentWeather = data[0];
        const currentHour = currentWeather.hourly_data?.[0];
        
        if (currentHour) {
          const current: WeatherData = {
            temperature: Math.round(currentHour.temperature || 20),
            condition: currentHour.weather_description || 'Partly Cloudy',
            humidity: Math.round(currentHour.humidity || 65),
            windSpeed: Math.round(currentHour.wind_speed || 10),
            icon: getWeatherIcon(currentHour.weather_description || 'cloudy'),
            description: currentHour.weather_description || 'Partly Cloudy'
          };
          setWeatherData(current);
        }
        
        // Process forecast data
        const forecastData: ForecastData[] = data.slice(0, 5).map((day: any, index: number) => {
          const dayData = day.hourly_data?.[12] || day.hourly_data?.[0]; // Use midday data or first available
          const dayName = index === 0 ? 'Today' : 
                         index === 1 ? 'Tomorrow' : 
                         new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
          
          return {
            day: dayName,
            temp: Math.round(dayData?.temperature || 20),
            condition: dayData?.weather_description || 'Partly Cloudy',
            icon: getWeatherIcon(dayData?.weather_description || 'cloudy'),
            rain: Math.round(dayData?.precipitation_probability || 0),
            description: dayData?.weather_description || 'Partly Cloudy'
          };
        });
        
        setForecast(forecastData);
      } else {
        throw new Error('No weather data available');
      }
    } catch (err) {
      console.error('Weather API error:', err);
      setError('Unable to fetch weather data. Using default values.');
      
      // Fallback to default data
      setWeatherData({
        temperature: 24,
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 12,
        icon: Cloud,
        description: 'Partly Cloudy'
      });
      
      setForecast([
        { day: 'Today', temp: 24, condition: 'Partly Cloudy', icon: Cloud, rain: 20, description: 'Partly Cloudy' },
        { day: 'Tomorrow', temp: 22, condition: 'Rainy', icon: CloudRain, rain: 80, description: 'Light Rain' },
        { day: 'Wednesday', temp: 26, condition: 'Sunny', icon: Sun, rain: 5, description: 'Clear Skies' },
        { day: 'Thursday', temp: 23, condition: 'Cloudy', icon: Cloud, rain: 40, description: 'Overcast' },
        { day: 'Friday', temp: 25, condition: 'Sunny', icon: Sun, rain: 10, description: 'Mostly Sunny' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherAlerts();
    fetchWeatherData();
  }, []);

  useEffect(() => {
    fetchWeatherData();
  }, [location]);

  const loadWeatherAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        const formattedAlerts = data.map(alert => ({
          type: alert.severity === 'high' ? 'warning' : 'info',
          title: alert.title,
          message: alert.message,
          time: new Date(alert.created_at).toLocaleString(),
          severity: alert.severity,
          location: alert.location,
        }));
        setAlerts(formattedAlerts);
      }
    } catch (error) {
      console.error('Error loading weather alerts:', error);
      // Fallback to static alerts
      setAlerts([
        {
          type: 'warning',
          title: 'Heavy Rain Expected',
          message: 'Heavy rainfall expected tomorrow. Prepare drainage systems and cover sensitive crops.',
          time: '2 hours ago',
        },
        {
          type: 'info',
          title: 'Optimal Planting Conditions',
          message: 'Perfect soil moisture and temperature for planting maize this week.',
          time: '6 hours ago',
        },
      ]);
    }
  };

  const updateLocation = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            <span className="ml-3 text-gray-600">Loading weather data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{t('weather')} Forecast</h2>
          <div className="flex items-center space-x-4">
            {error && (
              <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                Using offline data
              </span>
            )}
            <button
              onClick={fetchWeatherData}
              className="text-sm bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Location Selector */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Locations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name: 'Pretoria', lat: -25.8167, lng: 28.2411 },
              { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
              { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
              { name: 'Durban', lat: -29.8587, lng: 31.0218 },
            ].map((loc) => (
              <button
                key={loc.name}
                onClick={() => updateLocation(loc.lat, loc.lng)}
                className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                  Math.abs(location.lat - loc.lat) < 0.1 && Math.abs(location.lng - loc.lng) < 0.1
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Current Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Current Weather</h3>
                <div className="flex items-center space-x-2">
                  {weatherData && React.createElement(weatherData.icon, { size: 32 })}
                  <span className="text-3xl font-bold">{weatherData?.temperature || 24}°C</span>
                </div>
                <p className="text-blue-100 mt-2">{weatherData?.condition || 'Partly Cloudy'}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <Droplets size={16} />
                  <span className="text-sm">{weatherData?.humidity || 65}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wind size={16} />
                  <span className="text-sm">{weatherData?.windSpeed || 12} km/h</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Farming Advice</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Thermometer size={16} />
                <span>Good temperature for crop growth</span>
              </div>
              <div className="flex items-center space-x-2">
                <Droplets size={16} />
                <span>Moderate humidity - ideal conditions</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wind size={16} />
                <span>Light winds - safe for spraying</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Day Forecast */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">5-Day Forecast</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {forecast.map((day, index) => {
              const Icon = day.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="font-medium text-gray-800 mb-2">{day.day}</p>
                  <Icon size={32} className="mx-auto mb-2 text-gray-600" />
                  <p className="text-2xl font-bold text-gray-800">{day.temp}°C</p>
                  <p className="text-sm text-gray-600 mb-1">{day.condition}</p>
                  <p className="text-xs text-blue-600">{day.rain}% rain</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Source */}
        <div className="text-center text-xs text-gray-500 mb-4">
          Weather data provided by AfriGIS Weather Services
          {!error && <span className="text-green-600 ml-2">• Live Data</span>}
          {error && <span className="text-amber-600 ml-2">• Offline Mode</span>}
        </div>

        {/* Weather Alerts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Weather Alerts</h3>
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'warning' || alert.severity === 'high'
                    ? 'bg-orange-50 border-orange-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-800">{alert.title}</h4>
                      {alert.location && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                          {alert.location}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};