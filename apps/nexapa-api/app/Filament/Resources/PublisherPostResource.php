<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PublisherPostResource\Pages;
use App\Jobs\PublishPost;
use App\Models\PublisherPost;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\HtmlString;

class PublisherPostResource extends Resource
{
    protected static ?string $model = PublisherPost::class;

    protected static ?string $navigationIcon = 'heroicon-o-paper-airplane';

    protected static ?string $navigationLabel = 'Publisher Posts';

    protected static ?int $navigationSort = 4;

    protected static ?string $modelLabel = 'Publisher Post';

    protected static ?string $pluralModelLabel = 'Publisher Posts';

    protected static ?string $navigationGroup = 'Publisher';

    public static function shouldRegisterNavigation(): bool
    {
        return false;
    }

    public static function canAccess(): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Post Information')
                    ->schema([
                        Forms\Components\TextInput::make('caption')
                            ->maxLength(1000),
                        Forms\Components\Select::make('platform')
                            ->options([
                                'facebook' => 'Facebook',
                                'tiktok' => 'TikTok',
                            ]),
                        Forms\Components\Select::make('status')
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
                        Forms\Components\Select::make('action')
                            ->options([
                                'publish_now' => 'Publish Now',
                                'schedule' => 'Schedule',
                                'auto_bulk' => 'Auto Bulk',
                            ]),
                        Forms\Components\Select::make('provider_mode')
                            ->options([
                                'direct_post' => 'Direct Post',
                                'upload_as_draft' => 'Upload as Draft',
                            ]),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('ID')
                    ->sortable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('platform')
                    ->label('Platform')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => ucfirst($state ?? 'Unknown'))
                    ->sortable(),
                Tables\Columns\TextColumn::make('action')
                    ->label('Action')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => ucfirst(str_replace('_', ' ', $state ?? '')))
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => ucfirst($state ?? 'Unknown'))
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created At')
                    ->dateTime('d M Y H:i')
                    ->sortable(),
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
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([]),
            ])
            ->defaultSort('created_at', 'desc')
            ->paginationPageOptions([10, 25, 50, 100]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes(['active']);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPublisherPosts::route('/'),
            'view' => Pages\ViewPublisherPost::route('/{record}'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        return null;
    }
}
