<?php

namespace Tests\Feature;

use App\Models\CommerceProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommerceProductApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($this->admin);
    }

    public function test_admin_can_create_a_digital_product(): void
    {
        $response = $this->postJson('/api/v1/commerce/products', [
            'name' => 'Template Konten Premium',
            'description' => 'Template siap pakai untuk bisnis.',
            'type' => 'Template',
            'price_amount' => 149000,
            'status' => 'active',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Template Konten Premium')
            ->assertJsonPath('data.slug', 'template-konten-premium')
            ->assertJsonPath('data.price_amount', 149000)
            ->assertJsonPath('data.currency', 'IDR')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('commerce_products', [
            'name' => 'Template Konten Premium',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
        $this->assertNotNull(CommerceProduct::firstOrFail()->published_at);
    }

    public function test_generated_slugs_remain_unique(): void
    {
        $payload = [
            'name' => 'Panduan Marketing',
            'type' => 'E-book',
            'price_amount' => 89000,
            'status' => 'draft',
        ];

        $this->postJson('/api/v1/commerce/products', $payload)->assertCreated();
        $this->postJson('/api/v1/commerce/products', $payload)
            ->assertCreated()
            ->assertJsonPath('data.slug', 'panduan-marketing-2');
    }

    public function test_create_validates_product_fields(): void
    {
        $this->postJson('/api/v1/commerce/products', [
            'name' => '',
            'type' => '',
            'price_amount' => -1,
            'status' => 'published',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name',
                'type',
                'price_amount',
                'status',
            ]);
    }

    public function test_admin_can_search_and_filter_products(): void
    {
        CommerceProduct::create([
            'name' => 'Template Aktif',
            'slug' => 'template-aktif',
            'type' => 'Template',
            'price_amount' => 100000,
            'currency' => 'IDR',
            'status' => 'active',
        ]);
        CommerceProduct::create([
            'name' => 'E-book Draf',
            'slug' => 'ebook-draf',
            'type' => 'E-book',
            'price_amount' => 50000,
            'currency' => 'IDR',
            'status' => 'draft',
        ]);

        $this->getJson('/api/v1/commerce/products?search=template&status=active')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'template-aktif')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_admin_can_show_and_update_a_product(): void
    {
        $product = CommerceProduct::create([
            'name' => 'Produk Lama',
            'slug' => 'produk-lama',
            'type' => 'Asset',
            'price_amount' => 10000,
            'currency' => 'IDR',
            'status' => 'draft',
        ]);

        $this->getJson("/api/v1/commerce/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $product->id);

        $this->putJson("/api/v1/commerce/products/{$product->id}", [
            'name' => 'Produk Baru',
            'type' => 'Asset',
            'price_amount' => 25000,
            'status' => 'active',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Produk Baru')
            ->assertJsonPath('data.slug', 'produk-lama')
            ->assertJsonPath('data.price_amount', 25000)
            ->assertJsonPath('data.status', 'active');

        $product->refresh();
        $this->assertSame($this->admin->id, $product->updated_by);
        $this->assertNotNull($product->published_at);
    }

    public function test_admin_can_soft_delete_a_product(): void
    {
        $product = CommerceProduct::create([
            'name' => 'Produk Dihapus',
            'slug' => 'produk-dihapus',
            'type' => 'File Digital',
            'price_amount' => 50000,
            'currency' => 'IDR',
            'status' => 'draft',
        ]);

        $this->deleteJson("/api/v1/commerce/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('commerce_products', ['id' => $product->id]);
        $this->getJson("/api/v1/commerce/products/{$product->id}")->assertNotFound();
    }

    public function test_non_admin_cannot_manage_products(): void
    {
        Sanctum::actingAs(User::factory()->create(['is_admin' => false]));

        $this->getJson('/api/v1/commerce/products')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_unauthenticated_user_cannot_manage_products(): void
    {
        app('auth')->forgetGuards();

        $this->getJson('/api/v1/commerce/products')->assertUnauthorized();
    }
}
