<?php

namespace App\Services\OAuth;

use RuntimeException;

class FacebookOAuthException extends RuntimeException
{
    private ?string $errorCode;
    private ?string $errorDescription;
    private ?string $fbTraceId;
    private ?int $httpStatus;
    private array $additionalInfo;

    public function __construct(
        string $message,
        int $code,
        ?string $errorCode = null,
        ?string $errorDescription = null,
        ?string $fbTraceId = null,
        ?int $httpStatus = null,
        array $additionalInfo = []
    ) {
        parent::__construct($message, $code);
        $this->errorCode = $errorCode;
        $this->errorDescription = $errorDescription;
        $this->fbTraceId = $fbTraceId;
        $this->httpStatus = $httpStatus;
        $this->additionalInfo = $additionalInfo;
    }

    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    public function getErrorDescription(): ?string
    {
        return $this->errorDescription;
    }

    public function getFbTraceId(): ?string
    {
        return $this->fbTraceId;
    }

    public function getHttpStatus(): ?int
    {
        return $this->httpStatus;
    }

    public function getAdditionalInfo(): array
    {
        return $this->additionalInfo;
    }
}
