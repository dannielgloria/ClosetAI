import '../domain/interpreted_context.dart';
import 'closet_api_client.dart';

abstract interface class ContextRepository {
  Future<InterpretedContext> interpret(String text);
}

class ApiContextRepository implements ContextRepository {
  const ApiContextRepository(this._apiClient);

  final ClosetApiClient _apiClient;

  @override
  Future<InterpretedContext> interpret(String text) async {
    final row = await _apiClient.postObject(
      '/context/interpret',
      body: {'text': text},
    );

    return InterpretedContext.fromJson(row);
  }
}
