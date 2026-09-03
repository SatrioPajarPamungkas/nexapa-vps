<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserActivityLogResource\Pages;
use App\Models\ActivityLog;
use App\Support\SafeMetadata;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class UserActivityLogResource extends Resource
{
    protected static ?string $model = ActivityLog::class;

    protected static ?string $navigationIcon = 'heroicon-o-clock';

    protected static ?string $navigationLabel = 'Riwayat User';

    protected static ?string $pluralModelLabel = 'Riwayat User';

    protected static ?string $navigationGroup = 'Manajemen Pengguna';

    protected static ?int $navigationSort = 3;

    public static function canAccess(): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Waktu')
                    ->dateTime('d M Y H:i:s')
                    ->sortable(),
                Tables\Columns\TextColumn::make('actor_name')
                    ->label('User')
                    ->state(fn (ActivityLog $record): string => $record->actor_name ?? $record->user?->name ?? 'Tidak dikenal')
                    ->description(fn (ActivityLog $record): string => $record->actor_email ?? $record->user?->email ?? '-')
                    ->searchable(['actor_name', 'actor_email']),
                Tables\Columns\TextColumn::make('product')
                    ->label('Produk')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'crm' => 'CRM',
                        'publisher' => 'Publisher',
                        default => 'Legacy',
                    }),
                Tables\Columns\TextColumn::make('action')
                    ->label('Aktivitas')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => str_replace(['.', '_'], ' ', $state ?? ''))
                    ->searchable(),
                Tables\Columns\TextColumn::make('title')
                    ->label('Keterangan')
                    ->wrap()
                    ->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (?string $state): string => match ($state) {
                        'success', 'completed' => 'success',
                        'failed', 'error' => 'danger',
                        'blocked' => 'warning',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('ip_address')
                    ->label('IP')
                    ->searchable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('user_agent')
                    ->label('Perangkat')
                    ->limit(40)
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('safe_metadata')
                    ->label('Metadata')
                    ->state(fn (ActivityLog $record): string => SafeMetadata::summary($record->metadata))
                    ->wrap()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('product_scope')
                    ->label('Produk akun')
                    ->options([
                        'publisher' => 'Publisher',
                        'crm' => 'CRM',
                        'both' => 'Publisher + CRM',
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        $value = $data['value'] ?? null;
                        if (in_array($value, ['publisher', 'crm'], true)) {
                            return $query->where('product', $value);
                        }

                        if ($value === 'both') {
                            return $query->whereIn('actor_email', function ($subquery): void {
                                $subquery->select('actor_email')
                                    ->from('activity_logs')
                                    ->whereIn('product', ['publisher', 'crm'])
                                    ->whereNotNull('actor_email')
                                    ->groupBy('actor_email')
                                    ->havingRaw('COUNT(DISTINCT product) = 2');
                            });
                        }

                        return $query;
                    }),
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'success' => 'Berhasil',
                        'failed' => 'Gagal',
                        'blocked' => 'Diblokir',
                    ]),
                Tables\Filters\Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('from')->label('Dari'),
                        Forms\Components\DatePicker::make('until')->label('Sampai'),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['from'], fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date))
                        ->when($data['until'], fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date))),
            ])
            ->actions([])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->paginationPageOptions([25, 50, 100]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->with('user')
            ->whereIn('product', ['publisher', 'crm']);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ListUserActivityLogs::route('/')];
    }
}
