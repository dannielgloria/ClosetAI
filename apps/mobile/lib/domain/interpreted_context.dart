class ActivityContext {
  const ActivityContext({required this.type, required this.time});

  factory ActivityContext.fromJson(Map<String, Object?> json) {
    return ActivityContext(
      type: json['type'] as String,
      time: json['time'] as String?,
    );
  }

  final String type;
  final String? time;
}

class InterpretedContext {
  const InterpretedContext({required this.activities});

  factory InterpretedContext.fromJson(Map<String, Object?> json) {
    final activities = json['activities'];
    if (activities is! List) {
      throw const FormatException('Expected context activities.');
    }

    return InterpretedContext(
      activities: activities
          .cast<Map<String, Object?>>()
          .map(ActivityContext.fromJson)
          .toList(growable: false),
    );
  }

  final List<ActivityContext> activities;
}
