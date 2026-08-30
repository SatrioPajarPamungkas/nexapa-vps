<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'worker.token' => \App\Http\Middleware\EnsureWorkerToken::class,
            'guest.api' => \App\Http\Middleware\EnsureGuestApiAccess::class,
            'admin' => \App\Http\Middleware\EnsureAdminAccess::class,
            'subscription.active' =>
                \App\Http\Middleware\EnsureActiveSubscription::class,
        ]);
        $middleware->statefulApi();

        $middleware->redirectGuestsTo(
            fn (Request $request): string => 'https://app.nexapa.app/login'
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
        fn (Request $request): bool =>
            $request->is('api/*') || $request->expectsJson(),
    );

        $exceptions->renderable(function (\App\Exceptions\InvalidTransitionException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 409);
            }
        });

        $exceptions->renderable(function (\InvalidArgumentException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }
        });
    })->create();
