class Garment {
  const Garment({
    required this.id,
    required this.userId,
    required this.category,
    required this.primaryColor,
    required this.secondaryColors,
    required this.subcategory,
    required this.pattern,
    required this.fit,
    required this.estimatedMaterial,
    required this.formality,
    required this.status,
    required this.wearCount,
    required this.lastWornAt,
    this.name,
    this.imageId,
  });

  final String id;
  final String userId;
  final String category;
  final String primaryColor;
  final List<String> secondaryColors;
  final String? subcategory;
  final String? pattern;
  final String? fit;
  final String? estimatedMaterial;
  final int? formality;
  final String status;
  final int wearCount;
  final DateTime? lastWornAt;
  final String? name;
  final String? imageId;

  factory Garment.fromJson(Map<String, Object?> json) {
    final lastWornAt = json['lastWornAt'];

    return Garment(
      id: json['id']! as String,
      userId: json['userId']! as String,
      category: json['category']! as String,
      primaryColor: json['primaryColor']! as String,
      secondaryColors: ((json['secondaryColors'] as List?) ?? const [])
          .cast<String>()
          .toList(growable: false),
      subcategory: json['subcategory'] as String?,
      pattern: json['pattern'] as String?,
      fit: json['fit'] as String?,
      estimatedMaterial: json['estimatedMaterial'] as String?,
      formality: json['formality'] as int?,
      status: json['status']! as String,
      wearCount: json['wearCount']! as int,
      lastWornAt: lastWornAt is String ? DateTime.parse(lastWornAt) : null,
      name: json['name'] as String?,
      imageId: json['imageId'] as String?,
    );
  }
}

class GarmentImageUpload {
  const GarmentImageUpload({required this.id, required this.status});

  factory GarmentImageUpload.fromJson(Map<String, Object?> json) {
    return GarmentImageUpload(
      id: json['id']! as String,
      status: json['status']! as String,
    );
  }

  final String id;
  final String status;
}

class GarmentAnalysis {
  const GarmentAnalysis({
    required this.category,
    required this.primaryColor,
    required this.secondaryColors,
    required this.subcategory,
    required this.pattern,
    required this.fit,
    required this.estimatedMaterial,
    required this.formality,
  });

  factory GarmentAnalysis.fromJson(Map<String, Object?> json) {
    return GarmentAnalysis(
      category: json['category']! as String,
      primaryColor: json['primaryColor']! as String,
      secondaryColors: ((json['secondaryColors'] as List?) ?? const [])
          .cast<String>()
          .toList(growable: false),
      subcategory: json['subcategory'] as String?,
      pattern: json['pattern'] as String?,
      fit: json['fit'] as String?,
      estimatedMaterial: json['estimatedMaterial'] as String?,
      formality: json['formality'] as int?,
    );
  }

  final String category;
  final String primaryColor;
  final List<String> secondaryColors;
  final String? subcategory;
  final String? pattern;
  final String? fit;
  final String? estimatedMaterial;
  final int? formality;
}
