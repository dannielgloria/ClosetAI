import 'dart:convert';
import 'dart:io';

class ClosetApiClient {
  ClosetApiClient({required this.baseUrl, HttpClient? httpClient})
    : _httpClient = httpClient ?? HttpClient();

  final Uri baseUrl;
  final HttpClient _httpClient;

  Future<List<Map<String, Object?>>> getList(
    String path, {
    Map<String, String> query = const {},
  }) async {
    final response = await _send('GET', path, query: query);
    final decoded = jsonDecode(response);

    if (decoded is! List) {
      throw const FormatException('Expected a JSON array.');
    }

    return decoded.cast<Map<String, Object?>>();
  }

  Future<Map<String, Object?>> postObject(
    String path, {
    Map<String, Object?> body = const {},
  }) async {
    final response = await _send('POST', path, body: body);
    final decoded = jsonDecode(response);

    if (decoded is! Map<String, Object?>) {
      throw const FormatException('Expected a JSON object.');
    }

    return decoded;
  }

  Future<String> _send(
    String method,
    String path, {
    Map<String, String> query = const {},
    Map<String, Object?>? body,
  }) async {
    final uri = baseUrl.replace(
      path: '${baseUrl.path}$path',
      queryParameters: query.isEmpty ? null : query,
    );
    final request = await _httpClient.openUrl(method, uri);
    request.headers.contentType = ContentType.json;

    if (body != null) {
      request.write(jsonEncode(body));
    }

    final response = await request.close();
    final responseBody = await response.transform(utf8.decoder).join();

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException(
        'API request failed with ${response.statusCode}: $responseBody',
        uri: uri,
      );
    }

    return responseBody;
  }
}
