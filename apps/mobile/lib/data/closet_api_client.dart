import 'dart:convert';
import 'dart:io';

import 'token_storage.dart';

class ClosetApiClient {
  ClosetApiClient({
    required this.baseUrl,
    this._tokenStorage,
    this.onSessionExpired,
    HttpClient? httpClient,
  }) : _httpClient = httpClient ?? HttpClient();

  final Uri baseUrl;
  final TokenStorage? _tokenStorage;
  Future<void> Function()? onSessionExpired;
  final HttpClient _httpClient;

  Future<List<Map<String, Object?>>> getList(
    String path, {
    Map<String, String> query = const {},
    bool authenticated = true,
  }) async {
    final response = await _send(
      'GET',
      path,
      query: query,
      authenticated: authenticated,
    );
    final decoded = jsonDecode(response);

    if (decoded is! List) {
      throw const FormatException('Expected a JSON array.');
    }

    return decoded.cast<Map<String, Object?>>();
  }

  Future<Map<String, Object?>> getObject(
    String path, {
    Map<String, String> query = const {},
    bool authenticated = true,
  }) async {
    final response = await _send(
      'GET',
      path,
      query: query,
      authenticated: authenticated,
    );
    final decoded = jsonDecode(response);

    if (decoded is! Map<String, Object?>) {
      throw const FormatException('Expected a JSON object.');
    }

    return decoded;
  }

  Future<Map<String, Object?>> postObject(
    String path, {
    Map<String, Object?> body = const {},
    bool authenticated = true,
  }) async {
    final response = await _send(
      'POST',
      path,
      body: body,
      authenticated: authenticated,
    );
    final decoded = jsonDecode(response);

    if (decoded is! Map<String, Object?>) {
      throw const FormatException('Expected a JSON object.');
    }

    return decoded;
  }

  Future<Map<String, Object?>> patchObject(
    String path, {
    Map<String, Object?> body = const {},
    bool authenticated = true,
  }) async {
    final response = await _send(
      'PATCH',
      path,
      body: body,
      authenticated: authenticated,
    );
    final decoded = jsonDecode(response);

    if (decoded is! Map<String, Object?>) {
      throw const FormatException('Expected a JSON object.');
    }

    return decoded;
  }

  Future<Map<String, Object?>> postMultipartObject(
    String path, {
    required String fieldName,
    required List<int> bytes,
    required String filename,
    required String contentType,
    bool authenticated = true,
  }) async {
    final response = await _sendMultipart(
      path,
      fieldName: fieldName,
      bytes: bytes,
      filename: filename,
      contentType: contentType,
      authenticated: authenticated,
    );
    final decoded = jsonDecode(response);

    if (decoded is! Map<String, Object?>) {
      throw const FormatException('Expected a JSON object.');
    }

    return decoded;
  }

  Future<List<int>> getBytes(String path, {bool authenticated = true}) {
    return _sendBytes('GET', path, authenticated: authenticated);
  }

  Future<String> _send(
    String method,
    String path, {
    Map<String, String> query = const {},
    Map<String, Object?>? body,
    bool authenticated = true,
    bool retryOnUnauthorized = true,
  }) async {
    final uri = baseUrl.replace(
      path: '${baseUrl.path}$path',
      queryParameters: query.isEmpty ? null : query,
    );
    final request = await _httpClient.openUrl(method, uri);
    request.headers.contentType = ContentType.json;
    if (authenticated) {
      final accessToken = await _tokenStorage?.readAccessToken();
      if (accessToken != null) {
        request.headers.set(
          HttpHeaders.authorizationHeader,
          'Bearer $accessToken',
        );
      }
    }

    if (body != null) {
      request.write(jsonEncode(body));
    }

    final response = await request.close();
    final responseBody = await response.transform(utf8.decoder).join();

    if (response.statusCode == HttpStatus.unauthorized &&
        authenticated &&
        retryOnUnauthorized &&
        await _tryRefresh()) {
      return _send(
        method,
        path,
        query: query,
        body: body,
        authenticated: authenticated,
        retryOnUnauthorized: false,
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == HttpStatus.unauthorized && authenticated) {
        await _tokenStorage?.clear();
        await onSessionExpired?.call();
      }
      throw HttpException(
        'API request failed with ${response.statusCode}: $responseBody',
        uri: uri,
      );
    }

    return responseBody;
  }

  Future<bool> _tryRefresh() async {
    final refreshToken = await _tokenStorage?.readRefreshToken();
    if (refreshToken == null) {
      return false;
    }

    try {
      final response = await _send(
        'POST',
        '/auth/refresh',
        body: {'refreshToken': refreshToken},
        authenticated: false,
        retryOnUnauthorized: false,
      );
      final decoded = jsonDecode(response);
      if (decoded is! Map<String, Object?>) {
        return false;
      }

      final accessToken = decoded['accessToken'];
      final rotatedRefreshToken = decoded['refreshToken'];
      if (accessToken is! String || rotatedRefreshToken is! String) {
        return false;
      }

      await _tokenStorage?.writeTokens(
        AuthTokens(accessToken: accessToken, refreshToken: rotatedRefreshToken),
      );
      return true;
    } catch (_) {
      await _tokenStorage?.clear();
      await onSessionExpired?.call();
      return false;
    }
  }

  Future<String> _sendMultipart(
    String path, {
    required String fieldName,
    required List<int> bytes,
    required String filename,
    required String contentType,
    required bool authenticated,
    bool retryOnUnauthorized = true,
  }) async {
    final uri = baseUrl.replace(path: '${baseUrl.path}$path');
    final request = await _httpClient.postUrl(uri);
    final boundary = 'closet-ai-${DateTime.now().microsecondsSinceEpoch}';
    request.headers.set(
      HttpHeaders.contentTypeHeader,
      'multipart/form-data; boundary=$boundary',
    );
    await _authorize(request, authenticated);

    request.write('--$boundary\r\n');
    request.write(
      'Content-Disposition: form-data; name="$fieldName"; filename="$filename"\r\n',
    );
    request.write('Content-Type: $contentType\r\n\r\n');
    request.add(bytes);
    request.write('\r\n--$boundary--\r\n');

    final response = await request.close();
    final responseBody = await response.transform(utf8.decoder).join();

    if (response.statusCode == HttpStatus.unauthorized &&
        authenticated &&
        retryOnUnauthorized &&
        await _tryRefresh()) {
      return _sendMultipart(
        path,
        fieldName: fieldName,
        bytes: bytes,
        filename: filename,
        contentType: contentType,
        authenticated: authenticated,
        retryOnUnauthorized: false,
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException(
        'API request failed with ${response.statusCode}: $responseBody',
        uri: uri,
      );
    }

    return responseBody;
  }

  Future<List<int>> _sendBytes(
    String method,
    String path, {
    required bool authenticated,
    bool retryOnUnauthorized = true,
  }) async {
    final uri = baseUrl.replace(path: '${baseUrl.path}$path');
    final request = await _httpClient.openUrl(method, uri);
    await _authorize(request, authenticated);

    final response = await request.close();
    final chunks = <int>[];
    await for (final chunk in response) {
      chunks.addAll(chunk);
    }

    if (response.statusCode == HttpStatus.unauthorized &&
        authenticated &&
        retryOnUnauthorized &&
        await _tryRefresh()) {
      return _sendBytes(
        method,
        path,
        authenticated: authenticated,
        retryOnUnauthorized: false,
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException(
        'API request failed with ${response.statusCode}',
        uri: uri,
      );
    }

    return chunks;
  }

  Future<void> _authorize(HttpClientRequest request, bool authenticated) async {
    if (!authenticated) {
      return;
    }

    final accessToken = await _tokenStorage?.readAccessToken();
    if (accessToken != null) {
      request.headers.set(
        HttpHeaders.authorizationHeader,
        'Bearer $accessToken',
      );
    }
  }
}
