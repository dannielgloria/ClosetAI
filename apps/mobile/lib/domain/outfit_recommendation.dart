class OutfitItem {
  const OutfitItem({required this.garmentId, required this.position});

  factory OutfitItem.fromJson(Map<String, Object?> json) {
    return OutfitItem(
      garmentId: json['garmentId']! as String,
      position: json['position']! as int,
    );
  }

  final String garmentId;
  final int position;
}

class OutfitRecommendation {
  const OutfitRecommendation({
    required this.id,
    required this.userId,
    required this.status,
    required this.items,
    required this.explanation,
    required this.score,
  });

  factory OutfitRecommendation.fromJson(Map<String, Object?> json) {
    final items = json['items'];
    if (items is! List) {
      throw const FormatException('Expected outfit items.');
    }

    return OutfitRecommendation(
      id: json['id']! as String,
      userId: json['userId']! as String,
      status: json['status']! as String,
      items: items
          .cast<Map<String, Object?>>()
          .map(OutfitItem.fromJson)
          .toList(growable: false),
      explanation: json['explanation']! as String,
      score: json['score']! as int,
    );
  }

  final String id;
  final String userId;
  final String status;
  final List<OutfitItem> items;
  final String explanation;
  final int score;
}

class OutfitRecommendationsResult {
  const OutfitRecommendationsResult({
    required this.strategy,
    required this.recommendations,
  });

  factory OutfitRecommendationsResult.fromJson(Map<String, Object?> json) {
    final recommendations = json['recommendations'];
    if (recommendations is! List) {
      throw const FormatException('Expected outfit recommendations.');
    }

    return OutfitRecommendationsResult(
      strategy: json['strategy']! as String,
      recommendations: recommendations
          .cast<Map<String, Object?>>()
          .map(OutfitRecommendation.fromJson)
          .toList(growable: false),
    );
  }

  final String strategy;
  final List<OutfitRecommendation> recommendations;
}

class OutfitFeedback {
  const OutfitFeedback({
    required this.id,
    required this.outfitId,
    required this.decision,
    required this.reason,
  });

  factory OutfitFeedback.fromJson(Map<String, Object?> json) {
    return OutfitFeedback(
      id: json['id']! as String,
      outfitId: json['outfitId']! as String,
      decision: json['decision']! as String,
      reason: json['reason'] as String?,
    );
  }

  final String id;
  final String outfitId;
  final String decision;
  final String? reason;
}
