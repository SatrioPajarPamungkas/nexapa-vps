<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Models\PublisherPost;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PublisherPostsRelationManager extends RelationManager
{
    protected static string $relationship = 'publisherPosts';

    protected static ?string $title = 'Posting';

    protected static ?string $modelLabel = 'Posting';

    protected static ?string $pluralModelLabel = 'Posting';

    protected static ?string $recordTitleAttribute = 'id';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                Tables\Columns\TextColumn::make('post_label')
                    ->label('Caption')
                    ->state(function (PublisherPost $record): string {
                        if (filled($record->caption)) {
                            return Str::limit($record->caption, 80);
                        }
                        if (filled($record->metadata['title'] ?? null)) {
                            return Str::limit($record->metadata['title'], 80);
                        }
                        if ($record->mediaAsset) {
                            return $record->mediaAsset->display_name ?? $record->mediaAsset->original_name ?? Str::limit($record->id, 12);
                        }
                        return Str::limit($record->id, 12);
                    })
                    ->description(function (PublisherPost $record): ?string {
                        if ($record->mediaAsset) {
                            $name = $record->mediaAsset->display_name ?? $record->mediaAsset->original_name ?? null;
                            if (filled($record->caption) && filled($name)) {
                                return $name;
                            }
                        }
                        return null;
                    })
                    ->searchable(query: function (Builder $query, string $search): Builder {
                        return $query->where(function (Builder $q) use ($search) {
                            $q->where('caption', 'like', "%{$search}%")
                                ->orWhere('id', 'like', "%{$search}%");
                        });
                    })
                    ->wrap()
                    ->limit(60),

                Tables\Columns\TextColumn::make('platform')
                    ->label('Platform')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => ucfirst($state ?? 'Unknown'))
                    ->sortable(),

                Tables\Columns\TextColumn::make('connectedAccount.display_name')
                    ->label('Akun Terhubung')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: false)
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => ucfirst($state ?? 'Unknown'))
                    ->color(fn (?string $state): string => match ($state) {
                        'draft' => 'gray',
                        'scheduled' => 'warning',
                        'queued' => 'info',
                        'uploading' => 'primary',
                        'processing' => 'warning',
                        'publishing' => 'warning',
                        'completed', 'published' => 'success',
                        'failed' => 'danger',
                        'cancelled' => 'gray',
                        default => 'gray',
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('failure_short')
                    ->label('Error singkat')
                    ->state(function (PublisherPost $record): ?string {
                        if ($record->status !== 'failed') {
                            return null;
                        }
                        $msg = $record->failure_message ?? $record->failure_code ?? null;
                        if (!filled($msg)) {
                            return null;
                        }
                        return Str::limit(trim($msg), 80);
                    })
                    ->placeholder('—')
                    ->wrap()
                    ->toggleable(isToggledHiddenByDefault: false)
                    ->visible(fn (): bool => PublisherPost::where('status', 'failed')->exists()),

                Tables\Columns\TextColumn::make('scheduled_at')
                    ->label('Jadwal')
                    ->dateTime('d M Y H:i')
                    ->placeholder('—')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('published_at')
                    ->label('Tanggal Publish')
                    ->dateTime('d M Y H:i')
                    ->placeholder('—')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Dibuat')
                    ->dateTime('d M Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\ImageColumn::make('media_thumb')
                    ->label('Media')
                    ->state(function (PublisherPost $record): ?string {
                        $asset = $record->mediaAsset;
                        if (!$asset) {
                            return null;
                        }
                        if (filled($asset->public_url) && filter_var($asset->public_url, FILTER_VALIDATE_URL)) {
                            return $asset->public_url;
                        }
                        if (filled($asset->thumbnail_path)) {
                            $disk = $asset->storage_disk ?? 'local';
                            try {
                                if (\Illuminate\Support\Facades\Storage::disk($disk)->exists($asset->thumbnail_path)) {
                                    return \Illuminate\Support\Facades\Storage::disk($disk)->url($asset->thumbnail_path);
                                }
                            } catch (\Throwable $e) {
                                return null;
                            }
                        }
                        return null;
                    })
                    ->circular(false)
                    ->size(40)
                    ->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('platform')
                    ->options([
                        'facebook' => 'Facebook',
                        'tiktok' => 'TikTok',
                    ]),
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'draft' => 'Draft',
                        'scheduled' => 'Scheduled',
                        'queued' => 'Queued',
                        'uploading' => 'Uploading',
                        'processing' => 'Processing',
                        'publishing' => 'Publishing',
                        'completed' => 'Completed',
                        'failed' => 'Failed',
                        'cancelled' => 'Cancelled',
                    ]),
                Tables\Filters\SelectFilter::make('connected_account_id')
                    ->label('Akun Terhubung')
                    ->relationship('connectedAccount', 'display_name'),
            ])
            ->headerActions([])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->url(fn (PublisherPost $record) => \App\Filament\Resources\PublisherPostResource::getUrl('view', ['record' => $record])),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->paginated([10, 25, 50])
            ->modifyQueryUsing(fn (Builder $query): Builder => $query->with(['mediaAsset', 'connectedAccount']));
    }

    public static function getBadge(Model $ownerRecord, string $pageClass): ?string
    {
        $count = $ownerRecord->publisherPosts()->count();
        return $count > 0 ? (string) $count : null;
    }
}
