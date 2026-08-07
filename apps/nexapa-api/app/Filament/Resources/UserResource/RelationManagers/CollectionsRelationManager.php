<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class CollectionsRelationManager extends RelationManager
{
    protected static string $relationship = 'collections';

    protected static ?string $title = 'Collection';

    protected static ?string $recordTitleAttribute = 'name';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nama Collection')->searchable()->sortable()->weight('medium'),
                Tables\Columns\TextColumn::make('media_count')->label('Jumlah media')->numeric()->badge()->sortable(),
                Tables\Columns\TextColumn::make('source_platform')->label('Platform sumber')->badge()->placeholder('—')->toggleable(),
                Tables\Columns\TextColumn::make('created_at')->label('Dibuat')->dateTime('d M Y H:i')->sortable(),
            ])
            ->headerActions([])
            ->actions([])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc')
            ->paginated([10, 25]);
    }

    public static function getBadge(Model $ownerRecord, string $pageClass): ?string
    {
        $count = $ownerRecord->getAttribute('collections_count') ?? $ownerRecord->collections()->count();

        return $count > 0 ? (string) $count : null;
    }
}
