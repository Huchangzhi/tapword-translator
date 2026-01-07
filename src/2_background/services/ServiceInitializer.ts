/**
 * Service Initializer
 *
 * Initializes all backend services required by the extension
 */

import { getDeviceUID } from "@/0_common/utils/storageManager"
import * as backendModule from "@/5_backend"
import { BUILD_TIME_CREDENTIALS, hasBuildTimeCredentials } from "@/5_backend/config/credentials"
import { CLIENT_VERSION, CONFIG_ENDPOINTS, CONFIG_REFRESH_INTERVAL_MS, DEFAULT_BASE_URL } from "@/5_backend/constants"
import * as loggerModule from "@/0_common/utils/logger"

const logger = loggerModule.createLogger("2_background/services/ServiceInitializer")

/**
 * Initialize API Service with configuration
 *
 * @remarks
 * Credentials are loaded from build-time injection (from other/key/ files)
 */
export async function initializeAPIService(): Promise<void> {
    logger.info("Initializing API Service...")

    // Check for build-time credentials
    if (hasBuildTimeCredentials()) {
        logger.info("Using build-time injected credentials")
        const credentials = {
            apiKey: BUILD_TIME_CREDENTIALS.apiKey,
            apiSecret: BUILD_TIME_CREDENTIALS.apiSecret,
        }

        // Get or generate device UID
        const deviceUID = await getDeviceUID()
        logger.info("Device UID:", deviceUID)

        // Initialize AuthService
        backendModule.initAuthService(credentials, deviceUID, DEFAULT_BASE_URL)
        logger.info("AuthService initialized")

        // Initialize APIService
        backendModule.initAPIService({
            baseURL: DEFAULT_BASE_URL,
            clientVersion: CLIENT_VERSION,
        })

        logger.info("API Service initialized with JWT authentication")
    } else {
        logger.warn("No build-time credentials found. API Service not initialized.")
    }
}

/**
 * Initialize all services
 *
 * @remarks
 * This function should be called once when the background script loads
 */
export async function initializeServices(): Promise<void> {
    await initializeAPIService()
    await initializeConfigService()
    await initializeQuotaManager()
    // Add other service initializations here in the future
}

/**
 * Initialize Config Service
 *
 * @remarks
 * Fetches cloud configuration on first launch and sets up periodic refresh.
 * ConfigService uses APIService internally, so APIService must be initialized first.
 */
async function initializeConfigService(): Promise<void> {
    logger.info("Initializing Config Service...")

    try {
        // Initialize ConfigService with default settings
        // Note: ConfigService uses APIService internally, which already has baseURL configured
        await backendModule.initConfigService(CONFIG_ENDPOINTS.CONFIG, CONFIG_REFRESH_INTERVAL_MS)
        logger.info("Config Service initialized successfully")
    } catch (error) {
        logger.error("Failed to initialize Config Service:", error)
        // Non-critical error - extension can still work with default config
    }
}

/**
 * Initialize Quota Manager
 *
 * @remarks
 * Sets up quota tracking for translations and speech synthesis.
 * QuotaManager uses ConfigService internally, so ConfigService must be initialized first.
 */
async function initializeQuotaManager(): Promise<void> {
    logger.info("Initializing Quota Manager...")

    try {
        await backendModule.initQuotaManager()
        logger.info("Quota Manager initialized successfully")
    } catch (error) {
        logger.error("Failed to initialize Quota Manager:", error)
        // Non-critical error - extension can still work without quota tracking
    }
}
