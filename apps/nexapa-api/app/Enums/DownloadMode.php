<?php

namespace App\Enums;

enum DownloadMode: string
{
    case Single = 'single';
    case Multiple = 'multiple';
    case Profile = 'profile';
}
