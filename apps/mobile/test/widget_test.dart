import 'package:closet_ai_mobile/application/auth_controller.dart';
import 'package:closet_ai_mobile/data/auth_repository.dart';
import 'package:closet_ai_mobile/data/context_repository.dart';
import 'package:closet_ai_mobile/data/wardrobe_repository.dart';
import 'package:closet_ai_mobile/domain/auth_user.dart';
import 'package:closet_ai_mobile/domain/garment.dart';
import 'package:closet_ai_mobile/domain/interpreted_context.dart';
import 'package:closet_ai_mobile/domain/outfit_recommendation.dart';
import 'package:closet_ai_mobile/domain/weather.dart';
import 'package:closet_ai_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

void main() {
  testWidgets('lists and registers garments through the injected repository', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final authRepository = FakeAuthRepository();
    final repository = FakeWardrobeRepository();

    await tester.pumpWidget(
      ClosetAiApp(
        authController: AuthController(authRepository),
        wardrobeRepository: repository,
        contextRepository: FakeContextRepository(),
        pickGarmentImage: (_) async => const PickedGarmentImage(
          bytes: [1, 2, 3],
          filename: 'garment.jpg',
          mimeType: 'image/jpeg',
        ),
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
    expect(repository.thumbnailImageFetches, greaterThan(0));
    expect(repository.originalImageFetches, 0);

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

    await tester.scrollUntilVisible(
      find.text('Interpretar'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Interpretar'));
    await tester.pumpAndSettle();

    expect(find.text('GYM'), findsOneWidget);
    expect(find.text('17:00'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Generar outfits'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Generar outfits'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('LOOK 91/100'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('LOOK 91/100'), findsOneWidget);
    expect(find.textContaining('Ready for dinner'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Usar este outfit'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Usar este outfit'));
    await tester.pumpAndSettle();

    expect(find.text('Selected'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Me gusta'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.ensureVisible(find.text('Me gusta'));
    await tester.tap(find.text('Me gusta'));
    await tester.pumpAndSettle();

    expect(repository.feedbackDecisions, ['ACCEPTED']);
    expect(find.text('Feedback: ACCEPTED'), findsOneWidget);

    await tester.tap(find.text('No me gusta'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Razón opcional'),
      'Too formal',
    );
    await tester.tap(find.text('Enviar'));
    await tester.pumpAndSettle();

    expect(repository.feedbackDecisions, ['ACCEPTED', 'REJECTED']);
    expect(repository.lastFeedbackReason, 'Too formal');
    expect(find.text('Feedback: REJECTED'), findsOneWidget);
  });

  testWidgets('shows a basic error when outfit feedback fails', (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = FakeWardrobeRepository(failFeedback: true);

    await tester.pumpWidget(
      ClosetAiApp(
        authController: AuthController(FakeAuthRepository()),
        wardrobeRepository: repository,
        contextRepository: FakeContextRepository(),
        pickGarmentImage: (_) async => const PickedGarmentImage(
          bytes: [1, 2, 3],
          filename: 'garment.jpg',
          mimeType: 'image/jpeg',
        ),
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
    await tester.scrollUntilVisible(
      find.text('Interpretar'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Interpretar'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Generar outfits'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Generar outfits'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Me gusta'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.ensureVisible(find.text('Me gusta'));
    await tester.tap(find.text('Me gusta'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Feedback unavailable'), findsOneWidget);
  });

  testWidgets(
    'analyzes a selected garment image and confirms edited metadata',
    (tester) async {
      tester.view.physicalSize = const Size(800, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repository = FakeWardrobeRepository();

      await tester.pumpWidget(
        ClosetAiApp(
          authController: AuthController(FakeAuthRepository()),
          wardrobeRepository: repository,
          contextRepository: FakeContextRepository(),
          pickGarmentImage: (source) async {
            expect(source, ImageSource.gallery);
            return const PickedGarmentImage(
              bytes: [1, 2, 3],
              filename: 'cream-tee.jpg',
              mimeType: 'image/jpeg',
            );
          },
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
      await tester.tap(find.byTooltip('Choose garment photo'));
      await tester.pumpAndSettle();

      expect(repository.uploadedImages, 1);
      expect(repository.analyzedImages, 1);
      expect(find.text('Review garment'), findsOneWidget);
      expect(find.text('T_SHIRT'), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextField, 'Primary color'),
        'ivory',
      );
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();

      expect(repository.createdGarments, 1);
      expect(repository.lastCreatedImageId, 'image-1');
      expect(repository.lastCreatedPrimaryColor, 'ivory');
      expect(find.text('ivory top'), findsOneWidget);
    },
  );

  testWidgets('configures weather location and displays current weather', (
    tester,
  ) async {
    final repository = FakeWardrobeRepository();

    await tester.pumpWidget(
      ClosetAiApp(
        authController: AuthController(FakeAuthRepository()),
        wardrobeRepository: repository,
        contextRepository: FakeContextRepository(),
        pickGarmentImage: (_) async => null,
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

    await tester.tap(find.text('Location'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'City'),
      'Ciudad de Mexico',
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    expect(repository.lastLocation?.city, 'Ciudad de Mexico');
    expect(find.text('18°C, rain 45%'), findsOneWidget);
  });

  testWidgets(
    'opens garment detail, edits metadata, and transitions lifecycle',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repository = FakeWardrobeRepository();

      await tester.pumpWidget(
        ClosetAiApp(
          authController: AuthController(FakeAuthRepository()),
          wardrobeRepository: repository,
          contextRepository: FakeContextRepository(),
          pickGarmentImage: (_) async => null,
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

      await tester.tap(find.text('Black tee'));
      await tester.pumpAndSettle();
      expect(find.text('Status: CLEAN_AVAILABLE'), findsOneWidget);
      expect(find.text('Iniciar lavado'), findsNothing);
      expect(repository.thumbnailImageFetches, greaterThan(0));
      expect(repository.originalImageFetches, greaterThan(0));

      await tester.tap(find.text('Editar'));
      await tester.pumpAndSettle();
      expect(find.text('Edit garment'), findsOneWidget);
      await tester.enterText(
        find.widgetWithText(TextField, 'Name'),
        'Black tee edited',
      );
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();
      expect(find.text('Black tee edited'), findsOneWidget);

      await tester.tap(find.text('Black tee edited'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Enviar a ropa sucia'));
      await tester.pumpAndSettle();
      expect(repository.transitions, ['SEND_TO_LAUNDRY']);
      expect(find.text('TOP / black / LAUNDRY_BIN'), findsOneWidget);
    },
  );

  testWidgets('asks confirmation before irreversible garment action', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = FakeWardrobeRepository();

    await tester.pumpWidget(
      ClosetAiApp(
        authController: AuthController(FakeAuthRepository()),
        wardrobeRepository: repository,
        contextRepository: FakeContextRepository(),
        pickGarmentImage: (_) async => null,
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

    await tester.tap(find.text('Black tee'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Donar'));
    await tester.pumpAndSettle();
    expect(find.text('Confirm action'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(repository.transitions, isEmpty);

    await tester.tap(find.text('Donar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();
    expect(repository.transitions, ['DONATE']);
    await tester.tap(find.text('Black tee'));
    await tester.pumpAndSettle();
    expect(find.text('Restaurar'), findsNothing);
  });

  testWidgets('shows transition error state', (tester) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = FakeWardrobeRepository(failTransition: true);

    await tester.pumpWidget(
      ClosetAiApp(
        authController: AuthController(FakeAuthRepository()),
        wardrobeRepository: repository,
        contextRepository: FakeContextRepository(),
        pickGarmentImage: (_) async => null,
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

    await tester.tap(find.text('Black tee'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Enviar a ropa sucia'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Transition unavailable'), findsOneWidget);
  });
}

class FakeWardrobeRepository implements WardrobeRepository {
  FakeWardrobeRepository({
    this.failFeedback = false,
    this.failTransition = false,
  });

  int createdGarments = 0;
  final bool failFeedback;
  final bool failTransition;
  final List<String> feedbackDecisions = [];
  final List<String> transitions = [];
  String? lastFeedbackReason;
  final List<Garment> _garments = [
    const Garment(
      id: 'garment-1',
      userId: 'user-1',
      category: 'TOP',
      primaryColor: 'black',
      secondaryColors: [],
      subcategory: null,
      pattern: null,
      fit: null,
      estimatedMaterial: null,
      formality: null,
      status: 'CLEAN_AVAILABLE',
      wearCount: 0,
      lastWornAt: null,
      name: 'Black tee',
      imageId: 'image-1',
    ),
  ];

  @override
  Future<Garment> createGarment({
    required String category,
    required String primaryColor,
    required String status,
    String? name,
    List<String> secondaryColors = const [],
    String? subcategory,
    String? pattern,
    String? fit,
    String? estimatedMaterial,
    int? formality,
    String? imageId,
  }) async {
    createdGarments += 1;
    lastCreatedImageId = imageId;
    lastCreatedPrimaryColor = primaryColor;
    final garment = Garment(
      id: 'garment-${_garments.length + 1}',
      userId: 'user-1',
      category: category,
      primaryColor: primaryColor,
      secondaryColors: secondaryColors,
      subcategory: subcategory,
      pattern: pattern,
      fit: fit,
      estimatedMaterial: estimatedMaterial,
      formality: formality,
      status: status,
      wearCount: 0,
      lastWornAt: null,
      name: name,
      imageId: imageId,
    );
    _garments.add(garment);
    return garment;
  }

  @override
  Future<List<Garment>> listGarments() async {
    return _garments.toList(growable: false);
  }

  @override
  Future<Garment> getGarment(String garmentId) async {
    return _garments.firstWhere((garment) => garment.id == garmentId);
  }

  @override
  Future<Garment> updateGarment({
    required String garmentId,
    String? category,
    String? primaryColor,
    List<String>? secondaryColors,
    String? subcategory,
    String? pattern,
    String? fit,
    String? estimatedMaterial,
    int? formality,
    String? name,
  }) async {
    final index = _garments.indexWhere((garment) => garment.id == garmentId);
    final current = _garments[index];
    final updated = Garment(
      id: current.id,
      userId: current.userId,
      category: category ?? current.category,
      primaryColor: primaryColor ?? current.primaryColor,
      secondaryColors: secondaryColors ?? current.secondaryColors,
      subcategory: subcategory ?? current.subcategory,
      pattern: pattern ?? current.pattern,
      fit: fit ?? current.fit,
      estimatedMaterial: estimatedMaterial ?? current.estimatedMaterial,
      formality: formality ?? current.formality,
      status: current.status,
      wearCount: current.wearCount,
      lastWornAt: current.lastWornAt,
      name: name ?? current.name,
      imageId: current.imageId,
    );
    _garments[index] = updated;
    return updated;
  }

  @override
  Future<Garment> transitionGarment({
    required String garmentId,
    required String transition,
  }) async {
    if (failTransition) {
      throw Exception('Transition unavailable');
    }
    transitions.add(transition);
    final index = _garments.indexWhere((garment) => garment.id == garmentId);
    final current = _garments[index];
    final status = switch (transition) {
      'SEND_TO_LAUNDRY' => 'LAUNDRY_BIN',
      'MARK_CLEAN_AVAILABLE' => 'CLEAN_AVAILABLE',
      'RETIRE' => 'RETIRED',
      'DONATE' => 'DONATED',
      'DISCARD' => 'DISCARDED',
      _ => current.status,
    };
    final updated = Garment(
      id: current.id,
      userId: current.userId,
      category: current.category,
      primaryColor: current.primaryColor,
      secondaryColors: current.secondaryColors,
      subcategory: current.subcategory,
      pattern: current.pattern,
      fit: current.fit,
      estimatedMaterial: current.estimatedMaterial,
      formality: current.formality,
      status: status,
      wearCount: current.wearCount,
      lastWornAt: current.lastWornAt,
      name: current.name,
      imageId: current.imageId,
    );
    _garments[index] = updated;
    return updated;
  }

  @override
  Future<OutfitRecommendationsResult> generateOutfitRecommendations({
    InterpretedContext? context,
  }) async {
    return const OutfitRecommendationsResult(
      strategy: 'AI',
      weatherStatus: 'AVAILABLE',
      weather: WeatherContext(
        temperature: 18,
        apparentTemperature: 17,
        minTemperature: 14,
        maxTemperature: 22,
        rainProbability: 45,
        windSpeed: 12,
        humidity: 68,
      ),
      recommendations: [
        OutfitRecommendation(
          id: 'outfit-1',
          userId: 'user-1',
          status: 'PRESENTED',
          items: [
            OutfitItem(garmentId: 'garment-1', position: 0),
            OutfitItem(garmentId: 'garment-2', position: 1),
          ],
          explanation: 'Ready for dinner.',
          score: 91,
        ),
      ],
    );
  }

  @override
  Future<OutfitRecommendation> selectOutfit(String outfitId) async {
    return const OutfitRecommendation(
      id: 'outfit-1',
      userId: 'user-1',
      status: 'SELECTED',
      items: [
        OutfitItem(garmentId: 'garment-1', position: 0),
        OutfitItem(garmentId: 'garment-2', position: 1),
      ],
      explanation: 'Ready for dinner.',
      score: 91,
    );
  }

  @override
  Future<OutfitFeedback> submitOutfitFeedback({
    required String outfitId,
    required String decision,
    String? reason,
  }) async {
    if (failFeedback) {
      throw Exception('Feedback unavailable');
    }
    feedbackDecisions.add(decision);
    lastFeedbackReason = reason;
    return OutfitFeedback(
      id: 'feedback-${feedbackDecisions.length}',
      outfitId: outfitId,
      decision: decision,
      reason: reason,
    );
  }

  int uploadedImages = 0;
  int analyzedImages = 0;
  int originalImageFetches = 0;
  int thumbnailImageFetches = 0;
  String? lastCreatedImageId;
  String? lastCreatedPrimaryColor;

  @override
  Future<GarmentImageUpload> uploadGarmentImage({
    required List<int> bytes,
    required String filename,
    required String mimeType,
  }) async {
    uploadedImages += 1;
    return const GarmentImageUpload(id: 'image-1', status: 'UPLOADED');
  }

  @override
  Future<GarmentAnalysis> analyzeGarmentImage(String imageId) async {
    analyzedImages += 1;
    return const GarmentAnalysis(
      category: 'TOP',
      primaryColor: 'CREAM',
      secondaryColors: ['BLACK'],
      subcategory: 'T_SHIRT',
      pattern: 'SOLID',
      fit: 'REGULAR',
      estimatedMaterial: 'COTTON',
      formality: 2,
    );
  }

  @override
  Future<List<int>> fetchGarmentImage(String imageId) async {
    originalImageFetches += 1;
    return _onePixelPng;
  }

  @override
  Future<List<int>> fetchGarmentThumbnail(String imageId) async {
    thumbnailImageFetches += 1;
    return _onePixelPng;
  }

  static const _onePixelPng = [
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    8,
    6,
    0,
    0,
    0,
    31,
    21,
    196,
    137,
    0,
    0,
    0,
    10,
    73,
    68,
    65,
    84,
    120,
    156,
    99,
    0,
    1,
    0,
    0,
    5,
    0,
    1,
    13,
    10,
    45,
    180,
    0,
    0,
    0,
    0,
    73,
    69,
    78,
    68,
    174,
    66,
    96,
    130,
  ];

  @override
  Future<UserLocation> updateLocation(UserLocation location) async {
    lastLocation = location;
    return location;
  }

  @override
  Future<WeatherContext> fetchCurrentWeather() async {
    return const WeatherContext(
      temperature: 18,
      apparentTemperature: 17,
      minTemperature: 14,
      maxTemperature: 22,
      rainProbability: 45,
      windSpeed: 12,
      humidity: 68,
    );
  }

  UserLocation? lastLocation;
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
