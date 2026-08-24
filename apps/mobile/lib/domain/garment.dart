class Garment {
  const Garment({
    required this.id,
    required this.userId,
    required this.category,
    required this.primaryColor,
    required this.status,
    required this.wearCount,
    required this.lastWornAt,
    this.name,
  });

  final String id;
  final String userId;
  final String category;
  final String primaryColor;
  final String status;
  final int wearCount;
  final DateTime? lastWornAt;
  final String? name;

  factory Garment.fromJson(Map<String, Object?> json) {
    final lastWornAt = json['lastWornAt'];

    return Garment(
      id: json['id']! as String,
      userId: json['userId']! as String,
      category: json['category']! as String,
      primaryColor: json['primaryColor']! as String,
      status: json['status']! as String,
      wearCount: json['wearCount']! as int,
      lastWornAt: lastWornAt is String ? DateTime.parse(lastWornAt) : null,
      name: json['name'] as String?,
    );
  }
}
