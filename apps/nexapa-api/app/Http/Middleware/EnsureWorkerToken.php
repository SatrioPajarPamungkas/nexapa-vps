<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureWorkerToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null || $token === '') {
            return response()->json([
                'success' => false,
                'message' => 'Worker authentication required.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $expectedToken = config('nexapa.worker_token', '');

        if ($expectedToken === '' || ! hash_equals($expectedToken, $token)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid worker token.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
