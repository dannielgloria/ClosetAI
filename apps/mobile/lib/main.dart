import 'package:flutter/material.dart';

import 'application/wardrobe_controller.dart';
import 'data/closet_api_client.dart';
import 'data/wardrobe_repository.dart';
import 'domain/garment.dart';

const defaultApiBaseUrl = String.fromEnvironment(
  'CLOSET_API_BASE_URL',
  defaultValue: 'http://localhost:3000/api/v1',
);

void main() {
  runApp(
    ClosetAiApp(
      wardrobeRepository: ApiWardrobeRepository(
        ClosetApiClient(baseUrl: Uri.parse(defaultApiBaseUrl)),
      ),
    ),
  );
}

class ClosetAiApp extends StatelessWidget {
  const ClosetAiApp({required this.wardrobeRepository, super.key});

  final WardrobeRepository wardrobeRepository;

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
      home: WardrobeHomeScreen(
        controller: WardrobeController(wardrobeRepository),
      ),
    );
  }
}

class WardrobeHomeScreen extends StatefulWidget {
  const WardrobeHomeScreen({required this.controller, super.key});

  final WardrobeController controller;

  @override
  State<WardrobeHomeScreen> createState() => _WardrobeHomeScreenState();
}

class _WardrobeHomeScreenState extends State<WardrobeHomeScreen> {
  final _userIdController = TextEditingController();

  WardrobeController get _controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleControllerChange);
  }

  @override
  void dispose() {
    _controller.removeListener(_handleControllerChange);
    _userIdController.dispose();
    super.dispose();
  }

  void _handleControllerChange() {
    if (mounted) {
      setState(() {});
    }
  }

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
              'Digital Closet',
              style: textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _userIdController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'User ID',
              ),
              onSubmitted: (_) => _loadGarments(),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _controller.isLoading ? null : _loadGarments,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Load garments'),
                  ),
                ),
                const SizedBox(width: 12),
                IconButton.filledTonal(
                  onPressed: _controller.isLoading
                      ? null
                      : _showCreateGarmentDialog,
                  icon: const Icon(Icons.add),
                  tooltip: 'Register garment',
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (_controller.isLoading) const LinearProgressIndicator(),
            if (_controller.errorMessage != null) ...[
              Text(
                _controller.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 12),
            ],
            Text(
              'Garments',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            if (!_controller.isLoading && _controller.garments.isEmpty)
              const Text('No garments loaded.')
            else
              for (final garment in _controller.garments)
                _GarmentTile(garment: garment),
          ],
        ),
      ),
    );
  }

  Future<void> _loadGarments() {
    return _controller.loadGarments(_userIdController.text);
  }

  Future<void> _showCreateGarmentDialog() async {
    final result = await showDialog<_CreateGarmentInput>(
      context: context,
      builder: (context) => const _CreateGarmentDialog(),
    );

    if (result == null) {
      return;
    }

    await _controller.createGarment(
      userId: _userIdController.text,
      category: result.category,
      primaryColor: result.primaryColor,
      status: result.status,
      name: result.name,
    );
  }
}

class _GarmentTile extends StatelessWidget {
  const _GarmentTile({required this.garment});

  final Garment garment;

  @override
  Widget build(BuildContext context) {
    final name = garment.name?.trim().isNotEmpty == true
        ? garment.name!
        : '${garment.primaryColor} ${garment.category.toLowerCase()}';

    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.checkroom_outlined),
      title: Text(name),
      subtitle: Text(
        '${garment.category} / ${garment.primaryColor} / ${garment.status}',
      ),
      trailing: Text('Worn ${garment.wearCount}'),
    );
  }
}

class _CreateGarmentInput {
  const _CreateGarmentInput({
    required this.category,
    required this.primaryColor,
    required this.status,
    this.name,
  });

  final String category;
  final String primaryColor;
  final String status;
  final String? name;
}

class _CreateGarmentDialog extends StatefulWidget {
  const _CreateGarmentDialog();

  @override
  State<_CreateGarmentDialog> createState() => _CreateGarmentDialogState();
}

class _CreateGarmentDialogState extends State<_CreateGarmentDialog> {
  final _nameController = TextEditingController();
  final _colorController = TextEditingController(text: 'black');
  String _category = 'TOP';
  String _status = 'CLEAN_AVAILABLE';

  @override
  void dispose() {
    _nameController.dispose();
    _colorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Register garment'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'Category'),
              items: const [
                DropdownMenuItem(value: 'TOP', child: Text('Top')),
                DropdownMenuItem(value: 'BOTTOM', child: Text('Bottom')),
                DropdownMenuItem(value: 'FOOTWEAR', child: Text('Footwear')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _category = value);
                }
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _colorController,
              decoration: const InputDecoration(labelText: 'Primary color'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Status'),
              items: const [
                DropdownMenuItem(
                  value: 'CLEAN_AVAILABLE',
                  child: Text('Clean available'),
                ),
                DropdownMenuItem(
                  value: 'WORN_REUSABLE',
                  child: Text('Worn reusable'),
                ),
                DropdownMenuItem(
                  value: 'LAUNDRY_BIN',
                  child: Text('Laundry bin'),
                ),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _status = value);
                }
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            Navigator.of(context).pop(
              _CreateGarmentInput(
                category: _category,
                primaryColor: _colorController.text.trim(),
                status: _status,
                name: _nameController.text,
              ),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
