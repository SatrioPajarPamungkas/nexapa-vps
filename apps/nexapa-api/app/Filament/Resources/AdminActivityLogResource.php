<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AdminActivityLogResource\Pages;
use App\Models\ActivityLog;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class AdminActivityLogResource extends Resource
{
    protected static ?string $model = ActivityLog::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';

    protected static ?string $navigationLabel = 'Activity Log';

    protected static ?int $navigationSort = 9;

    protected static ?string $modelLabel = 'Activity Log';

    protected static ?string $pluralModelLabel = 'Activity Logs';

    protected static ?string $navigationGroup = 'Operasional Sistem';

    protected static ?string $recordTitleAttribute = 'title';

    public static function canAccess(): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Activity Details')
                    ->schema([
                        Forms\Components\TextInput::make('action')
                            ->maxLength(255),
                        Forms\Components\TextInput::make('title')
                            ->maxLength(255),
                        Forms\Components\Select::make('status')
                            ->options([
                                'success' => 'Success',
                                'failed' => 'Failed',
                                'blocked' => 'Blocked',
                            ]),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Time')
                    ->dateTime('d M Y H:i:s')
                    ->sortable(),
                Tables\Columns\Layout\Stack::make([
                    Tables\Columns\TextColumn::make('user.name')
                        ->label('Admin')
                        ->searchable(['user.name', 'user.email'])
                        ->sortable('user.name')
                        ->description(fn ($record): string => $record->user?->email ?? '-'),
                ]),
                Tables\Columns\TextColumn::make('action')
                    ->label('Action')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => str_replace('_', ' ', $state ?? ''))
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('title')
                    ->label('Description')
                    ->limit(50)
                    ->tooltip(fn ($record): ?string => $record->title)
                    ->searchable(),
                Tables\Columns\Layout\Stack::make([
                    Tables\Columns\TextColumn::make('subject_type')
                        ->label('Subject')
                        ->formatStateUsing(fn ($state, $record): string => $state ? class_basename($state) : '-')
                        ->description(fn ($record): string => $record->subject_id ? 'ID: ' . $record->subject_id : ''),
                ]),
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => ucfirst($state ?? 'Unknown'))
                    ->colors([
                        'success' => 'success',
                        'failed' => 'danger',
                        'blocked' => 'warning',
                    ])
                    ->sortable(),
                Tables\Columns\TextColumn::make('ip_address')
                    ->label('IP Address')
                    ->toggleable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('user_agent')
                    ->label('User Agent')
                    ->limit(30)
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('user')
                    ->label('Admin User')
                    ->relationship('user', 'name'),
                Tables\Filters\SelectFilter::make('action')
                    ->options([
                        'user.promoted_to_super_admin' => 'User Promoted to Super Admin',
                        'user.demoted_to_user' => 'User Demoted',
                        'user.role_change_blocked' => 'Role Change Blocked',
                        'connected_account.require_reconnect' => 'Require Reconnect',
                        'connected_account.disconnected' => 'Account Disconnected',
                        'connected_account.disconnect_blocked' => 'Disconnect Blocked',
                        'publisher_post.retry_requested' => 'Post Retry Requested',
                        'publisher_post.retry_blocked' => 'Post Retry Blocked',
                        'publisher_post.cancelled' => 'Post Cancelled',
                        'publisher_post.cancel_blocked' => 'Cancel Blocked',
                        'media_asset.deleted' => 'Media Deleted',
                        'media_asset.bulk_delete' => 'Media Bulk Delete',
                        'media_asset.clear_unused' => 'Media Clear Unused',
                        'media_asset.delete_blocked' => 'Media Delete Blocked',
                        'queue_job.retry_requested' => 'Job Retry Requested',
                        'queue_job.retry_blocked' => 'Job Retry Blocked',
                        'queue_job.forgotten' => 'Job Forgotten',
                        'settings.updated' => 'Settings Updated',
                        'settings.update_failed' => 'Settings Update Failed',
                    ]),
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'success' => 'Success',
                        'failed' => 'Failed',
                        'blocked' => 'Blocked',
                    ]),
                Tables\Filters\SelectFilter::make('subject_type')
                    ->label('Subject Type')
                    ->options([
                        'App\Models\User' => 'User',
                        'App\Models\ConnectedAccount' => 'Connected Account',
                        'App\Models\PublisherPost' => 'Publisher Post',
                        'App\Models\MediaAsset' => 'Media Asset',
                    ]),
                Tables\Filters\Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('from')
                            ->label('From'),
                        Forms\Components\DatePicker::make('until')
                            ->label('Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'], fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date))
                            ->when($data['until'], fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date));
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([]),
            ])
            ->defaultSort('created_at', 'desc')
            ->paginationPageOptions([25, 50, 100]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->with(['user'])
            ->where('category', 'admin');
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
            'index' => Pages\ListAdminActivityLogs::route('/'),
            'view' => Pages\ViewAdminActivityLog::route('/{record}'),
        ];
    }

    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::where('category', 'admin')->count();
    }
}
