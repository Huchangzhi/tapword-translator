import * as i18nModule from "@/0_common/utils/i18n"
import { createLogger } from "@/0_common/utils/logger"

const logger = createLogger("UpdatePage_v0_4_0")

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
    logger.info("Initializing update_v0_4_0 page")

    // Apply translations
    i18nModule.applyTranslations()

    // 1. Bind XHS Group Modal
    const modal = document.getElementById("qr-modal")
    const modalImg = document.getElementById("qr-image") as HTMLImageElement
    const xhsGroupBtn = document.getElementById("btn-xhs-group")
    const closeBtn = document.getElementById("close-modal")

    if (modal && xhsGroupBtn && modalImg && closeBtn) {
        xhsGroupBtn.addEventListener("click", () => {
            modalImg.src = "/assets/pic/xiaohongshu_group_qr.jpg"
            modal.classList.add("active")
        })

        const closeModal = () => {
            modal.classList.remove("active")
        }

        closeBtn.addEventListener("click", closeModal)
        
        // Close on overlay click
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal()
            }
        })
    }

    // Bind events
    document.getElementById("btn-close")?.addEventListener("click", () => {
        window.close()
    })
})
