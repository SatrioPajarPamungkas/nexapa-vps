<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class FacebookOAuthCallbackTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Config::set('nexapa.frontend_url', 'https://app.nexapa.app');
        Cache::flush();
    }

    public function test_missing_state_redirects_to_frontend_instead_of_throwing(): void
    {
        $response = $this->get('/api/v1/oauth/facebook/callback?code=unused');

        $response->assertRedirect(
            'https://app.nexapa.app/accounts?oauth_error=invalid_state'
        );
    }

    public function test_consumed_or_unknown_state_redirects_as_expired(): void
    {
        $state = str_repeat('a', 64);

        $response = $this->get(
            '/api/v1/oauth/facebook/callback?state='.$state.'&code=already-used'
        );

        $response->assertRedirect(
            'https://app.nexapa.app/accounts?oauth_error=expired_state'
        );
    }
}
