<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureGuestApiAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('sanctum')->user();

        $request->setUserResolver(
            static fn (?string $guard = null) => $user
        );

        if (config('nexapa.allow_guest_api', false)) {
            return $next($request);
        }

        if ($user) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Authentication required.',
        ], Response::HTTP_UNAUTHORIZED);
    }
}
