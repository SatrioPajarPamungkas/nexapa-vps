<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ConnectedAccountResource\Pages;
use App\Models\ConnectedAccount;
use App\Models\User;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ConnectedAccountResource extends Resource
{
    protected static ?string $model = ConnectedAccount::class;

    protected static ?string $navigationIcon = 'heroicon-o-link';

    protected static ?string $navigationLabel = 'Connected Accounts';

    protected static ?string $navigationGroup = 'Accounts';

    protected static ?int $navigationSort = 3;

    public static function shouldRegisterNavigation(): bool
    {
        return false;
    }

    protected static ?string $modelLabel = 'Connected Account';

    protected static ?string $pluralModelLabel = 'Connected Accounts';

    public static function form(Form $form): Form
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('avatar_url')
                    ->label('')
                    ->circular()
                    ->size(40)
                    ->defaultImageUrl(fn (ConnectedAccount $record): string => static::getInitialsAvatarUrl($record->display_name)),
                Tables\Columns\TextColumn::make('display_name')
                    ->label('Account')
                    ->description(fn (ConnectedAccount $record): ?string => filled($record->username) ? '@' . ltrim($record->username, '@') : null)
                    ->searchable(['display_name', 'external_account_id'])
                    ->sortable()
                    ->weight('medium'),
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Owner')
                    ->description(fn (ConnectedAccount $record): string => $record->user?->email ?? 'No owner')
                    ->searchable(['user.name', 'user.email'])
                    ->placeholder('No owner'),
                Tables\Columns\TextColumn::make('platform')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => static::formatLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        'facebook' => 'info',
                        'tiktok' => 'gray',
                        default => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('account_type')
                    ->label('Account Type')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => static::formatLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        'facebook_admin' => 'success',
                        'facebook_page' => 'info',
                        default => 'gray',
                    })
                    ->placeholder('Unknown')
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => static::formatLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        'connected' => 'success',
                        'disconnected' => 'gray',
                        'expired' => 'danger',
                        'error' => 'warning',
                        default => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('parent.display_name')
                    ->label('Parent Account')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('external_account_id')
                    ->label('External Account ID')
                    ->copyable()
                    ->copyMessage('External account ID copied')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('token_expires_at')
                    ->label('Token Expiry')
                    ->formatStateUsing(fn ($state): string => $state?->format('d M Y H:i') ?? 'Unknown')
                    ->description(fn (ConnectedAccount $record): string => match (true) {
                        $record->token_expires_at === null => 'Unknown',
                        $record->token_expires_at->isPast() => 'Expired',
                        default => 'Active',
                    })
                    ->color(fn (ConnectedAccount $record): string => match (true) {
                        $record->token_expires_at === null => 'gray',
                        $record->token_expires_at->isPast() => 'danger',
                        default => 'success',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created At')
                    ->dateTime('d M Y H:i')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('platform')
                    ->options(fn (): array => static::distinctOptions('platform')),
                Tables\Filters\SelectFilter::make('account_type')
                    ->label('Account Type')
                    ->options(fn (): array => static::distinctOptions('account_type')),
                Tables\Filters\SelectFilter::make('status')
                    ->options(fn (): array => static::distinctOptions('status')),
                Tables\Filters\SelectFilter::make('user_id')
                    ->label('Owner')
                    ->relationship('user', 'name')
                    ->getOptionLabelFromRecordUsing(fn (User $record): string => "{$record->name} ({$record->email})")
                    ->searchable(['name', 'email'])
                    ->preload(),
                Tables\Filters\TernaryFilter::make('token_expired')
                    ->label('Token Expired')
                    ->placeholder('All')
                    ->trueLabel('Expired')
                    ->falseLabel('Active')
                    ->queries(
                        true: fn (Builder $query): Builder => $query
                            ->whereNotNull('token_expires_at')
                            ->where('token_expires_at', '<', now()),
                        false: fn (Builder $query): Builder => $query
                            ->whereNotNull('token_expires_at')
                            ->where('token_expires_at', '>=', now()),
                    ),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->paginationPageOptions([10, 25, 50]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['user', 'parent']);
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public static function canView(Model $record): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function canDeleteAny(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListConnectedAccounts::route('/'),
            'view' => Pages\ViewConnectedAccount::route('/{record}'),
        ];
    }

    private static function distinctOptions(string $column): array
    {
        return ConnectedAccount::query()
            ->whereNotNull($column)
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->mapWithKeys(fn (string $value): array => [$value => static::formatLabel($value)])
            ->all();
    }

    private static function formatLabel(?string $value): string
    {
        return filled($value) ? Str::of($value)->replace('_', ' ')->title()->toString() : 'Unknown';
    }

    private static function getInitialsAvatarUrl(string $name): string
    {
        return 'https://ui-avatars.com/api/?' . http_build_query([
            'name' => $name,
            'background' => 'e2e8f0',
            'color' => '334155',
            'bold' => 'true',
        ]);
    }
}
