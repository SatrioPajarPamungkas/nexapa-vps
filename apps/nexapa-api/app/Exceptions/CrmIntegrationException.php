<?php

namespace App\Exceptions;

use RuntimeException;

class CrmIntegrationException extends RuntimeException
{
    public static function missingConfiguration(): self
    {
        return new self('Konfigurasi integrasi CRM belum lengkap.');
    }

    public static function unavailable(): self
    {
        return new self('Data CRM sedang tidak tersedia. Periksa konfigurasi atau koneksi Supabase.');
    }

    public static function invalidResponse(): self
    {
        return new self('Supabase mengembalikan respons yang tidak valid.');
    }
}
