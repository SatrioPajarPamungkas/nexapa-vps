<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => [
                'nullable',
                'string',
                'max:100',
            ],
            'search' => [
                'nullable',
                'string',
                'max:120',
            ],
            'featured' => [
                'nullable',
                'boolean',
            ],
            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:50',
            ],
        ]);

        $query = Article::query()
            ->publiclyVisible();

        if (!empty($validated['category'])) {
            $query->where(
                'category',
                $validated['category']
            );
        }

        if (array_key_exists(
            'featured',
            $validated
        )) {
            $query->where(
                'is_featured',
                (bool) $validated['featured']
            );
        }

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(
                function ($builder) use ($search): void {
                    $builder
                        ->where(
                            'title',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'excerpt',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhere(
                            'category',
                            'like',
                            "%{$search}%"
                        );
                }
            );
        }

        $perPage = (int) (
            $validated['per_page'] ?? 12
        );

        $articles = $query
            ->orderByDesc('published_at')
            ->paginate($perPage);

        $articles->setCollection(
            $articles
                ->getCollection()
                ->map(
                    fn (
                        Article $article
                    ): array =>
                        $this->transform(
                            $article
                        )
                )
        );

        return response()->json($articles);
    }

    public function featured(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'limit' => [
                'nullable',
                'integer',
                'min:1',
                'max:12',
            ],
        ]);

        $limit = (int) (
            $validated['limit'] ?? 5
        );

        $articles = Article::query()
            ->publiclyVisible()
            ->where('is_featured', true)
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get()
            ->map(
                fn (
                    Article $article
                ): array =>
                    $this->transform($article)
            )
            ->values();

        return response()->json([
            'data' => $articles,
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = Article::query()
            ->publiclyVisible()
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->select('category')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('category')
            ->orderBy('category')
            ->get()
            ->map(
                fn (Article $article): array => [
                    'name' => $article->category,
                    'total' => (int) $article->total,
                ]
            )
            ->values();

        return response()->json([
            'data' => $categories,
        ]);
    }

    public function show(
        Article $article
    ): JsonResponse {
        abort_unless(
            $article->isPubliclyVisible(),
            404
        );

        $related = Article::query()
            ->publiclyVisible()
            ->whereKeyNot($article->getKey())
            ->when(
                filled($article->category),
                fn ($query) =>
                    $query->where(
                        'category',
                        $article->category
                    )
            )
            ->orderByDesc('published_at')
            ->limit(4)
            ->get()
            ->map(
                fn (
                    Article $relatedArticle
                ): array =>
                    $this->transform(
                        $relatedArticle
                    )
            )
            ->values();

        return response()->json([
            'data' => $this->transform(
                $article,
                true
            ),
            'related' => $related,
        ]);
    }

    private function transform(
        Article $article,
        bool $withContent = false
    ): array {
        $payload = [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'category' => $article->category,
            'author_name' => $article->author_name,
            'featured_image_url' =>
                $article->featured_image_url,
            'is_featured' =>
                (bool) $article->is_featured,
            'published_at' =>
                $article->published_at?->toISOString(),
            'published_at_display' =>
                $this->publishedAtDisplay($article),
            'reading_time_minutes' =>
                $this->readingTime($article),
            'meta_title' =>
                $article->meta_title
                    ?: $article->title,
            'meta_description' =>
                $article->meta_description
                    ?: $article->excerpt,
            'url' =>
                rtrim(
                    (string) config(
                        'app.frontend_url',
                        'https://nexapa.me'
                    ),
                    '/'
                )
                .'/artikel/'
                .$article->slug,
        ];

        if ($withContent) {
            $payload['content'] = (string) str(
                $article->content
            )->sanitizeHtml();
        }

        return $payload;
    }

    private function readingTime(
        Article $article
    ): int {
        $wordCount = str_word_count(
            strip_tags($article->content)
        );

        return max(
            1,
            (int) ceil($wordCount / 200)
        );
    }

    private function publishedAtDisplay(
        Article $article
    ): ?string {
        if (!$article->published_at) {
            return null;
        }

        return $article
            ->published_at
            ->copy()
            ->timezone('Asia/Jakarta')
            ->locale('id')
            ->translatedFormat(
                'd F Y, H:i'
            )
            .' WIB';
    }
}
