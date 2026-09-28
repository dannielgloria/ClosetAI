class OutfitVisualization {
  const OutfitVisualization({
    required this.id,
    required this.outfitId,
    required this.status,
    required this.imageAvailable,
  });

  factory OutfitVisualization.fromJson(Map<String, Object?> json) =>
      OutfitVisualization(
        id: json['id'] as String,
        outfitId: json['outfitId'] as String,
        status: json['status'] as String,
        imageAvailable: json['imageAvailable'] as bool? ?? false,
      );

  final String id;
  final String outfitId;
  final String status;
  final bool imageAvailable;
}
