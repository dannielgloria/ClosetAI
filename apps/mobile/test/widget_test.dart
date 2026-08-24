import 'package:closet_ai_mobile/application/auth_controller.dart';
import 'package:closet_ai_mobile/data/auth_repository.dart';
import 'package:closet_ai_mobile/data/context_repository.dart';
import 'package:closet_ai_mobile/data/wardrobe_repository.dart';
import 'package:closet_ai_mobile/domain/auth_user.dart';
import 'package:closet_ai_mobile/domain/garment.dart';
import 'package:closet_ai_mobile/domain/interpreted_context.dart';
import 'package:closet_ai_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('lists and registers garments through the injected repository', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository();
    final repository = FakeWardrobeRepository();

    await tester.pumpWidget(
      ClosetAiApp(
        authController: AuthController(authRepository),
        wardrobeRepository: repository,
        contextRepository: FakeContextRepository(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Email'),
      'user@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Password'),
      'correct-password',
    );
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Digital Closet'), findsOneWidget);
    expect(find.text('Black tee'), findsOneWidget);

    await tester.tap(find.byTooltip('Register garment'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Name'),
      'White sneakers',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Primary color'),
      'white',
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    expect(repository.createdGarments, 1);
    expect(find.text('White sneakers'), findsOneWidget);

    await tester.tap(find.text('Interpretar'));
    await tester.pumpAndSettle();

    expect(find.text('GYM'), findsOneWidget);
    expect(find.text('17:00'), findsOneWidget);
  });
}

class FakeWardrobeRepository implements WardrobeRepository {
  int createdGarments = 0;
  final List<Garment> _garments = [
    const Garment(
      id: 'garment-1',
      userId: 'user-1',
      category: 'TOP',
      primaryColor: 'black',
      status: 'CLEAN_AVAILABLE',
      wearCount: 0,
      lastWornAt: null,
      name: 'Black tee',
    ),
  ];

  @override
  Future<Garment> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
  }) async {
    createdGarments += 1;
    final garment = Garment(
      id: 'garment-${_garments.length + 1}',
      userId: 'user-1',
      category: category,
      primaryColor: primaryColor,
      status: status,
      wearCount: 0,
      lastWornAt: null,
      name: name,
    );
    _garments.add(garment);
    return garment;
  }

  @override
  Future<List<Garment>> listGarments() async {
    return _garments.toList(growable: false);
  }
}

class FakeAuthRepository implements AuthRepository {
  bool loggedOut = false;

  @override
  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    return const AuthUser(
      id: 'user-1',
      householdId: 'household-1',
      displayName: 'Dann',
    );
  }

  @override
  Future<void> logout() async {
    loggedOut = true;
  }

  @override
  Future<AuthUser?> restoreSession() async {
    return null;
  }
}

class FakeContextRepository implements ContextRepository {
  @override
  Future<InterpretedContext> interpret(String text) async {
    return const InterpretedContext(
      activities: [ActivityContext(type: 'GYM', time: '17:00')],
    );
  }
}
