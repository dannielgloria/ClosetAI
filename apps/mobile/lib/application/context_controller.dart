import 'package:flutter/foundation.dart';

import '../data/context_repository.dart';
import '../domain/interpreted_context.dart';

class ContextController extends ChangeNotifier {
  ContextController(this._repository);

  final ContextRepository _repository;

  bool isLoading = false;
  String? errorMessage;
  InterpretedContext? interpretedContext;

  Future<void> interpret(String text) async {
    isLoading = true;
    errorMessage = null;
    notifyListeners();

    try {
      interpretedContext = await _repository.interpret(text.trim());
    } catch (error) {
      errorMessage = error.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
