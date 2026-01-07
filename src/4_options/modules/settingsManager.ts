/**
 * Settings Manager for Options Page
 *
 * Handles loading, saving, and updating user settings in the options page
 */

import { APP_EDITION } from "@/0_common/constants"
import { CUSTOM_API_FIXED_PARAMS } from "@/0_common/constants/customApi"
import type * as types from "@/0_common/types"
import * as loggerModule from "@/0_common/utils/logger"
import * as storageManagerModule from "@/0_common/utils/storageManager"
import { translateWord as translateWordWithLLM } from "@/8_generate"
import type { LLMConfig } from "@/8_generate"

const logger = loggerModule.createLogger("Options/Settings")
const CUSTOM_API_CONTROL_SELECTOR = '[data-custom-api-control="true"]'
const isCommunityEdition = APP_EDITION === "community"
const AUTO_PLAY_AUDIO_SETTING_ID = "autoPlayAudio"

function setTranslationControlsEnabled(enabled: boolean): void {
    const dependentIds = ["showIcon", "doubleClickTranslate"]

    dependentIds.forEach((id) => {
        const input = document.getElementById(id) as HTMLInputElement | null
        if (!input) {
            return
        }

        input.disabled = !enabled

        const settingItem = input.closest(".setting-item")
        if (settingItem) {
            settingItem.classList.toggle("is-disabled", !enabled)
        }
    })
}

function setCustomApiControlsEnabled(enabled: boolean): void {
    const controls = document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>(CUSTOM_API_CONTROL_SELECTOR)
    controls.forEach((element) => {
        element.disabled = !enabled
        const settingItem = element.closest(".setting-item")
        if (settingItem) {
            settingItem.classList.toggle("is-disabled", !enabled)
        }
    })
}

function lockUseCustomApiToggle(): void {
    if (!isCommunityEdition) {
        return
    }

    const toggle = document.getElementById("useCustomApi") as HTMLInputElement | null
    const settingItem = document.getElementById("useCustomApiSettingItem")

    if (!toggle) {
        return
    }

    toggle.checked = true
    toggle.disabled = true
    settingItem?.classList.add("is-disabled")
}

function lockAutoPlayAudioToggle(): void {
    if (!isCommunityEdition) {
        return
    }

    const toggle = document.getElementById(AUTO_PLAY_AUDIO_SETTING_ID) as HTMLInputElement | null
    const settingItem = document.getElementById("autoPlayAudioSettingItem")

    if (!toggle) {
        return
    }

    toggle.checked = false
    toggle.disabled = true
    settingItem?.classList.add("is-disabled")
}

async function ensureCommunityAutoPlayDisabled(settings: types.UserSettings): Promise<types.UserSettings> {
    if (!isCommunityEdition || settings.autoPlayAudio === false) {
        return settings
    }

    const updated = await storageManagerModule.updateUserSettings({ autoPlayAudio: false })
    return updated
}

async function ensureCommunityCustomApiEnabled(settings: types.UserSettings): Promise<types.UserSettings> {
    if (!isCommunityEdition || settings.customApi.useCustomApi) {
        return settings
    }

    const updated = await storageManagerModule.updateUserSettings({
        customApi: {
            ...settings.customApi,
            useCustomApi: true,
        },
    })

    return updated
}

async function restoreDependentTogglesIfAllOff(): Promise<void> {
    const showIconInput = document.getElementById("showIcon") as HTMLInputElement | null
    const doubleClickInput = document.getElementById("doubleClickTranslate") as HTMLInputElement | null

    if (!showIconInput || !doubleClickInput) {
        return
    }

    const bothDisabled = !showIconInput.checked && !doubleClickInput.checked
    if (!bothDisabled) {
        return
    }

    showIconInput.checked = true
    doubleClickInput.checked = true

    await storageManagerModule.updateUserSettings({
        showIcon: true,
        doubleClickTranslate: true,
    })
}

async function saveCustomApiSettings(partial: Partial<types.CustomApiSettings>): Promise<void> {
    const current = await storageManagerModule.getUserSettings()
    const nextPartial = isCommunityEdition
        ? {
              ...partial,
              useCustomApi: true,
          }
        : partial

    await storageManagerModule.updateUserSettings({
        customApi: {
            ...current.customApi,
            ...nextPartial,
        },
    })
}

export async function loadSettings(): Promise<void> {
    try {
        let settings = await storageManagerModule.getUserSettings()
        settings = await ensureCommunityCustomApiEnabled(settings)
        settings = await ensureCommunityAutoPlayDisabled(settings)

        const settingsRecord = settings as unknown as Record<string, unknown>
        logger.info("Loaded settings:", settings)

        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-setting]')
        checkboxes.forEach((checkbox) => {
            const input = checkbox as HTMLInputElement
            const settingKey = input.dataset.setting

            if (settingKey === "useCustomApi") {
                input.checked = settings.customApi.useCustomApi
            } else if (settingKey && settingKey in settings) {
                input.checked = settingsRecord[settingKey] as boolean
            }
        })

        const selects = document.querySelectorAll("select[data-setting]")
        selects.forEach((select) => {
            const selectElement = select as HTMLSelectElement
            const settingKey = selectElement.dataset.setting
            if (settingKey && settingKey in settings) {
                selectElement.value = String(settingsRecord[settingKey])
            }
        })

        const radioButtons = document.querySelectorAll('input[type="radio"][data-setting]')
        radioButtons.forEach((radio) => {
            const input = radio as HTMLInputElement
            const settingKey = input.dataset.setting
            if (settingKey && settingKey in settings) {
                input.checked = input.value === String(settingsRecord[settingKey])
            }
        })

        const numberInputs = document.querySelectorAll('input[type="number"][data-setting]')
        numberInputs.forEach((input) => {
            const inputElement = input as HTMLInputElement
            const settingKey = inputElement.dataset.setting

            if (settingKey && settingKey in settings) {
                inputElement.value = String(settingsRecord[settingKey])
            }
        })

        const textInputs = document.querySelectorAll(
            'input[type="text"][data-setting], input[type="url"][data-setting], input[type="password"][data-setting]'
        )
        textInputs.forEach((input) => {
            const inputElement = input as HTMLInputElement
            const settingKey = inputElement.dataset.setting
            if (settingKey && settingKey in settings) {
                inputElement.value = String(settingsRecord[settingKey] ?? "")
            }
        })

        const customApi = settings.customApi
        const setValue = (id: string, value: string | number | boolean) => {
            const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null
            if (!element) {
                return
            }
            if (element instanceof HTMLInputElement && element.type === "checkbox") {
                element.checked = Boolean(value)
            } else {
                element.value = String(value)
            }
        }

        setValue("useCustomApi", customApi.useCustomApi)
        setValue("customApiBaseUrl", customApi.baseUrl)
        setValue("customApiKey", customApi.apiKey)
        setValue("customApiModel", customApi.model)

        setTranslationControlsEnabled(settings.enableTapWord)
        setCustomApiControlsEnabled(isCommunityEdition ? true : customApi.useCustomApi)
        lockUseCustomApiToggle()
        lockAutoPlayAudioToggle()
    } catch (error) {
        logger.error("Failed to load settings:", error)
    }
}

export async function saveSetting(settingKey: keyof types.UserSettings, value: boolean | string | number): Promise<void> {
    try {
        await storageManagerModule.updateUserSettings({
            [settingKey]: value,
        })
        logger.info(`Setting ${settingKey} updated to ${value}`)
    } catch (error) {
        logger.error(`Failed to save setting ${settingKey}:`, error)
    }
}

export function setupSettingChangeListeners(): void {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-setting]')
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", async (event) => {
            const input = event.target as HTMLInputElement
            const settingKey = input.dataset.setting
            if (!settingKey) {
                return
            }

            if (settingKey === "useCustomApi") {
                if (isCommunityEdition) {
                    input.checked = true
                    lockUseCustomApiToggle()
                    setCustomApiControlsEnabled(true)
                    return
                }

                await saveCustomApiSettings({ useCustomApi: input.checked })
                setCustomApiControlsEnabled(input.checked)
                return
            }

            if (settingKey === AUTO_PLAY_AUDIO_SETTING_ID && isCommunityEdition) {
                input.checked = false
                lockAutoPlayAudioToggle()
                return
            }

            await saveSetting(settingKey as keyof types.UserSettings, input.checked)

            if (settingKey === "enableTapWord") {
                setTranslationControlsEnabled(input.checked)
                if (input.checked) {
                    await restoreDependentTogglesIfAllOff()
                }
            }
        })
    })

    const selects = document.querySelectorAll("select[data-setting]")
    selects.forEach((select) => {
        select.addEventListener("change", async (event) => {
            const selectElement = event.target as HTMLSelectElement
            const settingKey = selectElement.dataset.setting
            if (!settingKey) {
                return
            }
            const value = selectElement.value
            await saveSetting(settingKey as keyof types.UserSettings, value)
        })
    })

    const radioButtons = document.querySelectorAll('input[type="radio"][data-setting]')
    radioButtons.forEach((radio) => {
        radio.addEventListener("change", async (event) => {
            const input = event.target as HTMLInputElement
            const settingKey = input.dataset.setting
            if (settingKey && input.checked) {
                await saveSetting(settingKey as keyof types.UserSettings, input.value)
            }
        })
    })

    const numberInputs = document.querySelectorAll('input[type="number"][data-setting]')
    numberInputs.forEach((input) => {
        input.addEventListener("change", async (event) => {
            const inputElement = event.target as HTMLInputElement
            const settingKey = inputElement.dataset.setting
            if (!settingKey) {
                return
            }

            let parsed = Number(inputElement.value)
            if (!Number.isFinite(parsed)) {
                return
            }

            if (settingKey === "tooltipNextLineGapPx" || settingKey === "tooltipVerticalOffsetPx") {
                parsed = Math.max(0, Math.min(20, parsed))
                inputElement.value = String(parsed)
            }

            await saveSetting(settingKey as keyof types.UserSettings, parsed)
        })
    })

    const textInputs = document.querySelectorAll(
        'input[type="text"][data-setting], input[type="url"][data-setting], input[type="password"][data-setting]'
    )
    textInputs.forEach((input) => {
        input.addEventListener("change", async (event) => {
            const inputElement = event.target as HTMLInputElement
            const settingKey = inputElement.dataset.setting
            if (!settingKey) {
                return
            }

            const value = inputElement.value.trim()

            if (settingKey === "customApiBaseUrl" || settingKey === "customApiKey" || settingKey === "customApiModel") {
                const partial: Partial<types.CustomApiSettings> = {}

                if (settingKey === "customApiBaseUrl") {
                    partial.baseUrl = value
                }
                if (settingKey === "customApiKey") {
                    partial.apiKey = value
                }
                if (settingKey === "customApiModel") {
                    partial.model = value
                }

                await saveCustomApiSettings(partial)
                return
            }

            await saveSetting(settingKey as keyof types.UserSettings, value)
        })
    })
}

function buildCustomApiConfigFromInputs(): LLMConfig | null {
    const baseUrlInput = document.getElementById("customApiBaseUrl") as HTMLInputElement | null
    const apiKeyInput = document.getElementById("customApiKey") as HTMLInputElement | null
    const modelInput = document.getElementById("customApiModel") as HTMLInputElement | null
    if (!baseUrlInput || !apiKeyInput || !modelInput) {
        return null
    }

    const apiKey = apiKeyInput.value.trim()
    const baseUrl = baseUrlInput.value.trim()
    const model = modelInput.value.trim()

    if (!apiKey || !baseUrl || !model) {
        return null
    }

    return {
        apiKey,
        baseUrl,
        model,
        temperature: CUSTOM_API_FIXED_PARAMS.temperature,
        maxTokens: CUSTOM_API_FIXED_PARAMS.maxTokens,
        timeout: CUSTOM_API_FIXED_PARAMS.timeout,
    }
}

function setValidationStatus(element: HTMLElement | null, status: "idle" | "success" | "error" | "loading", message?: string): void {
    if (!element) {
        return
    }

    element.textContent = message ?? ""
    element.classList.remove("success", "error", "loading")

    if (status !== "idle") {
        element.classList.add(status)
    }
}

export function setupCustomApiValidation(): void {
    const validateButton = document.getElementById("validateCustomApiButton") as HTMLButtonElement | null
    const statusElement = document.getElementById("validateCustomApiStatus")
    const useCustomApiToggle = document.getElementById("useCustomApi") as HTMLInputElement | null
    const targetLanguageSelect = document.getElementById("targetLanguage") as HTMLSelectElement | null

    if (!validateButton || !useCustomApiToggle) {
        return
    }

    validateButton.addEventListener("click", async () => {
        const useCustomApi = useCustomApiToggle.checked

        if (!useCustomApi) {
            setValidationStatus(statusElement, "error", "Enable custom API before validating.")
            return
        }

        const config = buildCustomApiConfigFromInputs()
        if (!config) {
            setValidationStatus(statusElement, "error", "Base URL, API key, and model are required.")
            return
        }

        setValidationStatus(statusElement, "loading", "Validating...")
        validateButton.disabled = true

        try {
            const targetLanguage = targetLanguageSelect?.value || "zh"
            await translateWordWithLLM(
                {
                    word: "hello",
                    sourceLanguage: "en",
                    targetLanguage,
                },
                config
            )

            setValidationStatus(statusElement, "success", "Validation succeeded.")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Validation failed"
            setValidationStatus(statusElement, "error", message)
        } finally {
            validateButton.disabled = !useCustomApiToggle.checked
        }
    })
}
