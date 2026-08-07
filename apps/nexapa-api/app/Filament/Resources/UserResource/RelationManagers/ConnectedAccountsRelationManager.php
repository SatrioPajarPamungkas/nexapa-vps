<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Models\ConnectedAccount;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ConnectedAccountsRelationManager extends RelationManager
{
    protected static string $relationship = 'connectedAccounts';

    protected static ?string $title = 'Akun Sosial';

    protected static ?string $modelLabel = 'Akun Sosial';

    protected static ?string $pluralModelLabel = 'Akun Sosial';

    protected static ?string $recordTitleAttribute = 'display_name';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('display_name')
            ->columns([
                Tables\Columns\ImageColumn::make('avatar_url')
                    ->label('')
                    ->circular()
                    ->size(32)
                    ->defaultImageUrl(fn (ConnectedAccount $record): string => self::getInitialsAvatarUrl($record->display_name)),

                Tables\Columns\TextColumn::make('display_name')
                    ->label('Akun')
                    ->searchable(['display_name', 'username'])
                    ->sortable()
                    ->weight('medium')
                    ->formatStateUsing(fn (ConnectedAccount $record): string => ($record->isFacebookPage() ? '↳ ' : '') . $record->display_name)
                    ->description(function (ConnectedAccount $record): ?string {
                        if (filled($record->username)) {
                            $base = '@' . ltrim($record->username, '@');
                            if ($record->isFacebookPage() && $record->parent) {
                                return $base . ' · parent: ' . $record->parent->display_name;
                            }
                            return $base;
                        }
                        if ($record->isFacebookPage() && $record->parent) {
                            return 'parent: ' . $record->parent->display_name;
                        }
                        return null;
                    })
                    ->wrap(),

                Tables\Columns\TextColumn::make('platform')
                    ->label('Platform')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => self::formatLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        'facebook' => 'info',
                        'tiktok' => 'gray',
                        'youtube' => 'danger',
                        'shopee' => 'warning',
                        default => 'gray',
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('account_type')
                    ->label('Jenis akun')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => self::formatLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        'facebook_admin' => 'success',
                        'facebook_page' => 'info',
                        default => 'gray',
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => self::formatLabel($state))
                    ->color(fn (?string $state): string => match ($state) {
                        'connected' => 'success',
                        'disconnected' => 'gray',
                        'expired' => 'danger',
                        'error' => 'warning',
                        default => 'gray',
                    })
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_publishable')
                    ->label('Publishable')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('parent.display_name')
                    ->label('Parent')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: false),

                Tables\Columns\TextColumn::make('connection_state')
                    ->label('Masa Berlaku Token')
                    ->state(function (ConnectedAccount $record): string {
                        if ($record->token_expires_at === null) {
                            return $record->last_validated_at ? 'Divalidasi ' . $record->last_validated_at->diffForHumans() : 'Tidak diketahui';
                        }
                        if ($record->token_expires_at->isPast()) {
                            return 'Kadaluarsa ' . $record->token_expires_at->diffForHumans();
                        }
                        return 'Aktif sampai ' . $record->token_expires_at->format('d M Y');
                    })
                    ->description(fn (ConnectedAccount $record): string => match (true) {
                        $record->token_expires_at === null => 'Tidak ada masa kadaluarsa',
                        $record->token_expires_at->isPast() => 'Perlu koneksi ulang',
                        default => $record->last_validated_at ? 'Divalidasi ' . $record->last_validated_at->diffForHumans() : 'Valid',
                    })
                    ->color(fn (ConnectedAccount $record): string => match (true) {
                        $record->token_expires_at !== null && $record->token_expires_at->isPast() => 'danger',
                        $record->status === 'connected' => 'success',
                        default => 'gray',
                    })
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->wrap(),

                Tables\Columns\TextColumn::make('last_validated_at')
                    ->label('Terakhir divalidasi')
                    ->dateTime('d M Y H:i')
                    ->placeholder('—')
                    ->sortable()
                    ->description(fn (ConnectedAccount $record): ?string => $record->last_validated_at?->diffForHumans())
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('external_account_id')
                    ->label('External Account ID')
                    ->copyable()
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Terhubung')
                    ->dateTime('d M Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Diperbarui')
                    ->dateTime('d M Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('platform')
                    ->options(fn (): array => self::distinctOptions('platform')),
                Tables\Filters\SelectFilter::make('account_type')
                    ->label('Jenis Akun')
                    ->options(fn (): array => self::distinctOptions('account_type')),
                Tables\Filters\SelectFilter::make('status')
                    ->options(fn (): array => self::distinctOptions('status')),
            ])
            ->headerActions([])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->url(fn (ConnectedAccount $record) => \App\Filament\Resources\ConnectedAccountResource::getUrl('view', ['record' => $record])),
            ])
            ->bulkActions([])
            ->defaultSort(function (Builder $query): Builder {
                return $query
                    ->orderByRaw("CASE WHEN account_type = 'facebook_admin' THEN 0 WHEN account_type = 'facebook_page' THEN 1 ELSE 2 END")
                    ->orderByRaw("COALESCE(parent_connected_account_id, id)")
                    ->orderBy('created_at', 'desc');
            })
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->with(['parent']))
            ->paginated([10, 25]);
    }

    public static function getBadge(Model $ownerRecord, string $pageClass): ?string
    {
        $count = $ownerRecord->connectedAccounts()->count();

        return $count > 0 ? (string) $count : null;
    }

    private static function distinctOptions(string $column): array
    {
        return ConnectedAccount::query()
            ->whereNotNull($column)
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->mapWithKeys(fn (string $value): array => [$value => self::formatLabel($value)])
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
            'background' => '1e293b',
            'color' => 'e2e8f0',
            'bold' => 'true',
            'size' => '128',
        ]);
    }
}
