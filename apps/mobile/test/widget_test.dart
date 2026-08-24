import 'package:closet_ai_mobile/data/wardrobe_repository.dart';
import 'package:closet_ai_mobile/domain/garment.dart';
import 'package:closet_ai_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('lists and registers garments through the injected repository', (
    tester,
  ) async {
    final repository = FakeWardrobeRepository();

    await tester.pumpWidget(ClosetAiApp(wardrobeRepository: repository));
    await tester.enterText(find.byType(TextField).first, 'user-1');
    await tester.tap(find.text('Load garments'));
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
    required String userId,
    required String category,
    required String primaryColor,
    required String status,
    String? name,
  }) async {
    createdGarments += 1;
    final garment = Garment(
      id: 'garment-${_garments.length + 1}',
      userId: userId,
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
  Future<List<Garment>> listGarments(String userId) async {
    return _garments
        .where((garment) => garment.userId == userId)
        .toList(growable: false);
  }
}
