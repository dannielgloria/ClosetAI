import '../domain/auth_user.dart';
import 'closet_api_client.dart';
import 'token_storage.dart';

abstract interface class AuthRepository {
  Future<AuthUser?> restoreSession();

  Future<AuthUser> login({required String email, required String password});

  Future<void> logout();
}

class ApiAuthRepository implements AuthRepository {
  const ApiAuthRepository(this._apiClient, this._tokenStorage);

  final ClosetApiClient _apiClient;
  final TokenStorage _tokenStorage;

  @override
  Future<AuthUser?> restoreSession() async {
    final accessToken = await _tokenStorage.readAccessToken();
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (accessToken == null && refreshToken == null) {
      return null;
    }

    try {
      final response = await _apiClient.getObject('/auth/me');
      return _userFromResponse(response);
    } catch (_) {
      await _tokenStorage.clear();
      return null;
    }
  }

  @override
  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.postObject(
      '/auth/login',
      authenticated: false,
      body: {
        'email': email.trim(),
        'password': password,
        'devicePlatform': 'flutter',
      },
    );

    final accessToken = response['accessToken'];
    final refreshToken = response['refreshToken'];
    if (accessToken is! String || refreshToken is! String) {
      throw const FormatException('Expected authentication tokens.');
    }

    await _tokenStorage.writeTokens(
      AuthTokens(accessToken: accessToken, refreshToken: refreshToken),
    );

    return _userFromResponse(response);
  }

  @override
  Future<void> logout() async {
    try {
      await _apiClient.postObject('/auth/logout', body: {});
    } finally {
      await _tokenStorage.clear();
    }
  }

  AuthUser _userFromResponse(Map<String, Object?> response) {
    final user = response['user'];
    if (user is! Map<String, Object?>) {
      throw const FormatException('Expected an authenticated user.');
    }
    return AuthUser.fromJson(user);
  }
}
