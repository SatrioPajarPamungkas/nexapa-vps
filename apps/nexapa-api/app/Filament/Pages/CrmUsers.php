<?php

namespace App\Filament\Pages;

use App\Exceptions\CrmIntegrationException;
use App\Models\CrmUserRecord;
use App\Services\Crm\CrmUserDirectoryService;
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

class CrmUsers extends Page implements HasTable
{
    use Tables\Concerns\InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-building-office';

    protected static ?string $navigationLabel = 'User CRM';

    protected static ?string $navigationGroup = 'Manajemen Pengguna';

    protected static ?int $navigationSort = 3;

    protected static ?string $title = 'User CRM';

    protected static string $view = 'filament.pages.crm-users';

    public ?string $crmErrorMessage = null;

    private bool $errorNotificationSent = false;

    public static function canAccess(): bool
    {
        return auth()->user()?->isAdmin() === true;
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(CrmUserRecord::query())
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Pengguna')
                    ->description(fn (CrmUserRecord $record): string => $record->email)
                    ->searchable()
                    ->sortable()
                    ->weight('medium')
                    ->wrap(),
                Tables\Columns\TextColumn::make('account_name')
                    ->label('Workspace')
                    ->placeholder('—')
                    ->sortable()
                    ->wrap(),
                Tables\Columns\TextColumn::make('account_role')
                    ->label('Role')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => $state ? str($state)->title()->toString() : '—')
                    ->color(fn (?string $state): string => match ($state) {
                        'owner' => 'success',
                        'admin' => 'info',
                        'agent' => 'primary',
                        default => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('whatsapp_status')
                    ->label('WhatsApp')
                    ->badge()
                    ->placeholder('Belum dikonfigurasi')
                    ->color(fn (?string $state): string => $state === 'connected' ? 'success' : 'gray'),
                Tables\Columns\TextColumn::make('email_verified')
                    ->label('Verifikasi')
                    ->state(fn (CrmUserRecord $record): string => $record->email_verified ? 'Terverifikasi' : 'Belum terverifikasi')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'Terverifikasi' ? 'success' : 'warning'),
                Tables\Columns\TextColumn::make('last_sign_in_at')
                    ->label('Login Terakhir')
                    ->dateTime('d M Y H:i')
                    ->placeholder('Belum ada')
                    ->sortable(),
                Tables\Columns\TextColumn::make('provider')
                    ->label('Provider login')
                    ->badge()
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('whatsapp_phone_number_id')
                    ->label('WhatsApp Phone Number ID')
                    ->placeholder('Belum terhubung')
                    ->copyable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Terdaftar')
                    ->dateTime('d M Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('product')
                    ->label('Produk')
                    ->state('CRM')
                    ->badge()
                    ->color('info')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('email_verified')
                    ->label('Status verifikasi')
                    ->placeholder('Semua')
                    ->trueLabel('Terverifikasi')
                    ->falseLabel('Belum terverifikasi'),
                Tables\Filters\SelectFilter::make('account_role')
                    ->label('Role')
                    ->options(['owner' => 'Owner', 'admin' => 'Admin', 'agent' => 'Agent', 'viewer' => 'Viewer']),
                Tables\Filters\SelectFilter::make('account_id')
                    ->label('Workspace')
                    ->options(fn (): array => app(CrmUserDirectoryService::class)->workspaceOptions())
                    ->searchable(),
                Tables\Filters\TernaryFilter::make('whatsapp_configured')
                    ->label('Konfigurasi WhatsApp')
                    ->placeholder('Semua')
                    ->trueLabel('Sudah dikonfigurasi')
                    ->falseLabel('Belum dikonfigurasi'),
            ])
            ->recordUrl(fn (CrmUserRecord $record): string => CrmUserDetails::getUrl(['record' => $record->getKey()]))
            ->actions([
                Tables\Actions\Action::make('view')
                    ->label('Lihat detail')
                    ->icon('heroicon-o-eye')
                    ->url(fn (CrmUserRecord $record): string => CrmUserDetails::getUrl(['record' => $record->getKey()])),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->paginationPageOptions([10, 25, 50])
            ->emptyStateIcon('heroicon-o-building-office')
            ->emptyStateHeading(fn (): string => $this->crmErrorMessage ? 'Data CRM sedang tidak tersedia' : 'Belum ada user CRM')
            ->emptyStateDescription(fn (): string => $this->crmErrorMessage ?? 'User Supabase CRM akan tampil di sini.');
    }

    public function getTableRecords(): Collection|Paginator|CursorPaginator
    {
        $perPageState = $this->getTableRecordsPerPage() ?? 25;
        $perPage = $perPageState === 'all' ? 100 : (int) $perPageState;
        $page = $this->getTablePage();

        try {
            $result = app(CrmUserDirectoryService::class)->listUsers(
                page: $page,
                perPage: $perPage,
                filters: $this->serviceFilters(),
                sortColumn: $this->getTableSortColumn(),
                sortDirection: $this->getTableSortDirection() ?? 'desc',
            );
            $this->crmErrorMessage = null;
            $records = new Collection(array_map(
                fn ($user): CrmUserRecord => CrmUserRecord::fromArray($user->toArray()),
                $result['users'],
            ));

            return (new LengthAwarePaginator(
                items: $records,
                total: $result['total'],
                perPage: $perPage,
                currentPage: $page,
                options: ['path' => request()->url(), 'pageName' => $this->getTablePaginationPageName()],
            ))->onEachSide(0);
        } catch (CrmIntegrationException $exception) {
            $this->crmErrorMessage = $exception->getMessage();
            $this->sendErrorNotification();

            return new LengthAwarePaginator([], 0, $perPage, $page, [
                'path' => request()->url(),
                'pageName' => $this->getTablePaginationPageName(),
            ]);
        }
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('refresh')
                ->label('Refresh data')
                ->icon('heroicon-o-arrow-path')
                ->action(function (): void {
                    app(CrmUserDirectoryService::class)->flushCache();
                    $this->resetTable();
                    Notification::make()->success()->title('Cache CRM dibersihkan')->send();
                }),
        ];
    }

    private function serviceFilters(): array
    {
        return [
            'search' => $this->getTableSearch(),
            'role' => $this->filterValue('account_role'),
            'workspace' => $this->filterValue('account_id'),
            'email_verified' => $this->ternaryValue('email_verified'),
            'whatsapp_configured' => $this->ternaryValue('whatsapp_configured'),
        ];
    }

    private function filterValue(string $name): mixed
    {
        return $this->getTableFilterState($name)['value'] ?? null;
    }

    private function ternaryValue(string $name): ?bool
    {
        $value = $this->filterValue($name);

        return match ((string) $value) {
            '1' => true,
            '0' => false,
            default => null,
        };
    }

    private function sendErrorNotification(): void
    {
        if ($this->errorNotificationSent) {
            return;
        }

        $this->errorNotificationSent = true;
        Notification::make()
            ->warning()
            ->title('Data CRM sedang tidak tersedia')
            ->body($this->crmErrorMessage)
            ->send();
    }
}
