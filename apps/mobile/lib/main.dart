import 'package:flutter/material.dart';

void main() {
  runApp(const ClosetAiApp());
}

class ClosetAiApp extends StatelessWidget {
  const ClosetAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Closet AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF246A73),
          primary: const Color(0xFF246A73),
          secondary: const Color(0xFFC97C5D),
        ),
        scaffoldBackgroundColor: const Color(0xFFF7F7F2),
        useMaterial3: true,
      ),
      home: const WardrobeHomeScreen(),
    );
  }
}

class WardrobeHomeScreen extends StatelessWidget {
  const WardrobeHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Closet AI'), centerTitle: false),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Today',
              style: textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            const _StatusGrid(),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: null,
              icon: const Icon(Icons.checkroom),
              label: const Text('Generate basic outfit'),
            ),
            const SizedBox(height: 28),
            Text(
              'Available garments',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            const _GarmentTile(
              category: 'Top',
              color: 'Black',
              status: 'Clean',
            ),
            const _GarmentTile(
              category: 'Bottom',
              color: 'Indigo',
              status: 'Reusable',
            ),
            const _GarmentTile(
              category: 'Footwear',
              color: 'White',
              status: 'Clean',
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusGrid extends StatelessWidget {
  const _StatusGrid();

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      childAspectRatio: 2.4,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: const [
        _MetricTile(label: 'Available', value: '3'),
        _MetricTile(label: 'Outfits', value: '0'),
        _MetricTile(label: 'Selected', value: '0'),
        _MetricTile(label: 'Usage events', value: '0'),
      ],
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE0DED5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class _GarmentTile extends StatelessWidget {
  const _GarmentTile({
    required this.category,
    required this.color,
    required this.status,
  });

  final String category;
  final String color;
  final String status;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.checkroom_outlined),
      title: Text('$color $category'),
      subtitle: Text(status),
    );
  }
}
