import '../domain/garment.dart';
import '../domain/interpreted_context.dart';
import '../domain/outfit_recommendation.dart';
import 'closet_api_client.dart';

abstract interface class WardrobeRepository {
  Future<List<Garment>> listGarments();

  Future<Garment> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
  });

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
  Future<Garment> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
  }) async {
    final row = await _apiClient.postObject(
      '/garments',
      body: {
        'category': category,
        'primaryColor': primaryColor,
        'status': status,
        if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
      },
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
