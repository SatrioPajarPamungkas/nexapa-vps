<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Filament\Resources\UserResource\RelationManagers;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';

    protected static ?string $navigationLabel = 'User Publisher';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'User Publisher';

    protected static ?string $pluralModelLabel = 'User Publisher';

    protected static ?string $navigationGroup = 'Manajemen Pengguna';

    protected static ?string $recordTitleAttribute = 'name';

    public static function canAccess(): bool
    {
        return auth()->user()?->isAdmin() === true;
    }

    public static function form(Form $form): Form
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Pengguna')
                    ->description(fn (User $record): string => $record->email)
                    ->searchable(['name', 'email'])
                    ->sortable()
                    ->weight('medium')
                    ->wrap()
                    ->formatStateUsing(fn (User $record): string => $record->name),

                Tables\Columns\TextColumn::make('role')
                    ->label('Role')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => str($state ?: 'user')->title()->toString())
                    ->color(fn (?string $state): string => $state === 'admin' ? 'success' : 'gray')
                    ->sortable(),

                Tables\Columns\TextColumn::make('email_verified_at')
                    ->label('Status')
                    ->formatStateUsing(fn ($state): string => $state ? 'Terverifikasi' : 'Belum terverifikasi')
                    ->badge()
                    ->color(fn ($state): string => $state ? 'success' : 'warning')
                    ->icon(fn ($state): string => $state ? 'heroicon-o-check-circle' : 'heroicon-o-exclamation-triangle')
                    ->sortable(),

                Tables\Columns\TextColumn::make('connected_accounts_count')
                    ->label('Akun Sosial')
                    ->formatStateUsing(fn (int $state): string => $state > 0 ? "{$state} akun" : 'Belum ada')
                    ->badge()
                    ->color(fn (int $state): string => $state > 0 ? 'info' : 'gray')
                    ->sortable(),

                Tables\Columns\TextColumn::make('media_assets_count')
                    ->label('Media')
                    ->formatStateUsing(fn (int $state): string => $state > 0 ? "{$state} media" : 'Belum ada')
                    ->badge()
                    ->color(fn (int $state): string => $state > 0 ? 'gray' : 'gray')
                    ->sortable(),

                Tables\Columns\TextColumn::make('publisher_posts_count')
                    ->label('Posting')
                    ->formatStateUsing(fn (int $state): string => $state > 0 ? "{$state} posting" : 'Belum ada')
                    ->badge()
                    ->color(fn (int $state): string => $state > 0 ? 'primary' : 'gray')
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Terdaftar')
                    ->dateTime('d M Y H:i')
                    ->description(fn (User $record): ?string => $record->created_at?->diffForHumans())
                    ->sortable(),

                Tables\Columns\TextColumn::make('login_provider')
                    ->label('Login')
                    ->state(fn (User $record): string => filled($record->google_id) ? 'Google' : 'Email')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'Google' ? 'info' : 'gray')
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('last_activity_at')
                    ->label('Aktivitas terakhir')
                    ->dateTime('d M Y H:i')
                    ->placeholder('Belum ada aktivitas')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role')
                    ->label('Role')
                    ->options(fn (): array => User::query()
                        ->whereNotNull('role')
                        ->distinct()
                        ->orderBy('role')
                        ->pluck('role', 'role')
                        ->map(fn (string $role): string => str($role)->title()->toString())
                        ->all()),

                Tables\Filters\TernaryFilter::make('is_admin')
                    ->label('Status admin')
                    ->placeholder('Semua')
                    ->trueLabel('Admin')
                    ->falseLabel('User'),

                Tables\Filters\TernaryFilter::make('email_verified_at')
                    ->label('Status verifikasi')
                    ->placeholder('Semua')
                    ->trueLabel('Terverifikasi')
                    ->falseLabel('Belum terverifikasi')
                    ->queries(
                        true: fn (Builder $query): Builder => $query->whereNotNull('email_verified_at'),
                        false: fn (Builder $query): Builder => $query->whereNull('email_verified_at'),
                    ),

                Tables\Filters\Filter::make('registered_at')
                    ->label('Tanggal registrasi')
                    ->form([
                        Forms\Components\DatePicker::make('from')->label('Dari tanggal'),
                        Forms\Components\DatePicker::make('until')->label('Sampai tanggal'),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['from'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('created_at', '>=', $date))
                        ->when($data['until'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('created_at', '<=', $date))),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()->label('Lihat detail'),
            ])
            ->bulkActions([])
            ->recordUrl(fn (Model $record): string => static::getUrl('view', ['record' => $record]))
            ->defaultSort('created_at', 'desc')
            ->paginationPageOptions([10, 25, 50])
            ->emptyStateIcon('heroicon-o-user-group')
            ->emptyStateHeading('Belum ada user Publisher')
            ->emptyStateDescription('User yang mendaftar ke Nexapa Publisher akan tampil di sini.');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\ConnectedAccountsRelationManager::class,
            RelationManagers\MediaAssetsRelationManager::class,
            RelationManagers\PublisherPostsRelationManager::class,
            RelationManagers\CollectionsRelationManager::class,
            RelationManagers\ActivityLogsRelationManager::class,
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withCount([
                'connectedAccounts',
                'mediaAssets',
                'publisherPosts',
                'collections',
                'activityLogs',
                'publisherPosts as scheduled_publisher_posts_count' => fn (Builder $query) => $query->whereIn('status', ['scheduled', 'queued', 'uploading', 'processing', 'publishing']),
                'publisherPosts as successful_publisher_posts_count' => fn (Builder $query) => $query->whereIn('status', ['completed', 'published']),
                'publisherPosts as failed_publisher_posts_count' => fn (Builder $query) => $query->where('status', 'failed'),
            ])
            ->withMax('activityLogs as last_activity_at', 'created_at');
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'view' => Pages\ViewUser::route('/{record}'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::query()->count();

        return $count > 0 ? (string) $count : null;
    }

    private static function getInitialsAvatarUrl(string $name): string
    {
        return 'https://ui-avatars.com/api/?'.http_build_query([
            'name' => $name,
            'background' => '1e293b',
            'color' => 'e2e8f0',
            'bold' => 'true',
            'size' => '128',
        ]);
    }
}
