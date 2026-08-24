import 'package:flutter/foundation.dart';

import '../data/wardrobe_repository.dart';
import '../domain/garment.dart';

class WardrobeController extends ChangeNotifier {
  WardrobeController(this._repository);

  final WardrobeRepository _repository;

  bool isLoading = false;
  String? errorMessage;
  List<Garment> garments = const [];

  Future<void> loadGarments(String userId) async {
    if (userId.trim().isEmpty) {
      errorMessage = 'Enter a user id.';
      notifyListeners();
      return;
    }

    await _run(() async {
      garments = await _repository.listGarments(userId.trim());
    });
  }

  Future<void> createGarment({
    required String userId,
    required String category,
    required String primaryColor,
    required String status,
    String? name,
  }) async {
    if (userId.trim().isEmpty) {
      errorMessage = 'Enter a user id.';
      notifyListeners();
      return;
    }

    await _run(() async {
      await _repository.createGarment(
        userId: userId.trim(),
        category: category,
        primaryColor: primaryColor.trim(),
        status: status,
        name: name,
      );
      garments = await _repository.listGarments(userId.trim());
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
