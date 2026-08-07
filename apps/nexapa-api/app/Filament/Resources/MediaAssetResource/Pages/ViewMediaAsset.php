<?php

namespace App\Filament\Resources\MediaAssetResource\Pages;

use App\Filament\Resources\MediaAssetResource;
use App\Models\MediaAsset;
use App\Models\PublisherPost;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;
use Filament\Actions;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class ViewMediaAsset extends ViewRecord
{
    protected static string $resource = MediaAssetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('deleteUnused')
                ->label('Delete Unused Media')
                ->color('danger')
                ->icon('heroicon-o-trash')
                ->requiresConfirmation()
                ->modalHeading('Delete unused media?')
                ->modalDescription('File media dan thumbnail akan dihapus permanen dari Nexapa. Postingan di platform tidak akan dihapus.')
                ->modalSubmitActionLabel('Delete')
                ->modalCancelActionLabel('Cancel')
                ->visible(fn (): bool => $this->record->posts_count === 0)
                ->action(function (): void {
                    $mediaAsset = MediaAsset::find($this->record->id);
                    
                    if (!$mediaAsset) {
                        notification()
                            ->title('Media not found')
                            ->body('Media asset tidak ditemukan.')
                            ->danger()
                            ->send();
                        return;
                    }

                    if ($mediaAsset->posts()->exists()) {
                        $logger = app(\App\Services\AdminActivityLogger::class);
                        $logger->blocked(
                            'media_asset.delete_blocked',
                            $mediaAsset,
                            'Media delete blocked - has usage',
                            ['media_type' => $mediaAsset->media_type, 'usage_count' => $mediaAsset->posts()->count()]
                        );
                        notification()
                            ->title('Cannot delete')
                            ->body('Media is used by publisher posts and cannot be deleted.')
                            ->danger()
                            ->send();
                        return;
                    }

                    $logger = app(\App\Services\AdminActivityLogger::class);
                    $metadata = [
                        'media_type' => $mediaAsset->media_type,
                        'file_size' => $mediaAsset->file_size,
                        'usage_count' => 0,
                    ];

                    $storageDisk = $mediaAsset->storage_disk ?? 'local';
                    
                    if ($mediaAsset->storage_path && Storage::disk($storageDisk)->exists($mediaAsset->storage_path)) {
                        Storage::disk($storageDisk)->delete($mediaAsset->storage_path);
                    }

                    if ($mediaAsset->thumbnail_path && Storage::disk($storageDisk)->exists($mediaAsset->thumbnail_path)) {
                        Storage::disk($storageDisk)->delete($mediaAsset->thumbnail_path);
                    }

                    $mediaAsset->delete();
                    
                    $logger->success(
                        'media_asset.deleted',
                        null,
                        'Unused media deleted',
                        $metadata
                    );
                    
                    redirect(static::getResource()::getUrl('index'));
                })
                ->successNotificationTitle('Media deleted successfully')
                ->failureNotificationTitle('Failed to delete media'),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Identity')
                    ->schema([
                        Infolists\Components\TextEntry::make('id')
                            ->label('MediaAsset ID')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('user.name')
                            ->label('Owner')
                            ->description(fn ($record): string => $record->user?->email ?? ''),
                        Infolists\Components\TextEntry::make('original_name')
                            ->label('Original Filename')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('display_name')
                            ->label('Display Name'),
                        Infolists\Components\TextEntry::make('media_type')
                            ->label('Media Type')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => ucfirst($state ?? 'Unknown')),
                        Infolists\Components\TextEntry::make('mime_type')
                            ->label('MIME Type')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('status')
                            ->label('Status')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => ucfirst($state ?? 'Unknown'))
                            ->color(fn ($state): string => match ($state) {
                                'pending' => 'warning',
                                'processing' => 'info',
                                'available' => 'success',
                                'failed' => 'danger',
                                default => 'gray',
                            }),
                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Created At')
                            ->dateTime('d M Y H:i'),
                        Infolists\Components\TextEntry::make('updated_at')
                            ->label('Updated At')
                            ->dateTime('d M Y H:i'),
                    ])->columns(2),
                Infolists\Components\Section::make('File Information')
                    ->schema([
                        Infolists\Components\TextEntry::make('file_size')
                            ->label('File Size')
                            ->formatStateUsing(fn ($state): string => \App\Filament\Resources\MediaAssetResource::formatFileSize($state)),
                        Infolists\Components\TextEntry::make('duration_seconds')
                            ->label('Duration')
                            ->formatStateUsing(fn ($state): string => $state ? gmdate('i:s', $state) : '-'),
                        Infolists\Components\TextEntry::make('width')
                            ->label('Dimensions')
                            ->formatStateUsing(fn ($state, $record): string => $state && $record->height ? "{$state}×{$record->height}" : '-'),
                        Infolists\Components\TextEntry::make('storage_disk')
                            ->label('Storage Disk')
                            ->default('local'),
                        Infolists\Components\TextEntry::make('storage_path')
                            ->label('Storage Path')
                            ->default('-')
                            ->limit(80)
                            ->copyable(),
                        Infolists\Components\TextEntry::make('thumbnail_available')
                            ->label('Thumbnail Available')
                            ->formatStateUsing(fn ($record): string => !empty($record->thumbnail_path) ? 'Yes' : 'No')
                            ->badge()
                            ->color(fn ($record): string => !empty($record->thumbnail_path) ? 'success' : 'gray'),
                        Infolists\Components\TextEntry::make('content_available')
                            ->label('Content Available')
                            ->formatStateUsing(fn ($record): string => !empty($record->storage_path) ? 'Yes' : 'No')
                            ->badge()
                            ->color(fn ($record): string => !empty($record->storage_path) ? 'success' : 'gray'),
                    ])->columns(3),
                Infolists\Components\Section::make('Preview')
                    ->schema([
                        Infolists\Components\ImageEntry::make('thumbnail_path')
                            ->label('Thumbnail')
                            ->default('-')
                            ->url(function ($record): ?string {
                                if (!$record->thumbnail_path) {
                                    return null;
                                }
                                $disk = $record->storage_disk ?? 'local';
                                $path = $record->thumbnail_path;
                                if (\Illuminate\Support\Facades\Storage::disk($disk)->exists($path)) {
                                    return \Illuminate\Support\Facades\Storage::disk($disk)->url($path);
                                }
                                return null;
                            })
                            ->openUrlInNewTab(),
                    ])->columns(1),
                Infolists\Components\Section::make('Usage Statistics')
                    ->schema([
                        Infolists\Components\TextEntry::make('posts_count')
                            ->label('Total Posts')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => $state ?? '0'),
                        Infolists\Components\TextEntry::make('active_posts_count')
                            ->label('Active Posts')
                            ->badge()
                            ->color('warning')
                            ->formatStateUsing(fn ($state): string => $state ?? '0'),
                    ])->columns(2),
                Infolists\Components\Section::make('Recent Posts')
                    ->schema([
                        Infolists\Components\RepeatableEntry::make('recent_posts')
                            ->schema([
                                Infolists\Components\TextEntry::make('id')
                                    ->label('ID')
                                    ->copyable(),
                                Infolists\Components\TextEntry::make('platform')
                                    ->label('Platform')
                                    ->badge(),
                                Infolists\Components\TextEntry::make('status')
                                    ->label('Status')
                                    ->badge(),
                                Infolists\Components\TextEntry::make('destination')
                                    ->label('Destination'),
                                Infolists\Components\TextEntry::make('created_at')
                                    ->label('Created')
                                    ->dateTime('d M Y H:i'),
                            ])->columns(5),
                    ])->visible(fn ($record): bool => $record->posts_count > 0),
            ]);
    }

    protected function mutateStateBeforeFill(array $state): array
    {
        $record = $this->getRecord();
        
        $recentPosts = \App\Models\PublisherPost::where('media_asset_id', $record->id)
            ->with('connectedAccount')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($post) => [
                'id' => $post->id,
                'platform' => $post->platform,
                'status' => $post->status,
                'destination' => $post->connectedAccount?->display_name ?? '-',
                'created_at' => $post->created_at,
            ])
            ->toArray();

        return array_merge($state, [
            'thumbnail_available' => !empty($record->thumbnail_path),
            'content_available' => !empty($record->storage_path),
            'posts_count' => $record->posts_count ?? 0,
            'active_posts_count' => $record->active_posts_count ?? 0,
            'recent_posts' => $recentPosts,
        ]);
    }
}