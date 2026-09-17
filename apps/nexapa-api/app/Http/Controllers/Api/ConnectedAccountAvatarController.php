<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConnectedAccount;
use App\Services\Facebook\FacebookAvatarStreamService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ConnectedAccountAvatarController extends Controller
{
    public function __construct(
        private readonly FacebookAvatarStreamService $avatarStreamService,
    ) {}

    public function __invoke(Request $request, string $connectedAccount): Response
    {
        try {
            $account = ConnectedAccount::query()
                ->whereKey($connectedAccount)
                ->where('user_id', $request->user()?->id)
                ->where('platform', 'facebook')
                ->where('status', 'connected')
                ->firstOrFail();

            $image = $this->avatarStreamService->fetch($account);

            return response($image['body'], 200, array_merge(
                $this->noStoreHeaders(),
                [
                    'Content-Type' => $image['content_type'],
                    'Content-Length' => (string) strlen($image['body']),
                    'Content-Disposition' => 'inline',
                    'X-Content-Type-Options' => 'nosniff',
                    'Cross-Origin-Resource-Policy' => 'same-site',
                ],
            ));
        } catch (ModelNotFoundException) {
            return response('', 404, $this->noStoreHeaders());
        } catch (Throwable $exception) {
            Log::warning('Facebook avatar stream failed.', [
                'connected_account_id' => $connectedAccount,
                'user_id' => $request->user()?->id,
                'exception' => $exception::class,
                'error' => $exception->getMessage(),
            ]);

            return response('', 502, $this->noStoreHeaders());
        }
    }

    /** @return array<string, string> */
    private function noStoreHeaders(): array
    {
        return [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, private, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];
    }
}
