<?php

namespace Tests\Feature;

use App\Console\Commands\DownloadPurgeOrphanStorage;
use App\Models\DownloadJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PurgeOrphanDownloadStorageCommandTest extends TestCase
{
    // Remove RefreshDatabase trait to avoid SQLite VACUUM issues
    // use RefreshDatabase;

    protected User $user;
    protected string $downloadsPath;

    protected function setUp(): void
    {
        parent::setUp();

        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        $this->user = User::factory()->create();
        $this->downloadsPath = storage_path('app/private/downloads');
        
        // Ensure downloads directory exists
        if (!is_dir($this->downloadsPath)) {
            mkdir($this->downloadsPath, 0755, true);
        }
    }

    public function test_dry_run_shows_orphan_directories_without_deleting(): void
    {
        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        // Create user directory if it doesn't exist
        $userPath = "{$this->downloadsPath}/{$this->user->id}";
        if (!is_dir($userPath)) {
            mkdir($userPath, 0755, true);
        }
        
        // Create an orphan directory (no corresponding job in DB)
        $orphanJobId = '019fc846-744c-70d9-8712-b3c8e794bbf7';
        $orphanPath = "{$userPath}/{$orphanJobId}";
        if (!is_dir($orphanPath)) {
            mkdir($orphanPath, 0755, true);
            file_put_contents("{$orphanPath}/test.txt", 'orphan content');
        }

        // Create a valid directory (has corresponding job in DB)
        $validJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
        ]);
        $validPath = "{$userPath}/{$validJob->id}";
        if (!is_dir($validPath)) {
            mkdir($validPath, 0755, true);
            file_put_contents("{$validPath}/test.txt", 'valid content');
        }

        // Run the command in dry-run mode
        $this->artisan('download:purge-orphan-storage', ['--dry-run' => true])
            ->expectsOutputToContain('DRY RUN MODE')
            ->expectsOutputToContain('Found orphan directory')
            ->assertExitCode(0);

        // Verify orphan directory still exists
        $this->assertDirectoryExists($orphanPath);
        $this->assertFileExists("{$orphanPath}/test.txt");

        // Verify valid directory still exists
        $this->assertDirectoryExists($validPath);
        $this->assertFileExists("{$validPath}/test.txt");
    }

    public function test_execute_deletes_orphan_directories(): void
    {
        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        // Create user directory if it doesn't exist
        $userPath = "{$this->downloadsPath}/{$this->user->id}";
        if (!is_dir($userPath)) {
            mkdir($userPath, 0755, true);
        }
        
        // Create an orphan directory (no corresponding job in DB)
        $orphanJobId = '019fc846-744c-70d9-8712-b3c8e794bbf8';
        $orphanPath = "{$userPath}/{$orphanJobId}";
        if (!is_dir($orphanPath)) {
            mkdir($orphanPath, 0755, true);
            file_put_contents("{$orphanPath}/test.txt", 'orphan content');
        }

        // Create a valid directory (has corresponding job in DB)
        $validJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
        ]);
        $validPath = "{$userPath}/{$validJob->id}";
        if (!is_dir($validPath)) {
            mkdir($validPath, 0755, true);
            file_put_contents("{$validPath}/test.txt", 'valid content');
        }
        file_put_contents("{$validPath}/test.txt", 'valid content');

        // Run the command in execute mode
        $this->artisan('download:purge-orphan-storage', ['--execute' => true])
            ->expectsOutputToContain('EXECUTE MODE')
            ->expectsOutputToContain('Deleted orphan directory')
            ->expectsOutputToContain($orphanPath)
            ->assertExitCode(0);

        // Verify orphan directory was deleted
        $this->assertDirectoryDoesNotExist($orphanPath);
        $this->assertFileDoesNotExist("{$orphanPath}/test.txt");

        // Verify valid directory still exists
        $this->assertDirectoryExists($validPath);
        $this->assertFileExists("{$validPath}/test.txt");
    }

    public function test_invalid_paths_are_skipped(): void
    {
        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        // Create user directory if it doesn't exist
        $userPath = "{$this->downloadsPath}/{$this->user->id}";
        if (!is_dir($userPath)) {
            mkdir($userPath, 0755, true);
        }
        
        // Create an invalid user directory (non-numeric)
        $invalidUserPath = "{$this->downloadsPath}/invalid-user";
        if (!is_dir($invalidUserPath)) {
            mkdir($invalidUserPath, 0755, true);
        }

        // Create an invalid job directory (wrong format)
        $invalidJobPath = "{$this->downloadsPath}/{$this->user->id}/invalid-job-id";
        if (!is_dir($invalidJobPath)) {
            mkdir($invalidJobPath, 0755, true);
        }

        // Run the command in dry-run mode
        $this->artisan('download:purge-orphan-storage', ['--dry-run' => true])
            ->expectsOutputToContain('Skipping invalid user directory')
            ->expectsOutputToContain('Skipping invalid job directory')
            ->expectsOutputToContain('Invalid paths skipped')
            ->assertExitCode(0);
    }

    public function test_no_options_shows_error(): void
    {
        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        $this->artisan('download:purge-orphan-storage')
            ->expectsOutputToContain('Please specify either --dry-run or --execute option.')
            ->assertExitCode(1);
    }

    public function test_both_options_shows_error(): void
    {
        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        $this->artisan('download:purge-orphan-storage', ['--dry-run' => true, '--execute' => true])
            ->expectsOutputToContain('Please specify only one of --dry-run or --execute options.')
            ->assertExitCode(1);
    }

    public function test_nonexistent_downloads_directory_handled_gracefully(): void
    {
        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        // Temporarily rename the downloads directory
        $renamedPath = "{$this->downloadsPath}.backup";
        rename($this->downloadsPath, $renamedPath);

        try {
            $this->artisan('download:purge-orphan-storage', ['--dry-run' => true])
                ->expectsOutputToContain('Downloads directory does not exist')
                ->assertExitCode(0);
        } finally {
            // Restore the downloads directory
            rename($renamedPath, $this->downloadsPath);
        }
    }

    public function test_command_registers_correctly(): void
    {
        // Run migrations to ensure tables exist
        $this->artisan('migrate:fresh');
        
        // Test that the command is registered by trying to call it
        $this->artisan('list')
            ->expectsOutputToContain('download:purge-orphan-storage')
            ->assertExitCode(0);
    }
}