<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('publisher:dispatch-scheduled')
    ->everyMinute()
    ->withoutOverlapping()
    ->onOneServer();

Schedule::call(function () {
    Cache::put(
        'system_health.scheduler_last_seen',
        now()->toIso8601String(),
        now()->addHours(24)
    );
})->everyMinute()->name('system-health-heartbeat');
