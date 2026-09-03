<?php

namespace App\Providers;

use App\Console\Commands\DownloadPurgeOrphanStorage;
use App\Models\PublisherPost;
use App\Observers\PublisherPostObserver;
use App\Listeners\AccountAuthenticationSubscriber;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        PublisherPost::observe(PublisherPostObserver::class);
        Event::subscribe(AccountAuthenticationSubscriber::class);
        \Illuminate\Http\Resources\Json\JsonResource::withoutWrapping();

        // Register console commands manually if auto-discovery is not enabled
        if ($this->app->runningInConsole()) {
            $this->commands([
                DownloadPurgeOrphanStorage::class,
            ]);
        }
    }
}
