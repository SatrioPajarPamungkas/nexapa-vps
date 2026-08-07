<?php

namespace App\Filament\Pages;

use App\Models\UnifiedUserRecord;
use App\Services\Crm\CrmUserDirectoryService;
use App\Services\UnifiedUserDirectoryService;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Collection;
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
                Tables\Actions\Action::make('view')->label('Lihat detail')->icon('heroicon-o-eye')->url(fn (UnifiedUserRecord $record): string => UnifiedUserDetails::getUrl(['record' => $record->getKey()])),
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

    protected function getHeaderActions(): array
    {
        return [
            Action::make('refresh')->label('Refresh data')->icon('heroicon-o-arrow-path')->action(function (): void {
                app(CrmUserDirectoryService::class)->flushCache();
                $this->resetTable();
                Notification::make()->success()->title('Direktori diperbarui')->send();
            }),
        ];
    }
}
