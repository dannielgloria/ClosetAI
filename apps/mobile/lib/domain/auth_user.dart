class AuthUser {
  const AuthUser({
    required this.id,
    required this.householdId,
    required this.displayName,
  });

  final String id;
  final String householdId;
  final String displayName;

  factory AuthUser.fromJson(Map<String, Object?> json) {
    return AuthUser(
      id: json['id']! as String,
      householdId: json['householdId']! as String,
      displayName: json['displayName']! as String,
    );
  }
}
