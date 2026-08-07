<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Models\MediaAsset;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class MediaAssetsRelationManager extends RelationManager
{
    protected static string $relationship = 'mediaAssets';

    protected static ?string $title = 'Media';

    protected static ?string $modelLabel = 'Media';

    protected static ?string $pluralModelLabel = 'Media';

    protected static ?string $recordTitleAttribute = 'display_name';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('display_name')
            ->columns([
                Tables\Columns\ImageColumn::make('thumb_url')
                    ->label('Thumbnail')
                    ->state(function (MediaAsset $record): ?string {
                        if (filled($record->public_url) && filter_var($record->public_url, FILTER_VALIDATE_URL)) {
                            return $record->public_url;
                        }
                        if (filled($record->thumbnail_path)) {
                            $disk = $record->storage_disk ?? 'local';
                            try {
                                if (Storage::disk($disk)->exists($record->thumbnail_path)) {
                                    return Storage::disk($disk)->url($record->thumbnail_path);
                                }
                            } catch (\Throwable $e) {
                                return null;
                            }
                        }
                        return null;
                    })
                    ->defaultImageUrl(fn (MediaAsset $record): string => 'https://ui-avatars.com/api/?name=' . urlencode($record->display_name ?? $record->original_name ?? 'Media') . '&background=e2e8f0&color=334155')
                    ->circular(false)
                    ->size(48),

                Tables\Columns\TextColumn::make('display_name')
                    ->label('Nama file')
                    ->state(fn (MediaAsset $record): string => $record->display_name ?? $record->original_name ?? $record->id)
                    ->description(fn (MediaAsset $record): ?string => ($record->display_name !== $record->original_name) ? $record->original_name : null)
                    ->searchable(['display_name', 'original_name'])
                    ->wrap()
                    ->limit(40)
                    ->sortable(['display_name']),

                Tables\Columns\TextColumn::make('media_type')
                    ->label('Jenis media')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => ucfirst($state ?? 'Unknown'))
                    ->color(fn (?string $state): string => match ($state) {
                        'video' => 'info',
                        'image' => 'success',
                        default => 'gray',
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('file_size')
                    ->label('Ukuran')
                    ->formatStateUsing(fn ($state): string => self::formatFileSize($state))
                    ->sortable(),

                Tables\Columns\TextColumn::make('posts_count')
                    ->label('Penggunaan')
                    ->counts('posts')
                    ->badge()
                    ->color('gray')
                    ->description(fn (MediaAsset $record): ?string => 'posting')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: false),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => ucfirst($state?->value ?? $state ?? 'Unknown'))
                    ->color(fn ($state): string => match ($state?->value ?? $state) {
                        'pending' => 'warning',
                        'processing' => 'info',
                        'available' => 'success',
                        'failed' => 'danger',
                        'unavailable' => 'gray',
                        default => 'gray',
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('mime_type')
                    ->label('MIME')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->placeholder('—'),

                Tables\Columns\TextColumn::make('duration_seconds')
                    ->label('Durasi')
                    ->formatStateUsing(fn ($state): string => $state ? gmdate('i:s', (int) $state) : '—')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->sortable(),

                Tables\Columns\TextColumn::make('dimensions')
                    ->label('Dimensi')
                    ->state(fn (MediaAsset $record): string => ($record->width && $record->height) ? "{$record->width}×{$record->height}" : '—')
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Tanggal upload')
                    ->dateTime('d M Y H:i')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('media_type')
                    ->label('Jenis Media')
                    ->options([
                        'video' => 'Video',
                        'image' => 'Gambar',
                    ]),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'pending' => 'Menunggu',
                        'processing' => 'Diproses',
                        'available' => 'Tersedia',
                        'failed' => 'Gagal',
                    ]),
            ])
            ->headerActions([])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->url(fn (MediaAsset $record) => \App\Filament\Resources\MediaAssetResource::getUrl('view', ['record' => $record])),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->paginated([10, 25, 50])
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->withCount('posts'));
    }

    public static function getBadge(Model $ownerRecord, string $pageClass): ?string
    {
        $count = $ownerRecord->mediaAssets()->count();
        return $count > 0 ? (string) $count : null;
    }

    public static function formatFileSize(?int $bytes): string
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
}
