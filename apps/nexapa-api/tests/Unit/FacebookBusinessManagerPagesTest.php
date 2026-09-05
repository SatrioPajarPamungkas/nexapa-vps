<?php

namespace Tests\Unit;

use App\Services\OAuth\FacebookOAuthService;
use App\Services\SettingsService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class FacebookBusinessManagerPagesTest extends TestCase
{
    public function test_it_merges_direct_owned_and_client_pages_without_duplicates(): void
    {
        Config::set('nexapa.facebook.app_id', 'test-app-id');
        Config::set('nexapa.facebook.app_secret', 'test-app-secret');
        Config::set('nexapa.facebook.redirect_uri', 'https://api.nexapa.app/api/v1/oauth/facebook/callback');
        Config::set('nexapa.facebook.graph_api_version', 'v21.0');

        $settings = Mockery::mock(SettingsService::class);
        $settings->shouldReceive('getFacebookSettings')
            ->andReturn([
                'facebook_app_id' => null,
                'facebook_app_secret' => null,
                'facebook_graph_api_version' => null,
                'facebook_configuration_id' => null,
            ]);

        Http::fake(function (Request $request) {
            $url = $request->url();

            if (str_contains($url, '/me/accounts')) {
                return Http::response([
                    'data' => [[
                        'id' => 'page-direct',
                        'name' => 'Direct Page',
                        'access_token' => 'direct-token',
                        'tasks' => ['CREATE_CONTENT'],
                    ]],
                ]);
            }

            if (str_contains($url, '/me/businesses')) {
                return Http::response([
                    'data' => [[
                        'id' => 'business-1',
                        'name' => 'Nexapa Business',
                    ]],
                ]);
            }

            if (str_contains($url, '/business-1/owned_pages')) {
                return Http::response([
                    'data' => [
                        [
                            'id' => 'page-direct',
                            'name' => 'Direct Page',
                            'access_token' => 'owned-token',
                            'tasks' => ['CREATE_CONTENT'],
                        ],
                        [
                            'id' => 'page-owned',
                            'name' => 'Owned Page',
                            'access_token' => 'owned-page-token',
                            'tasks' => ['CREATE_CONTENT'],
                        ],
                    ],
                ]);
            }

            if (str_contains($url, '/business-1/client_pages')) {
                return Http::response([
                    'data' => [[
                        'id' => 'page-client',
                        'name' => 'Client Page',
                        'access_token' => 'client-page-token',
                        'tasks' => ['CREATE_CONTENT'],
                    ]],
                ]);
            }

            return Http::response([], 404);
        });

        $service = new FacebookOAuthService($settings);
        $pages = $service->fetchManagedPages('user-token');

        $this->assertCount(3, $pages);
        $this->assertSame(
            ['page-client', 'page-direct', 'page-owned'],
            collect($pages)->pluck('id')->sort()->values()->all()
        );

        $ownedPage = collect($pages)->firstWhere('id', 'page-owned');
        $this->assertSame('business_owned_pages', $ownedPage['source_edge']);
        $this->assertSame('business-1', $ownedPage['business_id']);
        $this->assertSame('Nexapa Business', $ownedPage['business_name']);

        Http::assertSentCount(4);
    }
}
