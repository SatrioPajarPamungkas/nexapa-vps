<?php

namespace App\Enums;

enum SourceType: string
{
    case Video = 'video';
    case Post = 'post';
    case Profile = 'profile';
    case Channel = 'channel';
    case Playlist = 'playlist';
    case Collection = 'collection';
    case Unknown = 'unknown';
}
