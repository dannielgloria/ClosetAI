import '../domain/garment.dart';
import 'closet_api_client.dart';

abstract interface class WardrobeRepository {
  Future<List<Garment>> listGarments();

  Future<Garment> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
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
}
