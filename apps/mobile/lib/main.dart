import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'application/auth_controller.dart';
import 'application/context_controller.dart';
import 'application/wardrobe_controller.dart';
import 'data/auth_repository.dart';
import 'data/closet_api_client.dart';
import 'data/context_repository.dart';
import 'data/token_storage.dart';
import 'data/wardrobe_repository.dart';
import 'domain/garment.dart';
import 'domain/weather.dart';

const defaultApiBaseUrl = String.fromEnvironment(
  'CLOSET_API_BASE_URL',
  defaultValue: 'http://localhost:3000/api/v1',
);

void main() {
  final tokenStorage = SecureTokenStorage();
  final apiClient = ClosetApiClient(
    baseUrl: Uri.parse(defaultApiBaseUrl),
    tokenStorage: tokenStorage,
  );
  final authRepository = ApiAuthRepository(apiClient, tokenStorage);
  final authController = AuthController(authRepository);
  apiClient.onSessionExpired = () async => authController.markSignedOut();
  runApp(
    ClosetAiApp(
      authController: authController,
      wardrobeRepository: ApiWardrobeRepository(apiClient),
      contextRepository: ApiContextRepository(apiClient),
      pickGarmentImage: pickGarmentImageWithImagePicker,
    ),
  );
}

class PickedGarmentImage {
  const PickedGarmentImage({
    required this.bytes,
    required this.filename,
    required this.mimeType,
  });

  final List<int> bytes;
  final String filename;
  final String mimeType;
}

typedef PickGarmentImage = Future<PickedGarmentImage?> Function(
  ImageSource source,
);

Future<PickedGarmentImage?> pickGarmentImageWithImagePicker(
  ImageSource source,
) async {
  final file = await ImagePicker().pickImage(source: source, imageQuality: 85);
  if (file == null) {
    return null;
  }

  return PickedGarmentImage(
    bytes: await file.readAsBytes(),
    filename: file.name,
    mimeType: file.mimeType ?? _mimeTypeFromFilename(file.name),
  );
}

String _mimeTypeFromFilename(String filename) {
  final lower = filename.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

class ClosetAiApp extends StatelessWidget {
  const ClosetAiApp({
    required this.authController,
    required this.wardrobeRepository,
    required this.contextRepository,
    this.pickGarmentImage,
    super.key,
  });

  final AuthController authController;
  final WardrobeRepository wardrobeRepository;
  final ContextRepository contextRepository;
  final PickGarmentImage? pickGarmentImage;

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
      home: AuthenticatedAppShell(
        authController: authController,
        wardrobeRepository: wardrobeRepository,
        contextRepository: contextRepository,
        pickGarmentImage: pickGarmentImage ?? pickGarmentImageWithImagePicker,
      ),
    );
  }
}

class AuthenticatedAppShell extends StatefulWidget {
  const AuthenticatedAppShell({
    required this.authController,
    required this.wardrobeRepository,
    required this.contextRepository,
    required this.pickGarmentImage,
    super.key,
  });

  final AuthController authController;
  final WardrobeRepository wardrobeRepository;
  final ContextRepository contextRepository;
  final PickGarmentImage pickGarmentImage;

  @override
  State<AuthenticatedAppShell> createState() => _AuthenticatedAppShellState();
}

class _AuthenticatedAppShellState extends State<AuthenticatedAppShell> {
  WardrobeController? _wardrobeController;
  ContextController? _contextController;

  AuthController get _authController => widget.authController;

  @override
  void initState() {
    super.initState();
    _authController.addListener(_handleControllerChange);
    _authController.initialize();
  }

  @override
  void dispose() {
    _authController.removeListener(_handleControllerChange);
    _wardrobeController?.dispose();
    _contextController?.dispose();
    super.dispose();
  }

  void _handleControllerChange() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_authController.status) {
      case AuthStatus.checking:
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      case AuthStatus.signedOut:
        _wardrobeController?.dispose();
        _wardrobeController = null;
        _contextController?.dispose();
        _contextController = null;
        return LoginScreen(controller: _authController);
      case AuthStatus.signedIn:
        _wardrobeController ??= WardrobeController(widget.wardrobeRepository)
          ..loadGarments();
        _contextController ??= ContextController(widget.contextRepository);
        return WardrobeHomeScreen(
          authController: _authController,
          controller: _wardrobeController!,
          contextController: _contextController!,
          pickGarmentImage: widget.pickGarmentImage,
        );
    }
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({required this.controller, super.key});

  final AuthController controller;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 48),
            Text(
              'CLOSET AI',
              style: textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 28),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Email',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Password',
              ),
              onSubmitted: (_) => _login(),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: widget.controller.status == AuthStatus.checking
                  ? null
                  : _login,
              icon: const Icon(Icons.login),
              label: const Text('Sign in'),
            ),
            if (widget.controller.errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(
                widget.controller.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _login() {
    return widget.controller.login(
      email: _emailController.text,
      password: _passwordController.text,
    );
  }
}

class WardrobeHomeScreen extends StatefulWidget {
  const WardrobeHomeScreen({
    required this.authController,
    required this.controller,
    required this.contextController,
    required this.pickGarmentImage,
    super.key,
  });

  final AuthController authController;
  final WardrobeController controller;
  final ContextController contextController;
  final PickGarmentImage pickGarmentImage;

  @override
  State<WardrobeHomeScreen> createState() => _WardrobeHomeScreenState();
}

class _WardrobeHomeScreenState extends State<WardrobeHomeScreen> {
  final _contextTextController = TextEditingController(
    text: 'Hoy voy al gimnasio a las cinco y despues a cenar.',
  );

  WardrobeController get _controller => widget.controller;
  ContextController get _contextController => widget.contextController;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleControllerChange);
    _contextController.addListener(_handleControllerChange);
  }

  @override
  void dispose() {
    _controller.removeListener(_handleControllerChange);
    _contextController.removeListener(_handleControllerChange);
    _contextTextController.dispose();
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
      appBar: AppBar(
        title: const Text('Closet AI'),
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: widget.authController.logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
          ),
        ],
      ),
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
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  onPressed: _controller.isLoading
                      ? null
                      : () => _pickAnalyzeAndReview(ImageSource.camera),
                  icon: const Icon(Icons.photo_camera_outlined),
                  tooltip: 'Take garment photo',
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  onPressed: _controller.isLoading
                      ? null
                      : () => _pickAnalyzeAndReview(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined),
                  tooltip: 'Choose garment photo',
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
            Row(
              children: [
                Expanded(
                  child: Text(
                    _controller.weather == null
                        ? 'Weather not configured'
                        : '${_controller.weather!.temperature.round()}°C, rain ${_controller.weather!.rainProbability.round()}%',
                  ),
                ),
                TextButton.icon(
                  onPressed: _controller.isLoading ? null : _showLocationDialog,
                  icon: const Icon(Icons.location_city_outlined),
                  label: const Text('Location'),
                ),
                IconButton(
                  onPressed: _controller.isLoading
                      ? null
                      : _controller.loadWeather,
                  icon: const Icon(Icons.wb_cloudy_outlined),
                  tooltip: 'Load weather',
                ),
              ],
            ),
            const SizedBox(height: 20),
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
                _GarmentTile(
                  garment: garment,
                  fetchImage: _controller.fetchGarmentImage,
                ),
            const SizedBox(height: 28),
            Text(
              'Context',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _contextTextController,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: '¿Qué vas a hacer hoy?',
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _contextController.isLoading
                  ? null
                  : _interpretContext,
              icon: const Icon(Icons.auto_awesome),
              label: const Text('Interpretar'),
            ),
            if (_contextController.isLoading) ...[
              const SizedBox(height: 12),
              const LinearProgressIndicator(),
            ],
            if (_contextController.errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                _contextController.errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            if (_contextController.interpretedContext != null) ...[
              const SizedBox(height: 12),
              for (final activity
                  in _contextController.interpretedContext!.activities)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.event_available_outlined),
                  title: Text(activity.type),
                  subtitle: Text(activity.time ?? 'Sin hora'),
                ),
              FilledButton.icon(
                onPressed: _controller.isLoading
                    ? null
                    : _generateOutfitRecommendations,
                icon: const Icon(Icons.checkroom),
                label: const Text('Generar outfits'),
              ),
            ],
            if (_controller.recommendations.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'Outfits',
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text('Strategy: ${_controller.recommendationStrategy}'),
              Text('Weather: ${_controller.weatherStatus ?? 'NOT_CONFIGURED'}'),
              const SizedBox(height: 8),
              for (final recommendation in _controller.recommendations)
                Padding(
                  padding: const EdgeInsets.only(bottom: 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.style_outlined),
                        title: Text('LOOK ${recommendation.score}/100'),
                        subtitle: Text(
                          '${recommendation.items.map((item) => _garmentLabel(item.garmentId)).join('\n')}\n\n${recommendation.explanation}',
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          TextButton.icon(
                            onPressed: recommendation.status == 'SELECTED'
                                ? null
                                : () => _controller.selectOutfit(
                                    recommendation.id,
                                  ),
                            icon: const Icon(Icons.checkroom),
                            label: Text(
                              recommendation.status == 'SELECTED'
                                  ? 'Selected'
                                  : 'Usar este outfit',
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _controller.isLoading
                                ? null
                                : () => _submitAcceptedFeedback(
                                    recommendation.id,
                                  ),
                            icon: const Icon(Icons.thumb_up_outlined),
                            label: const Text('Me gusta'),
                          ),
                          TextButton.icon(
                            onPressed: _controller.isLoading
                                ? null
                                : () => _showRejectedFeedbackDialog(
                                    recommendation.id,
                                  ),
                            icon: const Icon(Icons.thumb_down_outlined),
                            label: const Text('No me gusta'),
                          ),
                        ],
                      ),
                      if (_controller.feedbackByOutfitId[recommendation.id] !=
                          null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Feedback: ${_controller.feedbackByOutfitId[recommendation.id]}',
                            style: textTheme.bodySmall,
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _loadGarments() {
    return _controller.loadGarments();
  }

  Future<void> _interpretContext() {
    return _contextController.interpret(_contextTextController.text);
  }

  Future<void> _generateOutfitRecommendations() {
    return _controller.generateOutfitRecommendations(
      context: _contextController.interpretedContext,
    );
  }

  Future<void> _showLocationDialog() async {
    final result = await showDialog<UserLocation>(
      context: context,
      builder: (context) => const _LocationDialog(),
    );

    if (result == null) {
      return;
    }

    await _controller.updateLocation(result);
  }

  Future<void> _pickAnalyzeAndReview(ImageSource source) async {
    final image = await widget.pickGarmentImage(source);
    if (image == null) {
      return;
    }

    await _controller.uploadAndAnalyzeGarmentImage(
      bytes: image.bytes,
      filename: image.filename,
      mimeType: image.mimeType,
    );

    if (!mounted || _controller.proposedGarment == null) {
      return;
    }

    await _showReviewGarmentDialog(_controller.proposedGarment!);
  }

  Future<void> _showReviewGarmentDialog(GarmentAnalysis analysis) async {
    final result = await showDialog<_CreateGarmentInput>(
      context: context,
      builder: (context) => _CreateGarmentDialog(initialAnalysis: analysis),
    );

    if (result == null) {
      return;
    }

    await _controller.createGarment(
      category: result.category,
      primaryColor: result.primaryColor,
      status: result.status,
      name: result.name,
      secondaryColors: result.secondaryColors,
      subcategory: result.subcategory,
      pattern: result.pattern,
      fit: result.fit,
      estimatedMaterial: result.estimatedMaterial,
      formality: result.formality,
      imageId: _controller.pendingImageId,
    );
  }

  Future<void> _submitAcceptedFeedback(String outfitId) {
    return _controller.submitOutfitFeedback(
      outfitId: outfitId,
      decision: 'ACCEPTED',
    );
  }

  Future<void> _showRejectedFeedbackDialog(String outfitId) async {
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => const _RejectedFeedbackDialog(),
    );

    if (reason == null) {
      return;
    }

    await _controller.submitOutfitFeedback(
      outfitId: outfitId,
      decision: 'REJECTED',
      reason: reason,
    );
  }

  String _garmentLabel(String garmentId) {
    Garment? garment;
    for (final candidate in _controller.garments) {
      if (candidate.id == garmentId) {
        garment = candidate;
        break;
      }
    }

    if (garment == null) {
      return garmentId;
    }

    return garment.name?.trim().isNotEmpty == true
        ? garment.name!
        : '${garment.primaryColor} ${garment.category.toLowerCase()}';
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
      category: result.category,
      primaryColor: result.primaryColor,
      status: result.status,
      name: result.name,
      secondaryColors: result.secondaryColors,
      subcategory: result.subcategory,
      pattern: result.pattern,
      fit: result.fit,
      estimatedMaterial: result.estimatedMaterial,
      formality: result.formality,
    );
  }
}

class _LocationDialog extends StatefulWidget {
  const _LocationDialog();

  @override
  State<_LocationDialog> createState() => _LocationDialogState();
}

class _LocationDialogState extends State<_LocationDialog> {
  final _cityController = TextEditingController(text: 'Ciudad de Mexico');
  final _latitudeController = TextEditingController(text: '19.4326');
  final _longitudeController = TextEditingController(text: '-99.1332');
  final _timezoneController = TextEditingController(
    text: 'America/Mexico_City',
  );

  @override
  void dispose() {
    _cityController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    _timezoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Weather location'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _cityController,
              decoration: const InputDecoration(labelText: 'City'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _latitudeController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              decoration: const InputDecoration(labelText: 'Latitude'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _longitudeController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              decoration: const InputDecoration(labelText: 'Longitude'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _timezoneController,
              decoration: const InputDecoration(labelText: 'Timezone'),
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
            final latitude = double.tryParse(_latitudeController.text.trim());
            final longitude = double.tryParse(_longitudeController.text.trim());
            if (latitude == null || longitude == null) {
              return;
            }

            Navigator.of(context).pop(
              UserLocation(
                city: _cityController.text.trim(),
                latitude: latitude,
                longitude: longitude,
                timezone: _timezoneController.text.trim(),
              ),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}

class _RejectedFeedbackDialog extends StatefulWidget {
  const _RejectedFeedbackDialog();

  @override
  State<_RejectedFeedbackDialog> createState() =>
      _RejectedFeedbackDialogState();
}

class _RejectedFeedbackDialogState extends State<_RejectedFeedbackDialog> {
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('¿Por qué?'),
      content: TextField(
        controller: _reasonController,
        maxLength: 500,
        decoration: const InputDecoration(labelText: 'Razón opcional'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_reasonController.text),
          child: const Text('Enviar'),
        ),
      ],
    );
  }
}

class _GarmentTile extends StatelessWidget {
  const _GarmentTile({required this.garment, required this.fetchImage});

  final Garment garment;
  final Future<List<int>> Function(String imageId) fetchImage;

  @override
  Widget build(BuildContext context) {
    final name = garment.name?.trim().isNotEmpty == true
        ? garment.name!
        : '${garment.primaryColor} ${garment.category.toLowerCase()}';

    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: garment.imageId == null
          ? const Icon(Icons.checkroom_outlined)
          : FutureBuilder<List<int>>(
              future: fetchImage(garment.imageId!),
              builder: (context, snapshot) {
                if (snapshot.hasData) {
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Image.memory(
                      Uint8List.fromList(snapshot.data!),
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                    ),
                  );
                }

                return const SizedBox(
                  width: 48,
                  height: 48,
                  child: Icon(Icons.image_outlined),
                );
              },
            ),
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
    this.secondaryColors = const [],
    this.subcategory,
    this.pattern,
    this.fit,
    this.estimatedMaterial,
    this.formality,
    this.name,
  });

  final String category;
  final String primaryColor;
  final String status;
  final List<String> secondaryColors;
  final String? subcategory;
  final String? pattern;
  final String? fit;
  final String? estimatedMaterial;
  final int? formality;
  final String? name;
}

class _CreateGarmentDialog extends StatefulWidget {
  const _CreateGarmentDialog({this.initialAnalysis});

  final GarmentAnalysis? initialAnalysis;

  @override
  State<_CreateGarmentDialog> createState() => _CreateGarmentDialogState();
}

class _CreateGarmentDialogState extends State<_CreateGarmentDialog> {
  final _nameController = TextEditingController();
  late final TextEditingController _colorController;
  late final TextEditingController _secondaryColorsController;
  late final TextEditingController _formalityController;
  String _category = 'TOP';
  String _status = 'CLEAN_AVAILABLE';
  String? _subcategory;
  String? _pattern;
  String? _fit;
  String? _estimatedMaterial;

  @override
  void initState() {
    super.initState();
    final analysis = widget.initialAnalysis;
    _category = analysis?.category ?? 'TOP';
    _subcategory = analysis?.subcategory;
    _pattern = analysis?.pattern;
    _fit = analysis?.fit;
    _estimatedMaterial = analysis?.estimatedMaterial;
    _colorController = TextEditingController(
      text: analysis?.primaryColor ?? 'black',
    );
    _secondaryColorsController = TextEditingController(
      text: analysis?.secondaryColors.join(', ') ?? '',
    );
    _formalityController = TextEditingController(
      text: analysis?.formality?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _colorController.dispose();
    _secondaryColorsController.dispose();
    _formalityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.initialAnalysis == null ? 'Register garment' : 'Review garment',
      ),
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
            TextField(
              controller: _secondaryColorsController,
              decoration: const InputDecoration(labelText: 'Secondary colors'),
            ),
            const SizedBox(height: 12),
            _optionalDropdown(
              label: 'Subcategory',
              value: _subcategory,
              values: const [
                'T_SHIRT',
                'SHIRT',
                'SWEATER',
                'HOODIE',
                'JACKET',
                'JEANS',
                'TROUSERS',
                'SHORTS',
                'DRESS',
                'SNEAKERS',
                'BOOTS',
                'DRESS_SHOES',
                'UNKNOWN',
              ],
              onChanged: (value) => setState(() => _subcategory = value),
            ),
            const SizedBox(height: 12),
            _optionalDropdown(
              label: 'Pattern',
              value: _pattern,
              values: const [
                'SOLID',
                'STRIPED',
                'CHECKED',
                'PRINTED',
                'TEXTURED',
                'UNKNOWN',
              ],
              onChanged: (value) => setState(() => _pattern = value),
            ),
            const SizedBox(height: 12),
            _optionalDropdown(
              label: 'Fit',
              value: _fit,
              values: const [
                'SLIM',
                'REGULAR',
                'RELAXED',
                'OVERSIZED',
                'UNKNOWN',
              ],
              onChanged: (value) => setState(() => _fit = value),
            ),
            const SizedBox(height: 12),
            _optionalDropdown(
              label: 'Material',
              value: _estimatedMaterial,
              values: const [
                'COTTON',
                'DENIM',
                'WOOL',
                'LINEN',
                'LEATHER',
                'SYNTHETIC',
                'KNIT',
                'UNKNOWN',
              ],
              onChanged: (value) => setState(() => _estimatedMaterial = value),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _formalityController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Formalidad'),
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
                secondaryColors: _secondaryColorsController.text
                    .split(',')
                    .map((color) => color.trim())
                    .where((color) => color.isNotEmpty)
                    .toList(growable: false),
                subcategory: _subcategory,
                pattern: _pattern,
                fit: _fit,
                estimatedMaterial: _estimatedMaterial,
                formality: int.tryParse(_formalityController.text.trim()),
                name: _nameController.text,
              ),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }

  Widget _optionalDropdown({
    required String label,
    required String? value,
    required List<String> values,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: InputDecoration(labelText: label),
      items: [
        const DropdownMenuItem(value: null, child: Text('Unknown')),
        for (final item in values)
          DropdownMenuItem(value: item, child: Text(item)),
      ],
      onChanged: onChanged,
    );
  }
}
