<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Models\User;
use App\Services\AdminActivityLogger;
use Filament\Actions;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;

class ViewUser extends ViewRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('toggleAdmin')
                ->label(fn (User $record): string => $record->is_admin ? 'Cabut status admin' : 'Jadikan admin')
                ->icon(fn (User $record): string => $record->is_admin ? 'heroicon-o-user-minus' : 'heroicon-o-user-plus')
                ->color(fn (User $record): string => $record->is_admin ? 'danger' : 'success')
                ->requiresConfirmation()
                ->modalHeading(fn (User $record): string => $record->is_admin ? 'Hapus akses admin?' : 'Berikan akses admin?')
                ->modalDescription(fn (User $record): string => $record->is_admin
                    ? 'User ini tidak akan dapat mengakses panel admin setelah status admin dihapus.'
                    : 'User ini akan memperoleh akses penuh ke panel admin Nexapa.')
                ->disabled(fn (User $record): bool => (int) auth()->id() === (int) $record->getKey())
                ->tooltip(fn (User $record): ?string => (int) auth()->id() === (int) $record->getKey() ? 'Anda tidak dapat mengubah akses admin diri sendiri.' : null)
                ->action(function (User $record): void {
                    $oldValue = $record->is_admin;
                    $record->forceFill(['is_admin' => ! $oldValue])->save();

                    app(AdminActivityLogger::class)->success(
                        action: $oldValue ? 'user.admin_removed' : 'user.admin_granted',
                        subject: $record,
                        description: $oldValue ? "Akses admin {$record->email} dihapus." : "Akses admin {$record->email} diberikan.",
                        metadata: ['target_user_id' => $record->getKey(), 'is_admin' => ! $oldValue],
                    );

                    Notification::make()->success()->title('Status admin diperbarui')->send();
                    $this->refreshFormData(['is_admin']);
                }),

            Actions\Action::make('verifyEmail')
                ->label('Tandai email terverifikasi')
                ->icon('heroicon-o-check-badge')
                ->color('success')
                ->requiresConfirmation()
                ->modalDescription('Email akan ditandai terverifikasi tanpa mengirim tautan verifikasi.')
                ->visible(fn (User $record): bool => $record->email_verified_at === null)
                ->action(function (User $record): void {
                    $record->markEmailAsVerified();

                    app(AdminActivityLogger::class)->success(
                        action: 'user.email_verified',
                        subject: $record,
                        description: "Email {$record->email} ditandai terverifikasi oleh admin.",
                        metadata: ['target_user_id' => $record->getKey()],
                    );

                    Notification::make()->success()->title('Email ditandai terverifikasi')->send();
                    $this->refreshFormData(['email_verified_at']);
                }),

            Actions\Action::make('resendVerification')
                ->label('Kirim ulang verifikasi')
                ->icon('heroicon-o-envelope')
                ->requiresConfirmation()
                ->visible(fn (User $record): bool => $record->email_verified_at === null)
                ->action(function (User $record): void {
                    $record->sendEmailVerificationNotification();

                    app(AdminActivityLogger::class)->success(
                        action: 'user.verification_resent',
                        subject: $record,
                        description: "Email verifikasi dikirim ulang ke {$record->email}.",
                        metadata: ['target_user_id' => $record->getKey()],
                    );

                    Notification::make()->success()->title('Email verifikasi dikirim ulang')->send();
                }),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Profil Pengguna')
                    ->schema([
                        Infolists\Components\ImageEntry::make('google_avatar_url')
                            ->label('Avatar')
                            ->circular()
                            ->size(64)
                            ->defaultImageUrl(fn (User $record): string => self::getInitialsAvatarUrl($record->name)),
                        Infolists\Components\TextEntry::make('id')->label('ID Publisher')->copyable(),
                        Infolists\Components\TextEntry::make('name')->label('Nama')->weight('bold'),
                        Infolists\Components\TextEntry::make('email')->label('Email')->copyable(),
                        Infolists\Components\TextEntry::make('role')->label('Role')->badge()->formatStateUsing(fn (?string $state): string => str($state ?: 'user')->title()->toString()),
                        Infolists\Components\TextEntry::make('is_admin')
                            ->label('Status Admin')
                            ->state(fn (User $record): string => $record->is_admin ? 'Admin' : 'User')
                            ->badge()
                            ->color(fn (string $state): string => $state === 'Admin' ? 'success' : 'gray'),
                        Infolists\Components\TextEntry::make('login_provider')
                            ->label('Provider Login')
                            ->state(fn (User $record): string => filled($record->google_id) ? 'Google' : 'Email')
                            ->badge()
                            ->color(fn (string $state): string => $state === 'Google' ? 'info' : 'gray'),
                        Infolists\Components\TextEntry::make('google_id_safe')
                            ->label('Google ID')
                            ->state(fn (User $record): ?string => self::maskIdentifier($record->google_id))
                            ->placeholder('Tidak tersedia'),
                        Infolists\Components\TextEntry::make('email_verified_at')
                            ->label('Verifikasi Email')
                            ->dateTime('d M Y H:i')
                            ->placeholder('Belum terverifikasi')
                            ->formatStateUsing(fn ($state): string => $state ? 'Terverifikasi pada ' . $state->format('d M Y H:i') : 'Belum terverifikasi')
                            ->badge()
                            ->color(fn ($state): string => $state ? 'success' : 'warning'),
                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Terdaftar')
                            ->dateTime('d M Y H:i'),
                        Infolists\Components\TextEntry::make('updated_at')
                            ->label('Terakhir Diubah')
                            ->dateTime('d M Y H:i'),
                    ])
                    ->columns(['default' => 1, 'md' => 2, 'xl' => 4])
                    ->columnSpanFull(),

                Infolists\Components\Section::make('Ringkasan Penggunaan')
                    ->schema([
                        self::countEntry('connected_accounts_count', 'Akun Sosial', 'info'),
                        self::countEntry('media_assets_count', 'Media Assets', 'gray'),
                        self::countEntry('publisher_posts_count', 'Posting', 'primary'),
                        self::countEntry('collections_count', 'Collections', 'gray'),
                        self::countEntry('activity_logs_count', 'Aktivitas', 'gray'),
                        self::countEntry('scheduled_publisher_posts_count', 'Jadwal Posting', 'warning'),
                        self::countEntry('successful_publisher_posts_count', 'Posting Berhasil', 'success'),
                        self::countEntry('failed_publisher_posts_count', 'Posting Gagal', 'danger'),
                    ])
                    ->columns(['default' => 2, 'md' => 4])
                    ->columnSpanFull(),
            ]);
    }

    private static function countEntry(string $name, string $label, string $color = 'gray'): Infolists\Components\TextEntry
    {
        return Infolists\Components\TextEntry::make($name)
            ->label($label)
            ->numeric()
            ->badge()
            ->color($color);
    }

    private static function maskIdentifier(?string $identifier): ?string
    {
        if (blank($identifier)) {
            return null;
        }

        return '••••••'.substr($identifier, -6);
    }

    private static function getInitialsAvatarUrl(string $name): string
    {
        return 'https://ui-avatars.com/api/?'.http_build_query([
            'name' => $name,
            'background' => '1e293b',
            'color' => 'e2e8f0',
            'bold' => 'true',
            'size' => '128',
        ]);
    }
}
