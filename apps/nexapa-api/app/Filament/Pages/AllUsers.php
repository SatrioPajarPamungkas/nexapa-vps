<?php

namespace App\Filament\Pages;

use App\Models\UnifiedUserRecord;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Illuminate\Support\Carbon;
use App\Services\Crm\CrmUserDirectoryService;
use App\Services\UnifiedUserDirectoryService;
use App\Services\UserLifecycleService;
use Throwable;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

class AllUsers extends Page implements HasTable
{
    use Tables\Concerns\InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    protected static ?string $navigationLabel = 'Semua Pengguna';

    protected static ?string $navigationGroup = 'Manajemen Pengguna';

    protected static ?int $navigationSort = 1;

    protected static ?string $title = 'Semua Pengguna';

    protected static string $view = 'filament.pages.all-users';

    public ?string $crmWarning = null;

    private bool $warningNotificationSent = false;

    public static function canAccess(): bool
    {
        return auth()->user()?->isAdmin() === true;
    }

    public function mount(): void
    {
        if (! app(CrmUserDirectoryService::class)->isConfigured()) {
            $this->crmWarning = 'Konfigurasi integrasi CRM belum lengkap.';
        }
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(UnifiedUserRecord::query())
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Pengguna')
                    ->description(fn (UnifiedUserRecord $record): string => $record->email)
                    ->searchable()
                    ->weight('medium')
                    ->wrap(),
                Tables\Columns\TextColumn::make('product')
                    ->label('Produk')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'Publisher' => 'primary',
                        'CRM' => 'info',
                        default => 'success',
                    }),
                Tables\Columns\TextColumn::make('email_verified')
                    ->label('Verifikasi')
                    ->state(fn (UnifiedUserRecord $record): string => $record->email_verified ? 'Terverifikasi' : 'Belum terverifikasi')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'Terverifikasi' ? 'success' : 'warning'),
                Tables\Columns\TextColumn::make('link_status')
                    ->label('Akun Terkait')
                    ->badge()
                    ->color('warning')
                    ->placeholder('—')
                    ->wrap(),
                Tables\Columns\TextColumn::make('lifecycle_status')
                    ->label('Status akun')
                    ->state(fn (UnifiedUserRecord $record): string =>
                        $record->lifecycle_status ?? 'active'
                    )
                    ->formatStateUsing(fn (string $state): string =>
                        match ($state) {
                            'suspended' => 'Disuspend',
                            default => 'Aktif',
                        }
                    )
                    ->badge()
                    ->color(fn (string $state): string =>
                        $state === 'suspended' ? 'danger' : 'success'
                    ),

                Tables\Columns\TextColumn::make('registered_at')
                    ->label('Terdaftar')
                    ->dateTime('d M Y H:i'),
                Tables\Columns\TextColumn::make('source_user_id')
                    ->label('ID sumber')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->copyable()
                    ->wrap(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('source')
                    ->label('Asal pengguna')
                    ->options(['publisher' => 'Publisher', 'crm' => 'CRM', 'both' => 'Publisher + CRM']),
            ])
            ->recordUrl(fn (UnifiedUserRecord $record): string => UnifiedUserDetails::getUrl(['record' => $record->getKey()]))
            ->actions([
                Tables\Actions\Action::make('view')
                    ->label('Lihat detail')
                    ->icon('heroicon-o-eye')
                    ->url(fn (UnifiedUserRecord $record): string =>
                        UnifiedUserDetails::getUrl([
                            'record' => $record->getKey(),
                        ])
                    ),

                Tables\Actions\Action::make('manageSubscription')
                    ->label('Kelola Paket')
                    ->icon('heroicon-o-credit-card')
                    ->color('primary')
                    ->visible(
                        fn (
                            UnifiedUserRecord $record
                        ): bool =>
                            ! $this->isProtected($record)
                            && filled(
                                $record->publisher_user_id
                            )
                    )
                    ->modalHeading('Kelola paket pengguna')
                    ->modalDescription(
                        'Perubahan langsung menentukan akses '
                        .'WhatsApp API pada akun ini.'
                    )
                    ->modalSubmitActionLabel('Simpan paket')
                    ->fillForm(
                        function (
                            UnifiedUserRecord $record
                        ): array {
                            $subscription =
                                Subscription::query()
                                    ->where(
                                        'publisher_user_id',
                                        (int) $record
                                            ->publisher_user_id
                                    )
                                    ->latest('id')
                                    ->first();

                            return [
                                'plan_code' =>
                                    $subscription
                                        ?->plan_code
                                        ?? 'starter',
                                'billing_cycle' =>
                                    $subscription
                                        ?->billing_cycle
                                        ?? 'monthly',
                                'status' =>
                                    $subscription
                                        ?->status
                                        ?? 'active',
                                'starts_at' =>
                                    $subscription
                                        ?->starts_at
                                        ?? now(),
                                'expires_at' =>
                                    $subscription
                                        ?->expires_at
                                        ?? now()
                                            ->addMonthNoOverflow(),
                            ];
                        }
                    )
                    ->form([
                        Select::make('plan_code')
                            ->label('Paket')
                            ->options(
                                fn (): array =>
                                    SubscriptionPlan::query()
                                        ->where(
                                            'is_active',
                                            true
                                        )
                                        ->orderBy('sort_order')
                                        ->pluck(
                                            'name',
                                            'code'
                                        )
                                        ->all()
                            )
                            ->required()
                            ->native(false),

                        Select::make('billing_cycle')
                            ->label('Periode')
                            ->options([
                                'monthly' => 'Bulanan',
                                'yearly' => 'Tahunan',
                            ])
                            ->required()
                            ->native(false),

                        Select::make('status')
                            ->label('Status paket')
                            ->options([
                                'active' => 'Aktif',
                                'expired' => 'Kedaluwarsa',
                                'suspended' => 'Disuspend',
                                'cancelled' => 'Dibatalkan',
                            ])
                            ->required()
                            ->native(false),

                        DateTimePicker::make('starts_at')
                            ->label('Mulai aktif')
                            ->seconds(false)
                            ->required(),

                        DateTimePicker::make('expires_at')
                            ->label('Berakhir pada')
                            ->seconds(false)
                            ->required()
                            ->after('starts_at'),
                    ])
                    ->action(
                        function (
                            UnifiedUserRecord $record,
                            array $data
                        ): void {
                            try {
                                $subscription = app(
                                    SubscriptionService::class
                                )->updateForPublisherUser(
                                    publisherUserId:
                                        (int) $record
                                            ->publisher_user_id,
                                    planCode:
                                        $data['plan_code'],
                                    billingCycle:
                                        $data['billing_cycle'],
                                    status:
                                        $data['status'],
                                    startsAt:
                                        Carbon::parse(
                                            $data['starts_at']
                                        ),
                                    expiresAt:
                                        Carbon::parse(
                                            $data['expires_at']
                                        ),
                                    adminUserId:
                                        (int) auth()->id(),
                                );

                                $this->resetTable();

                                Notification::make()
                                    ->success()
                                    ->title(
                                        'Paket berhasil diperbarui'
                                    )
                                    ->body(
                                        $subscription
                                            ->plan_name
                                        .' · '
                                        .ucfirst(
                                            $subscription
                                                ->status
                                        )
                                        .' · berakhir '
                                        .$subscription
                                            ->expires_at
                                            ->format(
                                                'd M Y H:i'
                                            )
                                    )
                                    ->send();
                            } catch (Throwable $exception) {
                                report($exception);

                                Notification::make()
                                    ->danger()
                                    ->title(
                                        'Paket gagal diperbarui'
                                    )
                                    ->body(
                                        $exception
                                            ->getMessage()
                                    )
                                    ->send();
                            }
                        }
                    ),

                Tables\Actions\Action::make('suspend')
                    ->label('Suspend')
                    ->icon('heroicon-o-no-symbol')
                    ->color('warning')
                    ->visible(fn (UnifiedUserRecord $record): bool =>
                        ! $this->isProtected($record)
                        && ($record->lifecycle_status ?? 'active')
                            === 'active'
                    )
                    ->requiresConfirmation()
                    ->modalHeading('Suspend akun pengguna?')
                    ->modalDescription(
                        'Pengguna akan dikeluarkan dan tidak dapat login.'
                    )
                    ->action(fn (UnifiedUserRecord $record) =>
                        $this->runLifecycle('suspend', $record)
                    ),

                Tables\Actions\Action::make('activate')
                    ->label('Aktifkan')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (UnifiedUserRecord $record): bool =>
                        ! $this->isProtected($record)
                        && ($record->lifecycle_status ?? 'active')
                            === 'suspended'
                    )
                    ->requiresConfirmation()
                    ->action(fn (UnifiedUserRecord $record) =>
                        $this->runLifecycle('activate', $record)
                    ),

                Tables\Actions\Action::make('archive')
                    ->label('Hapus')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->visible(fn (UnifiedUserRecord $record): bool =>
                        ! $this->isProtected($record)
                    )
                    ->requiresConfirmation()
                    ->modalHeading('Hapus akun dari panel?')
                    ->modalDescription(
                        'Akun akan diarsipkan dan akses login diblokir. '
                        .'Data CRM tetap disimpan agar dapat dipulihkan.'
                    )
                    ->modalSubmitActionLabel('Ya, hapus akun')
                    ->action(fn (UnifiedUserRecord $record) =>
                        $this->runLifecycle('archive', $record)
                    ),
            ])
            ->bulkActions([])
            ->paginationPageOptions([10, 20, 50])
            ->emptyStateIcon('heroicon-o-users')
            ->emptyStateHeading('Tidak ada pengguna yang cocok')
            ->emptyStateDescription('Coba ubah pencarian atau filter sumber pengguna.');
    }

    public function getTableRecords(): Collection|Paginator|CursorPaginator
    {
        $perPageState = $this->getTableRecordsPerPage() ?? 20;
        $perPage = $perPageState === 'all' ? 100 : (int) $perPageState;
        $page = $this->getTablePage();
        $result = app(UnifiedUserDirectoryService::class)->list($page, $perPage, [
            'search' => $this->getTableSearch(),
            'source' => $this->getTableFilterState('source')['value'] ?? null,
        ]);
        $this->crmWarning = $result['crm_error'];
        if ($this->crmWarning && ! $this->warningNotificationSent) {
            $this->warningNotificationSent = true;
            Notification::make()
                ->warning()
                ->title('Data CRM sedang tidak tersedia')
                ->body('Data Publisher tetap ditampilkan.')
                ->send();
        }
        $records = new Collection(array_map(fn (array $record): UnifiedUserRecord => UnifiedUserRecord::fromArray($record), $result['records']));

        return (new LengthAwarePaginator(
            items: $records,
            total: $result['total'],
            perPage: $perPage,
            currentPage: $page,
            options: ['path' => request()->url(), 'pageName' => $this->getTablePaginationPageName()],
        ))->onEachSide(0);
    }

    private function isProtected(
        UnifiedUserRecord $record
    ): bool {
        if (
            strtolower(trim((string) $record->email))
            === 'lubelicorporation@gmail.com'
        ) {
            return true;
        }

        if (blank($record->publisher_user_id)) {
            return false;
        }

        $publisher = \App\Models\User::withTrashed()
            ->find((int) $record->publisher_user_id);

        return $publisher?->is_admin === true
            || (int) $record->publisher_user_id
                === (int) auth()->id();
    }

    private function runLifecycle(
        string $operation,
        UnifiedUserRecord $record
    ): void {
        try {
            $service = app(UserLifecycleService::class);

            match ($operation) {
                'suspend' => $service->suspend($record),
                'activate' => $service->activate($record),
                'archive' => $service->archive($record),
                default => throw new \RuntimeException(
                    'Operasi tidak dikenal.'
                ),
            };

            $this->resetTable();

            Notification::make()
                ->success()
                ->title(match ($operation) {
                    'suspend' => 'Akun berhasil disuspend',
                    'activate' => 'Akun berhasil diaktifkan',
                    default => 'Akun berhasil dihapus dari panel',
                })
                ->send();
        } catch (Throwable $exception) {
            report($exception);

            Notification::make()
                ->danger()
                ->title('Tindakan gagal')
                ->body($exception->getMessage())
                ->send();
        }
    }

    protected function resolveTableRecord(
        ?string $key
    ): ?Model {
        if ($key === null || $key === '') {
            return null;
        }

        return $this->getTableRecords()->first(
            fn (Model $record): bool =>
                (string) $record->getKey() === (string) $key
        );
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('createAccount')
                ->label('Tambah Pengguna')
                ->icon('heroicon-o-user-plus')
                ->color('primary')
                ->url(fn (): string => route(
                    'admin.user-provisioning.create'
                )),
            Action::make('refresh')->label('Refresh data')->icon('heroicon-o-arrow-path')->action(function (): void {
                app(CrmUserDirectoryService::class)->flushCache();
                $this->resetTable();
                Notification::make()->success()->title('Direktori diperbarui')->send();
            }),
        ];
    }
}
