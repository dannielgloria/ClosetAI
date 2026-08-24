import 'package:flutter/foundation.dart';

import '../data/wardrobe_repository.dart';
import '../domain/garment.dart';
import '../domain/interpreted_context.dart';
import '../domain/outfit_recommendation.dart';

class WardrobeController extends ChangeNotifier {
  WardrobeController(this._repository);

  final WardrobeRepository _repository;

  bool isLoading = false;
  String? errorMessage;
  List<Garment> garments = const [];
  String? recommendationStrategy;
  List<OutfitRecommendation> recommendations = const [];
  Map<String, String> feedbackByOutfitId = const {};

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

  Future<void> generateOutfitRecommendations({
    InterpretedContext? context,
  }) async {
    await _run(() async {
      final result = await _repository.generateOutfitRecommendations(
        context: context,
      );
      recommendationStrategy = result.strategy;
      recommendations = result.recommendations;
    });
  }

  Future<void> selectOutfit(String outfitId) async {
    await _run(() async {
      final selected = await _repository.selectOutfit(outfitId);
      recommendations = recommendations
          .map(
            (recommendation) =>
                recommendation.id == selected.id ? selected : recommendation,
          )
          .toList(growable: false);
    });
  }

  Future<void> submitOutfitFeedback({
    required String outfitId,
    required String decision,
    String? reason,
  }) async {
    await _run(() async {
      final feedback = await _repository.submitOutfitFeedback(
        outfitId: outfitId,
        decision: decision,
        reason: reason,
      );
      feedbackByOutfitId = {
        ...feedbackByOutfitId,
        feedback.outfitId: feedback.decision,
      };
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
