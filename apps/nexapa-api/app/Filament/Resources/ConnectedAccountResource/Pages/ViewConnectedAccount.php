<?php

namespace App\Filament\Resources\ConnectedAccountResource\Pages;

use App\Filament\Resources\ConnectedAccountResource;
use App\Models\ConnectedAccount;
use App\Models\PublisherPost;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;
use Illuminate\Support\Str;

class ViewConnectedAccount extends ViewRecord
{
    protected static string $resource = ConnectedAccountResource::class;

    /** @var array{total: int, completed: int, failed: int, active: int} */
    public array $usage = [
        'total' => 0,
        'completed' => 0,
        'failed' => 0,
        'active' => 0,
    ];

    public function mount(int|string $record): void
    {
        parent::mount($record);

        $counts = PublisherPost::query()
            ->where('connected_account_id', $this->getRecord()->getKey())
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status IN ('completed', 'published') THEN 1 ELSE 0 END) as completed")
            ->selectRaw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
            ->selectRaw("SUM(CASE WHEN status IN ('queued', 'uploading', 'processing', 'publishing', 'scheduled') THEN 1 ELSE 0 END) as active")
            ->first();

        $this->usage = [
            'total' => (int) ($counts?->total ?? 0),
            'completed' => (int) ($counts?->completed ?? 0),
            'failed' => (int) ($counts?->failed ?? 0),
            'active' => (int) ($counts?->active ?? 0),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Account')
                    ->schema([
                        Infolists\Components\ImageEntry::make('avatar_url')
                            ->label('Avatar')
                            ->circular()
                            ->size(80)
                            ->defaultImageUrl(fn (ConnectedAccount $record): string => $this->getInitialsAvatarUrl($record->display_name)),
                        Infolists\Components\TextEntry::make('display_name')
                            ->label('Name'),
                        Infolists\Components\TextEntry::make('platform')
                            ->badge()
                            ->formatStateUsing(fn (?string $state): string => $this->formatLabel($state)),
                        Infolists\Components\TextEntry::make('account_type')
                            ->label('Account Type')
                            ->badge()
                            ->formatStateUsing(fn (?string $state): string => $this->formatLabel($state)),
                        Infolists\Components\TextEntry::make('status')
                            ->badge()
                            ->formatStateUsing(fn (?string $state): string => $this->formatLabel($state))
                            ->color(fn (?string $state): string => match ($state) {
                                'connected' => 'success',
                                'disconnected' => 'gray',
                                'expired' => 'danger',
                                'error' => 'warning',
                                default => 'gray',
                            }),
                        Infolists\Components\TextEntry::make('external_account_id')
                            ->label('External Account ID')
                            ->copyable()
                            ->placeholder('—'),
                        Infolists\Components\TextEntry::make('parent.display_name')
                            ->label('Parent Account')
                            ->placeholder('—'),
                        Infolists\Components\TextEntry::make('user.name')
                            ->label('Owner')
                            ->placeholder('No owner'),
                        Infolists\Components\TextEntry::make('user.email')
                            ->label('Owner Email')
                            ->placeholder('—'),
                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Created At')
                            ->dateTime('d M Y H:i'),
                        Infolists\Components\TextEntry::make('updated_at')
                            ->label('Updated At')
                            ->dateTime('d M Y H:i'),
                    ])
                    ->columns(2),
                Infolists\Components\Section::make('Connection')
                    ->schema([
                        Infolists\Components\TextEntry::make('token_available')
                            ->label('Token Available')
                            ->state(fn (ConnectedAccount $record): string => filled($record->getRawOriginal('access_token_encrypted')) ? 'Yes' : 'No')
                            ->badge()
                            ->color(fn (ConnectedAccount $record): string => filled($record->getRawOriginal('access_token_encrypted')) ? 'success' : 'gray'),
                        Infolists\Components\TextEntry::make('token_expires_at')
                            ->label('Token Expiry')
                            ->dateTime('d M Y H:i')
                            ->placeholder('Unknown'),
                        Infolists\Components\TextEntry::make('token_expired')
                            ->label('Expired')
                            ->state(fn (ConnectedAccount $record): string => match (true) {
                                $record->token_expires_at === null => 'Unknown',
                                $record->token_expires_at->isPast() => 'Yes',
                                default => 'No',
                            })
                            ->badge()
                            ->color(fn (ConnectedAccount $record): string => match (true) {
                                $record->token_expires_at === null => 'gray',
                                $record->token_expires_at->isPast() => 'danger',
                                default => 'success',
                            }),
                        Infolists\Components\TextEntry::make('last_validated_at')
                            ->label('Last Synced')
                            ->dateTime('d M Y H:i')
                            ->placeholder('—'),
                    ])
                    ->columns(4),
                Infolists\Components\Section::make('Usage')
                    ->schema([
                        Infolists\Components\TextEntry::make('usage_total')
                            ->label('Total Publisher Posts')
                            ->state(fn (): int => $this->usage['total']),
                        Infolists\Components\TextEntry::make('usage_completed')
                            ->label('Completed/Published')
                            ->state(fn (): int => $this->usage['completed'])
                            ->badge()
                            ->color('success'),
                        Infolists\Components\TextEntry::make('usage_failed')
                            ->label('Failed')
                            ->state(fn (): int => $this->usage['failed'])
                            ->badge()
                            ->color('danger'),
                        Infolists\Components\TextEntry::make('usage_active')
                            ->label('Scheduled/Active')
                            ->state(fn (): int => $this->usage['active'])
                            ->badge()
                            ->color('warning'),
                    ])
                    ->columns(4),
            ]);
    }

    private function formatLabel(?string $value): string
    {
        return filled($value) ? Str::of($value)->replace('_', ' ')->title()->toString() : 'Unknown';
    }

    private function getInitialsAvatarUrl(string $name): string
    {
        return 'https://ui-avatars.com/api/?' . http_build_query([
            'name' => $name,
            'background' => 'e2e8f0',
            'color' => '334155',
            'bold' => 'true',
        ]);
    }
}
