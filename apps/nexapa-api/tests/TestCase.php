<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $storagePath = (string) ($_ENV['LARAVEL_STORAGE_PATH'] ?? getenv('LARAVEL_STORAGE_PATH'));

        if ($storagePath !== '') {
            foreach ([
                'framework/cache/data',
                'framework/sessions',
                'framework/testing/disks',
                'framework/views',
                'logs',
            ] as $directory) {
                $path = $storagePath.DIRECTORY_SEPARATOR.$directory;
                if (! is_dir($path)) {
                    mkdir($path, 0777, true);
                }
            }
        }

        return parent::createApplication();
    }
}
