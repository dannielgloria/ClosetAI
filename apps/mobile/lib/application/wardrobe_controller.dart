import 'package:flutter/foundation.dart';

import '../data/wardrobe_repository.dart';
import '../domain/garment.dart';

class WardrobeController extends ChangeNotifier {
  WardrobeController(this._repository);

  final WardrobeRepository _repository;

  bool isLoading = false;
  String? errorMessage;
  List<Garment> garments = const [];

  Future<void> loadGarments() async {
    await _run(() async {
      garments = await _repository.listGarments();
    });
  }

  Future<void> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
  }) async {
    await _run(() async {
      await _repository.createGarment(
        category: category,
        primaryColor: primaryColor.trim(),
        status: status,
        name: name,
      );
      garments = await _repository.listGarments();
    });
  }

  Future<void> _run(Future<void> Function() work) async {
    isLoading = true;
    errorMessage = null;
    notifyListeners();

    try {
      await work();
    } catch (error) {
      errorMessage = error.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
