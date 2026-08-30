<?php

namespace App\Filament\Pages;

use App\Services\SettingsService;
use App\Services\AppearanceThemeService;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Tabs;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Fieldset;
use Filament\Forms\Components\Actions\Action;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Form;
use Filament\Pages\Page;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Livewire\WithFileUploads;

class Settings extends Page implements \Filament\Forms\Contracts\HasForms
{
    use \Filament\Forms\Concerns\InteractsWithForms;
    use WithFileUploads;

    protected static ?string $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static string $view = 'filament.pages.settings';

    protected static ?string $navigationLabel = 'Pengaturan';

    protected static ?int $navigationSort = 8;

    protected static ?string $navigationGroup = 'Operasional Sistem';

    protected static ?string $title = 'Pengaturan Nexapa';

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill();
    }

    public static function canAccess(): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public function form(Form $form): Form
    {
        $settingsService = app(SettingsService::class);
        $tiktokSettings = $settingsService->getTikTokSettings();
        $facebookSettings = $settingsService->getFacebookSettings();

        return $form
            ->schema([
                Tabs::make('Pengaturan')
                    ->tabs([
                        Tabs\Tab::make('Umum')
                            ->icon('heroicon-o-globe-alt')
                            ->schema([
                                Section::make('Informasi Aplikasi')
                                    ->schema([
                                        TextInput::make('app_name')
                                            ->label('Application Name')
                                            ->default(config('app.name'))
                                            ->disabled()
                                            ->helperText('APP_NAME from .env - cannot be changed from panel'),
                                        TextInput::make('app_env')
                                            ->label('Environment')
                                            ->default(config('app.env'))
                                            ->disabled()
                                            ->helperText('APP_ENV from .env'),
                                        TextInput::make('app_timezone')
                                            ->label('Default Timezone')
                                            ->default(config('app.timezone'))
                                            ->disabled()
                                            ->helperText('APP_TIMEZONE from .env'),
                                        Toggle::make('app_debug')
                                            ->label('Debug Mode')
                                            ->default(config('app.debug'))
                                            ->disabled()
                                            ->helperText('APP_DEBUG from .env - cannot be changed from panel'),
                                    ])->columns(2),
                                Section::make('Support')
                                    ->schema([
                                        TextInput::make('configured_support_email')
                                            ->label('Support Email')
                                            ->email()
                                            ->default(config('mail.from.address'))
                                            ->disabled()
                                            ->helperText('MAIL_FROM_ADDRESS from .env'),
                                    ]),
                            ]),

                        Tabs\Tab::make('Batas Publisher')
                            ->icon('heroicon-o-clock')
                            ->schema([
                                Section::make('Upload Limits')
                                    ->schema([
                                        TextInput::make('max_upload_size_mb')
                                            ->label('Maximum Upload Size (MB)')
                                            ->default((int) (ini_get('upload_max_filesize') ?: 50))
                                            ->numeric()
                                            ->disabled()
                                            ->helperText('Limited by PHP upload_max_filesize: ' . ini_get('upload_max_filesize')),
                                        TextInput::make('max_files_per_bulk')
                                            ->label('Maximum Files Per Bulk Upload')
                                            ->default(config('nexapa.max_profile_result_selection', 500))
                                            ->numeric()
                                            ->disabled()
                                            ->helperText('From config/nexapa.php'),
                                        TextInput::make('max_auto_bulk_items')
                                            ->label('Maximum Items Per Auto Bulk Batch')
                                            ->default(50)
                                            ->numeric()
                                            ->disabled()
                                            ->helperText('Default limit - not configurable yet'),
                                    ])->columns(2),
                                Section::make('Schedule Limits')
                                    ->schema([
                                        TextInput::make('max_active_schedules_per_user')
                                            ->label('Maximum Active Schedules Per User')
                                            ->default(100)
                                            ->numeric()
                                            ->disabled()
                                            ->helperText('Default limit - not configurable yet'),
                                        TextInput::make('schedule_max_days_ahead')
                                            ->label('Schedule Maximum Days Ahead')
                                            ->default(30)
                                            ->numeric()
                                            ->disabled()
                                            ->helperText('Default limit - not configurable yet'),
                                        TextInput::make('default_publishing_timezone')
                                            ->label('Default Publishing Timezone')
                                            ->default(config('app.timezone', 'UTC'))
                                            ->disabled()
                                            ->helperText('From app.timezone config'),
                                    ])->columns(2),
                                Section::make('Note')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('limits_note')
                                            ->label('')
                                            ->content('Nilai aplikasi tidak dapat melampaui batas PHP dan Nginx server. Untuk mengubah limit upload, edit php.ini dan nginx.conf secara manual.'),
                                    ]),
                            ]),

                        Tabs\Tab::make('Facebook')
                            ->icon('heroicon-o-share')
                            ->schema([
                                Section::make('Facebook OAuth Configuration')
                                    ->schema([
                                        TextInput::make('facebook_app_id')
                                            ->label('App ID')
                                            ->default($facebookSettings['facebook_app_id'])
                                            ->maxLength(255),
                                        TextInput::make('facebook_app_secret')
                                            ->label('App Secret')
                                            ->password()
                                            ->revealable()
                                            ->maxLength(255)
                                            ->helperText('Leave empty to keep current secret'),
                                        TextInput::make('facebook_graph_api_version')
                                            ->label('Graph API Version')
                                            ->default($facebookSettings['facebook_graph_api_version'])
                                            ->maxLength(50),
                                        TextInput::make('facebook_configuration_id')
                                            ->label('Configuration ID')
                                            ->default($facebookSettings['facebook_configuration_id'] ?? '')
                                            ->nullable()
                                            ->maxLength(255),
                                        Select::make('facebook_environment')
                                            ->label('Environment')
                                            ->options([
                                                'sandbox' => 'Sandbox',
                                                'production' => 'Production',
                                            ])
                                            ->default('sandbox')
                                            ->disabled()
                                            ->helperText('Not configurable yet - uses sandbox by default'),
                                    ])->columns(2),
                                Section::make('Redirect URI')
                                    ->schema([
                                        TextInput::make('facebook_redirect_uri')
                                            ->label('Redirect URI')
                                            ->default('https://api.nexapa.me/api/v1/oauth/facebook/callback')
                                            ->disabled()
                                            ->helperText('Fixed callback URL - must match Facebook App settings'),
                                    ]),
                            ]),

                        Tabs\Tab::make('TikTok')
                            ->icon('heroicon-o-video-camera')
                            ->schema([
                                Section::make('TikTok OAuth Configuration')
                                    ->schema([
                                        TextInput::make('tiktok_client_key')
                                            ->label('Client Key')
                                            ->default($tiktokSettings['tiktok_client_key'])
                                            ->maxLength(255),
                                        TextInput::make('tiktok_client_secret')
                                            ->label('Client Secret')
                                            ->password()
                                            ->revealable()
                                            ->maxLength(255)
                                            ->helperText('Leave empty to keep current secret'),
                                        Select::make('tiktok_environment')
                                            ->label('Environment')
                                            ->options([
                                                'sandbox' => 'Sandbox',
                                                'production' => 'Production',
                                            ])
                                            ->default($tiktokSettings['tiktok_environment']),
                                        TextInput::make('tiktok_scopes')
                                            ->label('Scopes')
                                            ->default('user.info.basic,video.upload,video.publish')
                                            ->disabled()
                                            ->helperText('Fixed scopes - not configurable yet'),
                                    ])->columns(2),
                                Section::make('Redirect URI')
                                    ->schema([
                                        TextInput::make('tiktok_redirect_uri')
                                            ->label('Redirect URI')
                                            ->default('https://api.nexapa.me/api/v1/oauth/tiktok/callback')
                                            ->disabled()
                                            ->helperText('Fixed callback URL - must match TikTok App settings'),
                                    ]),
                            ]),

                        Tabs\Tab::make('Platform Lain')
                            ->icon('heroicon-o-globe-alt')
                            ->schema([
                                Section::make('YouTube')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('youtube_status')
                                            ->label('Status')
                                            ->content('Not configured - Coming Soon'),
                                    ]),
                                Section::make('Shopee')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('shopee_status')
                                            ->label('Status')
                                            ->content('Not configured - Coming Soon'),
                                    ]),
                            ]),

                        Tabs\Tab::make('Penyimpanan & Media')
                            ->icon('heroicon-o-photo')
                            ->schema([
                                Section::make('Storage Configuration')
                                    ->schema([
                                        TextInput::make('filesystem_disk')
                                            ->label('Filesystem Disk')
                                            ->default(config('filesystems.default'))
                                            ->disabled()
                                            ->helperText('From config/filesystems.php'),
                                        TextInput::make('allowed_storage_disks')
                                            ->label('Allowed Storage Disks')
                                            ->default(implode(', ', \Illuminate\Support\Arr::wrap(config('nexapa.allowed_storage_disks'))))
                                            ->disabled()
                                            ->helperText('From config/nexapa.php'),
                                        TextInput::make('php_upload_max_filesize')
                                            ->label('PHP Upload Max Filesize')
                                            ->default(ini_get('upload_max_filesize'))
                                            ->disabled(),
                                        TextInput::make('php_post_max_size')
                                            ->label('PHP Post Max Size')
                                            ->default(ini_get('post_max_size'))
                                            ->disabled(),
                                    ])->columns(2),
                                Section::make('Media Statistics (Read-only)')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('total_media_count')
                                            ->label('Total Media Assets')
                                            ->content(\App\Models\MediaAsset::count()),
                                        \Filament\Forms\Components\Placeholder::make('total_media_storage')
                                            ->label('Total Media Storage')
                                            ->content($this->formatFileSize(\App\Models\MediaAsset::sum('file_size'))),
                                    ])->columns(2),
                            ]),

                        Tabs\Tab::make('Worker & Jadwal')
                            ->icon('heroicon-o-queue-list')
                            ->schema([
                                Section::make('Queue Configuration (Read-only)')
                                    ->schema([
                                        TextInput::make('queue_connection')
                                            ->label('QUEUE_CONNECTION')
                                            ->default(config('queue.default'))
                                            ->disabled(),
                                        TextInput::make('queue_table')
                                            ->label('Queue Table')
                                            ->default(config('queue.connections.database.table', 'jobs'))
                                            ->disabled(),
                                        TextInput::make('queue_retry_after')
                                            ->label('Retry After (seconds)')
                                            ->default(config('queue.connections.database.retry_after', 90))
                                            ->disabled(),
                                    ])->columns(2),
                                Section::make('Heartbeat Status')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('worker_heartbeat')
                                            ->label('Worker Last Seen')
                                            ->content(function (): string {
                                                $lastSeen = Cache::get('system_health.queue_worker_last_seen');
                                                return $lastSeen ? \Carbon\Carbon::parse($lastSeen)->format('d M Y H:i:s') . ' (' . \Carbon\Carbon::parse($lastSeen)->diffForHumans() . ')' : 'No heartbeat recorded';
                                            }),
                                        \Filament\Forms\Components\Placeholder::make('scheduler_heartbeat')
                                            ->label('Scheduler Last Run')
                                            ->content(function (): string {
                                                $lastRun = Cache::get('publisher_scheduler_last_run_at');
                                                return $lastRun ? \Carbon\Carbon::parse($lastRun)->format('d M Y H:i:s') . ' (' . \Carbon\Carbon::parse($lastRun)->diffForHumans() . ')' : 'No heartbeat recorded';
                                            }),
                                    ]),
                                Section::make('Worker Command')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('worker_command')
                                            ->label('Worker Command')
                                            ->content('php artisan queue:work database'),
                                        \Filament\Forms\Components\Placeholder::make('scheduler_command')
                                            ->label('Scheduler Command')
                                            ->content('* * * * * php artisan schedule:run'),
                                    ]),
                            ]),

                        Tabs\Tab::make('Keamanan')
                            ->icon('heroicon-o-shield-check')
                            ->schema([
                                Section::make('Application Security')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('app_debug_status')
                                            ->label('APP_DEBUG')
                                            ->content(config('app.debug') ? 'On (Warning in production!)' : 'Off'),
                                        \Filament\Forms\Components\Placeholder::make('app_env_status')
                                            ->label('APP_ENV')
                                            ->content(ucfirst(config('app.env'))),
                                        \Filament\Forms\Components\Placeholder::make('session_driver')
                                            ->label('Session Driver')
                                            ->content(config('session.driver')),
                                        \Filament\Forms\Components\Placeholder::make('secure_cookies')
                                            ->label('Secure Cookies')
                                            ->content(config('session.secure') ? 'Enabled' : 'Disabled'),
                                    ])->columns(2),
                                Section::make('Note')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('security_note')
                                            ->label('')
                                            ->content('Security settings are managed via .env file. Contact system administrator to change these values.'),
                                    ]),
                            ]),

                        Tabs\Tab::make('Website')
                            ->icon('heroicon-o-globe-alt')
                            ->schema([
                                Section::make('Branding')
                                    ->schema([
                                        TextInput::make('brand_name')
                                            ->label('Brand Name')
                                            ->default('Nexapa')
                                            ->maxLength(255),
                                        TextInput::make('legal_company_name')
                                            ->label('Legal Company Name')
                                            ->default('CV. ESA AJI RAHAYU')
                                            ->maxLength(255),
                                        FileUpload::make('main_logo')
                                            ->label('Main Logo')
                                            ->image()
                                            ->acceptedFileTypes(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
                                            ->disk('public')
                                            ->directory('company/branding')
                                            ->visibility('public')
                                            ->maxSize(2048),
                                        FileUpload::make('white_logo')
                                            ->label('White Logo')
                                            ->image()
                                            ->acceptedFileTypes(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
                                            ->disk('public')
                                            ->directory('company/branding')
                                            ->visibility('public')
                                            ->maxSize(2048),
                                        FileUpload::make('favicon')
                                            ->label('Favicon')
                                            ->image()
                                            ->acceptedFileTypes(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
                                            ->disk('public')
                                            ->directory('company/branding')
                                            ->visibility('public')
                                            ->maxSize(512),
                                    ])->columns(2),

                                Section::make('Website Appearance')
                                    ->schema([
                                        \Filament\Forms\Components\Placeholder::make('current_wallpaper')
                                            ->label('Current Wallpaper')
                                            ->content(function () {
                                                $service = app(AppearanceThemeService::class);
                                                $theme = $service->getActiveCompanyTheme();
                                                if (!$theme || $theme->background_type !== 'static_image' || !$theme->background_path) {
                                                    return 'Using builtin wallpaper';
                                                }
                                                return 'Uploaded wallpaper active';
                                            }),
                                        FileUpload::make('new_wallpaper')
                                            ->label('Upload New Wallpaper')
                                            ->image()
                                            ->acceptedFileTypes(['image/png', 'image/jpeg', 'image/webp'])
                                            ->storeFiles(false)
                                            ->maxSize(10240)
                                            ->helperText('PNG, JPG, WEBP up to 10MB'),
                                        Select::make('background_position')
                                            ->label('Background Position')
                                            ->options(['center' => 'Center', 'top' => 'Top', 'bottom' => 'Bottom'])
                                            ->default('center'),
                                        Select::make('background_size')
                                            ->label('Background Size')
                                            ->options(['cover' => 'Cover', 'contain' => 'Contain'])
                                            ->default('cover'),
                                        TextInput::make('overlay_opacity')
                                            ->label('Overlay Opacity')
                                            ->numeric()->default(2)->minValue(0)->maxValue(100),
                                        TextInput::make('card_opacity')
                                            ->label('Card Opacity')
                                            ->numeric()->default(98)->minValue(0)->maxValue(100),
                                        TextInput::make('card_blur')
                                            ->label('Card Blur')
                                            ->numeric()->default(80)->minValue(0)->maxValue(100),
                                        TextInput::make('navbar_opacity')
                                            ->label('Navbar Opacity')
                                            ->numeric()->default(95)->minValue(0)->maxValue(100),
                                        TextInput::make('animation_speed')
                                            ->label('Animation Speed')
                                            ->numeric()->step(0.1)->default(1)->minValue(0.1)->maxValue(5),
                                        TextInput::make('motion_intensity')
                                            ->label('Motion Intensity')
                                            ->numeric()->default(20)->minValue(0)->maxValue(100),
                                    ])->columns(2),

                                Section::make('Company & Contact')
                                    ->schema([
                                        TextInput::make('support_email')
                                            ->label('Support Email')
                                            ->email()
                                            ->default('support@nexapa.me')
                                            ->maxLength(255),
                                        TextInput::make('business_email')
                                            ->label('Business Email')
                                            ->email()
                                            ->maxLength(255),
                                        TextInput::make('whatsapp_number')
                                            ->label('WhatsApp Number')
                                            ->tel()
                                            ->maxLength(32),
                                        TextInput::make('phone_number')
                                            ->label('Phone Number')
                                            ->tel()
                                            ->maxLength(32),
                                        TextInput::make('country')
                                            ->label('Country')
                                            ->maxLength(64),
                                        TextInput::make('company_description')
                                            ->label('Company Description')
                                            ->maxLength(500),
                                    ])->columns(2),
                            ]),
                    ])
                    ->columnSpanFull(),
            ])
            ->statePath('data')
            ->columns(1);
    }

    public function save(): void
    {
        $settingsService = app(SettingsService::class);

        $rawWallpaperState = $this->data['new_wallpaper'] ?? null;

        \Illuminate\Support\Facades\Log::info(
            'website.wallpaper.before_get_state',
            [
                'has_key' => array_key_exists(
                    'new_wallpaper',
                    $this->data ?? []
                ),
                'raw_type' => get_debug_type($rawWallpaperState),
                'array_value_types' => is_array($rawWallpaperState)
                    ? array_map(
                        static fn ($value) => get_debug_type($value),
                        $rawWallpaperState
                    )
                    : [],
            ]
        );

        $data = $this->form->getState();

        \Illuminate\Support\Facades\Log::info(
            'website.wallpaper.after_get_state',
            [
                'has_key' => array_key_exists('new_wallpaper', $data),
                'raw_type' => get_debug_type(
                    $data['new_wallpaper'] ?? null
                ),
            ]
        );

        $logger = app(\App\Services\AdminActivityLogger::class);

        try {
            DB::transaction(function () use ($settingsService, $data, $logger) {
                $changedKeys = [];
                $secretKeysUpdated = [];
                
                // Save Facebook settings
                $facebookData = [
                    'app_id' => $data['facebook_app_id'] ?? '',
                    'app_secret' => $data['facebook_app_secret'] ?? '',
                    'graph_api_version' => $data['facebook_graph_api_version'] ?? 'v21.0',
                    'configuration_id' => $data['facebook_configuration_id'] ?? null,
                ];
                $settingsService->updateFacebookSettings($facebookData);
                
                if (!empty($data['facebook_app_id'])) $changedKeys[] = 'facebook.app_id';
                if (!empty($data['facebook_app_secret'])) {
                    $changedKeys[] = 'facebook.app_secret';
                    $secretKeysUpdated[] = 'facebook.app_secret';
                }
                if (!empty($data['facebook_graph_api_version'])) $changedKeys[] = 'facebook.graph_api_version';

                // Save TikTok settings
                $tiktokData = [
                    'client_key' => $data['tiktok_client_key'] ?? '',
                    'client_secret' => $data['tiktok_client_secret'] ?? '',
                    'environment' => $data['tiktok_environment'] ?? 'sandbox',
                ];
                $settingsService->updateTikTokSettings($tiktokData);
                
                if (!empty($data['tiktok_client_key'])) $changedKeys[] = 'tiktok.client_key';
                if (!empty($data['tiktok_client_secret'])) {
                    $changedKeys[] = 'tiktok.client_secret';
                    $secretKeysUpdated[] = 'tiktok.client_secret';
                }
                if (!empty($data['tiktok_environment'])) $changedKeys[] = 'tiktok.environment';

                // Save Website Appearance (Company wallpaper)
                $themeService = app(AppearanceThemeService::class);
                $admin = auth()->user();
                $appearanceUpdated = false;

                $wallpaperUpload = $data['new_wallpaper'] ?? null;

                // WALLPAPER RUNTIME DIAGNOSTIC
                \Illuminate\Support\Facades\Log::info(
                    'website.wallpaper.save_state',
                    [
                        'raw_type' => get_debug_type($wallpaperUpload),
                        'is_array' => is_array($wallpaperUpload),
                        'array_value_types' => is_array($wallpaperUpload)
                            ? array_map(
                                static fn ($value) => get_debug_type($value),
                                $wallpaperUpload
                            )
                            : [],
                    ]
                );

                // Filament FileUpload may return a single UploadedFile or
                // an array keyed by the temporary upload UUID.
                if (is_array($wallpaperUpload)) {
                    foreach ($wallpaperUpload as $candidate) {
                        if ($candidate instanceof \Illuminate\Http\UploadedFile) {
                            $wallpaperUpload = $candidate;
                            break;
                        }
                    }
                }

                \Illuminate\Support\Facades\Log::info(
                    'website.wallpaper.normalized_state',
                    [
                        'normalized_type' => get_debug_type($wallpaperUpload),
                        'is_uploaded_file' => $wallpaperUpload instanceof \Illuminate\Http\UploadedFile,
                    ]
                );

                if ($wallpaperUpload instanceof \Illuminate\Http\UploadedFile) {
                    $theme = $themeService->storeCompanyWallpaperUpload(
                        $admin,
                        $wallpaperUpload
                    );

                    $this->applyAppearanceValuesToTheme($theme, $data);
                    $themeService->activateCompanyTheme($admin, $theme);
                    $appearanceUpdated = true;
                } elseif ($this->hasAppearanceChanges($data)) {
                    $activeTheme = $themeService->getActiveCompanyTheme();
                    if ($activeTheme && $activeTheme->background_type === 'static_image') {
                        $this->applyAppearanceValuesToTheme($activeTheme, $data);
                        $activeTheme->save();
                        $appearanceUpdated = true;
                    }
                }

                if ($appearanceUpdated) {
                    Cache::forget('public:appearance:company');
                }

                // Save basic company contact settings
                $contactKeys = ['brand_name','legal_company_name','support_email','business_email','whatsapp_number','phone_number','country','company_description'];
                foreach ($contactKeys as $k) {
                    if (isset($data[$k])) {
                        \App\Models\Setting::updateOrCreate(['key' => 'website.' . $k], ['value' => $data[$k]]);
                    }
                }

                if (isset($data['new_wallpaper'])) {
                    $this->data['new_wallpaper'] = null;
                }

                $logger->success(
                    'settings.updated',
                    null,
                    'Settings updated',
                    [
                        'changed_keys' => $changedKeys,
                        'secret_keys_updated' => $secretKeysUpdated,
                    ]
                );
            });

            // Clear settings cache only
            Cache::forget('settings_cache');

            Notification::make()
                ->title('Settings saved successfully')
                ->success()
                ->send();
        } catch (\Exception $e) {
            report($e);

            $logger = app(\App\Services\AdminActivityLogger::class);
            $logger->failed(
                'settings.update_failed',
                null,
                'Settings update failed',
                ['error' => 'update_exception']
            );
            Notification::make()
                ->title('Failed to save settings')
                ->body('An error occurred while saving settings.')
                ->danger()
                ->send();
        }
    }

    public function resetUnsaved(): void
    {
        $this->form->fill();
        
        Notification::make()
            ->title('Changes reset')
            ->body('Unsaved changes have been reset to current values.')
            ->info()
            ->send();
    }

    private function formatFileSize(?int $bytes): string
    {
        if ($bytes === null || $bytes === 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, 2) . ' ' . $units[$pow];
    }

    private function hasAppearanceChanges(array $data): bool
    {
        $keys = ['background_position', 'background_size', 'overlay_opacity', 'card_opacity', 'card_blur', 'navbar_opacity', 'animation_speed', 'motion_intensity'];
        foreach ($keys as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                return true;
            }
        }
        return false;
    }

    private function applyAppearanceValuesToTheme(\App\Models\AppearanceTheme $theme, array $data): void
    {
        if (isset($data['background_position'])) {
            $theme->background_position = $data['background_position'];
        }
        if (isset($data['background_size'])) {
            $theme->background_size = $data['background_size'];
        }
        if (isset($data['overlay_opacity'])) {
            $theme->overlay_opacity = (int) $data['overlay_opacity'];
        }
        if (isset($data['card_opacity'])) {
            $theme->card_opacity = (int) $data['card_opacity'];
        }
        if (isset($data['card_blur'])) {
            $theme->card_blur = (int) $data['card_blur'];
        }
        if (isset($data['navbar_opacity'])) {
            $theme->topbar_opacity = (int) $data['navbar_opacity'];
        }
        if (isset($data['animation_speed'])) {
            $theme->animation_speed = (float) $data['animation_speed'];
        }
        if (isset($data['motion_intensity'])) {
            $theme->motion_intensity = (int) $data['motion_intensity'];
        }
    }
}
