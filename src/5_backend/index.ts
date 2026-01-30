/**
 * Backend Module - Main Entry Point
 *
 * Generic API client infrastructure for cloud service communication
 * Similar to Swift's APIService - handles HTTP requests, errors, and responses
 */

// Constants
export {
    API_BASE_URL_MAP,
    AUTH_ENDPOINTS,
    AUTO_REFRESH_INTERVAL_MS,
    CLIENT_VERSION,
    CONFIG_ENDPOINTS,
    CONFIG_REFRESH_INTERVAL_MS,
    DEFAULT_BASE_URL,
    TOKEN_REFRESH_BUFFER_SECONDS,
} from "./constants"

// Types - Error types and utilities
export { APIError, APIErrorCodes, getDebugMessage, getUserMessage } from "./types/APIError"

// Services - API Service
export { APIService, del, get, getAPIService, initAPIService, post, put } from "./services/APIService"

// Services - Auth Service
export { AuthService, getAuthService, initAuthService } from "./services/AuthService"

// Services - Config Service
export { ConfigService, getConfigService, initConfigService } from "./services/ConfigService"

// Services - Quota Manager
export { getQuotaManager, initQuotaManager, QuotaManager } from "./services/QuotaManager"

// Types - Response format
export type { APIResponse } from "./types/APIResponse"

// Types - Authentication types
export type { APICredentials, AuthHeaders, AuthRequestBody, AuthResponseData, JWTToken } from "./types/AuthTypes"

// Types - Configuration types
export type { CachedConfig, CloudConfig, QuotaConfig } from "./types/ConfigTypes"
