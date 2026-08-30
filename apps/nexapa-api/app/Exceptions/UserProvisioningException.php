<?php

namespace App\Exceptions;

use RuntimeException;

class UserProvisioningException extends RuntimeException
{
    public static function publisherCreationFailed(string $reason): self
    {
        return new self('Gagal membuat akun Publisher: '.$reason);
    }

    public static function crmCreationFailed(string $reason): self
    {
        return new self('Gagal membuat akun CRM: '.$reason);
    }

    public static function crmNotConfigured(): self
    {
        return new self('Konfigurasi CRM belum lengkap.');
    }

    public static function duplicateEmail(string $product): self
    {
        return new self("Email sudah terdaftar di {$product}.");
    }

    public static function partialFailure(string $failedProduct): self
    {
        return new self("Gagal membuat {$failedProduct}. Perubahan telah dikembalikan.");
    }

    public static function invalidWorkspace(string $workspaceId): self
    {
        return new self('Workspace CRM tidak valid.');
    }

    public static function rollbackFailed(): self
    {
        return new self('Gagal mengembalikan perubahan.');
    }
}
