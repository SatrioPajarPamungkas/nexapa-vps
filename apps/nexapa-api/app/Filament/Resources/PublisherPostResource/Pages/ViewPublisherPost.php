<?php

namespace App\Filament\Resources\PublisherPostResource\Pages;

use App\Filament\Resources\PublisherPostResource;
use App\Jobs\PublishPost;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;
use Filament\Actions;
use Illuminate\Support\Facades\DB;

class ViewPublisherPost extends ViewRecord
{
    protected static string $resource = PublisherPostResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('openPermalink')
                ->label('Open Published Post')
                ->color('success')
                ->icon('heroicon-o-arrow-top-right-on-square')
                ->url(fn (): ?string => $this->record->metadata['permalink'] ?? null)
                ->openUrlInNewTab()
                ->visible(fn (): bool => !empty($this->record->metadata['permalink']) && filter_var($this->record->metadata['permalink'] ?? '', FILTER_VALIDATE_URL)),
            Actions\Action::make('retry')
                ->label('Retry')
                ->color('warning')
                ->icon('heroicon-o-arrow-path')
                ->requiresConfirmation()
                ->modalHeading('Retry failed post?')
                ->modalDescription('Post ini akan dimasukkan kembali ke antrean publishing. Pastikan belum ada posting duplikat pada platform tujuan.')
                ->modalSubmitActionLabel('Retry')
                ->modalCancelActionLabel('Cancel')
                ->visible(fn (): bool => $this->record->status === 'failed')
                ->action(function (): void {
                    $logger = app(\App\Services\AdminActivityLogger::class);
                    
                    if (!empty($this->record->provider_publish_id)) {
                        $logger->blocked(
                            'publisher_post.retry_blocked',
                            $this->record,
                            'Retry blocked - post has provider_publish_id',
                            ['platform' => $this->record->platform, 'reason' => 'has_provider_publish_id']
                        );
                        notification()
                            ->title('Cannot retry')
                            ->body('Post ini sudah memiliki provider_publish_id. Verifikasi status di platform terlebih dahulu untuk menghindari duplikat.')
                            ->danger()
                            ->send();
                        return;
                    }

                    if ($this->record->connectedAccount?->status !== 'connected') {
                        $logger->blocked(
                            'publisher_post.retry_blocked',
                            $this->record,
                            'Retry blocked - account not connected',
                            ['platform' => $this->record->platform, 'reason' => 'account_not_connected']
                        );
                        notification()
                            ->title('Cannot retry')
                            ->body('Connected account tidak dalam status connected. Silakan reconnect account terlebih dahulu.')
                            ->danger()
                            ->send();
                        return;
                    }

                    DB::transaction(function () use ($logger) {
                        $this->record->update([
                            'status' => 'queued',
                            'failure_code' => null,
                            'failure_message' => null,
                            'provider_status' => null,
                        ]);

                        PublishPost::dispatch($this->record)->afterCommit();
                        
                        $logger->success(
                            'publisher_post.retry_requested',
                            $this->record,
                            'Post retry requested',
                            ['platform' => $this->record->platform, 'previous_status' => 'failed', 'provider_publish_id_present' => false]
                        );
                    });
                })
                ->successNotificationTitle('Post queued for retry')
                ->failureNotificationTitle('Failed to queue retry'),
            Actions\Action::make('cancel')
                ->label('Cancel')
                ->color('danger')
                ->icon('heroicon-o-x-mark')
                ->requiresConfirmation()
                ->modalHeading('Cancel this post?')
                ->modalDescription('Post yang belum dipublikasikan akan dibatalkan. Media dan data riwayat tetap disimpan.')
                ->modalSubmitActionLabel('Cancel')
                ->modalCancelActionLabel('Cancel')
                ->visible(fn (): bool => in_array($this->record->status, ['scheduled', 'queued']))
                ->action(function (): void {
                    $logger = app(\App\Services\AdminActivityLogger::class);
                    
                    if (in_array($this->record->status, ['completed', 'published', 'publishing', 'processing'])) {
                        $logger->blocked(
                            'publisher_post.cancel_blocked',
                            $this->record,
                            'Cancel blocked - post already published/processing',
                            ['platform' => $this->record->platform, 'reason' => 'already_published']
                        );
                        notification()
                            ->title('Cannot cancel')
                            ->body('Post ini sudah dipublikasikan atau sedang diproses dan tidak dapat dibatalkan.')
                            ->danger()
                            ->send();
                        return;
                    }

                    if (!empty($this->record->provider_publish_id)) {
                        $logger->blocked(
                            'publisher_post.cancel_blocked',
                            $this->record,
                            'Cancel blocked - post has provider_publish_id',
                            ['platform' => $this->record->platform, 'reason' => 'has_provider_publish_id']
                        );
                        notification()
                            ->title('Cannot cancel')
                            ->body('Post ini sudah memiliki provider_publish_id yang menunjukkan publikasi di platform.')
                            ->danger()
                            ->send();
                        return;
                    }

                    DB::transaction(function () use ($logger) {
                        $claimed = DB::table('publisher_posts')
                            ->where('id', $this->record->id)
                            ->whereIn('status', ['scheduled', 'queued'])
                            ->update([
                                'status' => 'cancelled',
                                'updated_at' => now(),
                            ]);

                        if ($claimed === 0) {
                            throw new \Exception('Post is being processed by scheduler');
                        }
                        
                        $logger->success(
                            'publisher_post.cancelled',
                            $this->record,
                            'Post cancelled successfully',
                            ['platform' => $this->record->platform, 'previous_status' => $this->record->status]
                        );
                    });
                })
                ->successNotificationTitle('Post cancelled successfully')
                ->failureNotificationTitle('Failed to cancel post'),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Identity')
                    ->schema([
                        Infolists\Components\TextEntry::make('id')
                            ->label('PublisherPost ID')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('user.name')
                            ->label('Owner')
                            ->description(fn ($record): string => $record->user?->email ?? ''),
                        Infolists\Components\TextEntry::make('platform')
                            ->label('Platform')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => match ($state) {
                                'facebook' => 'Facebook',
                                'tiktok' => 'TikTok',
                                default => $state ?? 'Unknown',
                            }),
                        Infolists\Components\TextEntry::make('action')
                            ->label('Action')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => match ($state) {
                                'publish_now' => 'Publish Now',
                                'schedule' => 'Schedule',
                                'auto_bulk' => 'Auto Bulk',
                                default => ucfirst(str_replace('_', ' ', $state ?? '')),
                            }),
                        Infolists\Components\TextEntry::make('provider_mode')
                            ->label('Provider Mode')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => match ($state) {
                                'direct_post' => 'Direct Post',
                                'upload_as_draft' => 'Upload as Draft',
                                default => ucfirst(str_replace('_', ' ', $state ?? '')),
                            }),
                        Infolists\Components\TextEntry::make('metadata.post_type')
                            ->label('Post Type')
                            ->badge()
                            ->default('-'),
                        Infolists\Components\TextEntry::make('status')
                            ->label('Status')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => ucfirst($state ?? 'Unknown'))
                            ->color(fn ($state): string => match ($state) {
                                'draft' => 'gray',
                                'scheduled' => 'warning',
                                'queued' => 'info',
                                'uploading' => 'primary',
                                'processing' => 'warning',
                                'completed' => 'success',
                                'failed' => 'danger',
                                'cancelled' => 'gray',
                                default => 'gray',
                            }),
                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Created At')
                            ->dateTime('d M Y H:i'),
                        Infolists\Components\TextEntry::make('updated_at')
                            ->label('Updated At')
                            ->dateTime('d M Y H:i'),
                    ])->columns(2),
                Infolists\Components\Section::make('Destination')
                    ->schema([
                        Infolists\Components\TextEntry::make('connected_account.display_name')
                            ->label('Account Name'),
                        Infolists\Components\TextEntry::make('connected_account.account_type')
                            ->label('Account Type')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('connected_account.external_account_id')
                            ->label('External Account ID')
                            ->default('-')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('connected_account.parent.display_name')
                            ->label('Parent Facebook Admin')
                            ->default('-')
                            ->description(fn ($record): string => $record->connectedAccount?->parent ? 'Facebook Admin' : ''),
                    ])->columns(2),
                Infolists\Components\Section::make('Content')
                    ->schema([
                        Infolists\Components\TextEntry::make('caption')
                            ->label('Caption')
                            ->default('-')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('media_asset.display_name')
                            ->label('Media Filename')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('media_asset.media_type')
                            ->label('Media Type')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('media_asset.file_size')
                            ->label('File Size')
                            ->default('-')
                            ->formatStateUsing(fn ($state): string => $state ? number_format($state) . ' bytes' : '-'),
                        Infolists\Components\ImageEntry::make('media_asset.thumbnail_path')
                            ->label('Thumbnail')
                            ->default('-')
                            ->url(function ($record): ?string {
                                if (!$record->mediaAsset?->thumbnail_path) {
                                    return null;
                                }
                                $disk = $record->mediaAsset->storage_disk ?? 'local';
                                $path = $record->mediaAsset->thumbnail_path;
                                if (\Illuminate\Support\Facades\Storage::disk($disk)->exists($path)) {
                                    return \Illuminate\Support\Facades\Storage::disk($disk)->url($path);
                                }
                                return null;
                            }),
                        Infolists\Components\TextEntry::make('media_asset_id')
                            ->label('Media Asset ID')
                            ->default('-')
                            ->copyable(),
                    ])->columns(2),
                Infolists\Components\Section::make('Schedule')
                    ->schema([
                        Infolists\Components\TextEntry::make('scheduled_at')
                            ->label('Scheduled At')
                            ->dateTime('d M Y H:i')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('published_at')
                            ->label('Published At')
                            ->dateTime('d M Y H:i')
                            ->default('-'),
                    ])->columns(2),
                Infolists\Components\Section::make('Provider')
                    ->schema([
                        Infolists\Components\TextEntry::make('provider_status')
                            ->label('Provider Status')
                            ->default('-')
                            ->badge(),
                        Infolists\Components\TextEntry::make('provider_publish_id')
                            ->label('Provider Publish ID')
                            ->default('-')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('metadata.permalink')
                            ->label('Permalink')
                            ->default('-')
                            ->url(fn ($state): ?string => $state ?: null)
                            ->openUrlInNewTab(),
                    ])->columns(2),
                Infolists\Components\Section::make('Failure Information')
                    ->schema([
                        Infolists\Components\TextEntry::make('failure_code')
                            ->label('Failure Code')
                            ->default('-')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('failure_message')
                            ->label('Failure Message')
                            ->default('-')
                            ->copyable()
                            ->columnSpanFull(),
                    ])->columns(2)
                    ->visible(fn ($record): bool => $record->status === 'failed'),
                Infolists\Components\Section::make('Metadata')
                    ->schema([
                        Infolists\Components\TextEntry::make('metadata.post_type')
                            ->label('Post Type')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('metadata.title')
                            ->label('Title')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('metadata.privacy_level')
                            ->label('Privacy Level')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('metadata.disable_comment')
                            ->label('Disable Comment')
                            ->default('-')
                            ->formatStateUsing(fn ($state): string => $state ? 'Yes' : 'No'),
                        Infolists\Components\TextEntry::make('metadata.processing_status')
                            ->label('Processing Status')
                            ->default('-'),
                    ])->columns(2),
            ]);
    }
}