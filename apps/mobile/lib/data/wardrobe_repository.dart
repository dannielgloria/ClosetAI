import '../domain/garment.dart';
import '../domain/interpreted_context.dart';
import '../domain/outfit_recommendation.dart';
import '../domain/weather.dart';
import 'closet_api_client.dart';

abstract interface class WardrobeRepository {
  Future<List<Garment>> listGarments();

  Future<Garment> getGarment(String garmentId);

  Future<Garment> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
    List<String> secondaryColors = const [],
    String? subcategory,
    String? pattern,
    String? fit,
    String? estimatedMaterial,
    int? formality,
    String? imageId,
  });

  Future<GarmentImageUpload> uploadGarmentImage({
    required List<int> bytes,
    required String filename,
    required String mimeType,
  });

  Future<GarmentAnalysis> analyzeGarmentImage(String imageId);

  Future<List<int>> fetchGarmentImage(String imageId);

  Future<Garment> updateGarment({
    required String garmentId,
    String? category,
    String? primaryColor,
    List<String>? secondaryColors,
    String? subcategory,
    String? pattern,
    String? fit,
    String? estimatedMaterial,
    int? formality,
    String? name,
  });

  Future<Garment> transitionGarment({
    required String garmentId,
    required String transition,
  });

  Future<UserLocation> updateLocation(UserLocation location);

  Future<WeatherContext> fetchCurrentWeather();

  Future<OutfitRecommendationsResult> generateOutfitRecommendations({
    InterpretedContext? context,
  });

  Future<OutfitRecommendation> selectOutfit(String outfitId);

  Future<OutfitFeedback> submitOutfitFeedback({
    required String outfitId,
    required String decision,
    String? reason,
  });
}

class ApiWardrobeRepository implements WardrobeRepository {
  const ApiWardrobeRepository(this._apiClient);

  final ClosetApiClient _apiClient;

  @override
  Future<List<Garment>> listGarments() async {
    final rows = await _apiClient.getList('/garments');

    return rows.map(Garment.fromJson).toList(growable: false);
  }

  @override
  Future<Garment> getGarment(String garmentId) async {
    final row = await _apiClient.getObject('/garments/$garmentId');

    return Garment.fromJson(row);
  }

  @override
  Future<UserLocation> updateLocation(UserLocation location) async {
    final row = await _apiClient.patchObject(
      '/me/location',
      body: location.toJson(),
    );

    return UserLocation.fromJson(row);
  }

  @override
  Future<WeatherContext> fetchCurrentWeather() async {
    final row = await _apiClient.getObject('/weather/current');

    return WeatherContext.fromJson(row);
  }

  @override
  Future<Garment> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
    List<String> secondaryColors = const [],
    String? subcategory,
    String? pattern,
    String? fit,
    String? estimatedMaterial,
    int? formality,
    String? imageId,
  }) async {
    final body = <String, Object?>{
      'category': category,
      'primaryColor': primaryColor,
      'secondaryColors': secondaryColors,
      'status': status,
    };
    void addOptional(String key, Object? value) {
      if (value != null) {
        body[key] = value;
      }
    }

    addOptional('subcategory', subcategory);
    addOptional('pattern', pattern);
    addOptional('fit', fit);
    addOptional('estimatedMaterial', estimatedMaterial);
    addOptional('formality', formality);
    addOptional('imageId', imageId);
    if (name != null && name.trim().isNotEmpty) {
      body['name'] = name.trim();
    }

    final row = await _apiClient.postObject('/garments', body: body);

    return Garment.fromJson(row);
  }

  @override
  Future<GarmentImageUpload> uploadGarmentImage({
    required List<int> bytes,
    required String filename,
    required String mimeType,
  }) async {
    final row = await _apiClient.postMultipartObject(
      '/garment-images',
      fieldName: 'image',
      bytes: bytes,
      filename: filename,
      contentType: mimeType,
    );

    return GarmentImageUpload.fromJson(row);
  }

  @override
  Future<GarmentAnalysis> analyzeGarmentImage(String imageId) async {
    final row = await _apiClient.postObject('/garment-images/$imageId/analyze');

    return GarmentAnalysis.fromJson(row);
  }

  @override
  Future<List<int>> fetchGarmentImage(String imageId) {
    return _apiClient.getBytes('/garment-images/$imageId');
  }

  @override
  Future<Garment> updateGarment({
    required String garmentId,
    String? category,
    String? primaryColor,
    List<String>? secondaryColors,
    String? subcategory,
    String? pattern,
    String? fit,
    String? estimatedMaterial,
    int? formality,
    String? name,
  }) async {
    final body = <String, Object?>{};
    void addOptional(String key, Object? value) {
      if (value != null) {
        body[key] = value;
      }
    }

    addOptional('category', category);
    addOptional('primaryColor', primaryColor);
    addOptional('secondaryColors', secondaryColors);
    addOptional('subcategory', subcategory);
    addOptional('pattern', pattern);
    addOptional('fit', fit);
    addOptional('estimatedMaterial', estimatedMaterial);
    addOptional('formality', formality);
    addOptional('name', name);

    final row = await _apiClient.patchObject(
      '/garments/$garmentId',
      body: body,
    );

    return Garment.fromJson(row);
  }

  @override
  Future<Garment> transitionGarment({
    required String garmentId,
    required String transition,
  }) async {
    final row = await _apiClient.postObject(
      '/garments/$garmentId/transitions',
      body: {'transition': transition},
    );

    return Garment.fromJson(row);
  }

  @override
  Future<OutfitRecommendationsResult> generateOutfitRecommendations({
    InterpretedContext? context,
  }) async {
    final row = await _apiClient.postObject(
      '/outfit-recommendations',
      body: {if (context != null) 'context': context.toJson()},
    );

    return OutfitRecommendationsResult.fromJson(row);
  }

  @override
  Future<OutfitRecommendation> selectOutfit(String outfitId) async {
    final row = await _apiClient.postObject('/outfits/$outfitId/select');

    return OutfitRecommendation.fromJson(row);
  }

  @override
  Future<OutfitFeedback> submitOutfitFeedback({
    required String outfitId,
    required String decision,
    String? reason,
  }) async {
    final row = await _apiClient.postObject(
      '/outfits/$outfitId/feedback',
      body: {
        'decision': decision,
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );

    return OutfitFeedback.fromJson(row);
  }
}
