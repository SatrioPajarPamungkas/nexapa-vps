<?php

namespace App\Filament\Pages;

use App\Exceptions\CrmIntegrationException;
use App\Services\Crm\CrmUserDirectoryService;
use Filament\Actions\Action;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Pages\Page;

class CrmUserDetails extends Page
{
    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $slug = 'crm-users/{record}';

    protected static string $view = 'filament.pages.crm-user-details';

    /** @var array<string, mixed> */
    public array $user = [];

    public ?string $crmErrorMessage = null;

    public static function canAccess(): bool
    {
        return auth()->user()?->isAdmin() === true;
    }

    public function mount(string $record): void
    {
        try {
            $this->user = app(CrmUserDirectoryService::class)->findUser($record)->toArray();
        } catch (CrmIntegrationException $exception) {
            $this->crmErrorMessage = $exception->getMessage();
        }
    }

    public function getTitle(): string
    {
        return $this->user === [] ? 'Detail User CRM' : 'Pengguna: '.$this->user['name'];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('back')->label('Kembali ke User CRM')->icon('heroicon-o-arrow-left')->url(CrmUsers::getUrl()),
        ];
    }

    public function userInfolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->state($this->user)
            ->schema([
                Infolists\Components\Section::make('Profil')
                    ->schema([
                        Infolists\Components\ImageEntry::make('avatar_url')->label('Avatar')->circular()->size(64),
                        Infolists\Components\TextEntry::make('id')->label('ID CRM')->copyable(),
                        Infolists\Components\TextEntry::make('name')->label('Nama')->weight('bold'),
                        Infolists\Components\TextEntry::make('email')->label('Email')->copyable(),
                        Infolists\Components\TextEntry::make('provider')->label('Provider login')->badge()->placeholder('Belum tersedia'),
                        Infolists\Components\TextEntry::make('email_confirmed_at')
                            ->label('Verifikasi Email')
                            ->dateTime('d M Y H:i')
                            ->placeholder('Belum terverifikasi')
                            ->formatStateUsing(fn ($state): string => $state ? 'Terverifikasi pada ' . $state->format('d M Y H:i') : 'Belum terverifikasi')
                            ->badge()
                            ->color(fn ($state): string => $state ? 'success' : 'warning'),
                        Infolists\Components\TextEntry::make('last_sign_in_at')
                            ->label('Login Terakhir')
                            ->dateTime('d M Y H:i')
                            ->placeholder('Belum ada'),
                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Terdaftar')
                            ->dateTime('d M Y H:i'),
                        Infolists\Components\TextEntry::make('updated_at')
                            ->label('Terakhir Diubah')
                            ->dateTime('d M Y H:i'),
                    ])
                    ->columns(['default' => 1, 'md' => 2, 'xl' => 3])
                    ->columnSpanFull(),

                Infolists\Components\Section::make('Workspace')
                    ->schema([
                        Infolists\Components\TextEntry::make('account_id')->label('ID Account')->copyable()->placeholder('Belum terhubung'),
                        Infolists\Components\TextEntry::make('account_name')->label('Nama Workspace')->placeholder('Belum terhubung'),
                        Infolists\Components\TextEntry::make('account_role')->label('Role')->badge()->placeholder('Belum tersedia'),
                        Infolists\Components\TextEntry::make('is_account_owner')->label('Pemilik Account')->formatStateUsing(fn (bool $state): string => $state ? 'Ya' : 'Tidak')->badge(),
                        Infolists\Components\TextEntry::make('member_count')->label('Jumlah Member')->numeric()->placeholder('Belum tersedia'),
                        Infolists\Components\TextEntry::make('presence_last_seen_at')->label('Presence Terakhir')->dateTime('d M Y H:i')->placeholder('Tidak tersedia'),
                    ])
                    ->columns(['default' => 1, 'md' => 3])
                    ->columnSpanFull(),

                Infolists\Components\Section::make('Konfigurasi WhatsApp')
                    ->description('Hanya identifier dan status aman. Token dan secret tidak pernah dimuat ke halaman ini.')
                    ->schema([
                        Infolists\Components\TextEntry::make('whatsapp_phone_number_id')->label('Phone Number ID')->copyable()->placeholder('Belum dikonfigurasi'),
                        Infolists\Components\TextEntry::make('whatsapp_waba_id')->label('WABA ID')->copyable()->placeholder('Belum tersedia'),
                        Infolists\Components\TextEntry::make('whatsapp_status')
                            ->label('Status Koneksi')
                            ->badge()
                            ->placeholder('Belum dikonfigurasi')
                            ->formatStateUsing(fn (?string $state): string => match ($state) {
                                'connected' => 'Terhubung',
                                'disconnected' => 'Tidak Terhubung',
                                default => 'Belum dikonfigurasi',
                            })
                            ->color(fn (?string $state): string => match ($state) {
                                'connected' => 'success',
                                'disconnected' => 'danger',
                                default => 'gray',
                            }),
                        Infolists\Components\TextEntry::make('whatsapp_registered_at')
                            ->label('Status Registrasi')
                            ->formatStateUsing(fn ($state): string => $state ? 'Terdaftar' : 'Belum / tidak diketahui')
                            ->badge()
                            ->color(fn ($state): string => $state ? 'success' : 'gray'),
                        Infolists\Components\TextEntry::make('whatsapp_connected_at')
                            ->label('Tanggal Terhubung')
                            ->dateTime('d M Y H:i')
                            ->placeholder('Belum terhubung'),
                    ])
                    ->columns(['default' => 1, 'md' => 3])
                    ->columnSpanFull(),

                Infolists\Components\Section::make('Ringkasan CRM')
                    ->schema([
                        self::summaryEntry('summary.contacts', 'Kontak'),
                        self::summaryEntry('summary.conversations', 'Conversation'),
                        self::summaryEntry('summary.messages', 'Pesan'),
                        self::summaryEntry('summary.broadcasts', 'Kampanye'),
                        self::summaryEntry('summary.templates', 'Template'),
                        self::summaryEntry('summary.automations', 'Otomatisasi'),
                        self::summaryEntry('summary.api_keys', 'API Key'),
                        self::summaryEntry('summary.webhook_endpoints', 'Webhook'),
                    ])
                    ->columns(['default' => 2, 'md' => 4])
                    ->columnSpanFull(),
            ]);
    }

    private static function summaryEntry(string $name, string $label): Infolists\Components\TextEntry
    {
        return Infolists\Components\TextEntry::make($name)->label($label)->numeric()->badge()->placeholder('Belum tersedia');
    }
}
