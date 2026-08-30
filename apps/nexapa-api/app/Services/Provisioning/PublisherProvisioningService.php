<?php

namespace App\Services\Provisioning;

use App\Data\Provisioning\ProvisioningInput;
use App\Data\Provisioning\UserProvisioningResult;
use App\Exceptions\UserProvisioningException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PublisherProvisioningService
{
    public function create(ProvisioningInput $input): UserProvisioningResult
    {
        $normalizedEmail = $input->normalizedEmail();

        if ($this->emailExists($normalizedEmail)) {
            throw UserProvisioningException::duplicateEmail('Publisher');
        }

        $temporaryPassword = $this->getPassword($input);
        $passwordHash = Hash::make($temporaryPassword);

        $user = User::create([
            'name' => $input->fullName,
            'email' => $normalizedEmail,
            'password' => $passwordHash,
            'role' => $input->publisherRole,
            'email_verified_at' => $input->emailVerified ? now() : null,
        ]);

        return new UserProvisioningResult(
            publisherCreated: true,
            publisherUserId: $user->id,
            temporaryPassword: $input->useTemporaryPassword() ? $temporaryPassword : null,
        );
    }

    public function delete(int $userId): void
    {
        User::where('id', $userId)->delete();
    }

    public function emailExists(string $normalizedEmail): bool
    {
        $normalizedEmail = strtolower(trim($normalizedEmail));

        return User::whereRaw('LOWER(email) = LOWER(?)', [$normalizedEmail])->exists();
    }

    public function generateTemporaryPassword(int $length = 16): string
    {
        return Str::password($length);
    }

    private function getPassword(ProvisioningInput $input): string
    {
        if ($input->useTemporaryPassword() && $input->temporaryPassword !== null) {
            return $input->temporaryPassword;
        }

        return $this->generateTemporaryPassword();
    }
}
