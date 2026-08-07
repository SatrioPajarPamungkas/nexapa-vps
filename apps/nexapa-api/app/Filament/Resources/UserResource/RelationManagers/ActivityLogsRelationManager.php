<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use App\Models\ActivityLog;
use App\Support\SafeMetadata;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class ActivityLogsRelationManager extends RelationManager
{
    protected static string $relationship = 'activityLogs';

    protected static ?string $title = 'Aktivitas pengguna';

    protected static ?string $recordTitleAttribute = 'title';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('action')->label('Aksi')->searchable()->sortable()->weight('medium'),
                Tables\Columns\TextColumn::make('subject_type')
                    ->label('Resource')
                    ->formatStateUsing(fn (?string $state): string => $state ? class_basename($state) : '—')
                    ->description(fn (ActivityLog $record): ?string => $record->subject_id),
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (?string $state): string => match ($state) {
                        'success', 'completed' => 'success',
                        'failed', 'error' => 'danger',
                        'pending', 'processing' => 'warning',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('safe_metadata')
                    ->label('Ringkasan metadata')
                    ->state(fn (ActivityLog $record): string => SafeMetadata::summary($record->metadata))
                    ->wrap()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')->label('Waktu')->dateTime('d M Y H:i:s')->sortable(),
            ])
            ->headerActions([])
            ->actions([])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->paginated([10, 25, 50]);
    }

    public static function getBadge(Model $ownerRecord, string $pageClass): ?string
    {
        $count = $ownerRecord->getAttribute('activity_logs_count') ?? $ownerRecord->activityLogs()->count();

        return $count > 0 ? (string) $count : null;
    }
}
