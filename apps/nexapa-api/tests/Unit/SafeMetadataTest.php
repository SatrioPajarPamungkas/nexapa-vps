<?php

namespace Tests\Unit;

use App\Support\SafeMetadata;
use PHPUnit\Framework\TestCase;

class SafeMetadataTest extends TestCase
{
    public function test_nested_secrets_are_redacted(): void
    {
        $safe = SafeMetadata::sanitize([
            'resource' => 'publisher_post',
            'nested' => [
                'authorization_header' => 'Bearer secret',
                'access_token' => 'secret-token',
                'safe_value' => 'visible',
            ],
        ]);

        $this->assertSame('publisher_post', $safe['resource']);
        $this->assertSame('[DIHAPUS]', $safe['nested']['authorization_header']);
        $this->assertSame('[DIHAPUS]', $safe['nested']['access_token']);
        $this->assertSame('visible', $safe['nested']['safe_value']);
    }
}
