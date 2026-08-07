<?php

namespace App\Filament\Resources\AdminActivityLogResource\Pages;

use App\Filament\Resources\AdminActivityLogResource;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;

class ViewAdminActivityLog extends ViewRecord
{
    protected static string $resource = AdminActivityLogResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Identity')
                    ->schema([
                        Infolists\Components\TextEntry::make('id')
                            ->label('Log ID')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Timestamp')
                            ->dateTime('d M Y H:i:s'),
                        Infolists\Components\TextEntry::make('status')
                            ->label('Status')
                            ->badge()
                            ->formatStateUsing(fn ($state): string => ucfirst($state ?? 'Unknown'))
                            ->color(fn ($state): string => match ($state) {
                                'success' => 'success',
                                'failed' => 'danger',
                                'blocked' => 'warning',
                                default => 'gray',
                            }),
                    ])->columns(3),
                Infolists\Components\Section::make('Admin')
                    ->schema([
                        Infolists\Components\TextEntry::make('user.name')
                            ->label('Admin Name')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('user.email')
                            ->label('Admin Email')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('ip_address')
                            ->label('IP Address')
                            ->default('-')
                            ->copyable(),
                        Infolists\Components\TextEntry::make('user_agent')
                            ->label('User Agent')
                            ->default('-')
                            ->limit(100),
                    ])->columns(2),
                Infolists\Components\Section::make('Action')
                    ->schema([
                        Infolists\Components\TextEntry::make('action')
                            ->label('Action')
                            ->formatStateUsing(fn ($state): string => str_replace('_', ' ', $state ?? '')),
                        Infolists\Components\TextEntry::make('title')
                            ->label('Description')
                            ->columnSpanFull(),
                        Infolists\Components\TextEntry::make('category')
                            ->label('Category')
                            ->badge(),
                    ])->columns(2),
                Infolists\Components\Section::make('Subject')
                    ->schema([
                        Infolists\Components\TextEntry::make('subject_type')
                            ->label('Subject Type')
                            ->formatStateUsing(fn ($state): string => $state ? class_basename($state) : '-')
                            ->default('-'),
                        Infolists\Components\TextEntry::make('subject_id')
                            ->label('Subject ID')
                            ->default('-')
                            ->copyable(),
                    ])->columns(2)
                    ->visible(fn ($record): bool => $record->subject_type !== null),
                Infolists\Components\Section::make('Metadata')
                    ->schema([
                        Infolists\Components\TextEntry::make('metadata')
                            ->label('Metadata')
                            ->formatStateUsing(fn ($state): string => json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES))
                            ->default('-')
                            ->columnSpanFull(),
                    ])
                    ->visible(fn ($record): bool => !empty($record->metadata)),
                Infolists\Components\Section::make('Note')
                    ->schema([
                        Infolists\Components\Placeholder::make('retention_note')
                            ->label('Retention')
                            ->content('Activity logs are retained for administrative auditing.'),
                    ]),
            ]);
    }
}