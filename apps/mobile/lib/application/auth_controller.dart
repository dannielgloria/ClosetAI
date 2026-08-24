import 'package:flutter/foundation.dart';

import '../data/auth_repository.dart';
import '../domain/auth_user.dart';

enum AuthStatus { checking, signedOut, signedIn }

class AuthController extends ChangeNotifier {
  AuthController(this._repository);

  final AuthRepository _repository;

  AuthStatus status = AuthStatus.checking;
  AuthUser? user;
  String? errorMessage;

  Future<void> initialize() async {
    try {
      user = await _repository.restoreSession();
      status = user == null ? AuthStatus.signedOut : AuthStatus.signedIn;
    } catch (error) {
      user = null;
      errorMessage = error.toString();
      status = AuthStatus.signedOut;
    } finally {
      notifyListeners();
    }
  }

  Future<void> login({required String email, required String password}) async {
    if (email.trim().isEmpty || password.isEmpty) {
      errorMessage = 'Enter email and password.';
      notifyListeners();
      return;
    }

    status = AuthStatus.checking;
    errorMessage = null;
    notifyListeners();

    try {
      user = await _repository.login(email: email, password: password);
      status = AuthStatus.signedIn;
    } catch (error) {
      user = null;
      errorMessage = error.toString();
      status = AuthStatus.signedOut;
    } finally {
      notifyListeners();
    }
  }

  Future<void> logout() async {
    status = AuthStatus.checking;
    notifyListeners();
    try {
      await _repository.logout();
    } finally {
      user = null;
      status = AuthStatus.signedOut;
      notifyListeners();
    }
  }

  void markSignedOut() {
    user = null;
    status = AuthStatus.signedOut;
    notifyListeners();
  }
}
