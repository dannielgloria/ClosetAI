class UserLocation {
  const UserLocation({
    required this.city,
    required this.latitude,
    required this.longitude,
    required this.timezone,
  });

  factory UserLocation.fromJson(Map<String, Object?> json) {
    return UserLocation(
      city: json['city']! as String,
      latitude: (json['latitude']! as num).toDouble(),
      longitude: (json['longitude']! as num).toDouble(),
      timezone: json['timezone']! as String,
    );
  }

  final String city;
  final double latitude;
  final double longitude;
  final String timezone;

  Map<String, Object?> toJson() {
    return {
      'city': city,
      'latitude': latitude,
      'longitude': longitude,
      'timezone': timezone,
    };
  }
}

class WeatherContext {
  const WeatherContext({
    required this.temperature,
    required this.apparentTemperature,
    required this.minTemperature,
    required this.maxTemperature,
    required this.rainProbability,
    required this.windSpeed,
    required this.humidity,
  });

  factory WeatherContext.fromJson(Map<String, Object?> json) {
    return WeatherContext(
      temperature: (json['temperature']! as num).toDouble(),
      apparentTemperature: (json['apparentTemperature']! as num).toDouble(),
      minTemperature: (json['minTemperature']! as num).toDouble(),
      maxTemperature: (json['maxTemperature']! as num).toDouble(),
      rainProbability: (json['rainProbability']! as num).toDouble(),
      windSpeed: (json['windSpeed']! as num).toDouble(),
      humidity: (json['humidity']! as num).toDouble(),
    );
  }

  final double temperature;
  final double apparentTemperature;
  final double minTemperature;
  final double maxTemperature;
  final double rainProbability;
  final double windSpeed;
  final double humidity;
}
