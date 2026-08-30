<?php

namespace Tests\Unit;

use App\Data\Provisioning\ProvisioningInput;
use App\Exceptions\UserProvisioningException;
use App\Models\User;
use App\Services\Provisioning\PublisherProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PublisherProvisioningServiceTest extends TestCase
{
    use RefreshDatabase;

    private PublisherProvisioningService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PublisherProvisioningService;
    }

    public function test_creates_publisher_user_with_hashed_password(): void
    {
        $input = new ProvisioningInput(
            fullName: 'John Doe',
            email: 'john@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'secretpassword123',
            emailVerified: false,
            publisherRole: 'user',
            adminActorId: '1',
        );

        $result = $this->service->create($input);

        $this->assertTrue($result->publisherCreated);
        $this->assertNotNull($result->publisherUserId);
        $this->assertTrue($result->hasTemporaryPassword());
        $this->assertEquals('secretpassword123', $result->temporaryPassword);

        $user = User::find($result->publisherUserId);
        $this->assertNotNull($user);
        $this->assertEquals('John Doe', $user->name);
        $this->assertEquals('john@example.com', $user->email);
        $this->assertEquals('user', $user->role);
        $this->assertNull($user->email_verified_at);
        $this->assertTrue(Hash::check('secretpassword123', $user->password));
    }

    public function test_creates_user_with_verified_email_when_flag_is_true(): void
    {
        $input = new ProvisioningInput(
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'verified-password',
            emailVerified: true,
            publisherRole: 'user',
            adminActorId: '1',
        );

        $result = $this->service->create($input);

        $user = User::find($result->publisherUserId);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_creates_user_with_admin_role_when_specified(): void
    {
        $input = new ProvisioningInput(
            fullName: 'Admin User',
            email: 'admin@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'admin-password',
            emailVerified: true,
            publisherRole: 'admin',
            adminActorId: '1',
        );

        $result = $this->service->create($input);

        $user = User::find($result->publisherUserId);
        $this->assertEquals('admin', $user->role);
    }

    public function test_normalizes_email_before_duplicate_check(): void
    {
        User::factory()->create(['email' => 'TEST@EXAMPLE.COM']);

        $input = new ProvisioningInput(
            fullName: 'Another User',
            email: '  test@example.com  ',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'duplicate-password',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);
        $this->expectExceptionMessage('Email sudah terdaftar di Publisher');

        $this->service->create($input);
    }

    public function test_throws_exception_for_duplicate_email(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $input = new ProvisioningInput(
            fullName: 'Existing User',
            email: 'existing@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'duplicate-password',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);
        $this->expectExceptionMessage('Email sudah terdaftar di Publisher');

        $this->service->create($input);
    }

    public function test_generates_temporary_password_when_not_provided(): void
    {
        $input = new ProvisioningInput(
            fullName: 'Random Password User',
            email: 'random@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            emailVerified: false,
            publisherRole: 'user',
            adminActorId: '1',
        );

        $result = $this->service->create($input);

        $this->assertNotNull($result->temporaryPassword);
        $this->assertGreaterThanOrEqual(16, strlen($result->temporaryPassword));
    }

    public function test_deletes_user_successfully(): void
    {
        $input = new ProvisioningInput(
            fullName: 'To Delete',
            email: 'delete@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'delete-password',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $result = $this->service->create($input);
        $userId = $result->publisherUserId;

        $this->service->delete($userId);

        $this->assertNull(User::find($userId));
    }

    public function test_email_exists_returns_true_for_existing_user(): void
    {
        User::factory()->create(['email' => 'exists@example.com']);

        $this->assertTrue($this->service->emailExists('EXISTS@EXAMPLE.COM'));
        $this->assertTrue($this->service->emailExists('  exists@example.com  '));
    }

    public function test_email_exists_returns_false_for_nonexistent_user(): void
    {
        $this->assertFalse($this->service->emailExists('nonexistent@example.com'));
    }

    public function test_generates_secure_password(): void
    {
        $password1 = $this->service->generateTemporaryPassword();
        $password2 = $this->service->generateTemporaryPassword();

        $this->assertNotEquals($password1, $password2);
        $this->assertGreaterThanOrEqual(16, strlen($password1));
    }

    public function test_password_is_never_stored_in_plaintext(): void
    {
        $input = new ProvisioningInput(
            fullName: 'Secure User',
            email: 'secure@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'mysecretpassword',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $result = $this->service->create($input);

        $user = User::find($result->publisherUserId);
        $this->assertStringStartsNotWith('mysecretpassword', $user->password);
        $this->assertTrue(Hash::check('mysecretpassword', $user->password));
    }

}
