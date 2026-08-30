<?php

namespace App\Services;

use App\Models\AdminUserCredential;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Str;

class AdminCredentialVaultService
{
    public function store(string $email, array $products, string $password, ?int $actorId): AdminUserCredential
    {
        $creatorId = $actorId !== null && User::whereKey($actorId)->exists() ? $actorId : null;

        return AdminUserCredential::updateOrCreate(
            ['normalized_email' => $this->normalizeEmail($email)],
            [
                'products' => array_values(array_unique($products)),
                'password' => $password,
                'created_by' => $creatorId,
                'password_updated_at' => now(),
            ],
        );
    }

    public function find(string $email): ?AdminUserCredential
    {
        return AdminUserCredential::where('normalized_email', $this->normalizeEmail($email))->first();
    }

    public function reveal(string $email, ?int $actorId): ?string
    {
        if (! auth()->user()?->isAdmin()) {
            throw new AuthorizationException('Hanya Super Admin yang dapat melihat password akun.');
        }

        $credential = $this->find($email);

        app(AdminActivityLogger::class)->success(
            'user.password_viewed',
            description: $credential ? 'Password akun dilihat oleh admin.' : 'Admin mencoba melihat password yang belum tersimpan.',
            metadata: [
                'email_hash' => hash('sha256', $this->normalizeEmail($email)),
                'actor_id' => $actorId,
                'credential_found' => $credential !== null,
            ],
        );

        return $credential?->password;
    }

    public function delete(string $email): void
    {
        AdminUserCredential::where('normalized_email', $this->normalizeEmail($email))->delete();
    }

    private function normalizeEmail(string $email): string
    {
        return Str::lower(trim($email));
    }
}
