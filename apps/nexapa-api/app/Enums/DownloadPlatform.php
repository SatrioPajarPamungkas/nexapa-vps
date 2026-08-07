<?php

namespace App\Enums;

enum DownloadPlatform: string
{
    case Tiktok = 'tiktok';
    case Facebook = 'facebook';
    case Instagram = 'instagram';
    case Youtube = 'youtube';
    case Generic = 'generic';
}
