/**
 * API Service
 *
 * Centralized client for backend API requests, inspired by Swift APIService
 *
 * Features:
 * 1. Generic request/response handling with type safety
 * 2. Automatic error parsing and classification
 * 3. Standard API response format support
 * 4. JWT token management and auto-refresh
 * 5. Timeout handling
 * 6. Rate limiting detection
 * 7. Business logic error vs network error distinction
 */

import { createLogger } from "@/0_common/utils/logger"
import { APIError, APIErrorCodes } from "../types/APIError"
import { APIResponse } from "../types/APIResponse"
import { getAuthService } from "./AuthService"
import { CONFIG_ENDPOINTS } from "../constants"

const logger = createLogger("APIService")

/**
 * Request options
 */
export interface RequestOptions {
    /** Request timeout in milliseconds */
    timeout?: number
    /** Additional headers */
    headers?: Record<string, string>
    /** Whether to add authentication token */
    addAuthToken?: boolean
}

/**
 * API Service Configuration
 */
export interface APIServiceConfig {
    /** Base URL for API requests */
    baseURL: string
    /** Client version */
    clientVersion?: string
    /** Fallback Base URL for auto-retry on network errors */
    fallbackBaseURL?: string
}

/**
 * API Service Class
 */
export class APIService {
    private config: APIServiceConfig
    private hasFallenBack: boolean = false
    private isProbingFallback: boolean = false

    constructor(config: APIServiceConfig) {
        this.config = config
        logger.info("APIService initialized with AuthService for JWT token management")
    }

    /**
     * Update service configuration
     */
    updateConfig(config: Partial<APIServiceConfig>): void {
        logger.info("Updating configuration:", config)
        const previousFallbackBaseURL = this.config.fallbackBaseURL
        this.config = { ...this.config, ...config }
        const fallbackBaseURLChanged = Object.prototype.hasOwnProperty.call(config, "fallbackBaseURL")
            && config.fallbackBaseURL !== previousFallbackBaseURL
        // If BaseURL is explicitly updated, reset fallback state
        if (config.baseURL || fallbackBaseURLChanged) {
            this.hasFallenBack = false
        }
        logger.info("Configuration updated. New baseURL:", this.config.baseURL)
    }

    /**
     * Performs a generic API request with automatic token refresh
     *
     * @template TResponse - The expected response data type
     * @template TBody - The request body type
     * @param endpoint - API endpoint path (e.g., "/api/v1/translate")
     * @param method - HTTP method
     * @param body - Request body (optional)
     * @param options - Request options (addAuthToken defaults to true)
     * @returns Promise with the response data
     * @throws APIError subclasses for different error scenarios
     */
    async request<TResponse, TBody = unknown>(
        endpoint: string,
        method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
        body?: TBody,
        options?: RequestOptions
    ): Promise<TResponse> {
        const fullUrl = `${this.config.baseURL}${endpoint}`
        logger.info(`⟶ ${method} ${fullUrl}`)
        if (body) {
            logger.debug("Request body:", body)
        }

        const bodyData = body ? JSON.stringify(body) : undefined
        // addAuthToken defaults to true if not specified
        const addAuthToken = options?.addAuthToken !== false

        try {
            const result = await this.performRequest<TResponse>(endpoint, method, bodyData, options)
            logger.info(`✓ ${method} ${endpoint}`)
            return result
        } catch (error) {
            // Check for fallback condition
            if (this.shouldFallback(error)) {
                logger.warn("Encountered blocking error, attempting fallback switch...")
                await this.performFallbackSwitch()
                
                // Retry request only if switch occurred
                if (this.hasFallenBack) {
                    try {
                        return await this.performRequest<TResponse>(endpoint, method, bodyData, options)
                    } catch (fallbackError) {
                        if (fallbackError instanceof APIError && fallbackError.type === "tokenExpired" && addAuthToken) {
                            logger.info("Token expired after fallback, attempting refresh...")
                            const authService = getAuthService()
                            await authService.refreshToken()
                            logger.info("Token refreshed, retrying request after fallback...")
                            return await this.performRequest<TResponse>(endpoint, method, bodyData, options)
                        }
                        throw fallbackError
                    }
                }
            }

            // If token is expired, refresh it and retry the request once
            if (error instanceof APIError && error.type === "tokenExpired" && addAuthToken) {
                logger.info("Token expired, attempting refresh...")
                const authService = getAuthService()
                await authService.refreshToken()
                logger.info("Token refreshed, retrying request...")
                return await this.performRequest<TResponse>(endpoint, method, bodyData, options)
            }
            // For any other error, just rethrow it
            logger.error(`✗ ${method} ${endpoint}`, error)
            throw error
        }
    }

    /**
     * Performs an authentication request (no JWT token needed)
     *
     * @template TResponse - The expected response data type
     * @param endpoint - API endpoint path
     * @param method - HTTP method
     * @param body - Request body
     * @param options - Request options
     * @returns Promise with the response data
     */
    async authRequest<TResponse>(endpoint: string, method: "POST" | "GET", body?: string, options?: RequestOptions): Promise<TResponse> {
        return await this.performRequest<TResponse>(endpoint, method, body, { ...options, addAuthToken: false })
    }

    /**
     * Performs the actual HTTP request
     */
    private async performRequest<TResponse>(endpoint: string, method: string, body?: string, options?: RequestOptions): Promise<TResponse> {
        const url = `${this.config.baseURL}${endpoint}`

        // addAuthToken defaults to true if not specified
        const addAuthToken = options?.addAuthToken !== false

        try {
            // Build headers
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                ...options?.headers,
            }

            // Add client version header
            if (this.config.clientVersion) {
                headers["x-client-version"] = this.config.clientVersion
            }

            // Add authentication token
            if (addAuthToken) {
                const authService = getAuthService()
                if (!authService.isInitialized()) {
                    logger.error("AuthService not initialized")
                    throw new APIError({ type: "requestError", code: 401, message: "Authentication not configured" })
                }
                const token = await authService.getToken()
                headers["Authorization"] = `Bearer ${token}`
                logger.debug("Auth token length:", token.length)
            } else {
                logger.debug("No auth token (addAuthToken=false)")
            }

            if (body) {
                logger.debug("Body:", body.substring(0, 200) + (body.length > 200 ? "..." : ""))
            }

            // Create abort controller for timeout
            const controller = new AbortController()
            const timeoutId = options?.timeout ? setTimeout(() => controller.abort(), options.timeout) : undefined

            // Make the request
            let response: Response
            const startTime = Date.now()
            try {
                response = await fetch(url, {
                    method,
                    headers,
                    body,
                    signal: controller.signal,
                })
                const duration = Date.now() - startTime
                logger.debug(`Response: ${response.status} (${duration}ms)`)
            } finally {
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }
            }

            // Parse response body
            const responseText = await response.text()

            let data: unknown
            try {
                data = JSON.parse(responseText)
            } catch (parseError) {
                logger.error("Invalid JSON:", responseText.substring(0, 200))
                throw new APIError({
                    type: "requestError",
                    code: response.status,
                    message: "Invalid JSON response from server",
                })
            }

            // Check HTTP status code
            if (!response.ok) {
                logger.error(`HTTP ${response.status}:`, responseText.substring(0, 200))

                // Try to extract error message from response
                const apiResponse = data as APIResponse<TResponse>
                const errorMessage = apiResponse?.message || "Could not parse error message"

                // Handle specific HTTP error codes
                if (response.status === 419) {
                    throw new APIError({ type: "tokenExpired", code: response.status, message: errorMessage })
                }

                if (response.status === 429) {
                    throw new APIError({ type: "rateLimited", code: response.status, message: errorMessage })
                }

                throw new APIError({ type: "requestError", code: response.status, message: errorMessage })
            }

            // Parse standard API response
            const apiResponse = data as APIResponse<TResponse>

            // Check business logic code
            if (apiResponse.code !== APIErrorCodes.SUCCESS) {
                logger.error(`Business error ${apiResponse.code}: ${apiResponse.message}`)

                // Handle specific business error codes
                if (apiResponse.code === APIErrorCodes.SERVER_ALERT) {
                    throw new APIError({ type: "serverAlert", code: APIErrorCodes.SERVER_ALERT, message: apiResponse.message })
                }

                if (apiResponse.code === APIErrorCodes.CLIENT_VERSION_OUTDATED) {
                    throw new APIError({
                        type: "reAttestationRequired",
                        code: APIErrorCodes.CLIENT_VERSION_OUTDATED,
                        message: apiResponse.message,
                    })
                }

                if (apiResponse.code === APIErrorCodes.TOKEN_EXPIRED) {
                    throw new APIError({ type: "tokenExpired", code: APIErrorCodes.TOKEN_EXPIRED, message: apiResponse.message })
                }

                // Generic business error
                throw new APIError({ type: "businessError", code: apiResponse.code, message: apiResponse.message })
            }

            // Validate response data
            if (apiResponse.data === null || apiResponse.data === undefined) {
                logger.error("Response data is null/undefined")
                throw new APIError({
                    type: "businessError",
                    code: -1,
                    message: "Request succeeded but response data was unexpectedly null",
                })
            }

            logger.info("Request completed successfully, returning data")
            return apiResponse.data
        } catch (error) {
            // Handle timeout errors
            if (error instanceof Error && error.name === "AbortError") {
                logger.error("Request timeout")
                throw new APIError({ type: "timeout", message: "Request timeout" })
            }

            // Re-throw if already an APIError
            if (this.isAPIError(error)) {
                throw error
            }

            // Wrap unexpected errors
            logger.error("Unexpected error:", error)
            const original = error as Error
            throw new APIError({
                type: "unexpectedError",
                message: original?.message,
                originalError: original,
            })
        }
    }

    private shouldFallback(error: unknown): boolean {
        if (!this.config.fallbackBaseURL || this.hasFallenBack) return false

        if (error instanceof APIError) {
            // 403 Forbidden (WAF), 429 Too Many Requests (WAF/RateLimit)
            if (error.code === 403 || error.code === 429) return true
            // requestError (Network Error, 502, 504 etc), timeout, or unexpectedError (e.g. Failed to fetch)
            if (error.type === "requestError" || error.type === "timeout" || error.type === "unexpectedError") return true
        }
        return false
    }

    private async performFallbackSwitch(): Promise<void> {
        if (!this.config.fallbackBaseURL || this.hasFallenBack || this.isProbingFallback) {
            return
        }

        this.isProbingFallback = true
        const fallbackUrl = this.config.fallbackBaseURL
        const probeEndpoint = CONFIG_ENDPOINTS.CONFIG

        logger.info(`Probing fallback URL before switching: ${fallbackUrl}`)

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            const response = await fetch(`${fallbackUrl}${probeEndpoint}`, {
                method: "GET",
                signal: controller.signal,
            })
            clearTimeout(timeoutId)

            if (response.ok) {
                logger.info("Fallback probe successful. Switching Base URL.")
                this.config.baseURL = fallbackUrl
                this.hasFallenBack = true

                // Also update AuthService
                const authService = getAuthService()
                if (authService.isInitialized()) {
                    authService.updateBaseURL(fallbackUrl)
                }
            } else {
                logger.warn(`Fallback probe failed with status: ${response.status}`)
            }
        } catch (error) {
            logger.warn("Fallback probe failed with network error:", error)
        } finally {
            this.isProbingFallback = false
        }
    }

    /**
     * Type guard to check if an error is an APIError
     */
    private isAPIError(error: unknown): error is APIError {
        return error instanceof APIError
    }
}

/**
 * Default API service instance (can be configured later)
 */
let defaultService: APIService | null = null

/**
 * Initialize the default API service
 */
export function initAPIService(config: APIServiceConfig): APIService {
    logger.info("Initializing API service...")
    logger.info("Base URL:", config.baseURL)
    logger.info("Client version:", config.clientVersion || "not set")

    defaultService = new APIService(config)

    logger.info("API service initialized successfully")
    return defaultService
}

/**
 * Get the default API service instance
 */
export function getAPIService(): APIService {
    if (!defaultService) {
        logger.error("API service not initialized!")
        throw new Error("API service not initialized. Call initAPIService first.")
    }
    return defaultService
}

/**
 * Convenience functions using the default service
 */

export async function post<TResponse, TBody = unknown>(endpoint: string, body?: TBody, options?: RequestOptions): Promise<TResponse> {
    logger.debug("post called with:", { endpoint, hasBody: !!body, options })
    return getAPIService().request<TResponse, TBody>(endpoint, "POST", body, options)
}

export async function get<TResponse>(endpoint: string, options?: RequestOptions): Promise<TResponse> {
    return getAPIService().request<TResponse>(endpoint, "GET", undefined, options)
}

export async function put<TResponse, TBody = unknown>(endpoint: string, body?: TBody, options?: RequestOptions): Promise<TResponse> {
    return getAPIService().request<TResponse, TBody>(endpoint, "PUT", body, options)
}

export async function del<TResponse>(endpoint: string, options?: RequestOptions): Promise<TResponse> {
    return getAPIService().request<TResponse>(endpoint, "DELETE", undefined, options)
}
