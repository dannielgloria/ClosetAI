import 'package:flutter_test/flutter_test.dart';

import 'package:closet_ai_mobile/main.dart';

void main() {
  testWidgets('shows the Closet AI wardrobe home screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ClosetAiApp());

    expect(find.text('Closet AI'), findsOneWidget);
    expect(find.text('Generate basic outfit'), findsOneWidget);
    expect(find.text('Available garments'), findsOneWidget);
    expect(find.text('Black Top'), findsOneWidget);
  });
}
